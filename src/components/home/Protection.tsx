'use client';

import { Check, Minus } from 'lucide-react';
import { Container, SectionHeading } from '@/components/ui';
import { Reveal } from '@/components/motion/primitives';
import { INSURANCE_TIER_SPECS, quoteInsurance } from '@/lib/domain/insurance';
import { GERMANY } from '@/lib/domain/countries';
import { formatMoney, money } from '@/lib/domain/money';
import type { InsuranceTier } from '@/lib/domain/types';
import { cn } from '@/lib/cn';

/**
 * Protection tiers.
 *
 * Choosing a tier is a comparison across identical dimensions, so this is a
 * comparison table rather than three cards — three cards force the reader to
 * hold each column in their head and leave the shortest tier sitting in a
 * void. Every figure comes from the real `quoteInsurance` function against a
 * representative car, so the page cannot drift from what checkout charges.
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

/** Which tier each line of cover first appears on. */
const COVERAGE: { label: string; from: InsuranceTier; note?: string }[] = [
  { label: 'Third-party liability', from: 'BASIC', note: 'Always in force — required by law' },
  { label: 'Damage to the vehicle above your excess', from: 'BASIC' },
  { label: 'Total loss above your excess', from: 'BASIC' },
  { label: 'Glass, tyres, wheels and undercarriage', from: 'PLUS' },
  { label: 'Theft and attempted theft', from: 'PLUS' },
  { label: 'Roadside assistance and recovery', from: 'PLUS', note: '24/7' },
  { label: 'Replacement key cover', from: 'PLUS' },
  { label: 'Personal accident cover', from: 'MAX', note: 'Driver and passengers' },
  { label: 'Loss-of-use paid to the owner', from: 'MAX' },
  { label: 'Misfuelling and lost-key recovery', from: 'MAX' },
];

const RANK: Record<InsuranceTier, number> = { BASIC: 0, PLUS: 1, MAX: 2 };

export function Protection() {
  const quotes = Object.fromEntries(
    TIERS.map((tier) => [tier, quoteInsurance({ ...SAMPLE, tier })]),
  ) as Record<InsuranceTier, ReturnType<typeof quoteInsurance>>;

  /** The highlighted column gets a continuous tint down the whole table. */
  const columnTint = (tier: InsuranceTier) =>
    tier === 'PLUS' ? 'bg-amber-500/[0.055]' : undefined;

  return (
    <section id="protection" className="relative py-24 sm:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            title="Three tiers, one honest number: what you still owe if it goes wrong"
            description="Statutory liability cover always travels with the car. What you choose here is how much of the vehicle's own repair bill stays with you — the excess."
          />
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
              <caption className="sr-only">
                KarRent protection tiers compared on a €48 per day compact car over four days
              </caption>

              <thead>
                <tr>
                  <th scope="col" className="w-[42%] pb-5 align-bottom">
                    <span className="record text-[11px] text-slate-dim">
                      On a €48/day compact, 4 days
                    </span>
                  </th>
                  {TIERS.map((tier) => {
                    const spec = INSURANCE_TIER_SPECS[tier];
                    const quote = quotes[tier];
                    return (
                      <th
                        key={tier}
                        scope="col"
                        className={cn(
                          'w-[19.33%] rounded-t-lg px-4 pb-5 pt-5 align-bottom',
                          columnTint(tier),
                        )}
                      >
                        <span className="flex items-baseline gap-2">
                          <span className="display display-tight text-lg text-chalk">
                            {spec.name}
                          </span>
                          {tier === 'PLUS' ? (
                            <span className="record text-[10px] text-amber-400">most chosen</span>
                          ) : null}
                        </span>
                        <span className="numeric mt-2 block text-[22px] font-bold leading-none text-chalk">
                          {quote.dailyPremium.amount === 0
                            ? 'Included'
                            : formatMoney(quote.dailyPremium)}
                        </span>
                        <span className="mt-1.5 block text-[11.5px] font-normal text-slate-dim">
                          {quote.dailyPremium.amount === 0 ? 'in every booking' : 'per day'}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {/* The two figures that actually decide the choice. */}
                <tr>
                  <th
                    scope="row"
                    className="border-t border-[var(--hairline-strong)] py-4 pr-6 align-top text-[13.5px] font-medium text-chalk"
                  >
                    Your excess
                    <span className="mt-1 block text-[12px] font-normal leading-snug text-slate-dim">
                      The most you pay toward repairs, whatever the bill comes to
                    </span>
                  </th>
                  {TIERS.map((tier) => (
                    <td
                      key={tier}
                      className={cn(
                        'border-t border-[var(--hairline-strong)] px-4 py-4 align-top',
                        columnTint(tier),
                      )}
                    >
                      <span
                        className={cn(
                          'numeric text-[17px] font-bold',
                          quotes[tier].excess.amount === 0 ? 'text-cedar-400' : 'text-chalk',
                        )}
                      >
                        {quotes[tier].excess.amount === 0
                          ? 'Zero'
                          : formatMoney(quotes[tier].excess)}
                      </span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <th
                    scope="row"
                    className="border-t border-[var(--hairline)] py-4 pr-6 align-top text-[13.5px] font-medium text-chalk"
                  >
                    Deposit held
                    <span className="mt-1 block text-[12px] font-normal leading-snug text-slate-dim">
                      Scaled against the car&rsquo;s base deposit
                    </span>
                  </th>
                  {TIERS.map((tier) => (
                    <td
                      key={tier}
                      className={cn(
                        'border-t border-[var(--hairline)] px-4 py-4 align-top',
                        columnTint(tier),
                      )}
                    >
                      <span className="numeric text-[15px] text-mist">
                        ×{INSURANCE_TIER_SPECS[tier].depositMultiplier.toFixed(2)}
                      </span>
                    </td>
                  ))}
                </tr>

                {COVERAGE.map((row, index) => (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      className={cn(
                        'py-3 pr-6 align-top text-[13px] font-normal text-mist',
                        index === 0
                          ? 'border-t border-[var(--hairline-strong)]'
                          : 'border-t border-[var(--hairline)]',
                      )}
                    >
                      {row.label}
                      {row.note ? (
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-dim">
                          {row.note}
                        </span>
                      ) : null}
                    </th>
                    {TIERS.map((tier) => {
                      const included = RANK[tier] >= RANK[row.from];
                      return (
                        <td
                          key={tier}
                          className={cn(
                            'px-4 py-3 align-top',
                            index === COVERAGE.length - 1 && 'rounded-b-lg pb-5',
                            index === 0
                              ? 'border-t border-[var(--hairline-strong)]'
                              : 'border-t border-[var(--hairline)]',
                            columnTint(tier),
                          )}
                        >
                          {included ? (
                            <>
                              <Check size={15} className="text-cedar-400" aria-hidden />
                              <span className="sr-only">Included in {tier}</span>
                            </>
                          ) : (
                            <>
                              <Minus size={15} className="text-ink-700" aria-hidden />
                              <span className="sr-only">Not included in {tier}</span>
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="prose-measure mt-10 text-[14px] leading-relaxed text-mist">
            <span className="text-chalk">Statutory liability is never something you buy here.</span>{' '}
            In Germany, Kfz-Haftpflichtversicherung is compulsory and follows the vehicle. In
            Lebanon, the mandatory policy covers third-party bodily injury but not property damage —
            which is exactly the gap KarRent protection fills.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
