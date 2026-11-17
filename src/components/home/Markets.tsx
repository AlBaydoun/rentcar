'use client';

import { motion } from 'framer-motion';
import { Container, SectionHeading } from '@/components/ui';
import { Reveal } from '@/components/motion/primitives';
import { GERMANY, LEBANON, type CountryConfig } from '@/lib/domain/countries';
import { formatMoney, money } from '@/lib/domain/money';
import { payoutMethodLabel } from '@/lib/domain/ledger';
import { cn } from '@/lib/cn';

/**
 * The two markets, compared row by row.
 *
 * Supporting two countries is not a dropdown — it is different tax treatment,
 * different licence law, different insurance regimes and different money
 * rails. Laying them against shared row labels is the only way a reader can
 * see that; two side-by-side cards would hide it.
 */

const MARKETS: { config: CountryConfig; accent: 'steel' | 'cedar' }[] = [
  { config: GERMANY, accent: 'steel' },
  { config: LEBANON, accent: 'cedar' },
];

const ACCENT = {
  steel: { text: 'text-steel-400', rule: 'bg-steel-500/50', bar: 'bg-steel-500' },
  cedar: { text: 'text-cedar-400', rule: 'bg-cedar-500/50', bar: 'bg-cedar-500' },
} as const;

function seasonMultiplier(country: CountryConfig, month: number): number {
  const value = (month + 1) * 100 + 15;
  return (
    country.seasons.find((season) => {
      const from = season.fromMonth * 100 + season.fromDay;
      const to = season.toMonth * 100 + season.toDay;
      return from <= to ? value >= from && value <= to : value >= from || value <= to;
    })?.multiplier ?? 1
  );
}

interface Row {
  label: string;
  cell: (country: CountryConfig, accent: 'steel' | 'cedar') => React.ReactNode;
}

const ROWS: Row[] = [
  {
    label: 'Settles in',
    cell: (country, accent) => (
      <>
        <span className={cn('numeric text-[17px] font-bold', ACCENT[accent].text)}>
          {country.currency}
        </span>
        <span className="mt-1.5 block text-[12.5px] leading-relaxed text-mist">
          {country.displayCurrencies.length > 1
            ? 'Priced in fresh dollars; lira shown alongside at the official peg.'
            : 'Single currency throughout.'}
        </span>
      </>
    ),
  },
  {
    label: 'What KarRent takes',
    cell: (country) => (
      <>
        <span className="numeric text-[15px] text-chalk">
          {Math.round(country.ownerCommissionRate * 100)}%
        </span>
        <span className="text-[13px] text-slate-dim"> owner · </span>
        <span className="numeric text-[15px] text-chalk">
          {Math.round(country.renterServiceFeeRate * 100)}%
        </span>
        <span className="text-[13px] text-slate-dim"> renter</span>
        <span className="mt-1.5 block text-[12.5px] leading-relaxed text-mist">
          No listing fee either way.
        </span>
      </>
    ),
  },
  {
    label: 'VAT',
    cell: (country) => (
      <>
        <span className="numeric text-[15px] text-chalk">
          {Math.round(country.vatRate * 100)}%
        </span>
        <span className="mt-1.5 block text-[12.5px] leading-relaxed text-mist">
          {country.vatNativeName}. Private owners charge none on the rental; it applies to the
          KarRent fee. Registered businesses charge it on the rental too.
        </span>
      </>
    ),
  },
  {
    label: 'Statutory cover',
    cell: (country) => (
      <>
        <span className="text-[13.5px] text-chalk">{country.mandatoryLiability.nativeName}</span>
        <span className="mt-1.5 block text-[12.5px] leading-relaxed text-mist">
          {country.mandatoryLiability.note}
        </span>
      </>
    ),
  },
  {
    label: 'Foreign licences',
    cell: (country) => {
      const fallback = country.licenceRules.find((rule) => rule.issuingRegion === '*');
      // What distinguishes the markets is which foreign regions are waved
      // through, not that both ask outsiders for a permit.
      const exempt = country.licenceRules
        .filter(
          (rule) =>
            rule.issuingRegion !== '*' &&
            rule.issuingRegion !== 'DOMESTIC' &&
            !rule.requiresInternationalPermit,
        )
        .map((rule) => rule.issuingRegion.replace('_', '/'));
      return (
        <>
          <span className="text-[13.5px] text-chalk">
            {exempt.length > 0
              ? `${exempt.join(', ')} accepted as issued`
              : 'Every foreign licence needs a permit'}
          </span>
          <span className="mt-1.5 block text-[12.5px] leading-relaxed text-mist">
            {fallback?.note}
          </span>
        </>
      );
    },
  },
  {
    label: 'Getting paid',
    cell: (country) => (
      <>
        <span className="text-[13.5px] text-chalk">
          {country.payoutMethods.map(payoutMethodLabel).join(', ')}
        </span>
        <span className="mt-1.5 block text-[12.5px] leading-relaxed text-mist">
          {country.payoutDelayDaysAfterTripEnd} days after each trip ends.
        </span>
      </>
    ),
  },
  {
    label: 'Deposit band',
    cell: (country) => (
      <>
        <span className="numeric text-[14px] text-chalk">
          {formatMoney(money(country.depositMin, country.currency), { compact: true })} –{' '}
          {formatMoney(money(country.depositMax, country.currency), { compact: true })}
        </span>
        <span className="mt-1.5 block text-[12.5px] leading-relaxed text-mist">
          {country.depositInstrument === 'CARD_PREAUTH'
            ? 'Held on a card.'
            : 'Held on a card or handed over in cash.'}{' '}
          Released after {country.depositReleaseDays} days.
        </span>
      </>
    ),
  },
  {
    label: 'Seasonal duty',
    cell: (country) => (
      <>
        <span className="text-[13.5px] text-chalk">
          {country.seasonalRequirements[0]?.label}
        </span>
        <span className="mt-1.5 block text-[12.5px] leading-relaxed text-mist">
          {country.seasonalRequirements[0]?.legalBasis}
        </span>
      </>
    ),
  },
];

