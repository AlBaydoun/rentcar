import type { CountryConfig } from './countries';
import { add, money, multiply, subtract, zero } from './money';
import type { CancellationPolicy, Money } from './types';

/**
 * Cancellation and refunds.
 *
 * The owner picks a policy when they list the car; the renter sees exactly
 * what it will cost them before they commit, and the same function computes
 * the actual refund later. One implementation, quoted and enforced.
 */

export interface PolicySpec {
  readonly policy: CancellationPolicy;
  readonly name: string;
  readonly summary: string;
  /** Tiers evaluated in order; the first whose threshold is met applies. */
  readonly tiers: readonly {
    /** Hours before pickup at or above which this tier applies. */
    readonly hoursBefore: number;
    /** Share of the rental refunded, 0-1. */
    readonly refundRate: number;
    readonly label: string;
  }[];
  /** Service fee refunded when the renter cancels. */
  readonly serviceFeeRefundable: boolean;
  /** Free-cancellation grace window after booking, in hours. */
  readonly graceHours: number;
}

export const POLICY_SPECS: Record<CancellationPolicy, PolicySpec> = {
  FLEXIBLE: {
    policy: 'FLEXIBLE',
    name: 'Flexible',
    summary: 'Full refund up to 24 hours before pickup.',
    tiers: [
      { hoursBefore: 24, refundRate: 1, label: 'More than 24 hours before pickup' },
      { hoursBefore: 2, refundRate: 0.5, label: 'Between 2 and 24 hours before pickup' },
      { hoursBefore: 0, refundRate: 0, label: 'Less than 2 hours before pickup' },
    ],
    serviceFeeRefundable: true,
    graceHours: 1,
  },
  MODERATE: {
    policy: 'MODERATE',
    name: 'Moderate',
    summary: 'Full refund up to 3 days before pickup, half up to 24 hours.',
    tiers: [
      { hoursBefore: 72, refundRate: 1, label: 'More than 3 days before pickup' },
      { hoursBefore: 24, refundRate: 0.5, label: 'Between 1 and 3 days before pickup' },
      { hoursBefore: 0, refundRate: 0, label: 'Less than 24 hours before pickup' },
    ],
    serviceFeeRefundable: false,
    graceHours: 24,
  },
  STRICT: {
    policy: 'STRICT',
    name: 'Strict',
    summary: 'Half refunded up to 7 days before pickup, nothing after.',
    tiers: [
      { hoursBefore: 168, refundRate: 1, label: 'More than 7 days before pickup' },
      { hoursBefore: 48, refundRate: 0.5, label: 'Between 2 and 7 days before pickup' },
      { hoursBefore: 0, refundRate: 0, label: 'Less than 48 hours before pickup' },
    ],
    serviceFeeRefundable: false,
    graceHours: 48,
  },
};

export interface RefundInput {
  readonly policy: CancellationPolicy;
  readonly country: CountryConfig;
  readonly cancelledBy: 'RENTER' | 'OWNER' | 'ADMIN';
  readonly bookedAt: Date;
  readonly tripStart: Date;
  readonly cancelledAt: Date;
  /** What the renter actually paid, split into its parts. */
  readonly rentalAmount: Money;
  readonly insuranceAmount: Money;
  readonly extrasAmount: Money;
  readonly serviceFee: Money;
  readonly vat: Money;
  readonly depositHeld: Money;
}

export interface RefundBreakdown {
  readonly refundRate: number;
  readonly tierLabel: string;
  readonly withinGrace: boolean;
  readonly rentalRefund: Money;
  readonly insuranceRefund: Money;
  readonly extrasRefund: Money;
  readonly serviceFeeRefund: Money;
  readonly vatRefund: Money;
  readonly totalRefund: Money;
  readonly depositReleased: Money;
  /** What the renter does not get back. */
  readonly renterForfeits: Money;
  /** Compensation paid to the owner out of the non-refunded amount. */
  readonly ownerCompensation: Money;
  /** Penalty charged to the owner when they cancel a confirmed trip. */
  readonly ownerPenalty: Money;
  readonly explanation: readonly string[];
}

/**
 * Owner cancellations are asymmetric on purpose: a renter left without a car
 * on the morning of a trip is a far worse outcome than an empty slot on an
 * owner's calendar, so the owner always refunds in full and pays a penalty
 * that scales with how late they pulled out.
 */
function ownerPenaltyFor(hoursBefore: number, rental: Money): Money {
  if (hoursBefore >= 168) return multiply(rental, 0.05);
  if (hoursBefore >= 48) return multiply(rental, 0.15);
  if (hoursBefore >= 12) return multiply(rental, 0.3);
  return multiply(rental, 0.5);
}

