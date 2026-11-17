import type { CountryConfig } from './countries';
import { add, money, multiply, zero } from './money';
import type { DamageSeverity, Money, VehiclePart } from './types';

/**
 * Handover and return inspections.
 *
 * The joint walk-around is what makes a peer-to-peer rental defensible. Both
 * parties photograph the same car at the same moment, both sign, and the
 * return is scored against the handover rather than against memory.
 */

export interface PhotoRequirement {
  readonly code: string;
  readonly label: string;
  readonly guidance: string;
  /** Where the camera should be, for the 3D capture guide. */
  readonly cameraAngle: { azimuth: number; elevation: number };
  readonly required: boolean;
}

export const PHOTO_REQUIREMENTS: readonly PhotoRequirement[] = [
  { code: 'FRONT', label: 'Front three-quarter', guidance: 'Stand back two metres so the whole bumper and both headlights are in frame.', cameraAngle: { azimuth: 45, elevation: 10 }, required: true },
  { code: 'REAR', label: 'Rear three-quarter', guidance: 'Include the number plate and both tail lights.', cameraAngle: { azimuth: 225, elevation: 10 }, required: true },
  { code: 'DRIVER_SIDE', label: 'Driver side', guidance: 'Square on, from door mirror to rear wheel arch.', cameraAngle: { azimuth: 270, elevation: 0 }, required: true },
  { code: 'PASSENGER_SIDE', label: 'Passenger side', guidance: 'Square on, both wheels visible.', cameraAngle: { azimuth: 90, elevation: 0 }, required: true },
  { code: 'ROOF', label: 'Roof', guidance: 'From the front corner, angled down across the roof.', cameraAngle: { azimuth: 45, elevation: 55 }, required: false },
  { code: 'DASHBOARD', label: 'Dashboard with ignition on', guidance: 'Odometer and fuel gauge must both be readable.', cameraAngle: { azimuth: 0, elevation: -10 }, required: true },
  { code: 'INTERIOR_FRONT', label: 'Front seats', guidance: 'From the driver door, showing both front seats.', cameraAngle: { azimuth: 300, elevation: 5 }, required: true },
  { code: 'INTERIOR_REAR', label: 'Rear seats and boot', guidance: 'Show the rear bench and the open boot.', cameraAngle: { azimuth: 200, elevation: 5 }, required: false },
  { code: 'WHEELS', label: 'Wheels and tyres', guidance: 'One photo per wheel, close enough to see kerb marks and tread.', cameraAngle: { azimuth: 315, elevation: -25 }, required: true },
];

export interface DamageMarker {
  readonly id: string;
  readonly part: VehiclePart;
  /** Normalised position on the 3D model, so both sides see the same spot. */
  readonly position: { x: number; y: number; z: number };
  readonly severity: DamageSeverity;
  readonly description: string;
  readonly photoUrls: readonly string[];
  /** Present at handover means pre-existing, not the renter's problem. */
  readonly preExisting: boolean;
  readonly recordedAt: Date;
  readonly recordedBy: 'OWNER' | 'RENTER';
}

export interface InspectionRecord {
  readonly phase: 'HANDOVER' | 'RETURN';
  readonly odometerKm: number;
  /** Tank level 0-1, or state of charge for an EV. */
  readonly fuelLevel: number;
  readonly cleanliness: 'CLEAN' | 'ACCEPTABLE' | 'DIRTY' | 'HEAVILY_SOILED';
  readonly photos: Record<string, string>;
  readonly damages: readonly DamageMarker[];
  readonly notes: string;
  readonly ownerSignedAt: Date | null;
  readonly renterSignedAt: Date | null;
  readonly completedAt: Date | null;
}

export interface InspectionValidation {
  readonly valid: boolean;
  readonly missingPhotos: readonly PhotoRequirement[];
  readonly issues: readonly string[];
}

export function validateInspection(record: InspectionRecord): InspectionValidation {
  const issues: string[] = [];
  const missingPhotos = PHOTO_REQUIREMENTS.filter(
    (requirement) => requirement.required && !record.photos[requirement.code],
  );

  if (missingPhotos.length > 0) {
    issues.push(`${missingPhotos.length} required photos are still missing.`);
  }
  if (!Number.isFinite(record.odometerKm) || record.odometerKm < 0) {
    issues.push('Enter the odometer reading.');
  }
  if (record.fuelLevel < 0 || record.fuelLevel > 1) {
    issues.push('Fuel level must be between empty and full.');
  }
  if (!record.ownerSignedAt) issues.push('The owner has not signed yet.');
  if (!record.renterSignedAt) issues.push('The renter has not signed yet.');
  for (const damage of record.damages) {
    if (damage.photoUrls.length === 0) {
      issues.push(`The "${damage.description || damage.part}" marker needs at least one photo.`);
    }
  }

  return { valid: issues.length === 0, missingPhotos, issues };
}