export function Markets() {
  return (
    <section className="relative py-28 sm:py-36">
      <Container>
        <Reveal>
          <SectionHeading
            title={
              <>
                Germany and Lebanon are not{' '}
                <span className="text-amber-400">the same product</span>
              </>
            }
            description="Different tax treatment, different licence law, different insurance regimes, different ways money physically moves. Each one is modelled rather than approximated."
          />
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[620px] border-separate border-spacing-0 text-left align-top">
              <caption className="sr-only">
                Germany and Lebanon compared across the rules that differ
              </caption>

              <thead>
                <tr>
                  <th scope="col" className="w-[22%] pb-5" />
                  {MARKETS.map(({ config, accent }) => (
                    <th key={config.code} scope="col" className="w-[39%] px-5 pb-5 align-bottom">
                      <span className="flex items-baseline gap-2.5">
                        <span className="text-xl" aria-hidden>
                          {config.flag}
                        </span>
                        <span className="display display-tight text-lg text-chalk">
                          {config.name}
                        </span>
                      </span>
                      <span className="record mt-1.5 block text-[11px] font-normal text-slate-dim">
                        {config.nativeName}
                      </span>
                      <span
                        className={cn('mt-4 block h-px w-full', ACCENT[accent].rule)}
                        aria-hidden
                      />
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {ROWS.map((row, index) => (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      className={cn(
                        'py-5 pr-6 align-top text-[12.5px] font-medium text-slate-dim',
                        index > 0 && 'border-t border-[var(--hairline)]',
                      )}
                    >
                      {row.label}
                    </th>
                    {MARKETS.map(({ config, accent }) => (
                      <td
                        key={config.code}
                        className={cn(
                          'px-5 py-5 align-top',
                          index > 0 && 'border-t border-[var(--hairline)]',
                        )}
                      >
                        {row.cell(config, accent)}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Demand through the year, as a shape rather than a sentence. */}
                <tr>
                  <th
                    scope="row"
                    className="border-t border-[var(--hairline)] py-5 pr-6 align-top text-[12.5px] font-medium text-slate-dim"
                  >
                    Demand through the year
                  </th>
                  {MARKETS.map(({ config, accent }) => (
                    <td
                      key={config.code}
                      className="border-t border-[var(--hairline)] px-5 py-5 align-top"
                    >
                      <div className="flex h-12 items-end gap-[3px]" aria-hidden>
                        {Array.from({ length: 12 }, (_, month) => {
                          const multiplier = seasonMultiplier(config, month);
                          return (
                            <motion.span
                              key={month}
                              initial={{ height: 3 }}
                              whileInView={{
                                height: `${Math.max(12, (multiplier - 0.68) * 100)}%`,
                              }}
                              viewport={{ once: true }}
                              transition={{
                                delay: 0.1 + month * 0.03,
                                duration: 0.5,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              className={cn(
                                'flex-1 rounded-[2px]',
                                multiplier > 1.1
                                  ? ACCENT[accent].bar
                                  : multiplier < 1
                                    ? 'bg-ink-750'
                                    : 'bg-ink-700',
                              )}
                            />
                          );
                        })}
                      </div>
                      <p className="record mt-2 flex justify-between text-[10px] text-slate-dim">
                        <span>Jan</span>
                        <span>Jun</span>
                        <span>Dec</span>
                      </p>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-mist">
                        Peaks in{' '}
                        {config.seasons
                          .filter((season) => season.multiplier > 1.1)
                          .map((season) => season.label.toLowerCase())
                          .join(' and ')}
                        .
                      </p>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
