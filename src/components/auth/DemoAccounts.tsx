'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Badge } from '@/components/ui';

/**
 * Seeded accounts, surfaced so the platform can be explored without going
 * through document verification first.
 */
const ACCOUNTS = [
  { email: 'lukas@example.de', role: 'Owner · Germany', note: '41 trips hosted, requests waiting' },
  { email: 'karim@example.lb', role: 'Owner · Lebanon', note: '88 trips hosted, requests waiting' },
  { email: 'amira@example.com', role: 'Renter · Germany', note: 'Verified, 12 completed trips' },
  { email: 'omar@example.lb', role: 'Renter · Lebanon', note: 'Verified, 19 completed trips' },
  { email: 'admin@karrent.app', role: 'Operations', note: 'Document review queue' },
];

const PASSWORD = 'karrent2026';

export function DemoAccounts() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard access can be denied; the value is on screen either way.
    }
  };

  return (
    <div className="w-full max-w-md">
      <Badge tone="amber">Seeded accounts</Badge>
      <h2 className="display mt-5 text-2xl text-chalk">Try it as someone else</h2>
      <p className="mt-3 text-[13.5px] leading-relaxed text-mist">
        Each of these has real history behind it — verified documents, listings, and bookings sitting
        at different points in the lifecycle. Password for all of them is{' '}
        <button
          type="button"
          onClick={() => copy(PASSWORD)}
          className="numeric rounded-[5px] bg-white/[0.08] px-1.5 py-0.5 text-chalk transition-colors hover:bg-white/[0.14]"
        >
          {PASSWORD}
        </button>
        .
      </p>

      <ul className="mt-6 space-y-2">
        {ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => copy(account.email)}
              className="surface group flex w-full items-center justify-between gap-4 rounded-xs px-4 py-3 text-left transition-colors hover:border-white/20"
            >
              <span className="min-w-0">
                <span className="numeric block truncate text-[13px] text-chalk">
                  {account.email}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-slate-dim">
                  {account.role} — {account.note}
                </span>
              </span>
              <span className="shrink-0 text-slate-dim transition-colors group-hover:text-amber-400">
                {copied === account.email ? <Check size={14} /> : <Copy size={14} />}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
