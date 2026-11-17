'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { HAPPY_PATH, STATUS_LABELS, isTerminal, progressIndex } from '@/lib/domain/booking-state-machine';
import type { BookingStatus } from '@/lib/domain/types';
import { cn } from '@/lib/cn';

/** Where this booking sits on the happy path. */
export function BookingTimeline({ status }: { status: string }) {
  const current = status as BookingStatus;
  const index = progressIndex(current);
  const terminated = isTerminal(current) && current !== 'COMPLETED';

  return (
    <div className="surface rounded-lg p-5">
      <ol className="flex items-center gap-1">
        {HAPPY_PATH.map((step, stepIndex) => {
          const done = stepIndex < index;
          const active = stepIndex === index;
          return (
            <li key={step} className="flex flex-1 items-center gap-1">
              <div className="relative flex-1">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: stepIndex * 0.05, duration: 0.4 }}
                  className={cn(
                    'h-1 origin-left rounded-full',
                    terminated
                      ? 'bg-danger/30'
                      : done
                        ? 'bg-cedar-500'
                        : active
                          ? 'bg-amber-500'
                          : 'bg-white/[0.08]',
                  )}
                />
                {active ? (
                  <motion.span
                    layoutId="timeline-dot"
                    className={cn(
                      'absolute -top-[3px] right-0 h-[7px] w-[7px] rounded-full',
                      terminated ? 'bg-danger' : 'bg-amber-400',
                    )}
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <p className="text-[13.5px] font-medium text-chalk">{STATUS_LABELS[current]}</p>
        <p className="numeric text-[11px] text-slate-dim">
          {terminated ? 'Ended early' : `Step ${Math.min(index + 1, HAPPY_PATH.length)} of ${HAPPY_PATH.length}`}
        </p>
      </div>
    </div>
  );
}

/** The event log — every transition, who did it and what it triggered. */
export function EventLog({
  events,
}: {
  events: {
    id: string;
    event: string;
    fromStatus: string;
    toStatus: string;
    actorRole: string;
    note: string | null;
    effects: string[];
    createdAt: string;
  }[];
}) {
  if (events.length === 0) return null;

  return (
    <div className="surface rounded-lg p-6">
      <h2 className="text-[15px] font-semibold text-chalk">Audit trail</h2>
      <p className="mt-1 text-[12.5px] text-slate-dim">
        Every state change, with the effects the engine ran.
      </p>

      <ol className="mt-5 space-y-4">
        {events.map((entry, index) => (
          <motion.li
            key={entry.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="relative flex gap-3.5 pl-1"
          >
            <span className="relative flex flex-col items-center">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-cedar-500/30 bg-cedar-500/10 text-cedar-400">
                <Check size={11} />
              </span>
              {index < events.length - 1 ? (
                <span className="mt-1 w-px flex-1 bg-white/[0.08]" />
              ) : null}
            </span>

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="numeric text-[12px] text-chalk">{entry.event}</span>
                <span className="numeric text-[10.5px] text-slate-dim">
                  {new Date(entry.createdAt).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] text-slate-dim">
                {STATUS_LABELS[entry.fromStatus as BookingStatus] ?? entry.fromStatus} →{' '}
                {STATUS_LABELS[entry.toStatus as BookingStatus] ?? entry.toStatus} · by{' '}
                {entry.actorRole.toLowerCase()}
              </p>
              {entry.note ? (
                <p className="mt-1.5 rounded-xs border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[12px] leading-relaxed text-mist">
                  {entry.note}
                </p>
              ) : null}
              {entry.effects.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {entry.effects.map((effect) => (
                    <span
                      key={effect}
                      className="numeric rounded-[5px] bg-white/[0.05] px-1.5 py-0.5 text-[9.5px] text-slate-dim"
                    >
                      {effect}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
