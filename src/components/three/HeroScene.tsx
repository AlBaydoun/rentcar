'use client';

import { ContactShadows, Float, PerspectiveCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { CarModel } from './CarModel';
import type { BodyStyle } from '@/lib/body-style';
import { HorizonGrid, LightStreaks, Motes, ReflectiveFloor, StudioEnvironment } from './Stage';
import { SceneCanvas, useReducedMotion } from './SceneCanvas';

/**
 * The landing hero.
 *
 * The camera follows the pointer with heavy damping — enough that the scene
 * feels alive and responsive, gentle enough that it never fights the reader.
 */
function DriftingCamera({ enabled }: { enabled: boolean }) {
  const { pointer } = useThree();
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const target = useRef(new THREE.Vector3(7.4, 2.9, 9.6));

  useFrame((_, delta) => {
    if (!camera.current) return;
    if (enabled) {
      target.current.set(
        7.4 + pointer.x * 1.4,
        2.9 + pointer.y * 0.8,
        9.6 - Math.abs(pointer.x) * 0.6,
      );
    }
    // Frame-rate independent damping.
    const alpha = 1 - Math.pow(0.001, delta);
    camera.current.position.lerp(target.current, alpha);
    camera.current.lookAt(0, 0.68, 0);
  });

  return <PerspectiveCamera ref={camera} makeDefault fov={30} position={[7.4, 2.9, 9.6]} />;
}

export interface HeroSceneProps {
  bodyStyle?: BodyStyle;
  colour?: string;
  className?: string;
}

export function HeroScene({ bodyStyle = 'SEDAN', colour = '#ffa62b', className }: HeroSceneProps) {
  const reduced = useReducedMotion();

  return (
    <SceneCanvas
      className={className}
      shadows
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-40 w-72 rounded-2xl border border-white/10 bg-white/[0.03]" />
        </div>
      }
    >
      <DriftingCamera enabled={!reduced} />
      <StudioEnvironment />

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 8, 4]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <spotLight position={[-6, 6, 2]} intensity={26} angle={0.75} penumbra={1} color="#ffb347" />
      <spotLight position={[6, 5, -5]} intensity={22} angle={0.8} penumbra={1} color="#79a4ff" />

      <group position={[0, -0.45, 0]} scale={0.92}>
        <Float
          speed={reduced ? 0 : 1.1}
          rotationIntensity={reduced ? 0 : 0.14}
          floatIntensity={reduced ? 0 : 0.24}
          floatingRange={[0, 0.07]}
        >
          <CarModel
            bodyStyle={bodyStyle}
            colour={colour}
            autoRotate={!reduced}
            rotationSpeed={0.13}
            driving={!reduced}
          />
        </Float>

        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.72}
          scale={16}
          blur={2.6}
          far={5}
          resolution={512}
          color="#000000"
        />
        <ReflectiveFloor />
        <HorizonGrid />
        {!reduced && <LightStreaks colour={colour} />}
        {!reduced && <Motes />}
      </group>

      <fog attach="fog" args={['#080a0e', 16, 38]} />
    </SceneCanvas>
  );
}
