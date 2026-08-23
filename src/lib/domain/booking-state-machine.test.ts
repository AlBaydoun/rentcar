import { describe, expect, it } from 'vitest';
import {
  approvalDeadline,
  availableEvents,
  blocksCalendar,
  isTerminal,
  progressIndex,
  transition,
  TRANSITIONS,
} from './booking-state-machine';
import type { BookingStatus } from './types';

describe('booking state machine', () => {
  it('walks the happy path end to end', () => {
    const path: [BookingStatus, Parameters<typeof transition>[1], 'RENTER' | 'OWNER' | 'SYSTEM'][] = [
      ['DRAFT', 'SUBMIT_REQUEST', 'RENTER'],
      ['PENDING_DOCUMENTS', 'DOCUMENTS_COMPLETED', 'SYSTEM'],
      ['AWAITING_OWNER_APPROVAL', 'OWNER_APPROVE', 'OWNER'],
      ['APPROVED_AWAITING_PAYMENT', 'PAYMENT_AUTHORIZED', 'SYSTEM'],
      ['CONFIRMED', 'START_HANDOVER', 'OWNER'],
      ['HANDOVER_PENDING', 'HANDOVER_COMPLETED', 'OWNER'],
      ['ACTIVE', 'START_RETURN', 'RENTER'],
      ['RETURN_PENDING', 'RETURN_COMPLETED', 'OWNER'],
    ];

    let status: BookingStatus = 'DRAFT';
    for (const [from, event, actor] of path) {
      expect(status).toBe(from);
      const result = transition(status, event, {
        actor,
        guards: {
          eligibilityPassed: true,
          paymentMethodOnFile: true,
          handoverSigned: true,
          returnSigned: true,
          ownerVerified: true,
        },
      });
      expect(result.ok, `${from} -> ${event}`).toBe(true);
      if (result.ok) status = result.value.to;
    }
    expect(status).toBe('COMPLETED');
  });

  it('never lets a renter approve their own booking', () => {
    const result = transition('AWAITING_OWNER_APPROVAL', 'OWNER_APPROVE', { actor: 'RENTER' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/cannot perform/i);
  });

  it('never charges before the owner approves', () => {
    // There is no edge from an unapproved state that authorises payment.
    const premature = TRANSITIONS.filter(
      (rule) =>
        rule.effects.includes('AUTHORIZE_PAYMENT') || rule.effects.includes('CAPTURE_PAYMENT'),
    );
    for (const rule of premature) {
      expect(['AWAITING_OWNER_APPROVAL', 'HANDOVER_PENDING']).toContain(rule.from);
    }
  });

  it('captures money only once the keys change hands', () => {
    const capture = TRANSITIONS.find((rule) => rule.effects.includes('CAPTURE_PAYMENT'))!;
    expect(capture.from).toBe('HANDOVER_PENDING');
    expect(capture.event).toBe('HANDOVER_COMPLETED');
  });

  it('refuses transitions out of terminal states', () => {
    for (const status of ['COMPLETED', 'DECLINED', 'EXPIRED', 'CANCELLED_BY_RENTER'] as BookingStatus[]) {
      expect(isTerminal(status)).toBe(true);
      expect(transition(status, 'OWNER_APPROVE', { actor: 'ADMIN' }).ok).toBe(false);
    }
  });

  it('refuses an event that has no edge from the current state', () => {
    const result = transition('CONFIRMED', 'OWNER_APPROVE', { actor: 'OWNER' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not possible/i);
  });

  it('enforces guards', () => {
    expect(
      transition('PENDING_DOCUMENTS', 'DOCUMENTS_COMPLETED', {
        actor: 'SYSTEM',
        guards: { eligibilityPassed: false },
      }).ok,
    ).toBe(false);

    expect(
      transition('HANDOVER_PENDING', 'HANDOVER_COMPLETED', {
        actor: 'OWNER',
        guards: { handoverSigned: false },
      }).ok,
    ).toBe(false);

    expect(
      transition('AWAITING_OWNER_APPROVAL', 'OWNER_APPROVE', {
        actor: 'OWNER',
        guards: { ownerVerified: false },
      }).ok,
    ).toBe(false);
  });

  it('lets an admin drive any legal edge', () => {
    expect(transition('AWAITING_OWNER_APPROVAL', 'OWNER_APPROVE', { actor: 'ADMIN' }).ok).toBe(true);
  });

  it('blocks the calendar only once money is committed', () => {
    expect(blocksCalendar('AWAITING_OWNER_APPROVAL')).toBe(false);
    expect(blocksCalendar('APPROVED_AWAITING_PAYMENT')).toBe(false);
    expect(blocksCalendar('CONFIRMED')).toBe(true);
    expect(blocksCalendar('ACTIVE')).toBe(true);
  });

  it('reveals the exact address only on confirmation', () => {
    const reveal = TRANSITIONS.filter((rule) => rule.effects.includes('REVEAL_EXACT_ADDRESS'));
    expect(reveal).toHaveLength(1);
    expect(reveal[0].to).toBe('CONFIRMED');
  });

  it('offers the right actions to each actor', () => {
    const ownerActions = availableEvents('AWAITING_OWNER_APPROVAL', 'OWNER');
    expect(ownerActions).toContain('OWNER_APPROVE');
    expect(ownerActions).toContain('OWNER_DECLINE');
    expect(ownerActions).toContain('OWNER_REQUEST_DOCUMENTS');

    const renterActions = availableEvents('AWAITING_OWNER_APPROVAL', 'RENTER');
    expect(renterActions).toEqual(['CANCEL_BY_RENTER']);
  });

  it('handles the owner asking for more documents and back again', () => {
    const asked = transition('AWAITING_OWNER_APPROVAL', 'OWNER_REQUEST_DOCUMENTS', { actor: 'OWNER' });
    expect(asked.ok && asked.value.to).toBe('DOCUMENTS_REQUESTED');
    const supplied = transition('DOCUMENTS_REQUESTED', 'RENTER_SUPPLY_DOCUMENTS', { actor: 'RENTER' });
    expect(supplied.ok && supplied.value.to).toBe('AWAITING_OWNER_APPROVAL');
  });

  it('shortens the approval window for imminent pickups', () => {
    const requestedAt = new Date('2026-03-01T10:00:00Z');
    const soon = approvalDeadline(requestedAt, new Date('2026-03-01T16:00:00Z'));
    const later = approvalDeadline(requestedAt, new Date('2026-04-01T10:00:00Z'));
    expect(soon.getTime() - requestedAt.getTime()).toBeLessThan(later.getTime() - requestedAt.getTime());
  });

  it('orders the progress timeline', () => {
    expect(progressIndex('PENDING_DOCUMENTS')).toBeLessThan(progressIndex('CONFIRMED'));
    expect(progressIndex('CONFIRMED')).toBeLessThan(progressIndex('COMPLETED'));
  });

  it('has no unreachable non-initial state', () => {
    const reachable = new Set<BookingStatus>(['DRAFT']);
    let changed = true;
    while (changed) {
      changed = false;
      for (const rule of TRANSITIONS) {
        if (reachable.has(rule.from) && !reachable.has(rule.to)) {
          reachable.add(rule.to);
          changed = true;
        }
      }
    }
    // Every state named in a transition must be reachable from DRAFT.
    for (const rule of TRANSITIONS) {
      expect(reachable.has(rule.to)).toBe(true);
    }
  });
});
