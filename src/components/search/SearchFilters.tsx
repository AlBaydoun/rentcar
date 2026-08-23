'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { Badge, Button, Select } from '@/components/ui';
import { VEHICLE_CATEGORIES } from '@/lib/domain/types';
import { formatMoney, money } from '@/lib/domain/money';
import { cn } from '@/lib/cn';

const CATEGORY_LABELS: Record<string, string> = {
  CITY: 'City',
  ECONOMY: 'Economy',
  COMPACT: 'Compact',
  SEDAN: 'Saloon',
  ESTATE: 'Estate',
  SUV: 'SUV',
  VAN: 'Van',
  PICKUP: 'Pickup',
  LUXURY: 'Luxury',
  SPORTS: 'Sports',
  CONVERTIBLE: 'Convertible',
  ELECTRIC: 'Electric',
};

export function SearchFilters({
  facets,
  currency,
}: {
  facets: {
    cities: { name: string; count: number }[];
    categories: { name: string; count: number }[];
    priceRange: { min: number; max: number } | null;
  };
  currency: 'EUR' | 'USD';
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      router.push(`/search?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const active = ['city', 'category', 'transmission', 'fuelType', 'seats', 'maxPrice', 'instantBook']
    .filter((key) => params.get(key));

  const clearAll = () => {
    const next = new URLSearchParams();
    for (const key of ['country', 'from', 'to']) {
      const value = params.get(key);
      if (value) next.set(key, value);
    }
    router.push(`/search?${next.toString()}`, { scroll: false });
  };

  const body = (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-dim">Market</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { code: 'DE', label: '🇩🇪 Germany' },
            { code: 'LB', label: '🇱🇧 Lebanon' },
          ].map((entry) => {
            const selected = params.get('country') === entry.code;
            return (
              <button
                key={entry.code}
                type="button"
                onClick={() => setParam('country', selected ? null : entry.code)}
                className={cn(
                  'rounded-xs border px-3 py-2.5 text-[12.5px] font-medium transition-colors',
                  selected
                    ? 'border-amber-500/50 bg-amber-500/12 text-amber-400'
                    : 'border-white/10 text-mist hover:border-white/25 hover:text-chalk',
                )}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-dim">City</p>
        <Select
          value={params.get('city') ?? ''}
          onChange={(event) => setParam('city', event.target.value || null)}
        >
          <option value="">Anywhere</option>
          {facets.cities.map((city) => (
            <option key={city.name} value={city.name}>
              {city.name} ({city.count})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-dim">Type</p>
        <div className="flex flex-wrap gap-1.5">
          {VEHICLE_CATEGORIES.filter((category) =>
            facets.categories.some((entry) => entry.name === category),
          ).map((category) => {
            const selected = params.get('category') === category;
            const count = facets.categories.find((entry) => entry.name === category)?.count ?? 0;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setParam('category', selected ? null : category)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[12px] transition-colors',
                  selected
                    ? 'border-amber-500/50 bg-amber-500/12 text-amber-400'
                    : 'border-white/10 text-mist hover:border-white/25 hover:text-chalk',
                )}
              >
                {CATEGORY_LABELS[category] ?? category}
                <span className="ml-1.5 text-slate-dim">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-dim">Gearbox</p>
          <Select
            value={params.get('transmission') ?? ''}
            onChange={(event) => setParam('transmission', event.target.value || null)}
          >
            <option value="">Any</option>
            <option value="AUTOMATIC">Automatic</option>
            <option value="MANUAL">Manual</option>
          </Select>
        </div>
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-dim">Fuel</p>
          <Select
            value={params.get('fuelType') ?? ''}
            onChange={(event) => setParam('fuelType', event.target.value || null)}
          >
            <option value="">Any</option>
            <option value="PETROL">Petrol</option>
            <option value="DIESEL">Diesel</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ELECTRIC">Electric</option>
          </Select>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-dim">Seats</p>
        <div className="flex gap-1.5">
          {[2, 4, 5, 7].map((seats) => {
            const selected = params.get('seats') === String(seats);
            return (
              <button
                key={seats}
                type="button"
                onClick={() => setParam('seats', selected ? null : String(seats))}
                className={cn(
                  'flex-1 rounded-xs border py-2 text-[12.5px] transition-colors',
                  selected
                    ? 'border-amber-500/50 bg-amber-500/12 text-amber-400'
                    : 'border-white/10 text-mist hover:border-white/25 hover:text-chalk',
                )}
              >
                {seats}+
              </button>
            );
          })}
        </div>
      </div>

      {facets.priceRange ? (
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-dim">Max per day</p>
            <span className="numeric text-[13px] text-chalk">
              {formatMoney(
                money(Number(params.get('maxPrice') ?? facets.priceRange.max), currency),
                { compact: true },
              )}
            </span>
          </div>
          <input
            type="range"
            min={facets.priceRange.min}
            max={facets.priceRange.max}
            step={500}
            defaultValue={params.get('maxPrice') ?? facets.priceRange.max}
            onMouseUp={(event) => setParam('maxPrice', (event.target as HTMLInputElement).value)}
            onTouchEnd={(event) => setParam('maxPrice', (event.target as HTMLInputElement).value)}
            className="w-full accent-amber-500"
          />
        </div>
      ) : null}

      {active.length > 0 ? (
        <Button variant="ghost" size="sm" onClick={clearAll} className="w-full">
          <X size={14} />
          Clear {active.length} {active.length === 1 ? 'filter' : 'filters'}
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <div className="lg:hidden">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="w-full">
          <SlidersHorizontal size={14} />
          Filters
          {active.length > 0 ? <Badge tone="amber">{active.length}</Badge> : null}
        </Button>
      </div>

      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-ink-950/95 p-6 backdrop-blur-xl lg:hidden"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="display text-xl text-chalk">Filters</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-xs text-mist hover:bg-white/[0.06]"
              aria-label="Close filters"
            >
              <X size={18} />
            </button>
          </div>
          {body}
          <Button size="lg" className="mt-8 w-full" onClick={() => setOpen(false)}>
            Show results
          </Button>
        </motion.div>
      ) : null}

      <aside className="hidden lg:block">
        <div className="panel sticky top-24 rounded-lg p-6">{body}</div>
      </aside>
    </>
  );
}
