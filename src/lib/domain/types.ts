/**
 * KarRent domain types.
 *
 * The database is SQLite in development and PostgreSQL in production, so the
 * schema deliberately avoids native enums. Every "enum" lives here as a const
 * tuple + derived union: one source of truth that works for TypeScript,
 * runtime validation (zod) and the persistence layer alike.
 */

export const COUNTRIES = ['DE', 'LB'] as const;
export type CountryCode = (typeof COUNTRIES)[number];

export const CURRENCIES = ['EUR', 'USD', 'LBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const USER_ROLES = ['RENTER', 'OWNER', 'BOTH', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Whether an owner rents privately or as a registered business (drives VAT). */
export const OWNER_TYPES = ['PRIVATE', 'BUSINESS'] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];

export const VERIFICATION_STATUSES = [
  'UNVERIFIED',
  'PENDING',
  'IN_REVIEW',
  'VERIFIED',
  'REJECTED',
  'EXPIRED',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const DOCUMENT_TYPES = [
  'DRIVING_LICENSE',
  'PASSPORT',
  'NATIONAL_ID',
  'RESIDENCE_PERMIT',
  'INTERNATIONAL_DRIVING_PERMIT',
  'PROOF_OF_ADDRESS',
  'SELFIE_LIVENESS',
  'VEHICLE_REGISTRATION',
  'VEHICLE_INSURANCE',
  'TECHNICAL_INSPECTION',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const VEHICLE_CATEGORIES = [
  'CITY',
  'ECONOMY',
  'COMPACT',
  'SEDAN',
  'ESTATE',
  'SUV',
  'VAN',
  'PICKUP',
  'LUXURY',
  'SPORTS',
  'CONVERTIBLE',
  'ELECTRIC',
] as const;
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

export const TRANSMISSIONS = ['MANUAL', 'AUTOMATIC'] as const;
export type Transmission = (typeof TRANSMISSIONS)[number];

export const FUEL_TYPES = ['PETROL', 'DIESEL', 'HYBRID', 'PLUGIN_HYBRID', 'ELECTRIC', 'LPG'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const VEHICLE_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'LISTED',
  'PAUSED',
  'SUSPENDED',
  'ARCHIVED',
] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const INSURANCE_TIERS = ['BASIC', 'PLUS', 'MAX'] as const;
export type InsuranceTier = (typeof INSURANCE_TIERS)[number];

export const CANCELLATION_POLICIES = ['FLEXIBLE', 'MODERATE', 'STRICT'] as const;
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

/**
 * Booking lifecycle. Transitions and their guards live in
 * `booking-state-machine.ts` — this list is only the vocabulary.
 */
export const BOOKING_STATUSES = [
  'DRAFT',
  'PENDING_DOCUMENTS',
  'AWAITING_OWNER_APPROVAL',
  'DOCUMENTS_REQUESTED',
  'APPROVED_AWAITING_PAYMENT',
  'CONFIRMED',
  'HANDOVER_PENDING',
  'ACTIVE',
  'RETURN_PENDING',
  'COMPLETED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED_BY_RENTER',
  'CANCELLED_BY_OWNER',
  'DISPUTED',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_ACTORS = ['RENTER', 'OWNER', 'ADMIN', 'SYSTEM'] as const;
export type BookingActor = (typeof BOOKING_ACTORS)[number];

export const RISK_TIERS = ['LOW', 'MEDIUM', 'HIGH', 'BLOCKED'] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

export const EXTRA_CODES = [
  'ADDITIONAL_DRIVER',
  'CHILD_SEAT',
  'BOOSTER_SEAT',
  'GPS',
  'WIFI_HOTSPOT',
  'ROOF_RACK',
  'SKI_RACK',
  'SNOW_CHAINS',
  'WINTER_TYRES',
  'CROSS_BORDER_PERMIT',
  'FUEL_PREPAID',
  'UNLIMITED_KM',
  'AIRPORT_PICKUP',
] as const;
export type ExtraCode = (typeof EXTRA_CODES)[number];

export const LEDGER_ENTRY_TYPES = [
  'RENTAL_CHARGE',
  'EXTRAS_CHARGE',
  'INSURANCE_CHARGE',
  'SERVICE_FEE',
  'DELIVERY_FEE',
  'CLEANING_FEE',
  'YOUNG_DRIVER_FEE',
  'CROSS_BORDER_FEE',
  'VAT',
  'DEPOSIT_HOLD',
  'DEPOSIT_RELEASE',
  'DEPOSIT_CAPTURE',
  'OWNER_PAYOUT',
  'PLATFORM_COMMISSION',
  'REFUND',
  'EXCESS_MILEAGE',
  'FUEL_DIFFERENCE',
  'LATE_RETURN_FEE',
  'DAMAGE_CHARGE',
  'CLEANING_PENALTY',
  'TRAFFIC_FINE',
] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const PAYMENT_STATUSES = [
  'NONE',
  'AUTHORIZATION_PENDING',
  'AUTHORIZED',
  'CAPTURED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FAILED',
  'VOIDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYOUT_METHODS = ['SEPA', 'WHISH', 'OMT', 'CASH', 'BANK_TRANSFER_LB'] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const CLAIM_STATUSES = [
  'OPEN',
  'EVIDENCE_REQUESTED',
  'UNDER_REVIEW',
  'RESOLVED_RENTER_LIABLE',
  'RESOLVED_OWNER_LIABLE',
  'RESOLVED_NO_FAULT',
  'WITHDRAWN',
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const DAMAGE_SEVERITIES = ['COSMETIC', 'MINOR', 'MODERATE', 'MAJOR', 'STRUCTURAL'] as const;
export type DamageSeverity = (typeof DAMAGE_SEVERITIES)[number];

/** The nine inspectable zones of the 3D vehicle model. */
export const VEHICLE_PARTS = [
  'FRONT_BUMPER',
  'REAR_BUMPER',
  'HOOD',
  'ROOF',
  'TRUNK',
  'DRIVER_SIDE',
  'PASSENGER_SIDE',
  'WINDSCREEN',
  'WHEELS',
  'INTERIOR',
] as const;
export type VehiclePart = (typeof VEHICLE_PARTS)[number];

/** Money is always integer minor units (cents / piastres) + a currency. */
export interface Money {
  readonly amount: number;
  readonly currency: Currency;
}

export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

/** A single auditable line in a price quote. */
export interface PriceLine {
  readonly code: string;
  readonly label: string;
  /** Human-readable arithmetic, e.g. "7 days x EUR 48.00". */
  readonly detail?: string;
  readonly amount: Money;
  /** Discounts and credits are negative and flagged so the UI can style them. */
  readonly kind: 'CHARGE' | 'DISCOUNT' | 'TAX' | 'DEPOSIT' | 'INFO';
  readonly payer: 'RENTER' | 'OWNER' | 'PLATFORM';
}

export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
