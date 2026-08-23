import { describe, expect, it } from 'vitest';
import { GERMANY, LEBANON } from './countries';
import { computeRefund, previewPolicy, POLICY_SPECS } from './cancellation';
import { money } from './money';
import { assessOwner, assessRisk, type RiskSignals } from './risk';
import {
  PHOTO_REQUIREMENTS,
  estimateRepairCost,
  settleReturn,
  validateInspection,
  type InspectionRecord,
} from './inspection';
import {
  assertBalanced,
  balanceOf,
  entriesForCapture,
  needsReauthorization,
  schedulePayout,
  type PaymentIntent,
} from './ledger';
import { quote, type VehiclePricingProfile } from './pricing';

// --------------------------------------------------------------------------
// Cancellation
// --------------------------------------------------------------------------

const refundInput = {
  country: GERMANY,
  cancelledBy: 'RENTER' as const,
  bookedAt: new Date('2026-02-01T10:00:00Z'),
  tripStart: new Date('2026-03-10T10:00:00Z'),
  rentalAmount: money(20_000, 'EUR'),
  insuranceAmount: money(3_000, 'EUR'),
  extrasAmount: money(1_000, 'EUR'),
  serviceFee: money(2_400, 'EUR'),
  vat: money(1_200, 'EUR'),
  depositHeld: money(50_000, 'EUR'),
};

describe('cancellation', () => {
  it('refunds a flexible booking in full more than 24 hours out', () => {
    const result = computeRefund({ ...refundInput, policy: 'FLEXIBLE', cancelledAt: new Date('2026-03-08T10:00:00Z') });
    expect(result.refundRate).toBe(1);
    expect(result.rentalRefund.amount).toBe(20_000);
    expect(result.serviceFeeRefund.amount).toBe(2_400);
  });

  it('refunds nothing on the rental two hours before a flexible pickup', () => {
    const result = computeRefund({ ...refundInput, policy: 'FLEXIBLE', cancelledAt: new Date('2026-03-10T09:00:00Z') });
    expect(result.rentalRefund.amount).toBe(0);
    // Protection and extras still come back — they were never consumed.
    expect(result.insuranceRefund.amount).toBe(3_000);
    expect(result.extrasRefund.amount).toBe(1_000);
  });

  it('keeps the service fee under a strict policy', () => {
    const result = computeRefund({ ...refundInput, policy: 'STRICT', cancelledAt: new Date('2026-03-05T10:00:00Z') });
    expect(result.serviceFeeRefund.amount).toBe(0);
    expect(POLICY_SPECS.STRICT.serviceFeeRefundable).toBe(false);
  });

  it('honours the post-booking grace window', () => {
    const result = computeRefund({
      ...refundInput,
      policy: 'STRICT',
      bookedAt: new Date('2026-03-01T10:00:00Z'),
      cancelledAt: new Date('2026-03-01T12:00:00Z'),
    });
    expect(result.withinGrace).toBe(true);
    expect(result.refundRate).toBe(1);
    expect(result.serviceFeeRefund.amount).toBe(2_400);
  });

  it('always refunds the renter in full when the owner cancels, and penalises the owner', () => {
    const result = computeRefund({
      ...refundInput,
      policy: 'STRICT',
      cancelledBy: 'OWNER',
      cancelledAt: new Date('2026-03-10T04:00:00Z'),
    });
    expect(result.totalRefund.amount).toBe(20_000 + 3_000 + 1_000 + 2_400 + 1_200);
    expect(result.ownerPenalty.amount).toBeGreaterThan(0);
    expect(result.renterForfeits.amount).toBe(0);
  });

  it('scales the owner penalty with how late they pull out', () => {
    const early = computeRefund({ ...refundInput, policy: 'STRICT', cancelledBy: 'OWNER', cancelledAt: new Date('2026-02-20T10:00:00Z') });
    const late = computeRefund({ ...refundInput, policy: 'STRICT', cancelledBy: 'OWNER', cancelledAt: new Date('2026-03-10T04:00:00Z') });
    expect(late.ownerPenalty.amount).toBeGreaterThan(early.ownerPenalty.amount);
  });

  it('compensates the owner from what the renter forfeits', () => {
    const result = computeRefund({ ...refundInput, policy: 'MODERATE', cancelledAt: new Date('2026-03-10T05:00:00Z') });
    expect(result.renterForfeits.amount).toBeGreaterThan(0);
    expect(result.ownerCompensation.amount).toBeGreaterThan(0);
    expect(result.ownerCompensation.amount).toBeLessThan(result.renterForfeits.amount);
  });

  it('never refunds more than was paid', () => {
    for (const policy of ['FLEXIBLE', 'MODERATE', 'STRICT'] as const) {
      const result = computeRefund({ ...refundInput, policy, cancelledAt: new Date('2026-02-15T10:00:00Z') });
      const paid = 20_000 + 3_000 + 1_000 + 2_400 + 1_200;
      expect(result.totalRefund.amount).toBeLessThanOrEqual(paid);
    }
  });

  it('previews the policy ladder and marks the current rung', () => {
    const preview = previewPolicy({
      policy: 'MODERATE',
      tripStart: new Date('2026-03-10T10:00:00Z'),
      total: money(20_000, 'EUR'),
      now: new Date('2026-03-09T10:00:00Z'),
    });
    expect(preview).toHaveLength(3);
    expect(preview.filter((row) => row.current)).toHaveLength(1);
  });
});

