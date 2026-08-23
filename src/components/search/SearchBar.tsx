'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { CalendarDays, MapPin, Search } from 'lucide-react';
import { Select } from '@/components/ui';
import { GERMANY, LEBANON } from '@/lib/domain/countries';

/** Compact date/place bar that sits above the results. */
export function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();

  const [city, setCity] = useState(params.get('city') ?? '');
  const [from, setFrom] = useState(params.get('from') ?? '');
  const [to, setTo] = useState(params.get('to') ?? '');

  const country = params.get('country');
  const cities = [
    ...(country !== 'LB' ? GERMANY.cities : []),
    ...(country !== 'DE' ? LEBANON.cities : []),
  ];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of [
      ['city', city],
      ['from', from],
      ['to', to],
    ] as const) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`/search?${next.toString()}`, { scroll: false });
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      onSubmit={submit}
      className="panel panel-lit grid gap-2 rounded-lg p-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]"
    >
      <label className="flex items-center gap-2.5 rounded-xs px-3 py-2.5 focus-within:bg-white/[0.05]">
        <MapPin size={15} className="shrink-0 text-amber-400" />
        <span className="sr-only">City</span>
        <input
          list="search-cities"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Anywhere"
          className="w-full bg-transparent text-sm text-chalk placeholder:text-slate-dim focus:outline-none"
        />
        <datalist id="search-cities">
          {cities.map((entry) => (
            <option key={entry.name} value={entry.name} />
          ))}
        </datalist>
      </label>

      <label className="flex items-center gap-2.5 rounded-xs px-3 py-2.5 focus-within:bg-white/[0.05]">
        <CalendarDays size={15} className="shrink-0 text-amber-400" />
        <span className="sr-only">Pickup</span>
        <input
          type="date"
          value={from}
          min={today}
          onChange={(event) => setFrom(event.target.value)}
          className="numeric w-full bg-transparent text-sm text-chalk focus:outline-none [color-scheme:dark]"
        />
      </label>

      <label className="flex items-center gap-2.5 rounded-xs px-3 py-2.5 focus-within:bg-white/[0.05]">
        <CalendarDays size={15} className="shrink-0 text-slate-dim" />
        <span className="sr-only">Return</span>
        <input
          type="date"
          value={to}
          min={from || today}
          onChange={(event) => setTo(event.target.value)}
          className="numeric w-full bg-transparent text-sm text-chalk focus:outline-none [color-scheme:dark]"
        />
      </label>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-xs bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-3 text-sm font-semibold text-ink-950 transition-[filter] hover:brightness-110"
      >
        <Search size={15} />
        Search
      </button>
    </form>
  );
}
