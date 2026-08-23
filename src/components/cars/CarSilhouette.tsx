import { cn } from '@/lib/cn';
import type { BodyStyle } from '@/components/three/CarModel';

/**
 * A 2D side profile drawn from the same outline as the 3D model.
 *
 * Listing cards cannot each carry a WebGL canvas — twenty of them on a search
 * page would be unusable. This renders the identical silhouette as an SVG, so
 * a car looks like itself in the grid and in the viewer.
 */

const PROFILES: Record<
  BodyStyle,
  { body: string; glass: string; wheels: [number, number][]; wheelR: number }
> = {
  HATCH: {
    body: 'M12 62 L14 40 L38 30 L86 26 L216 24 L250 30 L258 44 L258 62 Z',
    glass: 'M84 28 L112 8 L176 6 L212 22 L212 28 Z',
    wheels: [[74, 62], [204, 62]],
    wheelR: 19,
  },
  SEDAN: {
    body: 'M8 62 L10 40 L34 30 L82 25 L222 23 L256 26 L264 44 L264 62 Z',
    glass: 'M80 27 L110 8 L178 6 L220 21 L220 27 Z',
    wheels: [[70, 62], [208, 62]],
    wheelR: 19,
  },
  SUV: {
    body: 'M10 60 L12 34 L36 22 L84 15 L220 13 L254 20 L262 38 L262 60 Z',
    glass: 'M82 17 L110 0 L192 0 L228 16 L228 17 Z',
    wheels: [[72, 60], [206, 60]],
    wheelR: 23,
  },
  SPORTS: {
    body: 'M10 64 L12 48 L36 40 L88 33 L214 31 L250 36 L258 50 L258 64 Z',
    glass: 'M88 34 L124 16 L176 15 L210 30 L210 34 Z',
    wheels: [[72, 64], [204, 64]],
    wheelR: 20,
  },
  VAN: {
    body: 'M8 60 L10 30 L26 16 L60 8 L236 6 L258 16 L264 36 L264 60 Z',
    glass: 'M62 11 L78 0 L228 0 L238 12 Z',
    wheels: [[66, 60], [212, 60]],
    wheelR: 21,
  },
};

export function CarSilhouette({
  bodyStyle,
  colour = '#ffa62b',
  className,
}: {
  bodyStyle: BodyStyle;
  colour?: string;
  className?: string;
}) {
  const profile = PROFILES[bodyStyle];
  const id = `car-${bodyStyle}-${colour.replace('#', '')}`;

  return (
    <svg
      viewBox="0 0 272 92"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label={`${bodyStyle.toLowerCase()} side profile`}
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.95" />
          <stop offset="55%" stopColor={colour} stopOpacity="0.72" />
          <stop offset="100%" stopColor={colour} stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dfe8ff" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#8ea8d8" stopOpacity="0.1" />
        </linearGradient>
        <radialGradient id={`${id}-shadow`} cx="0.5" cy="0.5">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="136" cy="82" rx="120" ry="9" fill={`url(#${id}-shadow)`} />

      <g transform="translate(0, 6)">
        <path d={profile.body} fill={`url(#${id}-body)`} />
        <path d={profile.body} fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1.2" />
        <path
          d={profile.glass}
          fill={`url(#${id}-glass)`}
          stroke="#ffffff"
          strokeOpacity="0.14"
          strokeWidth="0.8"
        />

        {profile.wheels.map(([cx, cy], index) => (
          <g key={index}>
            <circle cx={cx} cy={cy} r={profile.wheelR} fill="#0b0d12" />
            <circle
              cx={cx}
              cy={cy}
              r={profile.wheelR * 0.58}
              fill="none"
              stroke="#7d859a"
              strokeWidth="2.2"
            />
            <circle cx={cx} cy={cy} r={profile.wheelR * 0.18} fill="#5b6379" />
          </g>
        ))}
      </g>
    </svg>
  );
}
