'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Studio lighting built entirely in-scene.
 *
 * drei's `Environment` presets fetch HDRI files from a CDN, which is a
 * network dependency and a blank car if it fails. Instead the environment map
 * is rendered from `Lightformer` planes each frame, so the reflections in the
 * paint are real and nothing is ever downloaded.
 */
export function StudioEnvironment({ intensity = 1 }: { intensity?: number }) {
  return (
    <Environment resolution={256} frames={1}>
      {/* Key: a long soft strip overhead, the classic automotive top light */}
      <Lightformer
        form="rect"
        intensity={5 * intensity}
        position={[0, 5, 1]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[10, 3, 1]}
        color="#ffffff"
      />
      {/* Warm rim from the front left */}
      <Lightformer
        form="rect"
        intensity={3.2 * intensity}
        position={[-5, 2, 4]}
        rotation={[0, -Math.PI / 3, 0]}
        scale={[6, 4, 1]}
        color="#ffb347"
      />
      {/* Cool rim from the rear right — separates the body from the background */}
      <Lightformer
        form="rect"
        intensity={2.6 * intensity}
        position={[5, 2, -4]}
        rotation={[0, Math.PI / 2.4, 0]}
        scale={[6, 4, 1]}
        color="#79a4ff"
      />
      {/* Two thin strips that become the highlight running along the flanks */}
      <Lightformer
        form="rect"
        intensity={4 * intensity}
        position={[0, 1.4, 6]}
        rotation={[0, 0, 0]}
        scale={[9, 0.35, 1]}
        color="#ffffff"
      />
      <Lightformer
        form="rect"
        intensity={3 * intensity}
        position={[0, 1.4, -6]}
        rotation={[0, Math.PI, 0]}
        scale={[9, 0.35, 1]}
        color="#cfe0ff"
      />
      {/* Fill from below so the sills are not pure black */}
      <Lightformer
        form="circle"
        intensity={0.8 * intensity}
        position={[0, -3, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[8, 8, 1]}
        color="#2a3550"
      />
    </Environment>
  );
}

/** A dark reflective floor built from a plane and a radial fade. */
export function ReflectiveFloor({ y = 0, colour = '#06070a' }: { y?: number; colour?: string }) {
  const texture = useMemo(() => {
    // Radial alpha gradient so the floor dissolves rather than ending on a hard edge.
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.30)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.10)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);

  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={colour} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* Pool of light directly under the car */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[14, 14]} />
        <meshBasicMaterial map={texture} transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Light streaks sweeping past the car — the motion-graphics element that makes
 * a static hero feel like it is moving at speed.
 */
export function LightStreaks({ count = 14, colour = '#ffa62b' }: { count?: number; colour?: string }) {
  const group = useRef<THREE.Group>(null);

  const streaks = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        z: (Math.random() - 0.5) * 9,
        y: 0.08 + Math.random() * 2.6,
        length: 1.6 + Math.random() * 5,
        speed: 4 + Math.random() * 9,
        offset: Math.random() * 26,
        opacity: 0.12 + Math.random() * 0.4,
        thickness: 0.008 + Math.random() * 0.02,
        warm: index % 3 !== 0,
      })),
    [count],
  );

  useFrame((state) => {
    if (!group.current) return;
    group.current.children.forEach((child, index) => {
      const streak = streaks[index];
      const travel = ((state.clock.elapsedTime * streak.speed + streak.offset) % 26) - 13;
      child.position.x = travel;
    });
  });

  return (
    <group ref={group}>
      {streaks.map((streak, index) => (
        <mesh key={index} position={[0, streak.y, streak.z]}>
          <boxGeometry args={[streak.length, streak.thickness, streak.thickness]} />
          <meshBasicMaterial
            color={streak.warm ? colour : '#8fb2ff'}
            transparent
            opacity={streak.opacity}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Slow drifting dust motes, for depth. */
export function Motes({ count = 120 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 22;
      positions[index * 3 + 1] = Math.random() * 6;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 16;
      speeds[index] = 0.05 + Math.random() * 0.18;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((_, delta) => {
    if (!points.current) return;
    const array = points.current.geometry.attributes.position.array as Float32Array;
    for (let index = 0; index < count; index += 1) {
      array[index * 3 + 1] += speeds[index] * delta;
      if (array[index * 3 + 1] > 6.2) array[index * 3 + 1] = -0.2;
    }
    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#ffd9a0"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/** A grid that fades with distance — the ground plane of the whole brand. */
export function HorizonGrid({ y = 0.004, colour = '#2a3348' }: { y?: number; colour?: string }) {
  const geometry = useMemo(() => {
    const points: number[] = [];
    const half = 20;
    const step = 1;
    for (let i = -half; i <= half; i += step) {
      points.push(-half, 0, i, half, 0, i);
      points.push(i, 0, -half, i, 0, half);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, []);

  return (
    <lineSegments geometry={geometry} position={[0, y, 0]}>
      <lineBasicMaterial color={colour} transparent opacity={0.28} depthWrite={false} />
    </lineSegments>
  );
}