export function computeRefund(input: RefundInput): RefundBreakdown {
  const spec = POLICY_SPECS[input.policy];
  const currency = input.rentalAmount.currency;
  const explanation: string[] = [];

  const hoursBefore = (input.tripStart.getTime() - input.cancelledAt.getTime()) / 3_600_000;
  const hoursSinceBooking = (input.cancelledAt.getTime() - input.bookedAt.getTime()) / 3_600_000;

  // --- Owner or admin cancels: renter is made whole, full stop. -----------
  if (input.cancelledBy !== 'RENTER') {
    const total = add(
      input.rentalAmount,
      input.insuranceAmount,
      input.extrasAmount,
      input.serviceFee,
      input.vat,
    );
    const penalty =
      input.cancelledBy === 'OWNER' ? ownerPenaltyFor(hoursBefore, input.rentalAmount) : zero(currency);
    explanation.push(
      input.cancelledBy === 'OWNER'
        ? 'The owner cancelled, so everything you paid is refunded in full.'
        : 'KarRent cancelled this booking, so everything you paid is refunded in full.',
    );
    if (penalty.amount > 0) {
      explanation.push(
        `The owner is charged a ${Math.round((penalty.amount / input.rentalAmount.amount) * 100)}% ` +
          'cancellation penalty, which funds your rebooking credit.',
      );
    }
    return {
      refundRate: 1,
      tierLabel: 'Cancelled by the owner',
      withinGrace: false,
      rentalRefund: input.rentalAmount,
      insuranceRefund: input.insuranceAmount,
      extrasRefund: input.extrasAmount,
      serviceFeeRefund: input.serviceFee,
      vatRefund: input.vat,
      totalRefund: total,
      depositReleased: input.depositHeld,
      renterForfeits: zero(currency),
      ownerCompensation: zero(currency),
      ownerPenalty: penalty,
      explanation,
    };
  }

  // --- Renter cancels ------------------------------------------------------
  // A grace window right after booking always refunds in full — it covers the
  // honest mis-click, and it is cheaper than the support ticket.
  const withinGrace = hoursSinceBooking <= spec.graceHours && hoursBefore > 24;

  const tier = withinGrace
    ? { hoursBefore: 0, refundRate: 1, label: `Within the ${spec.graceHours}-hour grace window` }
    : spec.tiers.find((candidate) => hoursBefore >= candidate.hoursBefore) ??
      spec.tiers[spec.tiers.length - 1];

  const refundRate = tier.refundRate;

  const rentalRefund = multiply(input.rentalAmount, refundRate);
  // Protection and extras are never consumed on a cancelled trip, so they
  // come back in full regardless of the rental refund rate.
  const insuranceRefund = input.insuranceAmount;
  const extrasRefund = input.extrasAmount;
  const serviceFeeRefund =
    spec.serviceFeeRefundable || withinGrace ? input.serviceFee : zero(currency);

  const refundedNet = add(rentalRefund, insuranceRefund, extrasRefund, serviceFeeRefund);
  const paidNet = add(input.rentalAmount, input.insuranceAmount, input.extrasAmount, input.serviceFee);
  // VAT follows the amount actually refunded.
  const vatRefund =
    paidNet.amount === 0
      ? zero(currency)
      : money(Math.round((input.vat.amount * refundedNet.amount) / paidNet.amount), currency);

  const totalRefund = add(refundedNet, vatRefund);
  const totalPaid = add(paidNet, input.vat);
  const renterForfeits = subtract(totalPaid, totalRefund);

  // The owner keeps their commission-net share of the forfeited rental.
  const forfeitedRental = subtract(input.rentalAmount, rentalRefund);
  const ownerCompensation = multiply(forfeitedRental, 1 - input.country.ownerCommissionRate);

  explanation.push(`${spec.name} policy: ${tier.label.toLowerCase()}.`);
  if (withinGrace) {
    explanation.push(
      `You cancelled within ${spec.graceHours} hours of booking, so this is a full refund.`,
    );
  } else if (refundRate === 1) {
    explanation.push('The rental is refunded in full.');
  } else if (refundRate === 0) {
    explanation.push('The rental is not refundable this close to pickup.');
  } else {
    explanation.push(`${Math.round(refundRate * 100)}% of the rental is refunded.`);
  }
  if (insuranceRefund.amount > 0) {
    explanation.push('Protection and extras are refunded in full — the trip never started.');
  }
  if (!spec.serviceFeeRefundable && !withinGrace && input.serviceFee.amount > 0) {
    explanation.push('The service fee is not refundable under this policy.');
  }
  explanation.push(
    `Your security deposit is released in full within ${input.country.depositReleaseDays} days.`,
  );

  return {
    refundRate,
    tierLabel: tier.label,
    withinGrace,
    rentalRefund,
    insuranceRefund,
    extrasRefund,
    serviceFeeRefund,
    vatRefund,
    totalRefund,
    depositReleased: input.depositHeld,
    renterForfeits,
    ownerCompensation,
    ownerPenalty: zero(currency),
    explanation,
  };
}

/**
 * The "if you cancel" table shown before booking. Being explicit up front is
 * what stops a cancellation from becoming a dispute.
 */
export function previewPolicy(params: {
  policy: CancellationPolicy;
  tripStart: Date;
  total: Money;
  now?: Date;
}): readonly { window: string; refund: Money; rate: number; current: boolean }[] {
  const spec = POLICY_SPECS[params.policy];
  const now = params.now ?? new Date();
  const hoursBefore = (params.tripStart.getTime() - now.getTime()) / 3_600_000;
  const activeTier = spec.tiers.find((tier) => hoursBefore >= tier.hoursBefore) ?? spec.tiers.at(-1)!;

  return spec.tiers.map((tier) => ({
    window: tier.label,
    refund: multiply(params.total, tier.refundRate),
    rate: tier.refundRate,
    current: tier === activeTier,
  }));
}