// --------------------------------------------------------------------------
// Risk
// --------------------------------------------------------------------------

const baseSignals: RiskSignals = {
  age: 34,
  licenceHeldMonths: 140,
  documentCompleteness: 100,
  accountAgeDays: 500,
  completedTrips: 12,
  cancelledTripsByRenter: 0,
  averageRating: 4.9,
  liableClaims: 0,
  lateReturns: 0,
  leadTimeHours: 120,
  tripDays: 3,
  vehicleValue: money(1_800_000, 'EUR'),
  vehicleCategory: 'COMPACT',
  crossBorder: false,
  isVisitor: false,
  paymentFlags: 0,
  contactVerified: true,
};

describe('risk assessment', () => {
  it('rates a seasoned, verified renter as low risk', () => {
    const result = assessRisk(baseSignals, GERMANY);
    expect(result.tier).toBe('LOW');
    expect(result.recommendation).toBe('ACCEPT');
  });

  it('explains every point it assigns', () => {
    const result = assessRisk(baseSignals, GERMANY);
    expect(result.factors.length).toBeGreaterThan(0);
    for (const factor of result.factors) {
      expect(factor.explanation.length).toBeGreaterThan(10);
      expect(factor.points).not.toBe(0);
    }
  });

  it('raises the score for a young, newly licensed first-timer', () => {
    const result = assessRisk(
      { ...baseSignals, age: 22, licenceHeldMonths: 8, completedTrips: 0, averageRating: null, accountAgeDays: 1 },
      GERMANY,
    );
    expect(result.score).toBeGreaterThan(assessRisk(baseSignals, GERMANY).score);
    expect(result.tier === 'MEDIUM' || result.tier === 'HIGH').toBe(true);
  });

  it('blocks a renter with a history of claims', () => {
    const result = assessRisk({ ...baseSignals, liableClaims: 3 }, GERMANY);
    expect(result.tier).toBe('BLOCKED');
    expect(result.recommendation).toBe('DECLINE');
  });

  it('blocks a renter with repeated payment failures', () => {
    expect(assessRisk({ ...baseSignals, paymentFlags: 3 }, GERMANY).tier).toBe('BLOCKED');
  });

  it('raises the deposit multiplier as risk rises', () => {
    const low = assessRisk(baseSignals, GERMANY);
    const high = assessRisk({ ...baseSignals, age: 21, licenceHeldMonths: 6, completedTrips: 0, averageRating: 3.2, lateReturns: 2, contactVerified: false, documentCompleteness: 60 }, GERMANY);
    expect(high.depositMultiplier).toBeGreaterThan(low.depositMultiplier);
  });

  it('accounts for the car as well as the driver', () => {
    const compact = assessRisk(baseSignals, GERMANY);
    const supercar = assessRisk({ ...baseSignals, vehicleCategory: 'SPORTS', vehicleValue: money(9_000_000, 'EUR') }, GERMANY);
    expect(supercar.score).toBeGreaterThan(compact.score);
  });

  it('stays inside 0-100', () => {
    const worst = assessRisk(
      { ...baseSignals, age: 21, licenceHeldMonths: 1, documentCompleteness: 0, accountAgeDays: 0, completedTrips: 0, cancelledTripsByRenter: 9, averageRating: 1, liableClaims: 2, lateReturns: 9, leadTimeHours: 1, tripDays: 40, vehicleValue: money(20_000_000, 'EUR'), vehicleCategory: 'SPORTS', crossBorder: true, isVisitor: true, paymentFlags: 2, contactVerified: false },
      GERMANY,
    );
    expect(worst.score).toBeLessThanOrEqual(100);
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(assessRisk(baseSignals, LEBANON).score).toBeGreaterThanOrEqual(0);
  });

  it('offers the owner concrete conditions rather than a bare verdict', () => {
    const result = assessRisk({ ...baseSignals, completedTrips: 0, crossBorder: true, tripDays: 20 }, GERMANY);
    expect(result.suggestedConditions.length).toBeGreaterThan(0);
  });
});

