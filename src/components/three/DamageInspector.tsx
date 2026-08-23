'use client';

import { Html, OrbitControls } from '@react-three/drei';
import { useState } from 'react';
import * as THREE from 'three';
import { CarModel } from './CarModel';
import { StudioEnvironment } from './Stage';
import { SceneCanvas } from './SceneCanvas';
import type { BodyStyle } from '@/lib/body-style';
import { PART_LABELS, SEVERITY_LABELS } from '@/lib/domain/inspection';
import type { DamageSeverity, VehiclePart } from '@/lib/domain/types';
import { cn } from '@/lib/cn';

/**
 * The 3D damage inspector.
 *
 * Both parties look at the same model of the same car and pin damage where it
 * actually is. A marker is a position in the car's own coordinate space, not a
 * line of text, which is what makes a handover record and a return record
 * comparable rather than a pair of opinions.
 */

export interface Marker {
  id: string;
  part: VehiclePart;
  position: { x: number; y: number; z: number };
  severity: DamageSeverity;
  description: string;
  preExisting: boolean;
}

const SEVERITY_COLOUR: Record<DamageSeverity, string> = {
  COSMETIC: '#facc15',
  MINOR: '#fb923c',
  MODERATE: '#f87171',
  MAJOR: '#ef4444',
  STRUCTURAL: '#dc2626',
};

/** Maps a click point on the body to the nearest inspectable panel. */
function partAtPoint(point: THREE.Vector3, hint: string): VehiclePart {
  if (hint === 'WINDSCREEN') return 'WINDSCREEN';
  if (hint === 'WHEELS') return 'WHEELS';
  if (hint === 'FRONT_BUMPER') return 'FRONT_BUMPER';
  if (hint === 'REAR_BUMPER') return 'REAR_BUMPER';

  // Front and rear thirds along the car's length take priority over the sides.
  if (point.x > 1.5) return 'FRONT_BUMPER';
  if (point.x < -1.5) return 'REAR_BUMPER';
  if (point.y > 1.2) return 'ROOF';
  if (point.y > 0.75 && point.x > 0.6) return 'HOOD';
  if (point.y > 0.75 && point.x < -0.9) return 'TRUNK';
  return point.z < 0 ? 'DRIVER_SIDE' : 'PASSENGER_SIDE';
}

function Pin({
  marker,
  selected,
  onSelect,
}: {
  marker: Marker;
  selected: boolean;
  onSelect: () => void;
}) {
  const colour = SEVERITY_COLOUR[marker.severity];
  return (
    <group position={[marker.position.x, marker.position.y, marker.position.z]}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <sphereGeometry args={[selected ? 0.075 : 0.055, 16, 16]} />
        <meshBasicMaterial color={colour} toneMapped={false} />
      </mesh>
      {/* Halo so a pin on a dark panel is still findable */}
      <mesh>
        <sphereGeometry args={[selected ? 0.13 : 0.1, 16, 16]} />
        <meshBasicMaterial color={colour} transparent opacity={0.22} toneMapped={false} />
      </mesh>
      {selected ? (
        <Html center distanceFactor={8} zIndexRange={[10, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-full border border-white/15 bg-ink-950/90 px-2.5 py-1 text-[10px] text-chalk backdrop-blur">
            {PART_LABELS[marker.part]}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

export function DamageInspector({
  bodyStyle,
  colour,
  markers,
  onAdd,
  onSelect,
  selectedId,
  readOnly = false,
  className,
}: {
  bodyStyle: BodyStyle;
  colour: string;
  markers: Marker[];
  onAdd?: (part: VehiclePart, position: { x: number; y: number; z: number }) => void;
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
  readOnly?: boolean;
  className?: string;
}) {
  const [hint, setHint] = useState(true);

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      <SceneCanvas
        className="h-full w-full"
        camera={{ fov: 32, position: [6, 2.6, 6.6] }}
        fallback={
          <div className="grid h-full place-items-center p-8 text-center text-[13px] text-slate-dim">
            3D inspection needs WebGL. Describe any damage in the notes instead.
          </div>
        }
      >
        <StudioEnvironment intensity={0.9} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 4]} intensity={1.8} />

        <group position={[0, -0.6, 0]}>
          <CarModel
            bodyStyle={bodyStyle}
            colour={colour}
            lightsOn={false}
            onPartClick={
              readOnly
                ? undefined
                : (part, point) => {
                    setHint(false);
                    onAdd?.(partAtPoint(point, part), {
                      x: Number(point.x.toFixed(3)),
                      y: Number(point.y.toFixed(3)),
                      z: Number(point.z.toFixed(3)),
                    });
                  }
            }
          />

          {markers.map((marker) => (
            <Pin
              key={marker.id}
              marker={marker}
              selected={marker.id === selectedId}
              onSelect={() => onSelect?.(marker.id === selectedId ? null : marker.id)}
            />
          ))}
        </group>

        <OrbitControls
          enablePan={false}
          minDistance={4.5}
          maxDistance={12}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2.05}
        />
      </SceneCanvas>

      {!readOnly && hint ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11.5px] text-amber-400 backdrop-blur">
            Click the car where the damage is
          </span>
        </div>
      ) : null}

      {markers.length > 0 ? (
        <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-1.5">
          {(Object.keys(SEVERITY_COLOUR) as DamageSeverity[])
            .filter((severity) => markers.some((marker) => marker.severity === severity))
            .map((severity) => (
              <span
                key={severity}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-950/70 px-2.5 py-1 text-[10.5px] text-mist backdrop-blur"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: SEVERITY_COLOUR[severity] }}
                />
                {SEVERITY_LABELS[severity].split(' — ')[0]}
              </span>
            ))}
        </div>
      ) : null}
    </div>
  );
}

export { SEVERITY_COLOUR };
