'use client';

import { useActionState, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  Info,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Badge, Button, ButtonLink, Field, Textarea } from '@/components/ui';
import { requestBookingAction, type ActionState } from '@/lib/actions/booking';
import { INSURANCE_TIER_SPECS } from '@/lib/domain/insurance';
import { formatMoney, money } from '@/lib/domain/money';
import type { Currency, ExtraCode, InsuranceTier } from '@/lib/domain/types';
import { cn } from '@/lib/cn';

/**
 * The booking panel.
 *
 * It re-prices through /api/quote on every change rather than doing any
 * arithmetic of its own, so the total on screen is always what the pricing
 * engine produced. Availability, eligibility and the price all arrive in the
 * same response.
 */

interface QuoteLine {
  code: string;
  label: string;
  detail?: string;
  amount: number;
  kind: string;
  payer: string;
}

interface QuoteResponse {
  quote: {
    currency: Currency;
    days: number;
    lines: QuoteLine[];
    renterTotal: number;
    deposit: number;
    insuranceExcess: number;
    averageDailyRate: number;
    includedKm: number | null;
    extraKmPrice: number;
    warnings: string[];
    requirements: string[];
  };
  availability: { available: boolean; conflicts: { code: string; message: string }[] };
  eligibility: {
    eligible: boolean;
    completeness: number;
    issues: { code: string; severity: string; message: string; remedy?: string }[];
    missingDocuments: string[];
  } | null;
  signedIn: boolean;
}

export interface ExtraOption {
  code: ExtraCode;
  label: string;
  description: string;
  billing: 'PER_DAY' | 'PER_BOOKING';
  price: number;
  maxQuantity: number;
}

const initialState: ActionState = { ok: false };

