import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AVAILABILITY_RULES,
  buildCalendarMonth,
  checkAvailability,
  demandIndexFromUtilisation,
  mergeBlocks,
  nextAvailableWindow,
  overlaps,
  utilisation,
  type CalendarBlock,
} from './availability';

const now = new Date('2026-03-01T09:00:00Z');
const rules = { ...DEFAULT_AVAILABILITY_RULES, bufferHours: 3 };

const booked: CalendarBlock = {
  start: new Date('2026-03-10T10:00:00Z'),
  end: new Date('2026-03-14T10:00:00Z'),
  reason: 'BOOKED',
  bookingId: 'bk_1',
};

describe('overlaps', () => {
  it('treats intervals as half-open', () => {
    const a = { start: new Date('2026-03-01T10:00:00Z'), end: new Date('2026-03-02T10:00:00Z') };
    const b = { start: new Date('2026-03-02T10:00:00Z'), end: new Date('2026-03-03T10:00:00Z') };
    expect(overlaps(a, b)).toBe(false);
  });

  it('detects a genuine clash', () => {
    const a = { start: new Date('2026-03-01T10:00:00Z'), end: new Date('2026-03-03T10:00:00Z') };
    const b = { start: new Date('2026-03-02T10:00:00Z'), end: new Date('2026-03-04T10:00:00Z') };
    expect(overlaps(a, b)).toBe(true);
  });
});

describe('checkAvailability', () => {
  it('accepts a clean window', () => {
    const result = checkAvailability({
      requested: { start: new Date('2026-03-20T10:00:00Z'), end: new Date('2026-03-23T10:00:00Z') },
      blocks: [booked],
      rules,
      now,
    });
    expect(result.available).toBe(true);
  });

  it('rejects a double booking', () => {
    const result = checkAvailability({
      requested: { start: new Date('2026-03-11T10:00:00Z'), end: new Date('2026-03-13T10:00:00Z') },
      blocks: [booked],
      rules,
      now,
    });
    expect(result.available).toBe(false);
    expect(result.conflicts.some((conflict) => conflict.code === 'OVERLAP')).toBe(true);
  });

  it('enforces the turnaround buffer between trips', () => {
    const result = checkAvailability({
      requested: { start: new Date('2026-03-14T11:00:00Z'), end: new Date('2026-03-16T10:00:00Z') },
      blocks: [booked],
      rules,
      now,
    });
    expect(result.available).toBe(false);
    expect(result.conflicts.some((conflict) => conflict.code === 'BUFFER')).toBe(true);
  });

  it('does not apply a buffer to owner-blocked dates', () => {
    const ownerBlock: CalendarBlock = { ...booked, reason: 'OWNER_BLOCKED', bookingId: undefined };
    const result = checkAvailability({
      requested: { start: new Date('2026-03-14T11:00:00Z'), end: new Date('2026-03-16T10:00:00Z') },
      blocks: [ownerBlock],
      rules,
      now,
    });
    expect(result.available).toBe(true);
  });

  it('enforces advance notice', () => {
    const result = checkAvailability({
      requested: { start: new Date('2026-03-01T10:00:00Z'), end: new Date('2026-03-03T10:00:00Z') },
      blocks: [],
      rules,
      now,
    });
    expect(result.conflicts.some((conflict) => conflict.code === 'ADVANCE_NOTICE')).toBe(true);
  });

  it('enforces the booking horizon', () => {
    const result = checkAvailability({
      requested: { start: new Date('2028-03-01T10:00:00Z'), end: new Date('2028-03-03T10:00:00Z') },
      blocks: [],
      rules,
      now,
    });
    expect(result.conflicts.some((conflict) => conflict.code === 'HORIZON')).toBe(true);
  });

  it('enforces the pickup window', () => {
    const result = checkAvailability({
      requested: { start: new Date('2026-03-20T03:00:00Z'), end: new Date('2026-03-22T10:00:00Z') },
      blocks: [],
      rules,
      now,
    });
    expect(result.conflicts.some((conflict) => conflict.code === 'PICKUP_WINDOW')).toBe(true);
  });

  it('rejects an inverted range immediately', () => {
    const result = checkAvailability({
      requested: { start: new Date('2026-03-22T10:00:00Z'), end: new Date('2026-03-20T10:00:00Z') },
      blocks: [],
      rules,
      now,
    });
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].code).toBe('INVALID_RANGE');
  });

  it('reports every conflict at once rather than the first', () => {
    const result = checkAvailability({
      requested: { start: new Date('2026-03-11T03:00:00Z'), end: new Date('2026-03-13T04:00:00Z') },
      blocks: [booked],
      rules,
      now,
    });
    expect(result.conflicts.length).toBeGreaterThan(1);
  });
});

