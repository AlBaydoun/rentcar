import {
  activeSeasonalRequirements,
  seasonMultiplierFor,
  type CountryConfig,
} from './countries';
import { quoteInsurance, type InsuranceQuote } from './insurance';
import {
  add,
  clamp,
  money,
  multiply,
  negate,
  subtract,
  vatOnNet,
  zero,
} from './money';
import type {
  ExtraCode,
  InsuranceTier,
  Money,
  OwnerType,
  PriceLine,
  VehicleCategory,
} from './types';

/**
 * The pricing engine.
 *
 * One rental produces one `PriceQuote`: an ordered, fully itemised list of
 * lines where every number can be traced back to a rule. Nothing in the UI
 * re-computes a price — it renders what this returns. That is what keeps the
 * renter's total, the owner's payout and the platform's ledger reconcilable.
 */

export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ExtraSpec {
  readonly code: ExtraCode;
  readonly label: string;
  /** Charged once per booking or once per rental day. */
  readonly billing: 'PER_DAY' | 'PER_BOOKING';
  readonly price: number;
  readonly maxQuantity: number;
  /** Owner-supplied extras flow into the owner's payout; platform ones do not. */
  readonly providedBy: 'OWNER' | 'PLATFORM';
  readonly description: string;
}

/** Catalogue prices are per market, in minor units. */
export const EXTRA_CATALOGUE: Record<'DE' | 'LB', readonly ExtraSpec[]> = {
  DE: [
    { code: 'ADDITIONAL_DRIVER', label: 'Additional driver', billing: 'PER_DAY', price: 500, maxQuantity: 3, providedBy: 'PLATFORM', description: 'Adds a second verified driver to the protection cover.' },
    { code: 'CHILD_SEAT', label: 'Child seat (9-18 kg)', billing: 'PER_DAY', price: 400, maxQuantity: 3, providedBy: 'OWNER', description: 'ECE R129 compliant seat, fitted at handover.' },
    { code: 'BOOSTER_SEAT', label: 'Booster seat', billing: 'PER_DAY', price: 250, maxQuantity: 3, providedBy: 'OWNER', description: 'For children from 15 kg.' },
    { code: 'GPS', label: 'Navigation unit', billing: 'PER_DAY', price: 350, maxQuantity: 1, providedBy: 'OWNER', description: 'Offline European maps.' },
    { code: 'WIFI_HOTSPOT', label: 'Mobile hotspot', billing: 'PER_DAY', price: 600, maxQuantity: 1, providedBy: 'PLATFORM', description: '20 GB EU data.' },
    { code: 'ROOF_RACK', label: 'Roof rack', billing: 'PER_BOOKING', price: 2_500, maxQuantity: 1, providedBy: 'OWNER', description: 'Fitted crossbars, 75 kg load.' },
    { code: 'SKI_RACK', label: 'Ski & snowboard rack', billing: 'PER_BOOKING', price: 3_000, maxQuantity: 1, providedBy: 'OWNER', description: 'Holds four pairs of skis.' },
    { code: 'SNOW_CHAINS', label: 'Snow chains', billing: 'PER_BOOKING', price: 1_800, maxQuantity: 1, providedBy: 'OWNER', description: 'Required on many Alpine passes in winter.' },
    { code: 'WINTER_TYRES', label: 'Winter tyres fitted', billing: 'PER_BOOKING', price: 0, maxQuantity: 1, providedBy: 'OWNER', description: 'Legally required in wintry conditions (§ 2 StVO).' },
    { code: 'CROSS_BORDER_PERMIT', label: 'Cross-border permit', billing: 'PER_DAY', price: 900, maxQuantity: 1, providedBy: 'PLATFORM', description: 'Extends cover and paperwork to neighbouring EU countries.' },
    { code: 'FUEL_PREPAID', label: 'Prepaid full tank', billing: 'PER_BOOKING', price: 9_500, maxQuantity: 1, providedBy: 'OWNER', description: 'Return at any level, no refuelling stop.' },
    { code: 'UNLIMITED_KM', label: 'Unlimited kilometres', billing: 'PER_DAY', price: 1_200, maxQuantity: 1, providedBy: 'OWNER', description: 'Removes the daily distance allowance.' },
    { code: 'AIRPORT_PICKUP', label: 'Airport meet & greet', billing: 'PER_BOOKING', price: 3_900, maxQuantity: 1, providedBy: 'OWNER', description: 'Handover in the terminal car park.' },
  ],
  LB: [
    { code: 'ADDITIONAL_DRIVER', label: 'Additional driver', billing: 'PER_DAY', price: 400, maxQuantity: 3, providedBy: 'PLATFORM', description: 'Adds a second verified driver to the protection cover.' },
    { code: 'CHILD_SEAT', label: 'Child seat', billing: 'PER_DAY', price: 300, maxQuantity: 3, providedBy: 'OWNER', description: 'Fitted at handover.' },
    { code: 'BOOSTER_SEAT', label: 'Booster seat', billing: 'PER_DAY', price: 200, maxQuantity: 3, providedBy: 'OWNER', description: 'For children from 15 kg.' },
    { code: 'GPS', label: 'Navigation unit', billing: 'PER_DAY', price: 300, maxQuantity: 1, providedBy: 'OWNER', description: 'Offline Lebanon maps.' },
    { code: 'WIFI_HOTSPOT', label: 'Mobile hotspot', billing: 'PER_DAY', price: 500, maxQuantity: 1, providedBy: 'PLATFORM', description: '10 GB local data — useful where coverage is patchy.' },
    { code: 'ROOF_RACK', label: 'Roof rack', billing: 'PER_BOOKING', price: 2_000, maxQuantity: 1, providedBy: 'OWNER', description: 'Fitted crossbars.' },
    { code: 'SKI_RACK', label: 'Ski rack', billing: 'PER_BOOKING', price: 2_500, maxQuantity: 1, providedBy: 'OWNER', description: 'For Faraya and the Cedars.' },
    { code: 'SNOW_CHAINS', label: 'Snow chains', billing: 'PER_BOOKING', price: 1_500, maxQuantity: 1, providedBy: 'OWNER', description: 'Advised for mountain roads from December.' },
    { code: 'FUEL_PREPAID', label: 'Prepaid full tank', billing: 'PER_BOOKING', price: 7_000, maxQuantity: 1, providedBy: 'OWNER', description: 'Return at any level.' },
    { code: 'UNLIMITED_KM', label: 'Unlimited kilometres', billing: 'PER_DAY', price: 1_000, maxQuantity: 1, providedBy: 'OWNER', description: 'Removes the daily distance allowance.' },
    { code: 'AIRPORT_PICKUP', label: 'Beirut airport handover', billing: 'PER_BOOKING', price: 3_000, maxQuantity: 1, providedBy: 'OWNER', description: 'Meet at the arrivals hall.' },
  ],
};

