'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * A procedurally generated car.
 *
 * The silhouette comes from two extruded side profiles — the lower body and
 * the glasshouse — rather than stacked boxes, which is what makes it read as
 * a car rather than a toy. Building it in code means the whole 3D experience
 * ships with zero downloaded assets: nothing to fetch, nothing to fail.
 */

import type { BodyStyle } from '@/lib/body-style';

export type { BodyStyle };

interface Profile {
  /** Side profile of the painted body, as [length, height] pairs. */
  body: [number, number][];
  /** Side profile of the glasshouse. */
  glass: [number, number][];
  width: number;
  glassWidth: number;
  wheelRadius: number;
  wheelBase: number;
  /**
   * Lateral wheel position. Extrusion bevelling widens the body beyond
   * `width`, so the track has to clear that or the wheels end up buried
   * inside the bodywork.
   */
  track: number;
  rideHeight: number;
}

const PROFILES: Record<BodyStyle, Profile> = {
  HATCH: {
    body: [
      [1.94, 0.30], [2.00, 0.50], [1.98, 0.66], [1.80, 0.74], [1.42, 0.79],
      [0.96, 0.83], [-1.10, 0.86], [-1.66, 0.85], [-1.90, 0.78], [-1.96, 0.56], [-1.96, 0.30],
    ],
    glass: [[1.00, 0.80], [0.52, 1.22], [-0.60, 1.28], [-1.24, 1.00], [-1.22, 0.80]],
    width: 1.70, glassWidth: 1.50, wheelRadius: 0.32, wheelBase: 1.30, track: 0.94, rideHeight: 0.32,
  },
  SEDAN: {
    body: [
      [2.16, 0.30], [2.24, 0.50], [2.22, 0.66], [2.00, 0.74], [1.52, 0.79],
      [1.06, 0.83], [-1.32, 0.86], [-1.94, 0.86], [-2.16, 0.78], [-2.24, 0.56], [-2.24, 0.30],
    ],
    glass: [[1.10, 0.80], [0.60, 1.20], [-0.62, 1.25], [-1.44, 0.96], [-1.42, 0.80]],
    width: 1.74, glassWidth: 1.54, wheelRadius: 0.33, wheelBase: 1.46, track: 0.96, rideHeight: 0.33,
  },
  SUV: {
    body: [
      [2.06, 0.44], [2.14, 0.70], [2.12, 0.92], [1.92, 1.00], [1.44, 1.04],
      [0.98, 1.07], [-1.46, 1.09], [-1.94, 1.08], [-2.06, 0.98], [-2.12, 0.72], [-2.12, 0.44],
    ],
    glass: [[1.02, 1.04], [0.62, 1.42], [-1.12, 1.47], [-1.62, 1.36], [-1.60, 1.04]],
    width: 1.80, glassWidth: 1.62, wheelRadius: 0.39, wheelBase: 1.40, track: 1.00, rideHeight: 0.44,
  },
  SPORTS: {
    body: [
      [2.04, 0.22], [2.12, 0.38], [2.08, 0.52], [1.86, 0.58], [1.40, 0.63],
      [0.92, 0.67], [-1.12, 0.72], [-1.68, 0.72], [-1.92, 0.64], [-2.00, 0.42], [-2.00, 0.22],
    ],
    glass: [[0.96, 0.64], [0.40, 0.98], [-0.56, 1.02], [-1.26, 0.78], [-1.24, 0.64]],
    width: 1.78, glassWidth: 1.52, wheelRadius: 0.34, wheelBase: 1.36, track: 0.99, rideHeight: 0.25,
  },
  VAN: {
    body: [
      [2.22, 0.38], [2.30, 0.62], [2.28, 0.86], [2.10, 1.02], [1.62, 1.12],
      [1.28, 1.16], [-1.96, 1.19], [-2.20, 1.14], [-2.30, 0.92], [-2.32, 0.62], [-2.32, 0.38],
    ],
    glass: [[1.32, 1.13], [1.04, 1.56], [-1.90, 1.60], [-2.06, 1.14]],
    width: 1.84, glassWidth: 1.68, wheelRadius: 0.37, wheelBase: 1.58, track: 1.02, rideHeight: 0.40,
  },
};

