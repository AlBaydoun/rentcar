import type { BookingActor, BookingStatus, Result } from './types';
import { err, ok } from './types';

/**
 * The booking lifecycle.
 *
 * This is the spine of the product: the owner's right to choose who drives
 * their car is expressed here as an explicit approval gate that money cannot
 * bypass. Nothing is charged before an owner has said yes, and no transition
 * happens anywhere in the codebase except through `transition()`.
 */

export type BookingEvent =
  | 'SUBMIT_REQUEST'
  | 'DOCUMENTS_COMPLETED'
  | 'OWNER_APPROVE'
  | 'OWNER_DECLINE'
  | 'OWNER_REQUEST_DOCUMENTS'
  | 'RENTER_SUPPLY_DOCUMENTS'
  | 'PAYMENT_AUTHORIZED'
  | 'PAYMENT_FAILED'
  | 'START_HANDOVER'
  | 'HANDOVER_COMPLETED'
  | 'START_RETURN'
  | 'RETURN_COMPLETED'
  | 'CANCEL_BY_RENTER'
  | 'CANCEL_BY_OWNER'
  | 'OPEN_DISPUTE'
  | 'RESOLVE_DISPUTE'
  | 'EXPIRE';

export interface TransitionRule {
  readonly from: BookingStatus;
  readonly event: BookingEvent;
  readonly to: BookingStatus;
  readonly allowedActors: readonly BookingActor[];
  readonly description: string;
  /** Side effects the orchestration layer must perform on this edge. */
  readonly effects: readonly TransitionEffect[];
}

export type TransitionEffect =
  | 'RUN_ELIGIBILITY_CHECK'
  | 'RUN_RISK_ASSESSMENT'
  | 'NOTIFY_OWNER'
  | 'NOTIFY_RENTER'
  | 'START_APPROVAL_TIMER'
  | 'CANCEL_APPROVAL_TIMER'
  | 'AUTHORIZE_PAYMENT'
  | 'CAPTURE_PAYMENT'
  | 'HOLD_DEPOSIT'
  | 'RELEASE_DEPOSIT'
  | 'VOID_AUTHORIZATION'
  | 'BLOCK_CALENDAR'
  | 'RELEASE_CALENDAR'
  | 'REVEAL_EXACT_ADDRESS'
  | 'ISSUE_REFUND'
  | 'SCHEDULE_OWNER_PAYOUT'
  | 'OPEN_INSPECTION'
  | 'CLOSE_INSPECTION'
  | 'REQUEST_REVIEWS'
  | 'FREEZE_PAYOUT';

/**
 * How long an owner has to answer a request before it expires. Requests for
 * imminent pickups expire faster — an unanswered request for tomorrow morning
 * is worse than useless to the renter.
 */
export function approvalDeadline(requestedAt: Date, tripStart: Date): Date {
  const hoursToPickup = (tripStart.getTime() - requestedAt.getTime()) / 3_600_000;
  const windowHours = hoursToPickup <= 12 ? 1 : hoursToPickup <= 48 ? 4 : hoursToPickup <= 24 * 7 ? 12 : 24;
  return new Date(requestedAt.getTime() + windowHours * 3_600_000);
}

