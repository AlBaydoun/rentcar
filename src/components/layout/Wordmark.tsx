import { cn } from '@/lib/cn';

/**
 * The KarRent mark: a speed-line "K" whose counters read as a road vanishing
 * toward a horizon. Drawn inline so it inherits colour and never flashes.
 */
export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-[9px] bg-amber-500 shadow-[0_6px_18px_-6px_rgba(255,166,43,0.8)]">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
          <path d="M6 4v16" stroke="#06070a" strokeWidth="3" strokeLinecap="round" />
          <path d="M18 4L8.5 12L18 20" stroke="#06070a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="absolute inset-x-0 top-0 h-px bg-white/50" />
      </span>
      {!compact && (
        <span className="display text-[17px] tracking-[-0.04em] text-chalk">
          Kar<span className="text-amber-400">Rent</span>
        </span>
      )}
    </span>
  );
}