function extrude(points: [number, number][], depth: number, bevel: number) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    shape.lineTo(points[index][0], points[index][1]);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 24,
  });
  // Extrusion runs along +Z from the origin; recentre it on the axis.
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * One wheel.
 *
 * The car's length runs along X and its width along Z, so a wheel's axle is
 * the Z axis. The inner group turns the cylinder's default Y axis to face
 * that way; the outer group is what spins.
 */
function Wheel({ radius, position }: { radius: number; position: [number, number, number] }) {
  const width = radius * 0.7;

  return (
    <group position={position}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        {/* Tyre */}
        <mesh castShadow>
          <cylinderGeometry args={[radius, radius, width, 40]} />
          <meshStandardMaterial color="#0c0d10" roughness={0.92} metalness={0.05} />
        </mesh>
        {/* Sidewall shoulder, so the tyre is not a flat disc in profile */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 0.92, radius * 0.11, 10, 40]} />
          <meshStandardMaterial color="#141519" roughness={0.85} />
        </mesh>

        {[1, -1].map((side) => (
          <group key={side} position={[0, (side * width) / 2 + side * 0.004, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[radius * 0.64, 32]} />
              <meshStandardMaterial
                color="#b9c0cc"
                metalness={0.95}
                roughness={0.26}
                side={THREE.DoubleSide}
              />
            </mesh>
            {Array.from({ length: 5 }).map((_, index) => (
              <mesh
                key={index}
                rotation={[0, (index / 5) * Math.PI * 2, 0]}
                position={[0, side * 0.008, 0]}
              >
                <boxGeometry args={[radius * 0.15, 0.014, radius * 1.12]} />
                <meshStandardMaterial color="#98a0af" metalness={0.95} roughness={0.32} />
              </mesh>
            ))}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, side * 0.014, 0]}>
              <circleGeometry args={[radius * 0.17, 24]} />
              <meshStandardMaterial color="#5f6779" metalness={0.9} roughness={0.35} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export interface CarModelProps {
  bodyStyle?: BodyStyle;
  /** Hex paint colour. */
  colour?: string;
  /** Slow idle rotation, used on the hero. */
  autoRotate?: boolean;
  rotationSpeed?: number;
  /** Wheels spin and the body gets a gentle float. */
  driving?: boolean;
  /** Headlights and tail lights emit. */
  lightsOn?: boolean;
  scale?: number;
  onPartClick?: (part: string, point: THREE.Vector3) => void;
}

export function CarModel({
  bodyStyle = 'HATCH',
  colour = '#ffa62b',
  autoRotate = false,
  rotationSpeed = 0.18,
  driving = false,
  lightsOn = true,
  scale = 1,
  onPartClick,
}: CarModelProps) {
  const root = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group>(null);
  const profile = PROFILES[bodyStyle];

  const bodyGeometry = useMemo(() => extrude(profile.body, profile.width, 0.085), [profile]);
  const glassGeometry = useMemo(() => extrude(profile.glass, profile.glassWidth, 0.05), [profile]);

  useFrame((state, delta) => {
    if (root.current) {
      if (autoRotate) root.current.rotation.y += delta * rotationSpeed;
      if (driving) {
        // A small vertical float plus a touch of roll reads as motion without
        // ever looking like the car is bouncing.
        root.current.position.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.012;
        root.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.9) * 0.006;
      }
    }
    if (wheels.current && driving) {
      for (const wheel of wheels.current.children) {
        // Z is the axle.
        wheel.rotation.z -= delta * 9;
      }
    }
  });

  const wheelPositions: [number, number, number][] = [
    [profile.wheelBase, profile.wheelRadius, profile.track],
    [profile.wheelBase, profile.wheelRadius, -profile.track],
    [-profile.wheelBase, profile.wheelRadius, profile.track],
    [-profile.wheelBase, profile.wheelRadius, -profile.track],
  ];

  const noseX = profile.body[1][0];
  const tailX = profile.body[profile.body.length - 2][0];
  const beltY = profile.body[5][1];

  const handleClick =
    (part: string) => (event: { stopPropagation: () => void; point: THREE.Vector3 }) => {
      if (!onPartClick) return;
      event.stopPropagation();
      onPartClick(part, event.point);
    };

  return (
    <group ref={root} scale={scale} dispose={null}>
      {/* Painted body */}
      <mesh geometry={bodyGeometry} castShadow receiveShadow onClick={handleClick('BODY')}>
        <meshPhysicalMaterial
          color={colour}
          metalness={0.6}
          roughness={0.26}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMapIntensity={1.6}
        />
      </mesh>

      {/* Glasshouse */}
      <mesh geometry={glassGeometry} castShadow onClick={handleClick('WINDSCREEN')}>
        <meshPhysicalMaterial
          color="#141c28"
          metalness={0.25}
          roughness={0.05}
          transmission={0.4}
          thickness={0.35}
          ior={1.45}
          transparent
          opacity={0.94}
          envMapIntensity={2.4}
        />
      </mesh>

      {/* Rocker surface, which grounds the body visually */}
      <mesh position={[0, profile.rideHeight * 0.42, 0]}>
        <boxGeometry args={[Math.abs(noseX - tailX) * 0.58, 0.05, profile.width + 0.08]} />
        <meshStandardMaterial color="#0d0f14" roughness={0.9} />
      </mesh>

      {/* Front grille */}
      <mesh
        position={[noseX - 0.02, profile.rideHeight + 0.2, 0]}
        onClick={handleClick('FRONT_BUMPER')}
      >
        <boxGeometry args={[0.09, 0.2, profile.width * 0.6]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Headlights */}
      {[1, -1].map((side) => (
        <mesh
          key={`head-${side}`}
          position={[noseX - 0.04, beltY - 0.13, side * profile.width * 0.33]}
          rotation={[0, 0, -0.08]}
          onClick={handleClick('FRONT_BUMPER')}
        >
          <boxGeometry args={[0.07, 0.075, profile.width * 0.2]} />
          <meshStandardMaterial
            color="#fff6e2"
            emissive="#ffe4b0"
            emissiveIntensity={lightsOn ? 1.6 : 0.08}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Tail light bar */}
      <mesh position={[tailX + 0.02, beltY - 0.1, 0]} onClick={handleClick('REAR_BUMPER')}>
        <boxGeometry args={[0.08, 0.085, profile.width * 0.76]} />
        <meshStandardMaterial
          color="#ff3b30"
          emissive="#ff2418"
          emissiveIntensity={lightsOn ? 1.4 : 0.12}
          toneMapped={false}
        />
      </mesh>

      {/* Door shut lines — subtle, but they stop the sides reading as slabs */}
      {[1, -1].map((side) =>
        [0.42, -0.62].map((x) => (
          <mesh
            key={`shut-${side}-${x}`}
            position={[x, beltY * 0.62, (side * profile.width) / 2 + side * 0.086]}
          >
            <boxGeometry args={[0.01, beltY * 0.66, 0.006]} />
            <meshStandardMaterial color="#05070a" roughness={1} />
          </mesh>
        )),
      )}

      {/* Mirrors */}
      {[1, -1].map((side) => (
        <mesh
          key={`mirror-${side}`}
          position={[
            profile.glass[0][0] - 0.06,
            profile.glass[0][1] + 0.07,
            side * (profile.width / 2 + 0.12),
          ]}
        >
          <boxGeometry args={[0.11, 0.07, 0.13]} />
          <meshPhysicalMaterial color={colour} metalness={0.6} roughness={0.3} clearcoat={1} />
        </mesh>
      ))}

      {/* Wheel arch openings — a dark ring inboard of each wheel */}
      {wheelPositions.map((position, index) => (
        <mesh
          key={`arch-${index}`}
          position={[position[0], position[1], position[2] * 0.86]}
          rotation={[Math.PI / 2, 0, 0]}
          onClick={handleClick('WHEELS')}
        >
          <cylinderGeometry
            args={[profile.wheelRadius * 1.26, profile.wheelRadius * 1.26, 0.04, 28]}
          />
          <meshStandardMaterial color="#05060a" roughness={1} metalness={0} />
        </mesh>
      ))}

      <group ref={wheels}>
        {wheelPositions.map((position, index) => (
          <Wheel key={index} radius={profile.wheelRadius} position={position} />
        ))}
      </group>
    </group>
  );
}