describe('owner reliability', () => {
  it('awards superhost to a fast, well-rated owner', () => {
    const result = assessOwner({
      responseRate: 0.98,
      medianResponseMinutes: 20,
      acceptanceRate: 0.9,
      cancelledByOwner: 0,
      completedTrips: 60,
      averageRating: 4.9,
      accountAgeDays: 900,
      verified: true,
    });
    expect(result.badge).toBe('SUPERHOST');
  });

  it('flags an unreliable owner', () => {
    const result = assessOwner({
      responseRate: 0.4,
      medianResponseMinutes: 2_000,
      acceptanceRate: 0.3,
      cancelledByOwner: 6,
      completedTrips: 8,
      averageRating: 3.5,
      accountAgeDays: 200,
      verified: false,
    });
    expect(result.badge).toBe('AT_RISK');
    expect(result.concerns.length).toBeGreaterThan(0);
  });

  it('marks an owner with no trips as new rather than bad', () => {
    const result = assessOwner({
      responseRate: 1,
      medianResponseMinutes: 10,
      acceptanceRate: 1,
      cancelledByOwner: 0,
      completedTrips: 0,
      averageRating: null,
      accountAgeDays: 3,
      verified: true,
    });
    expect(result.badge).toBe('NEW_HOST');
  });
});

// --------------------------------------------------------------------------
// Inspection & settlement
// --------------------------------------------------------------------------

const allPhotos = Object.fromEntries(PHOTO_REQUIREMENTS.map((req) => [req.code, `https://cdn/${req.code}.jpg`]));

const handover: InspectionRecord = {
  phase: 'HANDOVER',
  odometerKm: 48_000,
  fuelLevel: 1,
  cleanliness: 'CLEAN',
  photos: allPhotos,
  damages: [],
  notes: '',
  ownerSignedAt: new Date('2026-03-10T10:00:00Z'),
  renterSignedAt: new Date('2026-03-10T10:02:00Z'),
  completedAt: new Date('2026-03-10T10:02:00Z'),
};

const settlementBase = {
  country: GERMANY,
  handover,
  includedKm: 750,
  extraKmPrice: 29,
  dailyRate: money(4_800, 'EUR'),
  vehicleValue: money(1_800_000, 'EUR'),
  tankCapacityLitres: 50,
  scheduledReturn: new Date('2026-03-13T10:00:00Z'),
  actualReturn: new Date('2026-03-13T10:00:00Z'),
  cleaningPenalty: 8_000,
  insuranceExcess: money(50_000, 'EUR'),
  depositHeld: money(60_000, 'EUR'),
};

