import type { DateRange } from './types';
import { MILLISECONDS_PER_DAY } from './pricing';

/**
 * Availability.
 *
 * A car is a single physical object, so the calendar is the one place where
 * the platform cannot afford to be approximate. Two overlapping confirmed
 * bookings means somebody stands in a car park with no car.
 */

export interface AvailabilityRules {
  /** Cleaning / travel gap enforced between two trips, in hours. */
  readonly bufferHours: number;
  /** Earliest a trip may start, relative to now, in hours. */
  readonly advanceNoticeHours: number;
  /** Furthest into the future a trip may start, in days. */
  readonly bookingHorizonDays: number;
  readonly minRentalDays: number;
  readonly maxRentalDays: number;
  /** Weekday indices (0 = Sunday) on which handover is not possible. */
  readonly blockedWeekdays: readonly number[];
  /** Local time window for pickup and return, "HH:MM". */
  readonly pickupWindow: readonly [string, string];
}

export const DEFAULT_AVAILABILITY_RULES: AvailabilityRules = {
  bufferHours: 2,
  advanceNoticeHours: 3,
  bookingHorizonDays: 365,
  minRentalDays: 1,
  maxRentalDays: 60,
  blockedWeekdays: [],
  pickupWindow: ['07:00', '22:00'],
};

export type BlockReason =
  | 'BOOKED'
  | 'OWNER_BLOCKED'
  | 'MAINTENANCE'
  | 'BUFFER'
  | 'DOCUMENTS_EXPIRED';

export interface CalendarBlock extends DateRange {
  readonly reason: BlockReason;
  readonly bookingId?: string;
  readonly note?: string;
}

export interface AvailabilityConflict {
  readonly code:
    | 'OVERLAP'
    | 'BUFFER'
    | 'ADVANCE_NOTICE'
    | 'HORIZON'
    | 'MIN_DURATION'
    | 'MAX_DURATION'
    | 'BLOCKED_WEEKDAY'
    | 'PICKUP_WINDOW'
    | 'INVALID_RANGE';
  readonly message: string;
  readonly conflictingBlock?: CalendarBlock;
}

export function overlaps(a: DateRange, b: DateRange): boolean {
  // Half-open intervals: a trip ending at 10:00 does not clash with one
  // starting at 10:00 — that is what the buffer rule is for.
  return a.start < b.end && b.start < a.end;
}

function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Checks a requested range against every rule and every existing block.
 *
 * Returns *all* conflicts rather than the first one, so the UI can tell the
 * renter everything that is wrong in one pass instead of one thing at a time.
 */
export function checkAvailability(params: {
  requested: DateRange;
  blocks: readonly CalendarBlock[];
  rules: AvailabilityRules;
  now?: Date;
}): { available: boolean; conflicts: readonly AvailabilityConflict[] } {
  const { requested, blocks, rules } = params;
  const now = params.now ?? new Date();
  const conflicts: AvailabilityConflict[] = [];

  if (requested.end <= requested.start) {
    return {
      available: false,
      conflicts: [{ code: 'INVALID_RANGE', message: 'The return time must be after pickup.' }],
    };
  }

  const durationDays = Math.ceil(
    (requested.end.getTime() - requested.start.getTime()) / MILLISECONDS_PER_DAY,
  );

  const noticeHours = (requested.start.getTime() - now.getTime()) / 3_600_000;
  if (noticeHours < rules.advanceNoticeHours) {
    conflicts.push({
      code: 'ADVANCE_NOTICE',
      message:
        noticeHours < 0
          ? 'Pickup is in the past.'
          : `This car needs ${rules.advanceNoticeHours} hours' notice. Choose a later pickup.`,
    });
  }

  const horizonMs = rules.bookingHorizonDays * MILLISECONDS_PER_DAY;
  if (requested.start.getTime() - now.getTime() > horizonMs) {
    conflicts.push({
      code: 'HORIZON',
      message: `This car can be booked up to ${rules.bookingHorizonDays} days ahead.`,
    });
  }

  if (durationDays < rules.minRentalDays) {
    conflicts.push({
      code: 'MIN_DURATION',
      message: `Minimum rental is ${rules.minRentalDays} ${rules.minRentalDays === 1 ? 'day' : 'days'}.`,
    });
  }
  if (durationDays > rules.maxRentalDays) {
    conflicts.push({
      code: 'MAX_DURATION',
      message: `Maximum rental is ${rules.maxRentalDays} days.`,
    });
  }

  for (const day of [requested.start, requested.end]) {
    if (rules.blockedWeekdays.includes(day.getUTCDay())) {
      conflicts.push({
        code: 'BLOCKED_WEEKDAY',
        message: 'The owner does not do handovers on that day of the week.',
      });
      break;
    }
  }

  const [openTime, closeTime] = rules.pickupWindow;
  const open = minutesOfDay(openTime);
  const close = minutesOfDay(closeTime);
  for (const [label, moment] of [
    ['Pickup', requested.start],
    ['Return', requested.end],
  ] as const) {
    const minutes = moment.getUTCHours() * 60 + moment.getUTCMinutes();
    if (minutes < open || minutes > close) {
      conflicts.push({
        code: 'PICKUP_WINDOW',
        message: `${label} must be between ${openTime} and ${closeTime}.`,
      });
    }
  }

  const bufferMs = rules.bufferHours * 3_600_000;
  for (const block of blocks) {
    if (overlaps(requested, block)) {
      conflicts.push({
        code: 'OVERLAP',
        message:
          block.reason === 'BOOKED'
            ? 'Those dates are already booked.'
            : block.reason === 'MAINTENANCE'
              ? 'The car is off the road for maintenance during those dates.'
              : 'The owner has blocked those dates.',
        conflictingBlock: block,
      });
      continue;
    }
    // Only trips need a turnaround buffer — an owner blocking their own
    // calendar can hand the car over the moment the block ends.
    if (block.reason !== 'BOOKED') continue;
    const padded: DateRange = {
      start: new Date(block.start.getTime() - bufferMs),
      end: new Date(block.end.getTime() + bufferMs),
    };
    if (overlaps(requested, padded)) {
      conflicts.push({
        code: 'BUFFER',
        message: `The owner keeps ${rules.bufferHours} hours between trips to clean and check the car.`,
        conflictingBlock: block,
      });
    }
  }

  return { available: conflicts.length === 0, conflicts };
}

