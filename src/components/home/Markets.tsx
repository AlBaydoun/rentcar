'use client';

import { motion } from 'framer-motion';
import { Banknote, FileText, Landmark, ShieldCheck, Snowflake, Sun } from 'lucide-react';
import { Badge, Container, SectionHeading } from '@/components/ui';
import { Reveal, Stagger, StaggerItem, TiltCard } from '@/components/motion/primitives';
import { GERMANY, LEBANON, type CountryConfig } from '@/lib/domain/countries';
import { formatMoney, money } from '@/lib/domain/money';
import { cn } from '@/lib/cn';

/**
 * Two markets, side by side.
 *
 * The point of this section is that "supporting two countries" is not a
 * dropdown — it is different tax treatment, different licence law, different
 * insurance regimes and different money rails, all of which the platform
 * actually models.
 */

interface MarketCardProps {
  country: CountryConfig;
  accent: 'steel' | 'cedar';
  peakLabel: string;
  peakIcon: typeof Sun;
  notes: { icon: typeof ShieldCheck; label: string; value: string }[];
}

const CARDS: MarketCardProps[] = [
  {
    country: GERMANY,
    accent: 'steel',
    peakLabel: 'Winter tyres, legally',
    peakIcon: Snowflake,
    notes: [
      {
        icon: ShieldCheck,
        label: 'Statutory cover',
        value: 'Kfz-Haftpflichtversicherung travels with the vehicle — every trip is liability-insured before KarRent protection is added.',
      },
      {
        icon: FileText,
        label: 'Licences',
        value: 'EU/EEA licences accepted outright. Non-EU licences need an International Driving Permit, and residents must convert within six months (§ 29 FeV).',
      },
      {
        icon: Landmark,
        label: 'Tax',
        value: 'Private owners charge no VAT on the rental; 19% Umsatzsteuer applies to the KarRent fee. Registered businesses charge it on the rental too.',
      },
      {
        icon: Banknote,
        label: 'Payouts',
        value: 'SEPA credit transfer, no fee, 1–2 business days after the trip ends.',
      },
    ],
  },
  {
    country: LEBANON,
    accent: 'cedar',
    peakLabel: 'Diaspora summer',
    peakIcon: Sun,
    notes: [
      {
        icon: ShieldCheck,
        label: 'Statutory cover',
        value: 'Lebanese law mandates third-party bodily-injury cover only. Property damage is not in the statutory policy, so KarRent protection carries it.',
      },
      {
        icon: FileText,
        label: 'Licences',
        value: 'Visitors drive on a home licence plus an International Driving Permit for up to three months. GCC licences are accepted without one.',
      },
      {
        icon: Landmark,
        label: 'Tax',
        value: '11% VAT on platform fees. Prices are quoted and settled in fresh US dollars, with lira shown for reference at the official peg.',
      },
      {
        icon: Banknote,
        label: 'Payouts',
        value: 'Whish Money within the hour, OMT cash pickup the same day, or a Lebanese bank transfer.',
      },
    ],
  },
];