describe('mergeBlocks', () => {
  it('collapses adjacent blocks of the same kind', () => {
    const merged = mergeBlocks([
      { start: new Date('2026-03-01T00:00:00Z'), end: new Date('2026-03-05T00:00:00Z'), reason: 'BOOKED' },
      { start: new Date('2026-03-04T00:00:00Z'), end: new Date('2026-03-09T00:00:00Z'), reason: 'BOOKED' },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].end.toISOString()).toBe('2026-03-09T00:00:00.000Z');
  });

  it('keeps different reasons separate', () => {
    const merged = mergeBlocks([
      { start: new Date('2026-03-01T00:00:00Z'), end: new Date('2026-03-05T00:00:00Z'), reason: 'BOOKED' },
      { start: new Date('2026-03-04T00:00:00Z'), end: new Date('2026-03-09T00:00:00Z'), reason: 'MAINTENANCE' },
    ]);
    expect(merged).toHaveLength(2);
  });
});

describe('buildCalendarMonth', () => {
  it('marks booked days unavailable and leaves the rest open', () => {
    const days = buildCalendarMonth({ year: 2026, month: 3, blocks: [booked], rules, now });
    expect(days).toHaveLength(31);
    const eleventh = days.find((day) => day.date === '2026-03-11')!;
    const twentieth = days.find((day) => day.date === '2026-03-20')!;
    expect(eleventh.available).toBe(false);
    expect(eleventh.reason).toBe('BOOKED');
    expect(twentieth.available).toBe(true);
  });

  it('closes days in the past', () => {
    const days = buildCalendarMonth({ year: 2026, month: 2, blocks: [], rules, now });
    expect(days.every((day) => !day.available)).toBe(true);
  });
});

describe('nextAvailableWindow', () => {
  it('finds the next free slot after a booking', () => {
    const window = nextAvailableWindow({
      from: new Date('2026-03-10T10:00:00Z'),
      days: 2,
      blocks: [booked],
      rules,
    });
    expect(window).not.toBeNull();
    expect(window!.start.getTime()).toBeGreaterThanOrEqual(booked.end.getTime());
  });

  it('returns null when nothing fits in the search horizon', () => {
    const wall: CalendarBlock = {
      start: new Date('2026-03-01T00:00:00Z'),
      end: new Date('2027-03-01T00:00:00Z'),
      reason: 'BOOKED',
    };
    expect(
      nextAvailableWindow({ from: new Date('2026-03-02T10:00:00Z'), days: 2, blocks: [wall], rules, searchLimitDays: 30 }),
    ).toBeNull();
  });
});

describe('utilisation and demand', () => {
  it('measures the booked share of a window', () => {
    const result = utilisation({
      blocks: [booked],
      window: { start: new Date('2026-03-01T00:00:00Z'), end: new Date('2026-03-31T00:00:00Z') },
    });
    expect(result.bookedDays).toBe(4);
    expect(result.rate).toBeCloseTo(4 / 30, 2);
  });

  it('ignores non-booking blocks', () => {
    const result = utilisation({
      blocks: [{ ...booked, reason: 'MAINTENANCE' }],
      window: { start: new Date('2026-03-01T00:00:00Z'), end: new Date('2026-03-31T00:00:00Z') },
    });
    expect(result.bookedDays).toBe(0);
  });

  it('turns utilisation into a bounded demand index', () => {
    expect(demandIndexFromUtilisation(0.95)).toBe(1.3);
    expect(demandIndexFromUtilisation(0.5)).toBe(1);
    expect(demandIndexFromUtilisation(0.1)).toBe(0.9);
  });
});