describe('inspection validation', () => {
  it('accepts a complete, dual-signed inspection', () => {
    expect(validateInspection(handover).valid).toBe(true);
  });

  it('lists the photos that are still missing', () => {
    const result = validateInspection({ ...handover, photos: { FRONT: 'x' } });
    expect(result.valid).toBe(false);
    expect(result.missingPhotos.length).toBeGreaterThan(0);
  });

  it('refuses a one-sided signature', () => {
    expect(validateInspection({ ...handover, renterSignedAt: null }).valid).toBe(false);
  });

  it('requires a photo on every damage marker', () => {
    const result = validateInspection({
      ...handover,
      damages: [
        {
          id: 'd1',
          part: 'FRONT_BUMPER',
          position: { x: 0, y: 0, z: 0 },
          severity: 'MINOR',
          description: 'Scuff',
          photoUrls: [],
          preExisting: true,
          recordedAt: new Date(),
          recordedBy: 'OWNER',
        },
      ],
    });
    expect(result.valid).toBe(false);
  });
});

describe('return settlement', () => {
  it('charges nothing for a clean, on-time return within the allowance', () => {
    const result = settleReturn({
      ...settlementBase,
      returned: { ...handover, phase: 'RETURN', odometerKm: 48_400 },
    });
    expect(result.totalDue.amount).toBe(0);
    expect(result.depositReturned.amount).toBe(60_000);
  });

  it('bills excess kilometres', () => {
    const result = settleReturn({
      ...settlementBase,
      returned: { ...handover, phase: 'RETURN', odometerKm: 49_000 },
    });
    expect(result.distanceDriven).toBe(1_000);
    expect(result.excessKm).toBe(250);
    expect(result.lines.find((line) => line.code === 'EXCESS_MILEAGE')!.amount.amount).toBe(250 * 29);
  });

  it('bills the missing fuel at the market service rate', () => {
    const result = settleReturn({
      ...settlementBase,
      returned: { ...handover, phase: 'RETURN', odometerKm: 48_100, fuelLevel: 0.5 },
    });
    const fuel = result.lines.find((line) => line.code === 'FUEL_DIFFERENCE')!;
    expect(fuel.amount.amount).toBe(Math.round(0.5 * 50 * GERMANY.refuelServicePricePerLitre));
  });

  it('does not charge for a fuller tank than it left with', () => {
    const result = settleReturn({
      ...settlementBase,
      returned: { ...handover, phase: 'RETURN', odometerKm: 48_100, fuelLevel: 1 },
    });
    expect(result.lines.some((line) => line.code === 'FUEL_DIFFERENCE')).toBe(false);
  });

  it('absorbs a late return inside the grace period', () => {
    const result = settleReturn({
      ...settlementBase,
      actualReturn: new Date('2026-03-13T10:45:00Z'),
      returned: { ...handover, phase: 'RETURN', odometerKm: 48_100 },
    });
    expect(result.lines.some((line) => line.code === 'LATE_RETURN_FEE')).toBe(false);
  });

  it('bills a late return beyond the grace period', () => {
    const result = settleReturn({
      ...settlementBase,
      actualReturn: new Date('2026-03-13T13:00:00Z'),
      returned: { ...handover, phase: 'RETURN', odometerKm: 48_100 },
    });
    expect(result.lines.some((line) => line.code === 'LATE_RETURN_FEE')).toBe(true);
  });

  it('caps a very late return at one extra rental day', () => {
    const result = settleReturn({
      ...settlementBase,
      actualReturn: new Date('2026-03-15T13:00:00Z'),
      returned: { ...handover, phase: 'RETURN', odometerKm: 48_100 },
    });
    const late = result.lines.find((line) => line.code === 'LATE_RETURN_FEE')!;
    expect(late.amount.amount).toBe(4_800);
  });

  it('ignores damage that was already there at handover', () => {
    const preExisting = {
      id: 'd1',
      part: 'FRONT_BUMPER' as const,
      position: { x: 0, y: 0, z: 0 },
      severity: 'COSMETIC' as const,
      description: 'Old scuff',
      photoUrls: ['x'],
      preExisting: true,
      recordedAt: new Date(),
      recordedBy: 'OWNER' as const,
    };
    const result = settleReturn({
      ...settlementBase,
      handover: { ...handover, damages: [preExisting] },
      returned: { ...handover, phase: 'RETURN', odometerKm: 48_100, damages: [{ ...preExisting, preExisting: false }] },
    });
    expect(result.newDamages).toHaveLength(0);
    expect(result.requiresClaim).toBe(false);
  });

  it('caps a damage charge at the renter protection excess', () => {
    const result = settleReturn({
      ...settlementBase,
      insuranceExcess: money(20_000, 'EUR'),
      returned: {
        ...handover,
        phase: 'RETURN',
        odometerKm: 48_100,
        damages: [
          {
            id: 'd2',
            part: 'DRIVER_SIDE',
            position: { x: 0, y: 0, z: 0 },
            severity: 'MAJOR',
            description: 'Deep dent along the door',
            photoUrls: ['x'],
            preExisting: false,
            recordedAt: new Date(),
            recordedBy: 'OWNER',
          },
        ],
      },
    });
    const damage = result.lines.find((line) => line.code === 'DAMAGE_CHARGE')!;
    expect(damage.amount.amount).toBe(20_000);
    expect(result.requiresClaim).toBe(true);
  });

  it('splits what comes out of the deposit from what is charged beyond it', () => {
    const result = settleReturn({
      ...settlementBase,
      depositHeld: money(10_000, 'EUR'),
      returned: { ...handover, phase: 'RETURN', odometerKm: 50_000 },
    });
    expect(result.fromDeposit.amount).toBe(10_000);
    expect(result.additionalCharge.amount).toBeGreaterThan(0);
    expect(result.depositReturned.amount).toBe(0);
  });

  it('scales repair estimates with severity', () => {
    const value = money(2_000_000, 'EUR');
    const cosmetic = estimateRepairCost({ part: 'DRIVER_SIDE', severity: 'COSMETIC' }, value);
    const structural = estimateRepairCost({ part: 'DRIVER_SIDE', severity: 'STRUCTURAL' }, value);
    expect(structural.amount).toBeGreaterThan(cosmetic.amount * 10);
  });
});