/** Repair estimates by part and severity, as a share of vehicle value. */
const REPAIR_RATE: Record<DamageSeverity, number> = {
  COSMETIC: 0.004,
  MINOR: 0.012,
  MODERATE: 0.035,
  MAJOR: 0.09,
  STRUCTURAL: 0.22,
};

const PART_FACTOR: Record<VehiclePart, number> = {
  FRONT_BUMPER: 1.0,
  REAR_BUMPER: 0.95,
  HOOD: 1.1,
  ROOF: 1.3,
  TRUNK: 0.9,
  DRIVER_SIDE: 1.05,
  PASSENGER_SIDE: 1.05,
  WINDSCREEN: 0.8,
  WHEELS: 0.6,
  INTERIOR: 0.7,
};

export function estimateRepairCost(
  damage: Pick<DamageMarker, 'part' | 'severity'>,
  vehicleValue: Money,
): Money {
  return multiply(vehicleValue, REPAIR_RATE[damage.severity] * PART_FACTOR[damage.part]);
}

export interface ReturnSettlementInput {
  readonly country: CountryConfig;
  readonly handover: InspectionRecord;
  readonly returned: InspectionRecord;
  readonly includedKm: number;
  readonly extraKmPrice: number;
  readonly dailyRate: Money;
  readonly vehicleValue: Money;
  readonly tankCapacityLitres: number;
  readonly scheduledReturn: Date;
  readonly actualReturn: Date;
  readonly cleaningPenalty: number;
  /** Renter's remaining liability from the protection tier. */
  readonly insuranceExcess: Money;
  readonly depositHeld: Money;
}

export interface SettlementLine {
  readonly code: string;
  readonly label: string;
  readonly detail: string;
  readonly amount: Money;
}

export interface ReturnSettlement {
  readonly distanceDriven: number;
  readonly excessKm: number;
  readonly lateMinutes: number;
  readonly newDamages: readonly DamageMarker[];
  readonly lines: readonly SettlementLine[];
  readonly totalDue: Money;
  /** Taken from the deposit. */
  readonly fromDeposit: Money;
  /** Charged to the payment method beyond the deposit. */
  readonly additionalCharge: Money;
  readonly depositReturned: Money;
  readonly requiresClaim: boolean;
  readonly notes: readonly string[];
}

/**
 * Settles a return.
 *
 * Everything here is derived by comparing two inspection records, which is
 * why the handover walk-around is mandatory: without it there is no baseline
 * and every scratch becomes an argument.
 */
