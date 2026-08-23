'use client';

import { Canvas, type CanvasProps } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * Canvas wrapper with the guards every 3D surface needs:
 * it stays out of the way when WebGL is unavailable or the visitor has asked
 * for reduced motion, and it never blocks first paint.
 */

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);
  return reduced;
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

const DEFAULT_CAMERA = { fov: 34, position: [6.5, 2.2, 7.5] } as const;

export interface SceneCanvasProps extends Omit<CanvasProps, 'children'> {
  children: React.ReactNode;
  /** Rendered instead of the scene when 3D cannot or should not run. */
  fallback?: React.ReactNode;
  className?: string;
}

export function SceneCanvas({
  children,
  fallback = null,
  className,
  camera,
  ...rest
}: SceneCanvasProps) {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(webglAvailable());
  }, []);

  if (supported === false) return <>{fallback}</>;
  if (supported === null) return <div className={className} aria-hidden />;

  return (
    <Canvas
      className={className}
      // Cap the pixel ratio: a 3x phone screen renders nine times the pixels
      // of a 1x one for no visible benefit and a large battery cost.
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      camera={camera ?? DEFAULT_CAMERA}
      {...rest}
    >
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}