export function extraSpec(countryCode: 'DE' | 'LB', code: ExtraCode): ExtraSpec | undefined {
  return EXTRA_CATALOGUE[countryCode].find((spec) => spec.code === code);
}

export interface VehiclePricingProfile {
  readonly dailyRate: Money;
  readonly category: VehicleCategory;
  readonly estimatedValue: Money;
  readonly includedKmPerDay: number;
  readonly extraKmPrice: number;
  /** Owner-set discounts, e.g. 0.15 for 15% off from seven days. */
  readonly weeklyDiscount: number;
  readonly monthlyDiscount: number;
  readonly cleaningFee: number;
  readonly deliveryPricePerKm: number;
  readonly deliveryFreeRadiusKm: number;
  readonly minRentalDays: number;
  readonly maxRentalDays: number;
  /** Deposit before the insurance tier discount is applied. */
  readonly baseDeposit: number;
  readonly ownerType: OwnerType;
}

export interface QuoteRequest {
  readonly country: CountryConfig;
  readonly vehicle: VehiclePricingProfile;
  readonly start: Date;
  readonly end: Date;
  /** When the quote is being produced — drives lead-time pricing. */
  readonly now?: Date;
  readonly insuranceTier: InsuranceTier;
  readonly extras?: readonly { code: ExtraCode; quantity: number }[];
  readonly renterAge: number;
  readonly renterRiskScore: number;
  readonly deliveryDistanceKm?: number;
  readonly crossBorderCountries?: readonly string[];
  /** 0.8 (quiet) - 1.3 (hot). Supplied by the marketplace demand index. */
  readonly demandIndex?: number;
  readonly promoPercentOff?: number;
  readonly estimatedKm?: number;
}