export function BookingPanel({
  vehicleId,
  currency,
  dailyRate,
  minRentalDays,
  cancellationPolicy,
  extras,
  defaultFrom,
  defaultTo,
  signedIn,
}: {
  vehicleId: string;
  currency: Currency;
  dailyRate: number;
  minRentalDays: number;
  cancellationPolicy: string;
  extras: ExtraOption[];
  defaultFrom: string;
  defaultTo: string;
  signedIn: boolean;
}) {
  const [start, setStart] = useState(defaultFrom);
  const [end, setEnd] = useState(defaultTo);
  const [tier, setTier] = useState<InsuranceTier>('PLUS');
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const [data, setData] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [formState, formAction, submitting] = useActionState(requestBookingAction, initialState);

  const extrasPayload = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, quantity]) => quantity > 0)
        .map(([code, quantity]) => ({ code: code as ExtraCode, quantity })),
    [selected],
  );

  useEffect(() => {
    if (!start || !end) return;
    const controller = new AbortController();

    // Debounced so dragging a date field does not fire a request per keystroke.
    const timer = setTimeout(() => {
      startLoading(async () => {
        try {
          const response = await fetch('/api/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              vehicleId,
              start: `${start}T10:00:00.000Z`,
              end: `${end}T10:00:00.000Z`,
              insuranceTier: tier,
              extras: extrasPayload,
            }),
          });
          const payload = await response.json();
          if (!response.ok) {
            setError(payload.error ?? 'Could not price those dates.');
            setData(null);
          } else {
            setError(null);
            setData(payload);
          }
        } catch (caught) {
          if ((caught as Error).name !== 'AbortError') {
            setError('Could not reach the pricing service.');
          }
        }
      });
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [vehicleId, start, end, tier, extrasPayload]);

  const quote = data?.quote;
  const renterLines = quote?.lines.filter((line) => line.payer === 'RENTER') ?? [];
  const blockers = data?.eligibility?.issues.filter((issue) => issue.severity === 'BLOCKER') ?? [];
  const canSubmit =
    Boolean(data?.availability.available) &&
    Boolean(quote) &&
    !error &&
    (!data?.eligibility || data.eligibility.eligible);

  return (
    <div className="panel panel-lit rounded-lg p-6">
      {/* Headline price */}
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <span className="numeric text-[26px] font-bold leading-none text-chalk">
            {formatMoney(money(dailyRate, currency))}
          </span>
          <span className="ml-1.5 text-[13px] text-slate-dim">per day</span>
        </div>
        <Badge tone="neutral">{cancellationPolicy.toLowerCase()} cancellation</Badge>
      </div>

      {/* Dates */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <label className="rounded-xs border border-white/10 bg-ink-900/60 px-3 py-2.5 focus-within:border-amber-500/50">
          <span className="block text-[10.5px] uppercase tracking-wider text-slate-dim">Pickup</span>
          <input
            type="date"
            value={start}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setStart(event.target.value)}
            className="numeric mt-1 w-full bg-transparent text-[13px] text-chalk focus:outline-none [color-scheme:dark]"
          />
        </label>
        <label className="rounded-xs border border-white/10 bg-ink-900/60 px-3 py-2.5 focus-within:border-amber-500/50">
          <span className="block text-[10.5px] uppercase tracking-wider text-slate-dim">Return</span>
          <input
            type="date"
            value={end}
            min={start}
            onChange={(event) => setEnd(event.target.value)}
            className="numeric mt-1 w-full bg-transparent text-[13px] text-chalk focus:outline-none [color-scheme:dark]"
          />
        </label>
      </div>
      {minRentalDays > 1 ? (
        <p className="mt-2 text-[11.5px] text-slate-dim">
          This car has a {minRentalDays}-day minimum.
        </p>
      ) : null}

      {/* Protection */}
      <div className="mt-6">
        <p className="mb-2.5 text-[11px] uppercase tracking-[0.18em] text-slate-dim">Protection</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(['BASIC', 'PLUS', 'MAX'] as InsuranceTier[]).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setTier(entry)}
              className={cn(
                'relative rounded-xs border py-2.5 text-center transition-colors',
                tier === entry
                  ? 'border-amber-500/50 bg-amber-500/12'
                  : 'border-white/10 hover:border-white/25',
              )}
            >
              <span
                className={cn(
                  'block text-[12.5px] font-medium',
                  tier === entry ? 'text-amber-400' : 'text-chalk',
                )}
              >
                {INSURANCE_TIER_SPECS[entry].name}
              </span>
            </button>
          ))}
        </div>
        {quote ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-slate-dim">
            <ShieldCheck size={12} className="text-cedar-400" />
            {quote.insuranceExcess === 0
              ? 'Zero excess — you owe nothing toward repairs.'
              : `Your excess is ${formatMoney(money(quote.insuranceExcess, currency))}.`}
          </p>
        ) : null}
      </div>

      {/* Extras */}
      {extras.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2.5 text-[11px] uppercase tracking-[0.18em] text-slate-dim">Extras</p>
          <div className="space-y-1.5">
            {extras.slice(0, 5).map((extra) => {
              const quantity = selected[extra.code] ?? 0;
              return (
                <label
                  key={extra.code}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xs border border-white/[0.07] px-3 py-2.5 transition-colors hover:border-white/20"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] text-chalk">{extra.label}</span>
                    <span className="numeric block text-[11px] text-slate-dim">
                      {formatMoney(money(extra.price, currency))}
                      {extra.billing === 'PER_DAY' ? ' / day' : ' one-off'}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={quantity > 0}
                    onChange={(event) =>
                      setSelected((previous) => ({
                        ...previous,
                        [extra.code]: event.target.checked ? 1 : 0,
                      }))
                    }
                    className="h-4 w-4 shrink-0 accent-amber-500"
                  />
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Price breakdown */}
      <div className="mt-6 border-t border-white/[0.07] pt-5">
        {loading && !quote ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-slate-dim">
            <Loader2 size={15} className="animate-spin" />
            Pricing your trip…
          </div>
        ) : error ? (
          <div className="flex items-start gap-2.5 rounded-xs border border-warn/25 bg-warn/10 p-3.5 text-[12.5px] text-warn">
            <AlertTriangle size={14} className="mt-px shrink-0" />
            {error}
          </div>
        ) : quote ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={quote.renterTotal}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              <button
                type="button"
                onClick={() => setShowBreakdown((value) => !value)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="text-[13px] text-mist">
                  {quote.days} {quote.days === 1 ? 'day' : 'days'} · all in
                </span>
                <span className="flex items-center gap-1.5 text-[11.5px] text-slate-dim">
                  {showBreakdown ? 'Hide' : 'Show'} breakdown
                  <ChevronDown
                    size={13}
                    className={cn('transition-transform', showBreakdown && 'rotate-180')}
                  />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {showBreakdown ? (
                  <motion.dl
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-4">
                      {renterLines
                        .filter((line) => line.kind !== 'DEPOSIT' && line.kind !== 'INFO')
                        .map((line) => (
                          <div key={line.code} className="flex items-baseline justify-between gap-4">
                            <dt className="min-w-0 text-[12.5px] text-mist">
                              {line.label}
                              {line.detail ? (
                                <span className="mt-0.5 block text-[10.5px] leading-snug text-slate-dim">
                                  {line.detail}
                                </span>
                              ) : null}
                            </dt>
                            <dd
                              className={cn(
                                'numeric shrink-0 text-[12.5px]',
                                line.amount < 0 ? 'text-cedar-400' : 'text-chalk',
                              )}
                            >
                              {formatMoney(money(line.amount, currency))}
                            </dd>
                          </div>
                        ))}
                    </div>
                  </motion.dl>
                ) : null}
              </AnimatePresence>

              <div className="mt-4 flex items-baseline justify-between border-t border-white/[0.07] pt-4">
                <span className="text-[13.5px] font-medium text-chalk">Total</span>
                <span className="numeric text-xl font-bold text-chalk">
                  {formatMoney(money(quote.renterTotal, currency))}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[12px] text-slate-dim">Refundable deposit</span>
                <span className="numeric text-[12px] text-mist">
                  {formatMoney(money(quote.deposit, currency))}
                </span>
              </div>
              {quote.includedKm !== null ? (
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-[12px] text-slate-dim">Included distance</span>
                  <span className="numeric text-[12px] text-mist">{quote.includedKm} km</span>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* Availability conflicts */}
      {data && !data.availability.available ? (
        <div className="mt-4 space-y-2">
          {data.availability.conflicts.map((conflict) => (
            <div
              key={conflict.code}
              className="flex items-start gap-2.5 rounded-xs border border-warn/25 bg-warn/10 p-3 text-[12.5px] text-warn"
            >
              <AlertTriangle size={14} className="mt-px shrink-0" />
              {conflict.message}
            </div>
          ))}
        </div>
      ) : null}

      {/* Eligibility */}
      {blockers.length > 0 ? (
        <div className="mt-4 space-y-2">
          {blockers.slice(0, 3).map((issue) => (
            <div
              key={issue.code}
              className="rounded-xs border border-danger/25 bg-danger/10 p-3 text-[12.5px] text-danger"
            >
              <p>{issue.message}</p>
              {issue.remedy ? (
                <p className="mt-1 text-[11.5px] opacity-80">{issue.remedy}</p>
              ) : null}
            </div>
          ))}
          <Link
            href="/dashboard/verification"
            className="block text-center text-[12.5px] font-medium text-amber-400 hover:underline"
          >
            Complete your verification →
          </Link>
        </div>
      ) : null}

      {quote?.warnings.length ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xs border border-white/10 bg-white/[0.03] p-3 text-[12px] text-mist">
          <Info size={14} className="mt-px shrink-0 text-amber-400" />
          {quote.warnings[0]}
        </div>
      ) : null}

      {/* Submit */}
      {signedIn ? (
        <form action={formAction} className="mt-5">
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <input type="hidden" name="start" value={`${start}T10:00:00.000Z`} />
          <input type="hidden" name="end" value={`${end}T10:00:00.000Z`} />
          <input type="hidden" name="insuranceTier" value={tier} />
          <input type="hidden" name="extras" value={JSON.stringify(extrasPayload)} />

          <Field label="Message to the owner" error={formState.errors?.message}>
            <Textarea
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Where you are going, who is driving, anything they should know. Owners approve faster when they know what the trip is."
              className="min-h-24 text-[13px]"
              maxLength={1200}
            />
          </Field>

          {formState.message ? (
            <p className="mt-3 text-[12.5px] text-danger">{formState.message}</p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="mt-4 w-full"
            disabled={!canSubmit || submitting || loading}
          >
            {submitting ? 'Sending your request…' : 'Request this car'}
          </Button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-slate-dim">
            <Sparkles size={11} className="text-amber-400" />
            You are not charged anything until the owner approves.
          </p>
        </form>
      ) : (
        <div className="mt-5">
          <ButtonLink
            href={`/signin?next=/cars/${vehicleId}`}
            size="lg"
            className="w-full"
          >
            Sign in to request
          </ButtonLink>
          <p className="mt-3 text-center text-[11.5px] text-slate-dim">
            Verification takes a few minutes and covers both countries.
          </p>
        </div>
      )}
    </div>
  );
}
