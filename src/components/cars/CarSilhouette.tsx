import { cn } from '@/lib/cn';
import type { BodyStyle } from '@/lib/body-style';

/**
 * A 2D side profile, generated from the same per-body-style measurements as
 * the 3D model.
 *
 * A search page cannot give every card its own WebGL canvas — twenty of them
 * would be unusable — so the grid uses this instead. The outline is built with
 * real wheel-arch cutouts rather than a straight underside, which is most of
 * what makes a car icon read as a car.
 */

interface Spec {
  /** Upper outline from the front bumper round to the rear, in view units. */
  top: [number, number][];
  windows: [number, number][][];
  frontWheel: { x: number; r: number };
  rearWheel: { x: number; r: number };
  ground: number;
}

const SPECS: Record<BodyStyle, Spec> = {
  HATCH: {
    top: [
      [14, 64], [18, 54], [40, 47], [92, 42], [110, 40],
      [140, 20], [202, 19], [234, 40], [262, 44], [280, 52], [286, 66],
    ],
    windows: [
      [[116, 40], [143, 23], [166, 22], [166, 40]],
      [[174, 22], [199, 22], [226, 40], [174, 40]],
    ],
    frontWheel: { x: 72, r: 22 },
    rearWheel: { x: 226, r: 22 },
    ground: 80,
  },
  SEDAN: {
    top: [
      [10, 64], [14, 54], [38, 46], [96, 41], [116, 39],
      [146, 21], [206, 20], [238, 39], [272, 42], [288, 52], [292, 66],
    ],
    windows: [
      [[122, 39], [149, 24], [171, 23], [171, 39]],
      [[179, 23], [203, 23], [230, 39], [179, 39]],
    ],
    frontWheel: { x: 70, r: 22 },
    rearWheel: { x: 232, r: 22 },
    ground: 80,
  },
  SUV: {
    top: [
      [14, 58], [18, 44], [40, 34], [92, 28], [108, 26],
      [134, 10], [216, 9], [240, 26], [266, 30], [284, 40], [288, 58],
    ],
    windows: [
      [[114, 26], [137, 13], [162, 12], [162, 26]],
      [[170, 12], [212, 12], [232, 26], [170, 26]],
    ],
    frontWheel: { x: 74, r: 26 },
    rearWheel: { x: 228, r: 26 },
    ground: 80,
  },
  SPORTS: {
    top: [
      [10, 72], [14, 62], [36, 55], [98, 49], [122, 47],
      [154, 30], [196, 29], [232, 47], [266, 50], [286, 58], [290, 70],
    ],
    windows: [
      [[128, 47], [156, 33], [174, 32], [174, 47]],
      [[181, 32], [193, 32], [220, 47], [181, 47]],
    ],
    frontWheel: { x: 68, r: 21 },
    rearWheel: { x: 234, r: 21 },
    ground: 80,
  },
  VAN: {
    top: [
      [10, 56], [14, 40], [30, 24], [66, 12], [96, 8],
      [244, 7], [268, 14], [284, 30], [290, 44], [292, 58], [292, 62],
    ],
    windows: [
      [[70, 22], [92, 11], [116, 11], [116, 30], [76, 30]],
      [[126, 11], [172, 11], [172, 30], [126, 30]],
      [[182, 11], [232, 11], [238, 30], [182, 30]],
    ],
    frontWheel: { x: 62, r: 24 },
    rearWheel: { x: 236, r: 24 },
    ground: 80,
  },
};

/**
 * Builds the closed outline: along the top, down the tail, then back along the
 * underside arcing up and over each wheel.
 */
function buildOutline(spec: Spec): string {
  const { top, ground, frontWheel, rearWheel } = spec;
  const startX = top[0][0];
  const endX = top[top.length - 1][0];

  const parts = [`M ${startX} ${ground}`];
  for (const [x, y] of top) parts.push(`L ${x} ${y}`);
  parts.push(`L ${endX} ${ground}`);

  // Travelling right to left; sweep 0 arcs the cut upward into the body.
  parts.push(`L ${rearWheel.x + rearWheel.r} ${ground}`);
  parts.push(`A ${rearWheel.r} ${rearWheel.r} 0 0 0 ${rearWheel.x - rearWheel.r} ${ground}`);
  parts.push(`L ${frontWheel.x + frontWheel.r} ${ground}`);
  parts.push(`A ${frontWheel.r} ${frontWheel.r} 0 0 0 ${frontWheel.x - frontWheel.r} ${ground}`);
  parts.push('Z');

  return parts.join(' ');
}

function polygon(points: [number, number][]): string {
  return `M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;
}

function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#0a0c11" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#000000" strokeOpacity="0.6" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r * 0.56} fill="#171a22" />
      <circle
        cx={cx}
        cy={cy}
        r={r * 0.56}
        fill="none"
        stroke="#8f97a8"
        strokeOpacity="0.75"
        strokeWidth="1.6"
      />
      {Array.from({ length: 5 }).map((_, index) => {
        const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;
        return (
          <line
            key={index}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(angle) * r * 0.5}
            y2={cy + Math.sin(angle) * r * 0.5}
            stroke="#77808f"
            strokeOpacity="0.7"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.14} fill="#5f6779" />
    </g>
  );
}

export function CarSilhouette({
  bodyStyle,
  colour = '#ffa62b',
  className,
}: {
  bodyStyle: BodyStyle;
  colour?: string;
  className?: string;
}) {
  const spec = SPECS[bodyStyle];
  const id = `car-${bodyStyle}-${colour.replace('#', '')}`;
  const outline = buildOutline(spec);

  return (
    <svg
      viewBox="0 0 300 116"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label={`${bodyStyle.toLowerCase()} side profile`}
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="1" />
          <stop offset="48%" stopColor={colour} stopOpacity="0.86" />
          <stop offset="100%" stopColor={colour} stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#c9d8f5" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#6f88b4" stopOpacity="0.14" />
        </linearGradient>
        <radialGradient id={`${id}-shadow`} cx="0.5" cy="0.5">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="150" cy="106" rx="128" ry="8" fill={`url(#${id}-shadow)`} />

      <g transform="translate(0, 6)">
        {/* Wheels sit behind the body so the arch cut-outs frame them */}
        <Wheel cx={spec.frontWheel.x} cy={spec.ground} r={spec.frontWheel.r} />
        <Wheel cx={spec.rearWheel.x} cy={spec.ground} r={spec.rearWheel.r} />

        <path d={outline} fill={`url(#${id}-body)`} />
        <path
          d={outline}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.3"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />

        {spec.windows.map((window, index) => (
          <path
            key={index}
            d={polygon(window)}
            fill={`url(#${id}-glass)`}
            stroke="#ffffff"
            strokeOpacity="0.18"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
        ))}

        {/* Headlight and tail light */}
        <rect
          x={spec.top[0][0] + 1}
          y={spec.top[1][1] + 2}
          width="9"
          height="5"
          rx="2"
          fill="#fff3d6"
          fillOpacity="0.85"
        />
        <rect
          x={spec.top[spec.top.length - 1][0] - 10}
          y={spec.top[spec.top.length - 2][1] + 2}
          width="9"
          height="5"
          rx="2"
          fill="#ff5348"
          fillOpacity="0.9"
        />
      </g>
    </svg>
  );
}