/** Merges overlapping blocks so the calendar UI paints each day once. */
export function mergeBlocks(blocks: readonly CalendarBlock[]): CalendarBlock[] {
  const sorted = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: CalendarBlock[] = [];
  for (const block of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && block.start <= previous.end && previous.reason === block.reason) {
      merged[merged.length - 1] = {
        ...previous,
        end: block.end > previous.end ? block.end : previous.end,
      };
    } else {
      merged.push({ ...block });
    }
  }
  return merged;
}

/** Day-level availability map for rendering a month grid. */
export function buildCalendarMonth(params: {
  year: number;
  month: number;
  blocks: readonly CalendarBlock[];
  rules: AvailabilityRules;
  now?: Date;
}): { date: string; available: boolean; reason?: BlockReason }[] {
  const now = params.now ?? new Date();
  const daysInMonth = new Date(Date.UTC(params.year, params.month, 0)).getUTCDate();
  const merged = mergeBlocks(params.blocks);
  const horizon = new Date(now.getTime() + params.rules.bookingHorizonDays * MILLISECONDS_PER_DAY);

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = new Date(Date.UTC(params.year, params.month - 1, index + 1));
    const dayEnd = new Date(day.getTime() + MILLISECONDS_PER_DAY);
    const iso = day.toISOString().slice(0, 10);

    if (dayEnd <= now) return { date: iso, available: false, reason: 'OWNER_BLOCKED' as const };
    if (day > horizon) return { date: iso, available: false, reason: 'OWNER_BLOCKED' as const };
    if (params.rules.blockedWeekdays.includes(day.getUTCDay())) {
      return { date: iso, available: false, reason: 'OWNER_BLOCKED' as const };
    }

    const hit = merged.find((block) => overlaps({ start: day, end: dayEnd }, block));
    return hit
      ? { date: iso, available: false, reason: hit.reason }
      : { date: iso, available: true };
  });
}

/**
 * Finds the next window of at least `days` that is genuinely bookable —
 * powering "not available then, but free from the 14th" instead of a dead end.
 */
export function nextAvailableWindow(params: {
  from: Date;
  days: number;
  blocks: readonly CalendarBlock[];
  rules: AvailabilityRules;
  searchLimitDays?: number;
}): DateRange | null {
  const limit = params.searchLimitDays ?? 120;
  const start = new Date(params.from.getTime());
  for (let offset = 0; offset < limit; offset += 1) {
    const candidateStart = new Date(start.getTime() + offset * MILLISECONDS_PER_DAY);
    const candidateEnd = new Date(candidateStart.getTime() + params.days * MILLISECONDS_PER_DAY);
    const result = checkAvailability({
      requested: { start: candidateStart, end: candidateEnd },
      blocks: params.blocks,
      rules: params.rules,
      now: params.from,
    });
    // Ignore window-of-day conflicts here; the renter picks the exact time later.
    const blocking = result.conflicts.filter(
      (conflict) => conflict.code !== 'PICKUP_WINDOW' && conflict.code !== 'ADVANCE_NOTICE',
    );
    if (blocking.length === 0) return { start: candidateStart, end: candidateEnd };
  }
  return null;
}

/**
 * Utilisation over a window — the number the owner dashboard leads with, and
 * the input to the marketplace demand index.
 */
export function utilisation(params: {
  blocks: readonly CalendarBlock[];
  window: DateRange;
}): { bookedDays: number; totalDays: number; rate: number } {
  const totalMs = params.window.end.getTime() - params.window.start.getTime();
  const totalDays = Math.max(1, Math.round(totalMs / MILLISECONDS_PER_DAY));
  let bookedMs = 0;
  for (const block of params.blocks) {
    if (block.reason !== 'BOOKED') continue;
    const start = Math.max(block.start.getTime(), params.window.start.getTime());
    const end = Math.min(block.end.getTime(), params.window.end.getTime());
    if (end > start) bookedMs += end - start;
  }
  const bookedDays = Math.round(bookedMs / MILLISECONDS_PER_DAY);
  return { bookedDays, totalDays, rate: Math.min(1, bookedMs / totalMs) };
}

/**
 * Demand index for the pricing engine, derived from how much of the local
 * fleet is already committed. Clamped so pricing never runs away.
 */
export function demandIndexFromUtilisation(rate: number): number {
  if (rate >= 0.9) return 1.3;
  if (rate >= 0.75) return 1.18;
  if (rate >= 0.6) return 1.08;
  if (rate <= 0.2) return 0.9;
  if (rate <= 0.35) return 0.95;
  return 1;
}
