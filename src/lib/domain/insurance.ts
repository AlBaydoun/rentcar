import type { CountryConfig } from './countries';
import type { InsuranceTier, Money, VehicleCategory } from './types';
import { money, multiply, clamp } from './money';

/**
 * Protection tiers.
 *
 * Statutory liability cover always travels with the vehicle (see
 * `CountryConfig.mandatoryLiability`). What the renter buys here is damage
 * protection: how much of the vehicle's own repair bill they remain liable
 * for, which is the "excess" (Selbstbeteiligung / franchise).
 */

export interface InsuranceTierSpec {
  readonly tier: InsuranceTier;
  readonly name: string;
  readonly tagline: string;
  /** Daily premium as a share of the vehicle's daily base rate. */
  readonly dailyRateOfBase: number;
  /** Daily premium floor, in minor units. */
  readonly dailyMin: number;
  /** Renter's remaining liability, as a share of the vehicle's value. */
  readonly excessRateOfValue: number;
  readonly excessMin: number;
  readonly excessMax: number;
  /** Deposit is scaled down as protection goes up. */
  readonly depositMultiplier: number;
  readonly covers: readonly string[];
  readonly excludes: readonly string[];
  /** Roadside assistance included. */
  readonly roadsideAssistance: boolean;
  /** Glass, tyres and undercarriage — the classic exclusions. */
  readonly glassAndTyres: boolean;
  readonly theftProtection: boolean;
  readonly personalAccident: boolean;
}

export const INSURANCE_TIER_SPECS: Record<InsuranceTier, InsuranceTierSpec> = {
  BASIC: {
    tier: 'BASIC',
    name: 'Basic',
    tagline: 'Statutory liability plus a capped damage excess.',
    dailyRateOfBase: 0.0,
    dailyMin: 0,
    excessRateOfValue: 0.05,
    excessMin: 60_000,
    excessMax: 250_000,
    depositMultiplier: 1.0,
    covers: [
      'Statutory third-party liability (included by law with the vehicle)',
      'Damage to the vehicle above your excess',
      'Total loss above your excess',
    ],
    excludes: [
      'Glass, tyres, wheels and undercarriage',
      'Interior damage and odour removal',
      'Loss of keys or documents',
      'Roadside assistance and recovery',
    ],
    roadsideAssistance: false,
    glassAndTyres: false,
    theftProtection: false,
    personalAccident: false,
  },
  PLUS: {
    tier: 'PLUS',
    name: 'Plus',
    tagline: 'Lower excess, glass and tyres, 24/7 roadside help.',
    dailyRateOfBase: 0.18,
    dailyMin: 900,
    excessRateOfValue: 0.015,
    excessMin: 20_000,
    excessMax: 80_000,
    depositMultiplier: 0.6,
    covers: [
      'Everything in Basic',
      'Glass, tyres, wheels and undercarriage',
      'Theft and attempted theft',
      '24/7 roadside assistance and recovery',
      'Replacement key cover up to the excess',
    ],
    excludes: [
      'Damage caused by a driver not registered on the booking',
      'Damage while off-road or on unsurfaced tracks',
      'Interior damage from smoking or pets',
    ],
    roadsideAssistance: true,
    glassAndTyres: true,
    theftProtection: true,
    personalAccident: false,
  },
  MAX: {
    tier: 'MAX',
    name: 'Max',
    tagline: 'Zero excess. Walk away from anything that is not gross negligence.',
    dailyRateOfBase: 0.32,
    dailyMin: 1_800,
    excessRateOfValue: 0,
    excessMin: 0,
    excessMax: 0,
    depositMultiplier: 0.25,
    covers: [
      'Everything in Plus',
      'Zero excess on damage and total loss',
      'Personal accident cover for driver and passengers',
      'Loss-of-use compensation paid to the owner on your behalf',
      'Misfuelling and lost-key recovery',
    ],
    excludes: [
      'Gross negligence, intoxication or driving without a valid licence',
      'Use outside the countries permitted for the vehicle',
      'Damage deliberately concealed at return',
    ],
    roadsideAssistance: true,
    glassAndTyres: true,
    theftProtection: true,
    personalAccident: true,
  },
};

