'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Badge, ButtonLink, Container, SectionHeading } from '@/components/ui';
import { Counter, Reveal } from '@/components/motion/primitives';
import { GERMANY, LEBANON } from '@/lib/domain/countries';
import { formatMoney, money, toDecimal } from '@/lib/domain/money';
import { quote, type VehiclePricingProfile } from '@/lib/domain/pricing';
import type { CountryCode, VehicleCategory } from '@/lib/domain/types';
import { cn } from '@/lib/cn';

/**
 * "What could I earn?" — driven by the real pricing engine.
 *
 * Owners are rightly sceptical of marketplace earnings estimates, so this one
 * runs an actual quote and shows the deduction, not just the headline. The
 * number an owner sees here is the number the booking flow would produce.
 */

const CATEGORIES: { value: VehicleCategory; label: string; suggestedDE: number; suggestedLB: number }[] = [
  { value: 'CITY', label: 'City car', suggestedDE: 3000, suggestedLB: 2500 },
  { value: 'COMPACT', label: 'Compact', suggestedDE: 4500, suggestedLB: 3500 },
  { value: 'SEDAN', label: 'Saloon', suggestedDE: 6500, suggestedLB: 5000 },
  { value: 'SUV', label: 'SUV', suggestedDE: 9000, suggestedLB: 6000 },
  { value: 'VAN', label: 'Van', suggestedDE: 12000, suggestedLB: 9000 },
  { value: 'LUXURY', label: 'Luxury', suggestedDE: 18000, suggestedLB: 13000 },
];