export function settleReturn(input: ReturnSettlementInput): ReturnSettlement {
  const currency = input.dailyRate.currency;
  const lines: SettlementLine[] = [];
  const notes: string[] = [];

  // ---- Distance -----------------------------------------------------------
  const distanceDriven = Math.max(0, input.returned.odometerKm - input.handover.odometerKm);
  const excessKm = Number.isFinite(input.includedKm)
    ? Math.max(0, distanceDriven - input.includedKm)
    : 0;

  if (excessKm > 0) {
    const amount = money(Math.round(excessKm * input.extraKmPrice), currency);
    lines.push({
      code: 'EXCESS_MILEAGE',
      label: 'Extra kilometres',
      detail: `${distanceDriven} km driven, ${input.includedKm} included — ${excessKm} km × ${(input.extraKmPrice / 100).toFixed(2)}`,
      amount,
    });
  } else if (Number.isFinite(input.includedKm)) {
    notes.push(`${distanceDriven} km driven, within the ${input.includedKm} km allowance.`);
  }

  // ---- Fuel ---------------------------------------------------------------
  const fuelDelta = input.handover.fuelLevel - input.returned.fuelLevel;
  if (fuelDelta > 0.03) {
    const litres = fuelDelta * input.tankCapacityLitres;
    const amount = money(Math.round(litres * input.country.refuelServicePricePerLitre), currency);
    lines.push({
      code: 'FUEL_DIFFERENCE',
      label: 'Refuelling',
      detail: `Returned ${Math.round(fuelDelta * 100)}% lower — about ${litres.toFixed(1)} litres`,
      amount,
    });
  } else if (fuelDelta < -0.03) {
    notes.push('The car came back with more fuel than it left with. No charge, and thank you.');
  }

  // ---- Late return ---------------------------------------------------------
  const lateMinutes = Math.max(
    0,
    Math.round((input.actualReturn.getTime() - input.scheduledReturn.getTime()) / 60_000),
  );
  if (lateMinutes > input.country.lateReturnGraceMinutes) {
    const billableMinutes = lateMinutes - input.country.lateReturnGraceMinutes;
    const hours = Math.ceil(billableMinutes / 60);
    // Capped at a full extra day — a late return should not exceed re-renting.
    const hourly = multiply(input.dailyRate, input.country.lateReturnHourlyRateOfDaily);
    const uncapped = multiply(hourly, hours);
    const amount = uncapped.amount > input.dailyRate.amount ? input.dailyRate : uncapped;
    lines.push({
      code: 'LATE_RETURN_FEE',
      label: 'Late return',
      detail:
        amount.amount === input.dailyRate.amount
          ? `${hours} hours late — capped at one extra rental day`
          : `${hours} started ${hours === 1 ? 'hour' : 'hours'} past the ${input.country.lateReturnGraceMinutes}-minute grace period`,
      amount,
    });
  }

  // ---- Cleaning -------------------------------------------------------------
  if (input.returned.cleanliness === 'HEAVILY_SOILED') {
    lines.push({
      code: 'CLEANING_PENALTY',
      label: 'Deep cleaning',
      detail: 'The car was returned heavily soiled.',
      amount: money(input.cleaningPenalty, currency),
    });
  } else if (input.returned.cleanliness === 'DIRTY' && input.handover.cleanliness === 'CLEAN') {
    lines.push({
      code: 'CLEANING_PENALTY',
      label: 'Cleaning',
      detail: 'Returned noticeably dirtier than it was handed over.',
      amount: money(Math.round(input.cleaningPenalty * 0.4), currency),
    });
  }

  // ---- New damage -----------------------------------------------------------
  const preExistingKeys = new Set(
    input.handover.damages.map((damage) => `${damage.part}:${damage.severity}`),
  );
  const newDamages = input.returned.damages.filter(
    (damage) => !damage.preExisting && !preExistingKeys.has(`${damage.part}:${damage.severity}`),
  );

  let damageTotal = zero(currency);
  for (const damage of newDamages) {
    damageTotal = add(damageTotal, estimateRepairCost(damage, input.vehicleValue));
  }

  if (newDamages.length > 0) {
    // The renter never pays more than their protection excess for damage.
    const chargeable =
      damageTotal.amount > input.insuranceExcess.amount ? input.insuranceExcess : damageTotal;
    lines.push({
      code: 'DAMAGE_CHARGE',
      label: `New damage (${newDamages.length})`,
      detail:
        damageTotal.amount > input.insuranceExcess.amount
          ? `Estimated repair ${(damageTotal.amount / 100).toFixed(2)}, capped at your ${(input.insuranceExcess.amount / 100).toFixed(2)} excess`
          : `Estimated repair cost, below your ${(input.insuranceExcess.amount / 100).toFixed(2)} excess`,
      amount: chargeable,
    });
    notes.push(
      'New damage opens a claim. Nothing is taken from your deposit until both sides have had a chance to comment.',
    );
  }

  const totalDue = lines.length > 0 ? add(...lines.map((line) => line.amount)) : zero(currency);

  const fromDeposit = money(Math.min(totalDue.amount, input.depositHeld.amount), currency);
  const additionalCharge = money(Math.max(0, totalDue.amount - input.depositHeld.amount), currency);
  const depositReturned = money(Math.max(0, input.depositHeld.amount - totalDue.amount), currency);

  return {
    distanceDriven,
    excessKm,
    lateMinutes,
    newDamages,
    lines,
    totalDue,
    fromDeposit,
    additionalCharge,
    depositReturned,
    requiresClaim: newDamages.length > 0,
    notes,
  };
}

/** Deterministic 3D anchor points for each part, used by the damage inspector. */
export const PART_ANCHORS: Record<VehiclePart, { x: number; y: number; z: number }> = {
  FRONT_BUMPER: { x: 0, y: 0.35, z: 2.05 },
  REAR_BUMPER: { x: 0, y: 0.4, z: -2.05 },
  HOOD: { x: 0, y: 0.78, z: 1.25 },
  ROOF: { x: 0, y: 1.42, z: -0.1 },
  TRUNK: { x: 0, y: 0.92, z: -1.65 },
  DRIVER_SIDE: { x: -0.95, y: 0.7, z: 0 },
  PASSENGER_SIDE: { x: 0.95, y: 0.7, z: 0 },
  WINDSCREEN: { x: 0, y: 1.15, z: 0.72 },
  WHEELS: { x: -0.86, y: 0.34, z: 1.35 },
  INTERIOR: { x: 0, y: 0.95, z: 0.1 },
};

export const PART_LABELS: Record<VehiclePart, string> = {
  FRONT_BUMPER: 'Front bumper',
  REAR_BUMPER: 'Rear bumper',
  HOOD: 'Bonnet',
  ROOF: 'Roof',
  TRUNK: 'Boot',
  DRIVER_SIDE: 'Driver side',
  PASSENGER_SIDE: 'Passenger side',
  WINDSCREEN: 'Windscreen',
  WHEELS: 'Wheels & tyres',
  INTERIOR: 'Interior',
};

export const SEVERITY_LABELS: Record<DamageSeverity, string> = {
  COSMETIC: 'Cosmetic — scuff or light scratch',
  MINOR: 'Minor — small dent or deep scratch',
  MODERATE: 'Moderate — surface damage',
  MAJOR: 'Major — surface replacement',
  STRUCTURAL: 'Structural — frame or safety system',
};
