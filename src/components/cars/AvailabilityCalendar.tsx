'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildCalendarMonth, type AvailabilityRules } from '@/lib/domain/availability';
import { cn } from '@/lib/cn';

/**
 * A two-month availability grid.
 *
 * It calls the same `buildCalendarMonth` the server uses, so a day painted as
 * free here is a day the booking engine will actually accept.
 */

interface SerialisedBlock {
  start: string;
  end: string;
  reason: string;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function AvailabilityCalendar({
  blocks,
  rules,
}: {
  blocks: SerialisedBlock[];
  rules: Omit<AvailabilityRules, 'pickupWindow'> & { pickupWindow: [string, string] | string[] };
}) {
  const [offset, setOffset] = useState(0);

  const parsedBlocks = useMemo(
    () =>
      blocks.map((block) => ({
        start: new Date(block.start),
        end: new Date(block.end),
        reason: block.reason as 'BOOKED' | 'OWNER_BLOCKED' | 'MAINTENANCE',
      })),
    [blocks],
  );

  const months = useMemo(() => {
    const now = new Date();
    const resolvedRules: AvailabilityRules = {
      ...rules,
      pickupWindow: [rules.pickupWindow[0], rules.pickupWindow[1]] as [string, string],
    };

    return [0, 1].map((step) => {
      const cursor = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + step, 1),
      );
      const days = buildCalendarMonth({
        year: cursor.getUTCFullYear(),
        month: cursor.getUTCMonth() + 1,
        blocks: parsedBlocks,
        rules: resolvedRules,
        now,
      });
      // Grids start on Monday.
      const firstWeekday = (new Date(days[0].date).getUTCDay() + 6) % 7;
      return {
        label: cursor.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
        days,
        pad: firstWeekday,
      };
    });
  }, [offset, parsedBlocks, rules]);

  return (
    <div className="panel rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset((value) => Math.max(0, value - 1))}
          disabled={offset === 0}
          className="grid h-8 w-8 place-items-center rounded-xs text-mist transition-colors hover:bg-white/[0.06] hover:text-chalk disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex gap-4 text-[11px] text-slate-dim">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[3px] bg-white/25" />
            Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[3px] bg-amber-500/70" />
            Booked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[3px] bg-white/[0.07]" />
            Unavailable
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOffset((value) => Math.min(10, value + 1))}
          className="grid h-8 w-8 place-items-center rounded-xs text-mist transition-colors hover:bg-white/[0.06] hover:text-chalk"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {months.map((month) => (
          <div key={month.label}>
            <p className="mb-3 text-center text-[12.5px] font-medium text-chalk">{month.label}</p>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <span
                  key={day}
                  className="pb-1 text-center text-[10px] uppercase tracking-wider text-slate-dim"
                >
                  {day}
                </span>
              ))}
              {Array.from({ length: month.pad }).map((_, index) => (
                <span key={`pad-${index}`} />
              ))}
              {month.days.map((day, index) => (
                <motion.span
                  key={day.date}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.005, duration: 0.2 }}
                  title={`${day.date}${day.available ? '' : ` — ${day.reason?.toLowerCase().replace('_', ' ')}`}`}
                  className={cn(
                    'numeric grid aspect-square place-items-center rounded-[5px] text-[11.5px]',
                    day.available
                      ? 'bg-white/[0.05] text-chalk'
                      : day.reason === 'BOOKED'
                        ? 'bg-amber-500/25 text-amber-400/70 line-through'
                        : 'bg-white/[0.02] text-slate-dim/50',
                  )}
                >
                  {Number(day.date.slice(-2))}
                </motion.span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
