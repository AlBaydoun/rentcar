'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Minus, ShieldCheck } from 'lucide-react';
import { Badge, Container, SectionHeading } from '@/components/ui';
import { Reveal } from '@/components/motion/primitives';
import { INSURANCE_TIER_SPECS, quoteInsurance } from '@/lib/domain/insurance';
import { GERMANY } from '@/lib/domain/countries';
import { formatMoney, money } from '@/lib/domain/money';
import type { InsuranceTier } from '@/lib/domain/types';
import { cn } from '@/lib/cn';

/**
 * Protection tiers, priced live.
 *
 * The numbers here come from the real `quoteInsurance` function against a
 * representative car, so the marketing page cannot drift away from what the
 * checkout will actually charge.
 */

const SAMPLE = {
  dailyBaseRate: money(4_800, 'EUR' as const),
  vehicleValue: money(1_800_000, 'EUR' as const),
  category: 'COMPACT' as const,
  days: 4,
  renterRiskScore: 22,
  country: GERMANY,
};

const TIERS: InsuranceTier[] = ['BASIC', 'PLUS', 'MAX'];

export function Protection() {
  const [hovered, setHovered] = useState<InsuranceTier | null>('PLUS');

  return (
    <section id="protection" className="relative py-28 sm:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Protection"
            title={
              <>
                Three tiers. One honest number:
                <br />
                <span className="amber-gradient">what you still owe if it goes wrong.</span>
              </>
            }
            description="Statutory liability cover always travels with the car. What you choose here is how much of the vehicle's own repair bill stays with you — the excess."
          />
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {TIERS.map((tier, index) => {
            const spec = INSURANCE_TIER_SPECS[tier];
            const quote = quoteInsurance({ ...SAMPLE, tier });
            const featured = tier === 'PLUS';
            const active = hovered === tier;

            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-12%' }}
                transition={{ duration: 0.6, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => setHovered(tier)}
                className={cn(
                  'panel panel-lit relative flex flex-col overflow-hidden rounded-xl p-7 transition-[transform,border-color] duration-300',
                  active && 'border-amber-500/30 lg:-translate-y-1.5',
                  featured && 'lg:scale-[1.02]',
                )}
              >
                {featured && (
                  <div
                    className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-b from-amber-500/25 to-transparent blur-3xl"
                    aria-hidden
                  />
                )}

                <div className="relative flex items-center justify-between">
                  <h3 className="display text-xl text-chalk">{spec.name}</h3>
                  {featured && <Badge tone="amber">Most chosen</Badge>}
                </div>

                <p className="relative mt-2 text-[13px] leading-relaxed text-mist">{spec.tagline}</p>

                <div className="relative mt-7">
                  <div className="flex items-baseline gap-1.5">
                    <span className="numeric text-[2.6rem] font-bold leading-none text-chalk">
                      {quote.dailyPremium.amount === 0
                        ? 'Included'
                        : formatMoney(quote.dailyPremium)}
                    </span>
                    {quote.dailyPremium.amount > 0 && (
                      <span className="text-[13px] text-slate-dim">/ day</span>
                    )}
                  </div>
                  <p className="mt-2 text-[12px] text-slate-dim">
                    On a €48/day compact. Scales with the car and your risk profile.
                  </p>
                </div>

                <div className="relative mt-6 rounded-md border border-white/[0.07] bg-ink-950/50 p-4">
                  <p className="text-[10.5px] uppercase tracking-[0.18em] text-slate-dim">
                    Your excess
                  </p>
                  <p
                    className={cn(
                      'numeric mt-1.5 text-2xl font-bold',
                      quote.excess.amount === 0 ? 'text-cedar-400' : 'text-chalk',
                    )}
                  >
                    {quote.excess.amount === 0 ? 'Zero' : formatMoney(quote.excess)}
                  </p>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-slate-dim">
                    The most you pay toward repairs, whatever the bill comes to.
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11.5px]">
                    <span className="text-slate-dim">Deposit</span>
                    <span className="numeric text-chalk">
                      ×{spec.depositMultiplier.toFixed(2)}
                    </span>
                  </div>
                </div>

                <ul className="relative mt-6 flex-1 space-y-2.5">
                  {spec.covers.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[12.5px] leading-relaxed text-mist">
                      <Check size={14} className="mt-0.5 shrink-0 text-cedar-400" />
                      {item}
                    </li>
                  ))}
                  {spec.excludes.slice(0, 2).map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-[12.5px] leading-relaxed text-slate-dim"
                    >
                      <Minus size={14} className="mt-0.5 shrink-0 text-slate-dim" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        <Reveal delay={0.15}>
          <div className="panel mt-6 flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:gap-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xs border border-cedar-500/25 bg-cedar-500/10">
              <ShieldCheck size={19} className="text-cedar-400" />
            </span>
            <p className="text-[13.5px] leading-relaxed text-mist">
              <span className="font-medium text-chalk">
                Statutory liability is never something you buy here.
              </span>{' '}
              In Germany, Kfz-Haftpflichtversicherung is compulsory and follows the vehicle. In
              Lebanon, the mandatory policy covers third-party bodily injury but not property damage
              — which is exactly the gap KarRent protection fills.
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