/** Categories that carry more risk per day and price protection accordingly. */
const CATEGORY_RISK_FACTOR: Record<VehicleCategory, number> = {
  CITY: 0.85,
  ECONOMY: 0.9,
  COMPACT: 0.95,
  SEDAN: 1.0,
  ESTATE: 1.0,
  SUV: 1.15,
  VAN: 1.2,
  PICKUP: 1.2,
  LUXURY: 1.6,
  SPORTS: 1.9,
  CONVERTIBLE: 1.45,
  ELECTRIC: 1.25,
};

export function categoryRiskFactor(category: VehicleCategory): number {
  return CATEGORY_RISK_FACTOR[category] ?? 1;
}

export interface InsuranceQuoteInput {
  readonly tier: InsuranceTier;
  readonly country: CountryConfig;
  readonly dailyBaseRate: Money;
  readonly vehicleValue: Money;
  readonly category: VehicleCategory;
  readonly days: number;
  /** 0-100 from the risk engine; higher risk raises the premium. */
  readonly renterRiskScore: number;
}

export interface InsuranceQuote {
  readonly tier: InsuranceTier;
  readonly spec: InsuranceTierSpec;
  readonly dailyPremium: Money;
  readonly totalPremium: Money;
  /** What the renter still owes on a damage claim. */
  readonly excess: Money;
  /** Multiplier applied to the vehicle's base deposit. */
  readonly depositMultiplier: number;
  readonly riskLoading: number;
}

/**
 * Prices a protection tier for one booking.
 *
 * The premium scales with the vehicle's daily rate (a proxy for value and
 * repair cost), its category risk, and the renter's risk score. The excess is
 * derived from the vehicle's declared value and then clamped into the tier's
 * band so a €90k car does not produce a €4,500 "small" excess.
 */
export function quoteInsurance(input: InsuranceQuoteInput): InsuranceQuote {
  const spec = INSURANCE_TIER_SPECS[input.tier];
  const currency = input.dailyBaseRate.currency;

  // Risk loading: a spotless profile pays the list price, a risky one up to
  // 40% more. Below 20 the renter earns a small discount.
  const riskLoading = 1 + (Math.max(0, input.renterRiskScore - 20) / 100) * 0.5;

  const categoryFactor = categoryRiskFactor(input.category);

  const rawDaily = multiply(
    input.dailyBaseRate,
    spec.dailyRateOfBase * categoryFactor * riskLoading,
  );
  const dailyPremium =
    spec.dailyRateOfBase === 0
      ? money(0, currency)
      : money(Math.max(rawDaily.amount, spec.dailyMin), currency);

  const totalPremium = multiply(dailyPremium, input.days);

  const rawExcess = multiply(input.vehicleValue, spec.excessRateOfValue);
  const excess =
    spec.excessRateOfValue === 0
      ? money(0, currency)
      : clamp(money(rawExcess.amount, currency), spec.excessMin, spec.excessMax);

  return {
    tier: input.tier,
    spec,
    dailyPremium,
    totalPremium,
    excess,
    depositMultiplier: spec.depositMultiplier,
    riskLoading,
  };
}

/** Quotes all three tiers so the UI can show them side by side. */
export function quoteAllTiers(
  input: Omit<InsuranceQuoteInput, 'tier'>,
): Record<InsuranceTier, InsuranceQuote> {
  return {
    BASIC: quoteInsurance({ ...input, tier: 'BASIC' }),
    PLUS: quoteInsurance({ ...input, tier: 'PLUS' }),
    MAX: quoteInsurance({ ...input, tier: 'MAX' }),
  };
}

/**
 * High-risk renters cannot buy their way into a low excess on an expensive
 * car — the tier is floored, not the price.
 */
export function minimumTierFor(riskScore: number, category: VehicleCategory): InsuranceTier {
  const premium = category === 'LUXURY' || category === 'SPORTS' || category === 'CONVERTIBLE';
  if (riskScore >= 60) return 'MAX';
  if (riskScore >= 35 || premium) return 'PLUS';
  return 'BASIC';
}
