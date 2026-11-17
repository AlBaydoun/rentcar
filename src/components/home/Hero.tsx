'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, CalendarDays, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { HeroScene } from '@/components/three/HeroScene';
import { Badge, Container } from '@/components/ui';
import { Magnetic, SplitText } from '@/components/motion/primitives';
import { GERMANY, LEBANON } from '@/lib/domain/countries';
import { cn } from '@/lib/cn';

const MARKETS = [
  { config: GERMANY, accent: 'steel' as const, style: 'SEDAN' as const, colour: '#8fb0ff' },
  { config: LEBANON, accent: 'cedar' as const, style: 'SUV' as const, colour: '#4ee0a5' },
];

function isoDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function Hero() {
  const router = useRouter();
  const [marketIndex, setMarketIndex] = useState(0);
  const [city, setCity] = useState('');
  const [from, setFrom] = useState(isoDate(7));
  const [to, setTo] = useState(isoDate(11));

  const market = MARKETS[marketIndex];
  const { scrollY } = useScroll();
  // The scene sinks and fades slightly as the reader scrolls into the page.
  const sceneY = useTransform(scrollY, [0, 700], [0, 110]);
  const sceneOpacity = useTransform(scrollY, [0, 520], [1, 0.25]);
  const copyY = useTransform(scrollY, [0, 700], [0, -40]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams({
      country: market.config.code,
      from,
      to,
    });
    if (city) params.set('city', city);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pt-32 pb-24 sm:pt-36">
      {/* 3D stage */}
      <motion.div
        style={{
          y: sceneY,
          opacity: sceneOpacity,
          maskImage:
            'radial-gradient(72% 68% at 50% 50%, #000 20%, rgba(0,0,0,0.5) 44%, transparent 62%)',
          WebkitMaskImage:
            'radial-gradient(72% 68% at 50% 50%, #000 20%, rgba(0,0,0,0.5) 44%, transparent 62%)',
        }}
        className="pointer-events-none absolute bottom-0 left-1/2 h-[46svh] w-[125%] -translate-x-1/2 lg:left-auto lg:right-[-6%] lg:top-1/2 lg:h-[86svh] lg:w-[62%] lg:-translate-x-0 lg:-translate-y-1/2"
      >
        <HeroScene
          bodyStyle={market.style}
          colour={market.colour}
          className="h-full w-full"
        />
      </motion.div>

      {/* Vignette so type stays legible over the scene */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(8,10,14,0.96)_2%,transparent_38%)] lg:bg-[linear-gradient(to_right,rgba(8,10,14,0.94)_18%,transparent_62%)]"
        aria-hidden
      />

      <Container className="relative">
        <motion.div style={{ y: copyY }} className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <Badge tone="amber" className="backdrop-blur">
              <Sparkles size={12} />
              Live in Germany and Lebanon
            </Badge>
          </motion.div>

          {/*
            Emphasis sits on the three words that are the whole proposition —
            not on half the headline, which just reads as decoration.
          */}
          <h1 className="display mt-6 max-w-[14ch] text-[clamp(2.4rem,5vw,4rem)]">
            <SplitText text="Rent a car from someone who" />{' '}
            <SplitText text="owns one." delay={0.3} wordClassName="text-amber-400" />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 max-w-xl text-[16px] leading-relaxed text-mist"
          >
            Owners set their own price and decide who drives. Renters verify their documents once,
            then book anywhere. No counter, no queue, no upsell.
          </motion.p>

          {/* Market switch */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.62 }}
            className="mt-8 inline-flex rounded-xs border border-white/10 bg-ink-900/70 p-1 backdrop-blur"
            role="tablist"
            aria-label="Choose a market"
          >
            {MARKETS.map((entry, index) => (
              <button
                key={entry.config.code}
                type="button"
                role="tab"
                aria-selected={marketIndex === index}
                onClick={() => setMarketIndex(index)}
                className={cn(
                  'relative rounded-[10px] px-4 py-2 text-[13px] font-medium transition-colors',
                  marketIndex === index ? 'text-ink-950' : 'text-mist hover:text-chalk',
                )}
              >
                {marketIndex === index && (
                  <motion.span
                    layoutId="market-pill"
                    className="absolute inset-0 rounded-[10px] bg-amber-500"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <span aria-hidden>{entry.config.flag}</span>
                  {entry.config.name}
                </span>
              </button>
            ))}
          </motion.div>

          {/* Search */}
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="surface mt-5 grid gap-2 rounded-lg p-2 sm:grid-cols-[1.3fr_1fr_1fr_auto]"
          >
            <label className="flex items-center gap-2.5 rounded-xs px-3 py-2.5 transition-colors focus-within:bg-white/[0.05]">
              <MapPin size={15} className="shrink-0 text-amber-400" />
              <span className="sr-only">City</span>
              <input
                list="hero-cities"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="City or airport"
                className="w-full bg-transparent text-sm text-chalk placeholder:text-slate-dim focus:outline-none"
              />
              <datalist id="hero-cities">
                {market.config.cities.map((entry) => (
                  <option key={entry.name} value={entry.name} />
                ))}
              </datalist>
            </label>

            <label className="flex items-center gap-2.5 rounded-xs px-3 py-2.5 transition-colors focus-within:bg-white/[0.05]">
              <CalendarDays size={15} className="shrink-0 text-amber-400" />
              <span className="sr-only">Pickup date</span>
              <input
                type="date"
                value={from}
                min={isoDate(0)}
                onChange={(event) => setFrom(event.target.value)}
                className="numeric w-full bg-transparent text-sm text-chalk focus:outline-none [color-scheme:dark]"
              />
            </label>

            <label className="flex items-center gap-2.5 rounded-xs px-3 py-2.5 transition-colors focus-within:bg-white/[0.05]">
              <CalendarDays size={15} className="shrink-0 text-slate-dim" />
              <span className="sr-only">Return date</span>
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => setTo(event.target.value)}
                className="numeric w-full bg-transparent text-sm text-chalk focus:outline-none [color-scheme:dark]"
              />
            </label>

            <Magnetic>
              <button
                type="submit"
                className="group flex h-full w-full items-center justify-center gap-2 rounded-xs bg-amber-500 px-6 py-3 text-sm font-semibold text-ink-950 shadow-[0_1px_0_0_oklch(1 0 0 / 0.4)_inset,0_12px_32px_-12px_rgba(255,166,43,0.8)] transition-[filter,transform] hover:brightness-110"
              >
                Search
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </Magnetic>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.95 }}
            className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] text-slate-dim"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-cedar-400" />
              {market.config.mandatoryLiability.nativeName} included by law
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="numeric text-chalk">
                {Math.round(market.config.ownerCommissionRate * 100)}%
              </span>
              commission — no listing fee
            </span>
            <span className="inline-flex items-center gap-1.5">
              Priced in <span className="numeric text-chalk">{market.config.currency}</span>
            </span>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
