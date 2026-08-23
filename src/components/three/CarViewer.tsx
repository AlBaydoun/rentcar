'use client';

import { ContactShadows, OrbitControls } from '@react-three/drei';
import { useState } from 'react';
import { Maximize2, RotateCcw } from 'lucide-react';
import { CarModel } from './CarModel';
import type { BodyStyle } from '@/lib/body-style';
import { ReflectiveFloor, StudioEnvironment } from './Stage';
import { SceneCanvas, useReducedMotion } from './SceneCanvas';
import { CarSilhouette } from '@/components/cars/CarSilhouette';
import { cn } from '@/lib/cn';

/**
 * The 3D viewer on a listing.
 *
 * Drag to orbit, and swap the paint to see the car as it actually is versus
 * how it would look in another colour. Falls back to the flat silhouette when
 * WebGL is unavailable.
 */

const PAINTS = [
  { name: 'As listed', hex: null },
  { name: 'Alpine White', hex: '#e8ecf4' },
  { name: 'Obsidian', hex: '#22262f' },
  { name: 'Signal Red', hex: '#e0483c' },
  { name: 'Deep Blue', hex: '#4a7fe0' },
  { name: 'Cedar Green', hex: '#3fa878' },
  { name: 'Amber', hex: '#ffa62b' },
];

export function CarViewer({
  bodyStyle,
  colour,
  className,
}: {
  bodyStyle: BodyStyle;
  colour: string;
  className?: string;
}) {
  const [paint, setPaint] = useState<string | null>(null);
  const [spin, setSpin] = useState(true);
  const reduced = useReducedMotion();
  const active = paint ?? colour;

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      <SceneCanvas
        className="h-full w-full"
        shadows
        camera={{ fov: 30, position: [6.4, 2.4, 7.2] }}
        fallback={
          <div className="flex h-full w-full items-center justify-center p-10">
            <CarSilhouette bodyStyle={bodyStyle} colour={active} />
          </div>
        }
      >
        <StudioEnvironment />
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 8, 4]} intensity={2} castShadow shadow-mapSize={[1024, 1024]} />
        <spotLight position={[-6, 6, 2]} intensity={22} angle={0.75} penumbra={1} color="#ffb347" />

        <group position={[0, -0.5, 0]}>
          <CarModel
            bodyStyle={bodyStyle}
            colour={active}
            autoRotate={spin && !reduced}
            rotationSpeed={0.22}
          />
          <ContactShadows
            position={[0, 0.01, 0]}
            opacity={0.7}
            scale={14}
            blur={2.4}
            far={4.5}
            resolution={512}
          />
          <ReflectiveFloor />
        </group>

        <fog attach="fog" args={['#0a0c11', 16, 34]} />

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={5}
          maxDistance={13}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2.15}
          onStart={() => setSpin(false)}
        />
      </SceneCanvas>

      {/* Controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
        <div className="no-scrollbar pointer-events-auto flex flex-1 gap-1.5 overflow-x-auto">
          {PAINTS.map((entry) => {
            const selected = (entry.hex ?? null) === paint;
            return (
              <button
                key={entry.name}
                type="button"
                onClick={() => setPaint(entry.hex)}
                title={entry.name}
                aria-label={entry.name}
                aria-pressed={selected}
                className={cn(
                  'h-7 w-7 shrink-0 rounded-full border-2 transition-transform hover:scale-110',
                  selected ? 'border-amber-400 scale-110' : 'border-white/20',
                )}
                style={{
                  background: entry.hex ?? `linear-gradient(135deg, ${colour}, ${colour}80)`,
                }}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setSpin((value) => !value)}
          className="pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-ink-950/70 px-3 py-1.5 text-[11.5px] text-mist backdrop-blur transition-colors hover:text-chalk"
        >
          <RotateCcw size={12} />
          {spin ? 'Pause' : 'Spin'}
        </button>
      </div>

      <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-950/60 px-2.5 py-1 text-[10.5px] uppercase tracking-wider text-slate-dim backdrop-blur">
        <Maximize2 size={10} />
        Drag to look around
      </div>
    </div>
  );
}