export interface DayBreakdown {
  readonly date: string;
  readonly base: Money;
  readonly seasonMultiplier: number;
  readonly seasonLabel: string | null;
  readonly weekendUplift: boolean;
  readonly total: Money;
}

export interface PriceQuote {
  readonly currency: Money['currency'];
  readonly days: number;
  readonly hours: number;
  readonly lines: readonly PriceLine[];
  readonly dayBreakdown: readonly DayBreakdown[];
  /** What the renter is charged now (excluding the refundable deposit). */
  readonly renterTotal: Money;
  /** Held, not charged. */
  readonly deposit: Money;
  /** Renter's remaining liability on a damage claim. */
  readonly insuranceExcess: Money;
  readonly insurance: InsuranceQuote;
  /** Owner's gross before commission. */
  readonly ownerGross: Money;
  readonly ownerCommission: Money;
  readonly ownerPayout: Money;
  readonly platformRevenue: Money;
  readonly vat: Money;
  readonly averageDailyRate: Money;
  readonly includedKm: number;
  readonly extraKmPrice: number;
  readonly warnings: readonly string[];
  readonly requirements: readonly string[];
}

export class PricingError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'PricingError';
  }
}

/**
 * Billable rental days.
 *
 * The industry convention is a 24-hour day with a short grace period; 3 days
 * and 40 minutes is 3 days, 3 days and 3 hours is 4. The grace period is a
 * market setting because expectations differ between the two countries.
 */
export function billableDays(start: Date, end: Date, graceMinutes: number): number {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) throw new PricingError('End must be after start', 'INVALID_RANGE');
  const graceMs = graceMinutes * 60 * 1000;
  return Math.max(1, Math.ceil((ms - graceMs) / MILLISECONDS_PER_DAY));
}

/** Lead-time factor: last-minute costs more, booking far ahead costs less. */
export function leadTimeFactor(now: Date, start: Date): { factor: number; label: string | null } {
  const hours = (start.getTime() - now.getTime()) / (60 * 60 * 1000);
  if (hours < 24) return { factor: 1.12, label: 'Last-minute booking' };
  if (hours < 72) return { factor: 1.06, label: 'Short-notice booking' };
  if (hours > 24 * 120) return { factor: 0.92, label: 'Early-bird booking' };
  if (hours > 24 * 60) return { factor: 0.96, label: 'Advance booking' };
  return { factor: 1, label: null };
}

/** Duration discount tier chosen by the owner. */
export function durationDiscount(
  days: number,
  vehicle: VehiclePricingProfile,
): { rate: number; label: string | null } {
  if (days >= 28 && vehicle.monthlyDiscount > 0) {
    return { rate: vehicle.monthlyDiscount, label: 'Monthly discount' };
  }
  if (days >= 7 && vehicle.weeklyDiscount > 0) {
    return { rate: vehicle.weeklyDiscount, label: 'Weekly discount' };
  }
  return { rate: 0, label: null };
}

function iterateDays(start: Date, days: number): Date[] {
  return Array.from({ length: days }, (_, index) => new Date(start.getTime() + index * MILLISECONDS_PER_DAY));
}

/**
 * Produces the complete quote.
 *
 * Order matters and is deliberate: per-day rates first (season and weekend
 * are day-level facts), then booking-level modifiers, then who-pays-whom,
 * and finally tax — which in both markets lands on the platform's fees rather
 * than on a private owner's rental income.
 */