function MarketCard({ card, index }: { card: MarketCardProps; index: number }) {
  const { country, accent } = card;
  const PeakIcon = card.peakIcon;
  const accentClasses = {
    steel: {
      glow: 'from-steel-500/20',
      text: 'text-steel-400',
      border: 'group-hover:border-steel-500/30',
      dot: 'bg-steel-400',
    },
    cedar: {
      glow: 'from-cedar-500/20',
      text: 'text-cedar-400',
      border: 'group-hover:border-cedar-500/30',
      dot: 'bg-cedar-400',
    },
  }[accent];

  return (
    <TiltCard max={4} className="group h-full">
      <div
        className={cn(
          'panel panel-lit relative h-full overflow-hidden rounded-xl p-7 transition-colors sm:p-9',
          accentClasses.border,
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-b to-transparent opacity-60 blur-3xl transition-opacity group-hover:opacity-100',
            accentClasses.glow,
          )}
          aria-hidden
        />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                {country.flag}
              </span>
              <div>
                <h3 className="display text-2xl text-chalk">{country.name}</h3>
                <p className="text-[13px] text-slate-dim">{country.nativeName}</p>
              </div>
            </div>
          </div>
          <Badge tone={accent}>
            <span className={cn('h-1.5 w-1.5 rounded-full', accentClasses.dot)} />
            {country.currency}
          </Badge>
        </div>

        <div className="relative mt-7 grid grid-cols-3 gap-3">
          {[
            { label: 'Commission', value: `${Math.round(country.ownerCommissionRate * 100)}%` },
            { label: 'Service fee', value: `${Math.round(country.renterServiceFeeRate * 100)}%` },
            { label: country.vatName, value: `${Math.round(country.vatRate * 100)}%` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-md border border-white/[0.07] bg-ink-950/40 p-3">
              <p className={cn('numeric text-lg font-bold', accentClasses.text)}>{stat.value}</p>
              <p className="mt-1 text-[10.5px] uppercase tracking-wider text-slate-dim">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="relative mt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-mist">
            <PeakIcon size={11} className={accentClasses.text} />
            {card.peakLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-mist">
            Min age <span className="numeric text-chalk">{country.minDriverAge}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-mist">
            Deposit from{' '}
            <span className="numeric text-chalk">
              {formatMoney(money(country.depositMin, country.currency), { compact: true })}
            </span>
          </span>
        </div>

        <div className="hairline-x my-7" />

        <ul className="relative space-y-5">
          {card.notes.map((note, noteIndex) => {
            const NoteIcon = note.icon;
            return (
              <motion.li
                key={note.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ delay: index * 0.08 + noteIndex * 0.06, duration: 0.5 }}
                className="flex gap-3.5"
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border border-white/10 bg-white/[0.04]">
                  <NoteIcon size={13} className={accentClasses.text} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-chalk">{note.label}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-mist">{note.value}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>

        <div className="relative mt-7 rounded-md border border-white/[0.07] bg-ink-950/40 p-4">
          <p className="text-[10.5px] uppercase tracking-[0.18em] text-slate-dim">Seasonality</p>
          <div className="mt-3 flex h-8 items-end gap-[3px]">
            {Array.from({ length: 12 }, (_, month) => {
              const sample = new Date(Date.UTC(2026, month, 15));
              const multiplier = country.seasons.find((season) => {
                const value = (month + 1) * 100 + 15;
                const from = season.fromMonth * 100 + season.fromDay;
                const to = season.toMonth * 100 + season.toDay;
                return from <= to ? value >= from && value <= to : value >= from || value <= to;
              })?.multiplier ?? 1;
              return (
                <motion.div
                  key={month}
                  initial={{ height: 4 }}
                  whileInView={{ height: `${Math.max(14, (multiplier - 0.7) * 100)}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + month * 0.035, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  title={`${sample.toLocaleString('en', { month: 'long' })} — ×${multiplier}`}
                  className={cn(
                    'flex-1 rounded-t-[2px]',
                    multiplier > 1.1
                      ? 'bg-amber-500/80'
                      : multiplier < 1
                        ? 'bg-white/15'
                        : 'bg-white/30',
                  )}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[9.5px] uppercase tracking-wider text-slate-dim">
            <span>Jan</span>
            <span>Jun</span>
            <span>Dec</span>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}

export function Markets() {
  return (
    <section className="relative py-28 sm:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Two markets, properly"
            title={
              <>
                Germany and Lebanon are not
                <br />
                <span className="amber-gradient">the same product</span>
              </>
            }
            description="Different tax treatment, different licence law, different insurance regimes, different ways money physically moves. Each one is modelled rather than approximated."
          />
        </Reveal>

        <Stagger className="mt-14 grid gap-6 lg:grid-cols-2">
          {CARDS.map((card, index) => (
            <StaggerItem key={card.country.code}>
              <MarketCard card={card} index={index} />
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
