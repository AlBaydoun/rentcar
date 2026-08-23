'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Fuel, Gauge, Star, Users, Zap } from 'lucide-react';
import { Badge } from '@/components/ui';
import { CarSilhouette } from './CarSilhouette';
import { bodyStyleForCategory } from '@/lib/body-style';
import { formatMoney, money } from '@/lib/domain/money';
import type { Currency } from '@/lib/domain/types';
import { paintHex } from '@/lib/paint';

export interface CarCardData {
  id: string;
  make: string;
  model: string;
  variant?: string | null;
  year: number;
  category: string;
  transmission: string;
  fuelType: string;
  seats: number;
  colour: string;
  city: string;
  country: string;
  currency: Currency;
  dailyRate: number;
  rating: number | null;
  ratingCount: number;
  tripCount: number;
  instantBook: boolean;
}

export function CarCard({
  car,
  index = 0,
  href,
  compact = false,
}: {
  car: CarCardData;
  index?: number;
  href?: string;
  compact?: boolean;
}) {
  const hex = paintHex(car.colour);
  const style = bodyStyleForCategory(car.category);
  const electric = car.fuelType === 'ELECTRIC';

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8%' }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <Link
        href={href ?? `/cars/${car.id}`}
        className="panel panel-lit group relative flex h-full flex-col overflow-hidden rounded-lg transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-white/20"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-b from-white/[0.05] to-transparent">
          <div
            className="absolute inset-0 opacity-45 transition-opacity duration-500 group-hover:opacity-70"
            style={{ background: `radial-gradient(60% 60% at 50% 65%, ${hex}33, transparent 70%)` }}
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center justify-center p-6 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]">
            <CarSilhouette bodyStyle={style} colour={hex} />
          </div>

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge tone={car.country === 'DE' ? 'steel' : 'cedar'}>
              {car.country === 'DE' ? '🇩🇪' : '🇱🇧'} {car.city}
            </Badge>
            {electric && (
              <Badge tone="cedar">
                <Zap size={10} /> Electric
              </Badge>
            )}
          </div>

          {car.rating !== null && car.ratingCount > 0 && (
            <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-950/70 px-2.5 py-1 text-[11px] backdrop-blur">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              <span className="numeric font-medium text-chalk">{car.rating.toFixed(1)}</span>
              <span className="text-slate-dim">({car.ratingCount})</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-chalk">
                {car.make} {car.model}
              </h3>
              <p className="mt-0.5 truncate text-[12.5px] text-slate-dim">
                {car.variant ? `${car.variant} · ` : ''}
                {car.year}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="numeric text-[17px] font-bold leading-none text-chalk">
                {formatMoney(money(car.dailyRate, car.currency), { compact: true })}
              </p>
              <p className="mt-1 text-[11px] text-slate-dim">per day</p>
            </div>
          </div>

          {!compact && (
            <div className="mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[11.5px] text-mist">
              <span className="inline-flex items-center gap-1.5">
                <Users size={12} className="text-slate-dim" />
                {car.seats}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Gauge size={12} className="text-slate-dim" />
                {car.transmission === 'AUTOMATIC' ? 'Automatic' : 'Manual'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Fuel size={12} className="text-slate-dim" />
                {car.fuelType.charAt(0) + car.fuelType.slice(1).toLowerCase().replace('_', ' ')}
              </span>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <span className="text-[11.5px] text-slate-dim">
              {car.tripCount > 0 ? `${car.tripCount} trips` : 'New listing'}
            </span>
            <span className="text-[11.5px] font-medium text-mist transition-colors group-hover:text-amber-400">
              View →
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