export function EarningsCalculator() {
  const [countryCode, setCountryCode] = useState<CountryCode>('DE');
  const [categoryIndex, setCategoryIndex] = useState(1);
  const [daysPerMonth, setDaysPerMonth] = useState(12);

  const country = countryCode === 'DE' ? GERMANY : LEBANON;
  const category = CATEGORIES[categoryIndex];
  const dailyRate = countryCode === 'DE' ? category.suggestedDE : category.suggestedLB;

  const [rate, setRate] = useState<number | null>(null);
  const effectiveRate = rate ?? dailyRate;

  const result = useMemo(() => {
    const profile: VehiclePricingProfile = {
      dailyRate: money(effectiveRate, country.currency),
      category: category.value,
      estimatedValue: money(effectiveRate * 400, country.currency),
      includedKmPerDay: country.defaultIncludedKmPerDay,
      extraKmPrice: country.defaultExtraKmPrice,
      weeklyDiscount: 0.12,
      monthlyDiscount: 0.28,
      cleaningFee: countryCode === 'DE' ? 2000 : 1500,
      deliveryPricePerKm: 0,
      deliveryFreeRadiusKm: 0,
      minRentalDays: 1,
      maxRentalDays: 60,
      baseDeposit: countryCode === 'DE' ? 60_000 : 50_000,
      ownerType: 'PRIVATE',
    };

    // Model the month as three typical bookings rather than one long one, so
    // the cleaning fee and duration discounts behave realistically.
    const perBooking = Math.max(1, Math.round(daysPerMonth / 3));
    const start = new Date();
    start.setUTCHours(10, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() + 14);
    const end = new Date(start.getTime() + perBooking * 86_400_000);

    const priced = quote({
      country,
      vehicle: profile,
      start,
      end,
      insuranceTier: 'PLUS',
      renterAge: 32,
      renterRiskScore: 22,
    });

    const bookings = daysPerMonth / perBooking;
    return {
      priced,
      monthlyGross: money(Math.round(priced.ownerGross.amount * bookings), country.currency),
      monthlyPayout: money(Math.round(priced.ownerPayout.amount * bookings), country.currency),
      monthlyCommission: money(Math.round(priced.ownerCommission.amount * bookings), country.currency),
      annualPayout: money(Math.round(priced.ownerPayout.amount * bookings * 12), country.currency),
      perBooking,
      bookings,
    };
  }, [country, countryCode, category.value, effectiveRate, daysPerMonth]);

  return (
    <section id="earnings" className="relative py-28 sm:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <Reveal>
            <SectionHeading
              title={
                <>
                  Your car is idle <span className="text-amber-400">96%</span> of the time
                </>
              }
              description="Set your own price, block the dates you need it, and approve only the people you want driving it. This calculator runs the real pricing engine — the payout it shows is the payout you would get."
            />

            <div className="mt-8 space-y-6">
              {/* Market */}
              <div>
                <p className="mb-2.5 record text-[11px] text-slate-dim">
                  Market
                </p>
                <div className="inline-flex rounded-xs border border-white/10 bg-ink-900/70 p-1">
                  {(['DE', 'LB'] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setCountryCode(code);
                        setRate(null);
                      }}
                      className={cn(
                        'relative rounded-[10px] px-4 py-2 text-[13px] font-medium transition-colors',
                        countryCode === code ? 'text-ink-950' : 'text-mist hover:text-chalk',
                      )}
                    >
                      {countryCode === code && (
                        <motion.span
                          layoutId="earnings-market"
                          className="absolute inset-0 rounded-[10px] bg-amber-500"
                          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                        />
                      )}
                      <span className="relative">
                        {code === 'DE' ? '🇩🇪 Germany' : '🇱🇧 Lebanon'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="mb-2.5 record text-[11px] text-slate-dim">
                  Your car
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((entry, index) => (
                    <button
                      key={entry.value}
                      type="button"
                      onClick={() => {
                        setCategoryIndex(index);
                        setRate(null);
                      }}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors',
                        categoryIndex === index
                          ? 'border-amber-500/50 bg-amber-500/12 text-amber-400'
                          : 'border-white/10 text-mist hover:border-white/25 hover:text-chalk',
                      )}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily rate */}
              <div>
                <div className="mb-2.5 flex items-baseline justify-between">
                  <label
                    htmlFor="daily-rate"
                    className="record text-[11px] text-slate-dim"
                  >
                    Your daily price
                  </label>
                  <span className="numeric text-sm font-semibold text-chalk">
                    {formatMoney(money(effectiveRate, country.currency))}
                  </span>
                </div>
                <input
                  id="daily-rate"
                  type="range"
                  min={Math.round(dailyRate * 0.5)}
                  max={Math.round(dailyRate * 2)}
                  step={100}
                  value={effectiveRate}
                  onChange={(event) => setRate(Number(event.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Days */}
              <div>
                <div className="mb-2.5 flex items-baseline justify-between">
                  <label
                    htmlFor="days-rented"
                    className="record text-[11px] text-slate-dim"
                  >
                    Days rented per month
                  </label>
                  <span className="numeric text-sm font-semibold text-chalk">{daysPerMonth}</span>
                </div>
                <input
                  id="days-rented"
                  type="range"
                  min={3}
                  max={26}
                  value={daysPerMonth}
                  onChange={(event) => setDaysPerMonth(Number(event.target.value))}
                  className="w-full accent-amber-500"
                />
                <p className="mt-2 text-[11.5px] text-slate-dim">
                  Roughly {result.bookings.toFixed(1)} bookings of {result.perBooking}{' '}
                  {result.perBooking === 1 ? 'day' : 'days'}.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.12} direction="left">
            <div className="surface relative overflow-hidden rounded-xl p-7 sm:p-9">
              <div
                className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-b from-amber-500/20 to-transparent blur-3xl"
                aria-hidden
              />

              <div className="relative flex items-center justify-between">
                <Badge tone="amber">
                  <TrendingUp size={12} />
                  Estimated payout
                </Badge>
                <span className="numeric text-[11px] text-slate-dim">per month</span>
              </div>

              <div className="relative mt-6">
                <Counter
                  to={toDecimal(result.monthlyPayout)}
                  duration={0.9}
                  format={(value) =>
                    formatMoney(
                      money(Math.round(value * 100), country.currency),
                      { compact: true },
                    )
                  }
                  className="numeric block text-[clamp(2.6rem,6vw,3.8rem)] font-bold leading-none text-chalk"
                />
                <p className="mt-3 text-[13px] text-mist">
                  After the {Math.round(country.ownerCommissionRate * 100)}% KarRent commission,
                  paid via {country.payoutMethods[0].replace('_', ' ').toLowerCase()}{' '}
                  {country.payoutDelayDaysAfterTripEnd} days after each trip ends.
                </p>
              </div>

              <div className="hairline-x my-7" />

              <dl className="relative space-y-3.5">
                {[
                  {
                    label: 'Gross rental income',
                    value: formatMoney(result.monthlyGross),
                    tone: 'text-chalk',
                  },
                  {
                    label: `KarRent commission (${Math.round(country.ownerCommissionRate * 100)}%)`,
                    value: `−${formatMoney(result.monthlyCommission)}`,
                    tone: 'text-danger',
                  },
                  {
                    label: 'Listing fee',
                    value: 'None',
                    tone: 'text-cedar-400',
                  },
                  {
                    label: 'Insurance premium taken from you',
                    value: 'None — the renter buys protection',
                    tone: 'text-cedar-400',
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-[13px] text-mist">{row.label}</dt>
                    <dd className={cn('numeric shrink-0 text-[13px] font-medium', row.tone)}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="hairline-x my-7" />

              <div className="relative flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-chalk">Over a year</span>
                <span className="numeric text-xl font-bold text-amber-400">
                  {formatMoney(result.annualPayout, { compact: true })}
                </span>
              </div>

              <p className="relative mt-5 text-[11.5px] leading-relaxed text-slate-dim">
                An estimate, not a promise. Real earnings depend on demand in your city, your
                seasonality, how quickly you answer requests, and how many you approve.
              </p>

              <ButtonLink href="/host" size="lg" className="relative mt-7 w-full">
                List your car
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
