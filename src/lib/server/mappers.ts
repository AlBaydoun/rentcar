import type { Booking, Document, User, Vehicle } from '@prisma/client';
import { getCountry } from '@/lib/domain/countries';
import type { StoredDocument, RenterProfileForChecks } from '@/lib/domain/documents';
import type { VehiclePricingProfile } from '@/lib/domain/pricing';
import type { OwnerSignals, RiskSignals } from '@/lib/domain/risk';
import { DEFAULT_AVAILABILITY_RULES, type AvailabilityRules } from '@/lib/domain/availability';
import { money } from '@/lib/domain/money';
import type {
  CountryCode,
  DocumentType,
  OwnerType,
  VehicleCategory,
  VerificationStatus,
} from '@/lib/domain/types';

/**
 * Translation between persistence rows and the domain's own shapes.
 *
 * The domain layer knows nothing about Prisma, and nothing about JSON columns.
 * Every conversion lives here so the rules stay portable and the storage
 * details stay in one place.
 */

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toStoredDocument(row: Document): StoredDocument {
  return {
    id: row.id,
    type: row.type as DocumentType,
    status: row.status as VerificationStatus,
    issuingCountry: row.issuingCountry,
    documentNumber: row.documentNumber ?? undefined,
    holderName: row.holderName ?? undefined,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
    rejectionReason: row.rejectionReason,
    reviewedAt: row.reviewedAt,
  };
}

export function toRenterProfile(
  user: User,
  documents: readonly Document[],
): RenterProfileForChecks {
  return {
    fullName: user.fullName,
    dateOfBirth: user.dateOfBirth,
    residenceCountry: user.residenceCountry,
    documents: documents.map(toStoredDocument),
  };
}

export function toPricingProfile(vehicle: Vehicle): VehiclePricingProfile {
  const country = getCountry(vehicle.country as CountryCode);
  return {
    dailyRate: money(vehicle.dailyRate, country.currency),
    category: vehicle.category as VehicleCategory,
    estimatedValue: money(vehicle.estimatedValue, country.currency),
    includedKmPerDay: vehicle.includedKmPerDay,
    extraKmPrice: vehicle.extraKmPrice,
    weeklyDiscount: vehicle.weeklyDiscount,
    monthlyDiscount: vehicle.monthlyDiscount,
    cleaningFee: vehicle.cleaningFee,
    deliveryPricePerKm: vehicle.deliveryPricePerKm,
    deliveryFreeRadiusKm: vehicle.deliveryFreeRadiusKm,
    minRentalDays: vehicle.minRentalDays,
    maxRentalDays: vehicle.maxRentalDays,
    baseDeposit: vehicle.baseDeposit,
    ownerType: 'PRIVATE',
  };
}

export function toAvailabilityRules(vehicle: Vehicle): AvailabilityRules {
  const blocked = vehicle.blockedWeekdays
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

  return {
    ...DEFAULT_AVAILABILITY_RULES,
    bufferHours: vehicle.bufferHours,
    advanceNoticeHours: vehicle.advanceNoticeHours,
    bookingHorizonDays: vehicle.bookingHorizonDays,
    minRentalDays: vehicle.minRentalDays,
    maxRentalDays: vehicle.maxRentalDays,
    blockedWeekdays: blocked,
    pickupWindow: [vehicle.pickupWindowStart, vehicle.pickupWindowEnd],
  };
}

export function ownerTypeOf(user: User): OwnerType {
  return user.ownerType === 'BUSINESS' ? 'BUSINESS' : 'PRIVATE';
}

export function averageRating(sum: number, count: number): number | null {
  return count === 0 ? null : sum / count;
}

export function toRiskSignals(params: {
  renter: User;
  documentCompleteness: number;
  licenceHeldMonths: number | null;
  age: number;
  vehicle: Vehicle;
  tripDays: number;
  leadTimeHours: number;
  crossBorder: boolean;
}): RiskSignals {
  const country = getCountry(params.vehicle.country as CountryCode);
  return {
    age: params.age,
    licenceHeldMonths: params.licenceHeldMonths,
    documentCompleteness: params.documentCompleteness,
    accountAgeDays: Math.floor((Date.now() - params.renter.createdAt.getTime()) / 86_400_000),
    completedTrips: params.renter.completedTripsAsRenter,
    cancelledTripsByRenter: params.renter.cancelledAsRenter,
    averageRating: averageRating(params.renter.ratingAsRenterSum, params.renter.ratingAsRenterCount),
    liableClaims: params.renter.liableClaims,
    lateReturns: params.renter.lateReturns,
    leadTimeHours: params.leadTimeHours,
    tripDays: params.tripDays,
    vehicleValue: money(params.vehicle.estimatedValue, country.currency),
    vehicleCategory: params.vehicle.category as VehicleCategory,
    crossBorder: params.crossBorder,
    isVisitor: params.renter.residenceCountry.toUpperCase() !== params.vehicle.country,
    paymentFlags: params.renter.paymentFlags,
    contactVerified: Boolean(params.renter.emailVerifiedAt && params.renter.phoneVerifiedAt),
  };
}

