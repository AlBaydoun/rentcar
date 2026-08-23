'use client';

import { Container } from '@/components/ui';
import { Counter, Reveal } from '@/components/motion/primitives';

/**
 * A marquee of the market facts that actually differ between the two
 * countries, plus the four numbers that describe the marketplace.
 */

const FACTS = [
  'Kfz-Haftpflichtversicherung included on every German listing',
  'Whish and OMT payouts in Lebanon',
  'Winter tyres checked from October to April',
  'Nothing charged until the owner approves',
  'Mécanique certificate verified on every Lebanese car',
  'Exact address revealed only on confirmation',
  'Card authorised at approval, captured at handover',
  'Every risk factor shown to the owner with its reason',
];

export function TrustStrip({
  stats,
}: {
  stats: { cars: number; cities: number; owners: number };
}) {
  return (
    <section className="relative border-y border-white/[0.06] py-14">
      <Container>
        <Reveal>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: stats.cars, label: 'Cars listed', suffix: '', sub: 'Across both markets' },
              { value: stats.cities, label: 'Cities', suffix: '', sub: 'Germany and Lebanon' },
              { value: stats.owners, label: 'Verified owners', suffix: '', sub: 'Identity checked' },
              { value: 0, label: 'Charged before approval', suffix: '', sub: 'By design, not by policy' },
            ].map((stat, index) => (
              <div key={stat.label}>
                <div className="numeric text-[clamp(2rem,4vw,2.9rem)] font-bold leading-none text-chalk">
                  <Counter to={stat.value} duration={1.4 + index * 0.15} />
                  {stat.suffix}
                </div>
                <p className="mt-2.5 text-[13px] font-medium text-chalk">{stat.label}</p>
                <p className="mt-1 text-[12px] text-slate-dim">{stat.sub}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Container>

      <div className="relative mt-12 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink-950 to-transparent" />
        <div className="flex w-max animate-marquee gap-10">
          {[...FACTS, ...FACTS].map((fact, index) => (
            <span
              key={index}
              className="flex shrink-0 items-center gap-10 whitespace-nowrap text-[12.5px] text-slate-dim"
            >
              {fact}
              <span className="h-1 w-1 rounded-full bg-amber-500/50" aria-hidden />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