export function quote(request: QuoteRequest): PriceQuote {
  const { country, vehicle } = request;
  const now = request.now ?? new Date();
  const currency = vehicle.dailyRate.currency;
  const lines: PriceLine[] = [];
  const warnings: string[] = [];

  if (currency !== country.currency) {
    throw new PricingError(
      `Vehicle priced in ${currency} but ${country.code} settles in ${country.currency}`,
      'CURRENCY_MISMATCH',
    );
  }

  const hours = (request.end.getTime() - request.start.getTime()) / (60 * 60 * 1000);
  const days = billableDays(request.start, request.end, country.lateReturnGraceMinutes);

  if (days < vehicle.minRentalDays) {
    throw new PricingError(
      `This car has a ${vehicle.minRentalDays}-day minimum`,
      'BELOW_MIN_DAYS',
    );
  }
  if (days > vehicle.maxRentalDays) {
    throw new PricingError(
      `This car can be booked for at most ${vehicle.maxRentalDays} days`,
      'ABOVE_MAX_DAYS',
    );
  }

  // ---- 1. Per-day base, with season and weekend applied per calendar day --
  const demand = request.demandIndex ?? 1;
  if (demand < 0.5 || demand > 2) {
    throw new PricingError('Demand index out of range', 'INVALID_DEMAND');
  }
  const lead = leadTimeFactor(now, request.start);

  const dayBreakdown: DayBreakdown[] = iterateDays(request.start, days).map((date) => {
    const season = seasonMultiplierFor(country, date);
    const weekday = date.getUTCDay();
    const isWeekend = weekday === 5 || weekday === 6;
    const uplift = isWeekend ? 1 + country.weekendUplift : 1;
    const total = multiply(vehicle.dailyRate, season.multiplier * uplift * demand * lead.factor);
    return {
      date: date.toISOString().slice(0, 10),
      base: vehicle.dailyRate,
      seasonMultiplier: season.multiplier,
      seasonLabel: season.label,
      weekendUplift: isWeekend,
      total,
    };
  });

  const grossRental = add(...dayBreakdown.map((day) => day.total));

  lines.push({
    code: 'RENTAL_BASE',
    label: 'Rental',
    detail: `${days} ${days === 1 ? 'day' : 'days'} × ${(vehicle.dailyRate.amount / 100).toFixed(2)} base rate`,
    amount: grossRental,
    kind: 'CHARGE',
    payer: 'RENTER',
  });

  const seasonalDays = dayBreakdown.filter((day) => day.seasonMultiplier !== 1);
  if (seasonalDays.length > 0) {
    const labels = [...new Set(seasonalDays.map((day) => day.seasonLabel).filter(Boolean))];
    lines.push({
      code: 'SEASON_INFO',
      label: 'Seasonal pricing applied',
      detail: `${seasonalDays.length} of ${days} days — ${labels.join(', ')}`,
      amount: zero(currency),
      kind: 'INFO',
      payer: 'RENTER',
    });
  }
  if (lead.label) {
    lines.push({
      code: 'LEAD_TIME_INFO',
      label: lead.label,
      detail: `${lead.factor > 1 ? '+' : ''}${Math.round((lead.factor - 1) * 100)}% applied to the daily rate`,
      amount: zero(currency),
      kind: 'INFO',
      payer: 'RENTER',
    });
  }

  // ---- 2. Duration discount ---------------------------------------------
  const duration = durationDiscount(days, vehicle);
  const durationDiscountAmount = multiply(grossRental, duration.rate);
  if (duration.rate > 0) {
    lines.push({
      code: 'DURATION_DISCOUNT',
      label: duration.label!,
      detail: `−${Math.round(duration.rate * 100)}% for ${days} days`,
      amount: negate(durationDiscountAmount),
      kind: 'DISCOUNT',
      payer: 'RENTER',
    });
  }

  let netRental = subtract(grossRental, durationDiscountAmount);

  // ---- 3. Promotional discount ------------------------------------------
  if (request.promoPercentOff && request.promoPercentOff > 0) {
    const promoRate = Math.min(request.promoPercentOff, 0.5);
    const promo = multiply(netRental, promoRate);
    lines.push({
      code: 'PROMO_DISCOUNT',
      label: 'Promotional discount',
      detail: `−${Math.round(promoRate * 100)}%`,
      amount: negate(promo),
      kind: 'DISCOUNT',
      // The platform funds promotions, so the owner is unaffected.
      payer: 'PLATFORM',
    });
    netRental = subtract(netRental, promo);
  }

  // ---- 4. Protection ------------------------------------------------------
  const insurance = quoteInsurance({
    tier: request.insuranceTier,
    country,
    dailyBaseRate: vehicle.dailyRate,
    vehicleValue: vehicle.estimatedValue,
    category: vehicle.category,
    days,
    renterRiskScore: request.renterRiskScore,
  });

  if (insurance.totalPremium.amount > 0) {
    lines.push({
      code: 'INSURANCE',
      label: `${insurance.spec.name} protection`,
      detail: `${days} × ${(insurance.dailyPremium.amount / 100).toFixed(2)} · excess ${(insurance.excess.amount / 100).toFixed(0)}`,
      amount: insurance.totalPremium,
      kind: 'CHARGE',
      payer: 'RENTER',
    });
  } else {
    lines.push({
      code: 'INSURANCE',
      label: `${insurance.spec.name} protection`,
      detail: `Included · excess ${(insurance.excess.amount / 100).toFixed(0)}`,
      amount: zero(currency),
      kind: 'INFO',
      payer: 'RENTER',
    });
  }

  // ---- 5. Extras ----------------------------------------------------------
  let ownerExtras = zero(currency);
  let platformExtras = zero(currency);

  for (const selection of request.extras ?? []) {
    if (selection.quantity <= 0) continue;
    const spec = extraSpec(country.code, selection.code);
    if (!spec) {
      warnings.push(`Extra "${selection.code}" is not offered in ${country.name} and was ignored.`);
      continue;
    }
    const quantity = Math.min(selection.quantity, spec.maxQuantity);
    if (quantity < selection.quantity) {
      warnings.push(`${spec.label} is limited to ${spec.maxQuantity} per booking.`);
    }
    const units = spec.billing === 'PER_DAY' ? quantity * days : quantity;
    const amount = money(spec.price * units, currency);
    if (amount.amount === 0) continue;
    lines.push({
      code: `EXTRA_${spec.code}`,
      label: spec.label,
      detail:
        spec.billing === 'PER_DAY'
          ? `${quantity} × ${days} days × ${(spec.price / 100).toFixed(2)}`
          : `${quantity} × ${(spec.price / 100).toFixed(2)}`,
      amount,
      kind: 'CHARGE',
      payer: 'RENTER',
    });
    if (spec.providedBy === 'OWNER') ownerExtras = add(ownerExtras, amount);
    else platformExtras = add(platformExtras, amount);
  }

  // ---- 6. Young driver surcharge ------------------------------------------
  let youngDriverFee = zero(currency);
  if (request.renterAge < country.youngDriverAgeThreshold) {
    youngDriverFee = money(country.youngDriverDailySurcharge * days, currency);
    lines.push({
      code: 'YOUNG_DRIVER_FEE',
      label: 'Young driver surcharge',
      detail: `Under ${country.youngDriverAgeThreshold} · ${days} × ${(country.youngDriverDailySurcharge / 100).toFixed(2)}`,
      amount: youngDriverFee,
      kind: 'CHARGE',
      payer: 'RENTER',
    });
  }

  // ---- 7. Delivery ---------------------------------------------------------
  let deliveryFee = zero(currency);
  const distance = request.deliveryDistanceKm ?? 0;
  if (distance > 0) {
    const billableKm = Math.max(0, distance - vehicle.deliveryFreeRadiusKm);
    deliveryFee = money(Math.round(billableKm * vehicle.deliveryPricePerKm), currency);
    lines.push({
      code: 'DELIVERY_FEE',
      label: 'Delivery & collection',
      detail:
        billableKm === 0
          ? `${distance} km — inside the free ${vehicle.deliveryFreeRadiusKm} km radius`
          : `${billableKm} chargeable km × ${(vehicle.deliveryPricePerKm / 100).toFixed(2)}`,
      amount: deliveryFee,
      kind: deliveryFee.amount === 0 ? 'INFO' : 'CHARGE',
      payer: 'RENTER',
    });
  }

  // ---- 8. Cleaning ---------------------------------------------------------
  const cleaningFee = money(vehicle.cleaningFee, currency);
  if (cleaningFee.amount > 0) {
    lines.push({
      code: 'CLEANING_FEE',
      label: 'Cleaning fee',
      detail: 'One-off, set by the owner',
      amount: cleaningFee,
      kind: 'CHARGE',
      payer: 'RENTER',
    });
  }

  // ---- 9. Cross-border ------------------------------------------------------
  let crossBorderFee = zero(currency);
  const crossBorder = request.crossBorderCountries ?? [];
  if (crossBorder.length > 0) {
    const forbidden = crossBorder.filter((iso) => country.crossBorderForbidden.includes(iso));
    if (forbidden.length > 0) {
      throw new PricingError(
        `Travel to ${forbidden.join(', ')} is not permitted and voids all protection`,
        'CROSS_BORDER_FORBIDDEN',
      );
    }
    const unsupported = crossBorder.filter((iso) => !country.crossBorderAllowed.includes(iso));
    if (unsupported.length > 0) {
      throw new PricingError(
        `${unsupported.join(', ')} is outside the permitted area for ${country.name} vehicles`,
        'CROSS_BORDER_UNSUPPORTED',
      );
    }
    crossBorderFee = money(country.crossBorderDailyFee * days, currency);
    if (crossBorderFee.amount > 0) {
      lines.push({
        code: 'CROSS_BORDER_FEE',
        label: 'Cross-border cover',
        detail: `${crossBorder.join(', ')} · ${days} days`,
        amount: crossBorderFee,
        kind: 'CHARGE',
        payer: 'RENTER',
      });
    }
  }

  // ---- 10. Who earns what ---------------------------------------------------
  // The owner's gross is what they actually supply: the car, their extras,
  // delivery and cleaning. Protection premiums and platform extras never
  // touch the owner's balance.
  const ownerGross = add(netRental, ownerExtras, deliveryFee, cleaningFee);

  const preFeeRenterTotal = add(
    ownerGross,
    insurance.totalPremium,
    platformExtras,
    youngDriverFee,
    crossBorderFee,
  );

  const rawServiceFee = multiply(preFeeRenterTotal, country.renterServiceFeeRate);
  const serviceFee = clamp(rawServiceFee, country.renterServiceFeeMin, country.renterServiceFeeMax);
  lines.push({
    code: 'SERVICE_FEE',
    label: 'KarRent service fee',
    detail: `${Math.round(country.renterServiceFeeRate * 100)}% · covers verification, support and payment protection`,
    amount: serviceFee,
    kind: 'CHARGE',
    payer: 'RENTER',
  });

  const ownerCommission = multiply(ownerGross, country.ownerCommissionRate);

  // ---- 11. VAT --------------------------------------------------------------
  // Private owners are below the registration threshold in both markets, so
  // VAT applies to the platform's own fees. Business owners charge VAT on the
  // rental as well, and it is included in the price shown to the renter.
  const platformFeeBase = add(serviceFee, ownerCommission, insurance.totalPremium, platformExtras);
  let vat = vatOnNet(platformFeeBase, country.vatRate);

  if (vehicle.ownerType === 'BUSINESS' && country.vatOnPrivateOwnerRental === false) {
    vat = add(vat, vatOnNet(ownerGross, country.vatRate));
  }

  lines.push({
    code: 'VAT',
    label: `${country.vatName} (${Math.round(country.vatRate * 100)}%)`,
    detail:
      vehicle.ownerType === 'BUSINESS'
        ? `On the rental and platform fees — ${country.vatNativeName}`
        : `On platform fees only — private owners do not charge ${country.vatNativeName}`,
    amount: vat,
    kind: 'TAX',
    payer: 'RENTER',
  });

  const renterTotal = add(preFeeRenterTotal, serviceFee, vat);

  // ---- 12. Deposit -----------------------------------------------------------
  const rawDeposit = money(
    Math.round(vehicle.baseDeposit * insurance.depositMultiplier),
    currency,
  );
  const riskAdjustedDeposit = multiply(
    rawDeposit,
    1 + Math.max(0, request.renterRiskScore - 40) / 100,
  );
  const deposit = clamp(riskAdjustedDeposit, country.depositMin, country.depositMax);
  lines.push({
    code: 'DEPOSIT',
    label: 'Refundable security deposit',
    detail:
      country.depositInstrument === 'CARD_PREAUTH'
        ? `Held on your card, released ${country.depositReleaseDays} days after return`
        : `Held on your card or handed over in cash, returned ${country.depositReleaseDays} days after the trip`,
    amount: deposit,
    kind: 'DEPOSIT',
    payer: 'RENTER',
  });

  // ---- 13. Owner side --------------------------------------------------------
  const ownerPayout = subtract(ownerGross, ownerCommission);
  lines.push({
    code: 'OWNER_GROSS',
    label: 'Owner earnings before commission',
    amount: ownerGross,
    kind: 'INFO',
    payer: 'OWNER',
  });
  lines.push({
    code: 'PLATFORM_COMMISSION',
    label: 'KarRent commission',
    detail: `${Math.round(country.ownerCommissionRate * 100)}% of the owner's gross`,
    amount: negate(ownerCommission),
    kind: 'DISCOUNT',
    payer: 'OWNER',
  });
  lines.push({
    code: 'OWNER_PAYOUT',
    label: 'Owner payout',
    detail: `Paid ${country.payoutDelayDaysAfterTripEnd} days after the trip ends via ${country.payoutMethods[0]}`,
    amount: ownerPayout,
    kind: 'INFO',
    payer: 'OWNER',
  });

  const platformRevenue = add(serviceFee, ownerCommission, insurance.totalPremium, platformExtras);

  // ---- 14. Requirements & warnings --------------------------------------------
  const requirements = activeSeasonalRequirements(country, request.start)
    .map((req) => `${req.label} — ${req.legalBasis}`);

  const includedKm = (request.extras ?? []).some((extra) => extra.code === 'UNLIMITED_KM')
    ? Number.POSITIVE_INFINITY
    : vehicle.includedKmPerDay * days;

  if (request.estimatedKm && Number.isFinite(includedKm) && request.estimatedKm > includedKm) {
    const overage = request.estimatedKm - includedKm;
    warnings.push(
      `You estimated ${request.estimatedKm} km but only ${includedKm} km are included. ` +
        `The extra ${overage} km would cost about ${((overage * vehicle.extraKmPrice) / 100).toFixed(2)} — ` +
        `adding unlimited kilometres may be cheaper.`,
    );
  }

  if (days === 1 && hours < 6) {
    warnings.push('Rentals under six hours are still billed as a full day.');
  }

  return {
    currency,
    days,
    hours,
    lines,
    dayBreakdown,
    renterTotal,
    deposit,
    insuranceExcess: insurance.excess,
    insurance,
    ownerGross,
    ownerCommission,
    ownerPayout,
    platformRevenue,
    vat,
    averageDailyRate: money(Math.round(renterTotal.amount / days), currency),
    includedKm,
    extraKmPrice: vehicle.extraKmPrice,
    warnings,
    requirements,
  };
}