export function toOwnerSignals(owner: User): OwnerSignals {
  return {
    responseRate: owner.requestsReceived === 0 ? 1 : owner.requestsAnswered / owner.requestsReceived,
    medianResponseMinutes:
      owner.responseCount === 0 ? 30 : Math.round(owner.responseTotalMinutes / owner.responseCount),
    acceptanceRate:
      owner.requestsAnswered === 0 ? 1 : owner.requestsApproved / owner.requestsAnswered,
    cancelledByOwner: owner.cancelledAsOwner,
    completedTrips: owner.completedTripsAsOwner,
    averageRating: averageRating(owner.ratingAsOwnerSum, owner.ratingAsOwnerCount),
    accountAgeDays: Math.floor((Date.now() - owner.createdAt.getTime()) / 86_400_000),
    verified: owner.verificationStatus === 'VERIFIED',
  };
}

/** Public shape of a vehicle — never leaks the exact address or plate. */
export function toPublicVehicle(vehicle: Vehicle, owner?: User) {
  const country = getCountry(vehicle.country as CountryCode);
  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    year: vehicle.year,
    category: vehicle.category as VehicleCategory,
    transmission: vehicle.transmission,
    fuelType: vehicle.fuelType,
    seats: vehicle.seats,
    doors: vehicle.doors,
    powerHp: vehicle.powerHp,
    colour: vehicle.colour,
    country: vehicle.country as CountryCode,
    currency: country.currency,
    city: vehicle.city,
    // Approximate location only — the exact address appears on confirmation.
    lat: vehicle.areaLat,
    lng: vehicle.areaLng,
    dailyRate: vehicle.dailyRate,
    cleaningFee: vehicle.cleaningFee,
    baseDeposit: vehicle.baseDeposit,
    includedKmPerDay: vehicle.includedKmPerDay,
    extraKmPrice: vehicle.extraKmPrice,
    weeklyDiscount: vehicle.weeklyDiscount,
    monthlyDiscount: vehicle.monthlyDiscount,
    minRentalDays: vehicle.minRentalDays,
    maxRentalDays: vehicle.maxRentalDays,
    instantBook: vehicle.instantBook,
    cancellationPolicy: vehicle.cancellationPolicy,
    deliveryAvailable: vehicle.deliveryAvailable,
    deliveryPricePerKm: vehicle.deliveryPricePerKm,
    deliveryFreeRadiusKm: vehicle.deliveryFreeRadiusKm,
    smokingAllowed: vehicle.smokingAllowed,
    petsAllowed: vehicle.petsAllowed,
    crossBorderAllowed: vehicle.crossBorderAllowed,
    features: parseJson<string[]>(vehicle.features, []),
    photos: parseJson<string[]>(vehicle.photos, []),
    description: vehicle.description,
    status: vehicle.status,
    tripCount: vehicle.tripCount,
    rating: averageRating(vehicle.ratingSum, vehicle.ratingCount),
    ratingCount: vehicle.ratingCount,
    // Masked: "B-MW 1234" becomes "B-•• 1234"
    licensePlateMasked: maskPlate(vehicle.licensePlate),
    owner: owner
      ? {
          id: owner.id,
          firstName: owner.fullName.split(' ')[0],
          avatarUrl: owner.avatarUrl,
          verificationStatus: owner.verificationStatus,
          memberSince: owner.createdAt,
          reliability: toOwnerSignals(owner),
        }
      : null,
  };
}

export type PublicVehicle = ReturnType<typeof toPublicVehicle>;

export function maskPlate(plate: string): string {
  if (plate.length <= 3) return '•••';
  return `${plate.slice(0, 2)}••${plate.slice(-4)}`;
}

export function bookingReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let index = 0; index < 8; index += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `KR-${out.slice(0, 4)}-${out.slice(4)}`;
}

export function toBookingSummary(booking: Booking) {
  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    startAt: booking.startAt,
    endAt: booking.endAt,
    days: booking.days,
    currency: booking.currency,
    renterTotal: booking.renterTotal,
    deposit: booking.deposit,
    ownerPayout: booking.ownerPayout,
    insuranceTier: booking.insuranceTier,
    approvalDeadline: booking.approvalDeadline,
    riskScore: booking.riskScore,
    riskTier: booking.riskTier,
    createdAt: booking.createdAt,
  };
}