export const TRANSITIONS: readonly TransitionRule[] = [
  {
    from: 'DRAFT',
    event: 'SUBMIT_REQUEST',
    to: 'PENDING_DOCUMENTS',
    allowedActors: ['RENTER'],
    description: 'The renter submits the request; documents are checked before the owner is disturbed.',
    effects: ['RUN_ELIGIBILITY_CHECK'],
  },
  {
    from: 'PENDING_DOCUMENTS',
    event: 'DOCUMENTS_COMPLETED',
    to: 'AWAITING_OWNER_APPROVAL',
    allowedActors: ['SYSTEM', 'ADMIN'],
    description: 'Verification cleared. The request reaches the owner with a risk profile attached.',
    effects: ['RUN_RISK_ASSESSMENT', 'NOTIFY_OWNER', 'START_APPROVAL_TIMER'],
  },
  {
    from: 'PENDING_DOCUMENTS',
    event: 'CANCEL_BY_RENTER',
    to: 'CANCELLED_BY_RENTER',
    allowedActors: ['RENTER'],
    description: 'The renter withdraws before the owner ever sees the request. Nothing was charged.',
    effects: ['RELEASE_CALENDAR'],
  },
  {
    from: 'PENDING_DOCUMENTS',
    event: 'EXPIRE',
    to: 'EXPIRED',
    allowedActors: ['SYSTEM'],
    description: 'Documents were never completed and the pickup date passed.',
    effects: ['RELEASE_CALENDAR', 'NOTIFY_RENTER'],
  },

  {
    from: 'AWAITING_OWNER_APPROVAL',
    event: 'OWNER_APPROVE',
    to: 'APPROVED_AWAITING_PAYMENT',
    allowedActors: ['OWNER'],
    description: 'The owner accepts. Only now is the renter asked to pay.',
    effects: ['CANCEL_APPROVAL_TIMER', 'AUTHORIZE_PAYMENT', 'NOTIFY_RENTER'],
  },
  {
    from: 'AWAITING_OWNER_APPROVAL',
    event: 'OWNER_DECLINE',
    to: 'DECLINED',
    allowedActors: ['OWNER'],
    description: 'The owner declines, with a reason the renter can see.',
    effects: ['CANCEL_APPROVAL_TIMER', 'RELEASE_CALENDAR', 'NOTIFY_RENTER'],
  },
  {
    from: 'AWAITING_OWNER_APPROVAL',
    event: 'OWNER_REQUEST_DOCUMENTS',
    to: 'DOCUMENTS_REQUESTED',
    allowedActors: ['OWNER'],
    description: 'The owner wants something more before deciding — a second ID, a video call, proof of address.',
    effects: ['NOTIFY_RENTER', 'CANCEL_APPROVAL_TIMER'],
  },
  {
    from: 'AWAITING_OWNER_APPROVAL',
    event: 'EXPIRE',
    to: 'EXPIRED',
    allowedActors: ['SYSTEM'],
    description: 'The owner did not answer inside the response window.',
    effects: ['RELEASE_CALENDAR', 'NOTIFY_RENTER', 'NOTIFY_OWNER'],
  },
  {
    from: 'AWAITING_OWNER_APPROVAL',
    event: 'CANCEL_BY_RENTER',
    to: 'CANCELLED_BY_RENTER',
    allowedActors: ['RENTER'],
    description: 'The renter withdraws while waiting for an answer. Free of charge.',
    effects: ['CANCEL_APPROVAL_TIMER', 'RELEASE_CALENDAR', 'NOTIFY_OWNER'],
  },

  {
    from: 'DOCUMENTS_REQUESTED',
    event: 'RENTER_SUPPLY_DOCUMENTS',
    to: 'AWAITING_OWNER_APPROVAL',
    allowedActors: ['RENTER'],
    description: 'The renter supplies what was asked for; the request goes back to the owner.',
    effects: ['RUN_ELIGIBILITY_CHECK', 'RUN_RISK_ASSESSMENT', 'NOTIFY_OWNER', 'START_APPROVAL_TIMER'],
  },
  {
    from: 'DOCUMENTS_REQUESTED',
    event: 'CANCEL_BY_RENTER',
    to: 'CANCELLED_BY_RENTER',
    allowedActors: ['RENTER'],
    description: 'The renter drops out rather than supply the extra documents.',
    effects: ['RELEASE_CALENDAR', 'NOTIFY_OWNER'],
  },
  {
    from: 'DOCUMENTS_REQUESTED',
    event: 'EXPIRE',
    to: 'EXPIRED',
    allowedActors: ['SYSTEM'],
    description: 'The extra documents never arrived.',
    effects: ['RELEASE_CALENDAR', 'NOTIFY_RENTER'],
  },
  {
    from: 'DOCUMENTS_REQUESTED',
    event: 'OWNER_DECLINE',
    to: 'DECLINED',
    allowedActors: ['OWNER'],
    description: 'The owner decides against it without waiting.',
    effects: ['RELEASE_CALENDAR', 'NOTIFY_RENTER'],
  },

  {
    from: 'APPROVED_AWAITING_PAYMENT',
    event: 'PAYMENT_AUTHORIZED',
    to: 'CONFIRMED',
    allowedActors: ['SYSTEM', 'RENTER'],
    description: 'Funds authorised and the deposit held. The trip is locked in for both sides.',
    effects: ['HOLD_DEPOSIT', 'BLOCK_CALENDAR', 'REVEAL_EXACT_ADDRESS', 'NOTIFY_OWNER', 'NOTIFY_RENTER'],
  },
  {
    from: 'APPROVED_AWAITING_PAYMENT',
    event: 'PAYMENT_FAILED',
    to: 'EXPIRED',
    allowedActors: ['SYSTEM'],
    description: 'Authorisation failed or was never completed in time.',
    effects: ['VOID_AUTHORIZATION', 'RELEASE_CALENDAR', 'NOTIFY_OWNER', 'NOTIFY_RENTER'],
  },
  {
    from: 'APPROVED_AWAITING_PAYMENT',
    event: 'CANCEL_BY_RENTER',
    to: 'CANCELLED_BY_RENTER',
    allowedActors: ['RENTER'],
    description: 'The renter backs out before paying.',
    effects: ['VOID_AUTHORIZATION', 'RELEASE_CALENDAR', 'NOTIFY_OWNER'],
  },
  {
    from: 'APPROVED_AWAITING_PAYMENT',
    event: 'EXPIRE',
    to: 'EXPIRED',
    allowedActors: ['SYSTEM'],
    description: 'The payment window closed.',
    effects: ['VOID_AUTHORIZATION', 'RELEASE_CALENDAR', 'NOTIFY_OWNER', 'NOTIFY_RENTER'],
  },

  {
    from: 'CONFIRMED',
    event: 'START_HANDOVER',
    to: 'HANDOVER_PENDING',
    allowedActors: ['OWNER', 'RENTER'],
    description: 'Both parties open the joint handover inspection.',
    effects: ['OPEN_INSPECTION'],
  },
  {
    from: 'CONFIRMED',
    event: 'CANCEL_BY_RENTER',
    to: 'CANCELLED_BY_RENTER',
    allowedActors: ['RENTER'],
    description: 'Cancellation after confirmation — the owner\'s policy decides the refund.',
    effects: ['ISSUE_REFUND', 'RELEASE_DEPOSIT', 'RELEASE_CALENDAR', 'NOTIFY_OWNER'],
  },
  {
    from: 'CONFIRMED',
    event: 'CANCEL_BY_OWNER',
    to: 'CANCELLED_BY_OWNER',
    allowedActors: ['OWNER', 'ADMIN'],
    description: 'The owner cancels a confirmed trip. Always a full refund, plus a penalty on the owner.',
    effects: ['ISSUE_REFUND', 'RELEASE_DEPOSIT', 'RELEASE_CALENDAR', 'NOTIFY_RENTER'],
  },

  {
    from: 'HANDOVER_PENDING',
    event: 'HANDOVER_COMPLETED',
    to: 'ACTIVE',
    allowedActors: ['OWNER', 'RENTER', 'SYSTEM'],
    description: 'Photos, fuel, odometer and both signatures captured. The trip is running.',
    effects: ['CLOSE_INSPECTION', 'CAPTURE_PAYMENT', 'NOTIFY_OWNER', 'NOTIFY_RENTER'],
  },
  {
    from: 'HANDOVER_PENDING',
    event: 'CANCEL_BY_RENTER',
    to: 'CANCELLED_BY_RENTER',
    allowedActors: ['RENTER'],
    description: 'The renter walks away at handover.',
    effects: ['ISSUE_REFUND', 'RELEASE_DEPOSIT', 'RELEASE_CALENDAR', 'NOTIFY_OWNER'],
  },
  {
    from: 'HANDOVER_PENDING',
    event: 'CANCEL_BY_OWNER',
    to: 'CANCELLED_BY_OWNER',
    allowedActors: ['OWNER', 'ADMIN'],
    description: 'The owner fails to hand the car over.',
    effects: ['ISSUE_REFUND', 'RELEASE_DEPOSIT', 'RELEASE_CALENDAR', 'NOTIFY_RENTER'],
  },

  {
    from: 'ACTIVE',
    event: 'START_RETURN',
    to: 'RETURN_PENDING',
    allowedActors: ['OWNER', 'RENTER'],
    description: 'The return inspection opens.',
    effects: ['OPEN_INSPECTION'],
  },
  {
    from: 'ACTIVE',
    event: 'OPEN_DISPUTE',
    to: 'DISPUTED',
    allowedActors: ['OWNER', 'RENTER', 'ADMIN'],
    description: 'Something went wrong mid-trip — theft, an accident, an unreachable renter.',
    effects: ['FREEZE_PAYOUT', 'NOTIFY_OWNER', 'NOTIFY_RENTER'],
  },

  {
    from: 'RETURN_PENDING',
    event: 'RETURN_COMPLETED',
    to: 'COMPLETED',
    allowedActors: ['OWNER', 'RENTER', 'SYSTEM'],
    description: 'The car is back, the return inspection is signed, extras are settled.',
    effects: [
      'CLOSE_INSPECTION',
      'RELEASE_DEPOSIT',
      'RELEASE_CALENDAR',
      'SCHEDULE_OWNER_PAYOUT',
      'REQUEST_REVIEWS',
    ],
  },
  {
    from: 'RETURN_PENDING',
    event: 'OPEN_DISPUTE',
    to: 'DISPUTED',
    allowedActors: ['OWNER', 'RENTER', 'ADMIN'],
    description: 'New damage, a missing car, or a disagreement over the final bill.',
    effects: ['FREEZE_PAYOUT', 'NOTIFY_OWNER', 'NOTIFY_RENTER'],
  },

  {
    from: 'DISPUTED',
    event: 'RESOLVE_DISPUTE',
    to: 'COMPLETED',
    allowedActors: ['ADMIN'],
    description: 'Support closes the claim and settles the money.',
    effects: ['RELEASE_DEPOSIT', 'SCHEDULE_OWNER_PAYOUT', 'NOTIFY_OWNER', 'NOTIFY_RENTER'],
  },
];