/** Lines the renter sees, in display order, with info rows kept last. */
export function renterLines(quoteResult: PriceQuote): readonly PriceLine[] {
  return quoteResult.lines.filter((line) => line.payer === 'RENTER');
}

export function ownerLines(quoteResult: PriceQuote): readonly PriceLine[] {
  return quoteResult.lines.filter((line) => line.payer === 'OWNER');
}

/**
 * Suggests a nightly rate for a new listing from the comparable set. Used by
 * the listing wizard's "smart pricing" step.
 */
export function suggestDailyRate(
  comparables: readonly Money[],
  category: VehicleCategory,
  year: number,
  currentYear: number,
): { suggested: Money; low: Money; high: Money; sampleSize: number } | null {
  if (comparables.length === 0) return null;
  const currency = comparables[0].currency;
  const sorted = [...comparables].map((item) => item.amount).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const age = Math.max(0, currentYear - year);
  // Depreciation flattens out — 4% a year, floored at 60% of the comparable set.
  const ageFactor = Math.max(0.6, 1 - age * 0.04);
  const categoryFactor = category === 'LUXURY' || category === 'SPORTS' ? 1.1 : 1;
  const suggested = Math.round(median * ageFactor * categoryFactor);
  return {
    suggested: money(suggested, currency),
    low: money(Math.round(suggested * 0.85), currency),
    high: money(Math.round(suggested * 1.2), currency),
    sampleSize: comparables.length,
  };
}