// --------------------------------------------------------------------------
// Ledger
// --------------------------------------------------------------------------

const vehicle: VehiclePricingProfile = {
  dailyRate: money(4_800, 'EUR'),
  category: 'COMPACT',
  estimatedValue: money(1_800_000, 'EUR'),
  includedKmPerDay: 250,
  extraKmPrice: 29,
  weeklyDiscount: 0.15,
  monthlyDiscount: 0.3,
  cleaningFee: 2_000,
  deliveryPricePerKm: 150,
  deliveryFreeRadiusKm: 5,
  minRentalDays: 1,
  maxRentalDays: 60,
  baseDeposit: 60_000,
  ownerType: 'PRIVATE',
};

describe('ledger', () => {
  const priced = quote({
    country: GERMANY,
    vehicle,
    start: new Date('2026-03-02T10:00:00Z'),
    end: new Date('2026-03-05T10:00:00Z'),
    now: new Date('2026-02-01T10:00:00Z'),
    insuranceTier: 'PLUS',
    renterAge: 34,
    renterRiskScore: 20,
  });

  const entries = entriesForCapture({
    bookingId: 'bk_1',
    quote: priced,
    country: GERMANY,
    occurredAt: new Date('2026-03-02T10:05:00Z'),
  });

  it('balances to zero across all accounts', () => {
    expect(assertBalanced(entries)).toBe(true);
  });

  it('debits the renter by exactly what they were quoted', () => {
    expect(balanceOf(entries, 'RENTER').amount).toBe(-priced.renterTotal.amount);
  });

  it('credits the owner their payout net of commission', () => {
    expect(balanceOf(entries, 'OWNER').amount).toBe(priced.ownerPayout.amount);
  });

  it('excludes the deposit hold from every balance', () => {
    const deposit = entries.find((entry) => entry.type === 'DEPOSIT_HOLD')!;
    expect(deposit.isHold).toBe(true);
    expect(balanceOf(entries, 'DEPOSIT_HOLD').amount).toBe(0);
  });

  it('routes VAT to the tax authority', () => {
    expect(balanceOf(entries, 'TAX_AUTHORITY').amount).toBe(priced.vat.amount);
  });
});