/** Terminal states — nothing leaves them. */
export const TERMINAL_STATUSES: readonly BookingStatus[] = [
  'COMPLETED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED_BY_RENTER',
  'CANCELLED_BY_OWNER',
];

export function isTerminal(status: BookingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** States in which the calendar is committed and the car is unavailable. */
export const BLOCKING_STATUSES: readonly BookingStatus[] = [
  'CONFIRMED',
  'HANDOVER_PENDING',
  'ACTIVE',
  'RETURN_PENDING',
  'DISPUTED',
];

export function blocksCalendar(status: BookingStatus): boolean {
  return BLOCKING_STATUSES.includes(status);
}

/** States where the renter's money is committed in some form. */
export function hasMoneyAtStake(status: BookingStatus): boolean {
  return (
    status === 'APPROVED_AWAITING_PAYMENT' ||
    blocksCalendar(status) ||
    status === 'COMPLETED'
  );
}

export interface TransitionContext {
  readonly actor: BookingActor;
  /** Guards that the orchestration layer has already evaluated. */
  readonly guards?: {
    readonly eligibilityPassed?: boolean;
    readonly paymentMethodOnFile?: boolean;
    readonly handoverSigned?: boolean;
    readonly returnSigned?: boolean;
    readonly ownerVerified?: boolean;
  };
}

export interface TransitionOutcome {
  readonly from: BookingStatus;
  readonly to: BookingStatus;
  readonly event: BookingEvent;
  readonly effects: readonly TransitionEffect[];
  readonly rule: TransitionRule;
}

/**
 * The single legal way to move a booking.
 *
 * Refuses anything that is not an explicit edge, refuses an actor who is not
 * entitled to that edge, and refuses an edge whose guard has not been met.
 */
export function transition(
  current: BookingStatus,
  event: BookingEvent,
  context: TransitionContext,
): Result<TransitionOutcome> {
  if (isTerminal(current)) {
    return err(`A ${humanStatus(current).toLowerCase()} booking cannot change state.`);
  }

  const rule = TRANSITIONS.find((candidate) => candidate.from === current && candidate.event === event);
  if (!rule) {
    return err(`"${event}" is not possible from ${humanStatus(current)}.`);
  }

  // Admins may drive any edge; everyone else must be listed on it.
  if (context.actor !== 'ADMIN' && !rule.allowedActors.includes(context.actor)) {
    return err(`A ${context.actor.toLowerCase()} cannot perform "${event}" here.`);
  }

  const guards = context.guards ?? {};

  if (event === 'DOCUMENTS_COMPLETED' && guards.eligibilityPassed === false) {
    return err('Documents are not complete or have not passed verification.');
  }
  if (event === 'OWNER_APPROVE' && guards.ownerVerified === false) {
    return err('Verify your own identity before approving a booking.');
  }
  if (event === 'PAYMENT_AUTHORIZED' && guards.paymentMethodOnFile === false) {
    return err('No payment method is on file for this booking.');
  }
  if (event === 'HANDOVER_COMPLETED' && guards.handoverSigned === false) {
    return err('Both parties must sign the handover inspection first.');
  }
  if (event === 'RETURN_COMPLETED' && guards.returnSigned === false) {
    return err('Both parties must sign the return inspection first.');
  }

  return ok({ from: current, to: rule.to, event, effects: rule.effects, rule });
}

/** Events an actor can currently fire — used to render the action buttons. */
export function availableEvents(
  status: BookingStatus,
  actor: BookingActor,
): readonly BookingEvent[] {
  if (isTerminal(status)) return [];
  return TRANSITIONS.filter(
    (rule) => rule.from === status && (actor === 'ADMIN' || rule.allowedActors.includes(actor)),
  ).map((rule) => rule.event);
}

export const STATUS_LABELS: Record<BookingStatus, string> = {
  DRAFT: 'Draft',
  PENDING_DOCUMENTS: 'Checking documents',
  AWAITING_OWNER_APPROVAL: 'Waiting for the owner',
  DOCUMENTS_REQUESTED: 'Owner asked for more',
  APPROVED_AWAITING_PAYMENT: 'Approved — payment needed',
  CONFIRMED: 'Confirmed',
  HANDOVER_PENDING: 'Handover in progress',
  ACTIVE: 'Trip in progress',
  RETURN_PENDING: 'Return in progress',
  COMPLETED: 'Completed',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
  CANCELLED_BY_RENTER: 'Cancelled by renter',
  CANCELLED_BY_OWNER: 'Cancelled by owner',
  DISPUTED: 'Under review',
};

export function humanStatus(status: BookingStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/** What each side should be told is happening, in plain language. */
export const STATUS_NARRATIVE: Record<
  BookingStatus,
  { renter: string; owner: string; tone: 'NEUTRAL' | 'GOOD' | 'WARN' | 'BAD' }
> = {
  DRAFT: {
    renter: 'Finish your request to send it to the owner.',
    owner: 'Nothing to do yet.',
    tone: 'NEUTRAL',
  },
  PENDING_DOCUMENTS: {
    renter: 'We are checking your documents. This usually takes a few hours.',
    owner: 'A request is being verified before it reaches you.',
    tone: 'NEUTRAL',
  },
  AWAITING_OWNER_APPROVAL: {
    renter: 'Your documents cleared. The owner is deciding — you have not been charged.',
    owner: 'A verified renter wants your car. Review their profile and decide.',
    tone: 'NEUTRAL',
  },
  DOCUMENTS_REQUESTED: {
    renter: 'The owner asked for one more thing before approving.',
    owner: 'Waiting for the renter to send what you asked for.',
    tone: 'WARN',
  },
  APPROVED_AWAITING_PAYMENT: {
    renter: 'Approved. Complete payment to lock in the trip.',
    owner: 'You approved this trip. Waiting for the renter to pay.',
    tone: 'GOOD',
  },
  CONFIRMED: {
    renter: 'All set. You will get the exact pickup address and the owner\'s number.',
    owner: 'Confirmed and paid. The dates are blocked on your calendar.',
    tone: 'GOOD',
  },
  HANDOVER_PENDING: {
    renter: 'Walk around the car with the owner and sign off on its condition.',
    owner: 'Capture the car\'s condition together before handing over the keys.',
    tone: 'NEUTRAL',
  },
  ACTIVE: {
    renter: 'Enjoy the trip. Return details are in your booking.',
    owner: 'Your car is out on a trip.',
    tone: 'GOOD',
  },
  RETURN_PENDING: {
    renter: 'Return inspection is open — check fuel and mileage together.',
    owner: 'Check the car over and close the inspection.',
    tone: 'NEUTRAL',
  },
  COMPLETED: {
    renter: 'Trip complete. Your deposit is on its way back.',
    owner: 'Trip complete. Your payout is scheduled.',
    tone: 'GOOD',
  },
  DECLINED: {
    renter: 'The owner declined this request. Nothing was charged.',
    owner: 'You declined this request.',
    tone: 'BAD',
  },
  EXPIRED: {
    renter: 'This request expired. Nothing was charged.',
    owner: 'This request expired before it was answered.',
    tone: 'BAD',
  },
  CANCELLED_BY_RENTER: {
    renter: 'You cancelled this booking.',
    owner: 'The renter cancelled.',
    tone: 'BAD',
  },
  CANCELLED_BY_OWNER: {
    renter: 'The owner cancelled. You were refunded in full.',
    owner: 'You cancelled a confirmed booking.',
    tone: 'BAD',
  },
  DISPUTED: {
    renter: 'A claim is open on this trip. Support will be in touch.',
    owner: 'A claim is open on this trip. Your payout is on hold until it closes.',
    tone: 'WARN',
  },
};

/** Ordered milestones for the progress timeline in the UI. */
export const HAPPY_PATH: readonly BookingStatus[] = [
  'PENDING_DOCUMENTS',
  'AWAITING_OWNER_APPROVAL',
  'APPROVED_AWAITING_PAYMENT',
  'CONFIRMED',
  'HANDOVER_PENDING',
  'ACTIVE',
  'RETURN_PENDING',
  'COMPLETED',
];

export function progressIndex(status: BookingStatus): number {
  const index = HAPPY_PATH.indexOf(status);
  if (index >= 0) return index;
  return isTerminal(status) ? HAPPY_PATH.length : 0;
}
