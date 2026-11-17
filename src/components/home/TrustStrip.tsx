'use client';

import { Container } from '@/components/ui';
import { Reveal } from '@/components/motion/primitives';

/**
 * The band under the hero.
 *
 * Deliberately not a row of big numbers. A marketplace this size has small
 * numbers, and a hero metric reading "20 cars" argues against itself — the
 * honest version states the inventory plainly in a line and spends the space
 * on the specific commitments that actually distinguish the product.
 */

const COMMITMENTS = [
  'Nothing charged until the owner approves',
  'Card captured at handover, never before',
  'Kfz-Haftpflichtversicherung on every German listing',
  'Whish and OMT payouts in Lebanon',
  'Mécanique certificate verified on every Lebanese car',
  'Winter tyres checked from October to April',
  'Exact address revealed only on confirmation',
  'Every risk factor shown to the owner with its reason',
];

export function TrustStrip({
  stats,
}: {
  stats: { cars: number; cities: number; owners: number };
}) {
  return (
    <section className="relative border-y border-[var(--hairline)] py-10">
      <Container>
        <Reveal>
          <p className="lede text-[14px] leading-relaxed text-mist">
            <span className="numeric text-chalk">{stats.cars}</span> cars across{' '}
            <span className="numeric text-chalk">{stats.cities}</span> cities in Germany and
            Lebanon, listed by <span className="numeric text-chalk">{stats.owners}</span> verified
            owners. Small, and every one of them checked.
          </p>
        </Reveal>
      </Container>

      {/* The commitments, running quietly past. */}
      <div className="relative mt-8 overflow-hidden" aria-hidden>
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[var(--z-raised)] w-24 bg-gradient-to-r from-ink-950 via-ink-950/80 to-transparent sm:w-36" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[var(--z-raised)] w-24 bg-gradient-to-l from-ink-950 via-ink-950/80 to-transparent sm:w-36" />
        <div className="flex w-max animate-marquee">
          {[...COMMITMENTS, ...COMMITMENTS].map((fact, index) => (
            <span
              key={index}
              className="flex shrink-0 items-center gap-10 whitespace-nowrap pr-10 text-[12.5px] text-slate-dim"
            >
              {fact}
              <span className="h-1 w-1 rounded-full bg-amber-500/60" />
            </span>
          ))}
        </div>
      </div>

      {/* The same commitments, reachable by anyone not watching them scroll. */}
      <ul className="sr-only">
        {COMMITMENTS.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </section>
  );
}