describe('payouts', () => {
  it('charges no fee on a SEPA transfer', () => {
    const result = schedulePayout({
      ownerGross: money(20_000, 'EUR'),
      commission: money(3_000, 'EUR'),
      country: GERMANY,
      method: 'SEPA',
      tripEnd: new Date('2026-03-13T10:00:00Z'),
      hasOpenClaim: false,
      ownerVerified: true,
    });
    expect(result.fee.amount).toBe(0);
    expect(result.netAmount.amount).toBe(17_000);
    expect(result.blockers).toHaveLength(0);
  });

  it('charges the Lebanese rail fee', () => {
    const result = schedulePayout({
      ownerGross: money(20_000, 'USD'),
      commission: money(2_400, 'USD'),
      country: LEBANON,
      method: 'OMT',
      tripEnd: new Date('2026-03-13T10:00:00Z'),
      hasOpenClaim: false,
      ownerVerified: true,
    });
    expect(result.fee.amount).toBeGreaterThan(0);
    expect(result.netAmount.amount).toBeLessThan(17_600);
  });

  it('holds the payout while a claim is open', () => {
    const result = schedulePayout({
      ownerGross: money(20_000, 'EUR'),
      commission: money(3_000, 'EUR'),
      country: GERMANY,
      method: 'SEPA',
      tripEnd: new Date('2026-03-13T10:00:00Z'),
      hasOpenClaim: true,
      ownerVerified: true,
    });
    expect(result.blockers.join(' ')).toMatch(/claim/i);
  });

  it('rejects a rail that does not exist in the market', () => {
    const result = schedulePayout({
      ownerGross: money(20_000, 'EUR'),
      commission: money(3_000, 'EUR'),
      country: GERMANY,
      method: 'OMT',
      tripEnd: new Date('2026-03-13T10:00:00Z'),
      hasOpenClaim: false,
      ownerVerified: true,
    });
    expect(result.blockers.join(' ')).toMatch(/not available/i);
  });

  it('respects the market payout delay', () => {
    const de = schedulePayout({ ownerGross: money(1, 'EUR'), commission: money(0, 'EUR'), country: GERMANY, method: 'SEPA', tripEnd: new Date('2026-03-13T10:00:00Z'), hasOpenClaim: false, ownerVerified: true });
    const lb = schedulePayout({ ownerGross: money(1, 'USD'), commission: money(0, 'USD'), country: LEBANON, method: 'WHISH', tripEnd: new Date('2026-03-13T10:00:00Z'), hasOpenClaim: false, ownerVerified: true });
    expect(lb.availableAt.getTime()).toBeGreaterThan(de.availableAt.getTime());
  });
});

describe('payment authorisation', () => {
  const intent: PaymentIntent = {
    id: 'pi_1',
    bookingId: 'bk_1',
    status: 'AUTHORIZED',
    authorizedAmount: money(30_000, 'EUR'),
    capturedAmount: money(0, 'EUR'),
    refundedAmount: money(0, 'EUR'),
    depositHold: money(60_000, 'EUR'),
    provider: 'mock',
    authorizedAt: new Date('2026-03-01T10:00:00Z'),
    capturedAt: null,
    authorizationExpiresAt: new Date('2026-03-08T10:00:00Z'),
  };

  it('flags an authorisation that lapses before pickup', () => {
    expect(needsReauthorization(intent, new Date('2026-03-20T10:00:00Z'))).toBe(true);
  });

  it('leaves a valid authorisation alone', () => {
    expect(needsReauthorization(intent, new Date('2026-03-05T10:00:00Z'))).toBe(false);
  });
});
