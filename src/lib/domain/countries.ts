import type { CountryCode, Currency, DocumentType, PayoutMethod } from './types';

/**
 * Per-market configuration.
 *
 * Germany and Lebanon differ in almost every dimension that matters to a
 * rental marketplace: tax treatment, which licences are legal to drive on,
 * what "insured" means, how money physically moves, and what the seasons do
 * to demand. Everything market-specific is pinned down here so the rest of
 * the domain stays generic.
 */

export interface SeasonWindow {
  /** 1-12. Windows may wrap across the new year (e.g. Dec 15 -> Jan 5). */
  readonly fromMonth: number;
  readonly fromDay: number;
  readonly toMonth: number;
  readonly toDay: number;
  readonly label: string;
  /** Multiplier applied to the base daily rate. */
  readonly multiplier: number;
}

export interface LicenceRule {
  /** Issuing region this rule covers. '*' is the fallback. */
  readonly issuingRegion: 'DOMESTIC' | 'EU_EEA' | 'GCC' | 'OTHER' | '*';
  readonly requiresInternationalPermit: boolean;
  readonly requiresTranslation: boolean;
  /**
   * How long the foreign licence remains usable by someone *resident* in this
   * country, in months. `null` means no conversion deadline.
   */
  readonly validForResidentMonths: number | null;
  /** How long a non-resident visitor may drive on it, in months. */
  readonly validForVisitorMonths: number | null;
  readonly note: string;
}

export interface SeasonalRequirement {
  readonly code: string;
  readonly label: string;
  readonly fromMonth: number;
  readonly toMonth: number;
  readonly legalBasis: string;
  readonly blocking: boolean;
}

export interface CountryConfig {
  readonly code: CountryCode;
  readonly name: string;
  readonly nativeName: string;
  readonly flag: string;
  readonly locale: string;
  readonly timezone: string;
  readonly phonePrefix: string;
  readonly distanceUnit: 'km';
  readonly drivingSide: 'LEFT' | 'RIGHT';

  /** Currency the marketplace prices and settles in for this market. */
  readonly currency: Currency;
  /** Extra currencies shown for reference only. */
  readonly displayCurrencies: readonly Currency[];

  // ---- Tax ------------------------------------------------------------
  readonly vatRate: number;
  readonly vatName: string;
  readonly vatNativeName: string;
  /**
   * Private owners in both markets sit below the registration threshold in
   * the typical case, so VAT lands only on the platform's service fee.
   * Registered businesses charge VAT on the rental itself as well.
   */
  readonly vatOnPrivateOwnerRental: boolean;

  // ---- Marketplace economics ------------------------------------------
  readonly ownerCommissionRate: number;
  readonly renterServiceFeeRate: number;
  /** Service fee clamp, in minor units of `currency`. */
  readonly renterServiceFeeMin: number;
  readonly renterServiceFeeMax: number;

  // ---- Driver eligibility ---------------------------------------------
  readonly minDriverAge: number;
  readonly youngDriverAgeThreshold: number;
  /** Per-day surcharge in minor units for drivers under the threshold. */
  readonly youngDriverDailySurcharge: number;
  readonly minLicenceHeldMonths: number;
  readonly premiumCategoryMinAge: number;
  readonly premiumCategoryMinLicenceMonths: number;

  // ---- Documents -------------------------------------------------------
  readonly requiredRenterDocuments: readonly DocumentType[];
  readonly requiredOwnerDocuments: readonly DocumentType[];
  readonly requiredVehicleDocuments: readonly DocumentType[];
  readonly licenceRules: readonly LicenceRule[];

  // ---- Insurance -------------------------------------------------------
  readonly mandatoryLiability: {
    readonly name: string;
    readonly nativeName: string;
    /** Statutory minimum cover per claim, in minor units. */
    readonly minBodilyInjuryCover: number;
    readonly minPropertyDamageCover: number;
    readonly minFinancialLossCover: number;
    readonly note: string;
  };

  // ---- Deposits --------------------------------------------------------
  readonly depositMin: number;
  readonly depositMax: number;
  readonly depositInstrument: 'CARD_PREAUTH' | 'CARD_PREAUTH_OR_CASH';
  readonly depositReleaseDays: number;

  // ---- Money movement --------------------------------------------------
  readonly payoutMethods: readonly PayoutMethod[];
  readonly payoutDelayDaysAfterTripEnd: number;

  // ---- Operations ------------------------------------------------------
  /** Countries a vehicle from this market may be driven into. */
  readonly crossBorderAllowed: readonly string[];
  readonly crossBorderForbidden: readonly string[];
  readonly crossBorderDailyFee: number;
  readonly seasons: readonly SeasonWindow[];
  readonly seasonalRequirements: readonly SeasonalRequirement[];
  /** Uplift applied to Friday/Saturday pickups. */
  readonly weekendUplift: number;
  /** Default kilometres included per rental day. */
  readonly defaultIncludedKmPerDay: number;
  /** Charge per kilometre beyond the allowance, in minor units. */
  readonly defaultExtraKmPrice: number;
  /** Grace period before a late return is billable. */
  readonly lateReturnGraceMinutes: number;
  /** Late return is billed per started hour at this share of the daily rate. */
  readonly lateReturnHourlyRateOfDaily: number;
  /** Refuelling service charge per litre when the tank comes back short. */
  readonly refuelServicePricePerLitre: number;
  /** Statutory notes surfaced in the UI at booking time. */
  readonly legalNotes: readonly string[];
  /** Consumer-law right of withdrawal for this booking type. */
  readonly withdrawalRight: { readonly applies: boolean; readonly note: string };
  /** Supported UI languages for this market. */
  readonly languages: readonly string[];
  /** Cities seeded for search. */
  readonly cities: readonly { name: string; lat: number; lng: number }[];
}

export const GERMANY: CountryConfig = {
  code: 'DE',
  name: 'Germany',
  nativeName: 'Deutschland',
  flag: '🇩🇪',
  locale: 'de-DE',
  timezone: 'Europe/Berlin',
  phonePrefix: '+49',
  distanceUnit: 'km',
  drivingSide: 'RIGHT',
  currency: 'EUR',
  displayCurrencies: ['EUR'],

  vatRate: 0.19,
  vatName: 'VAT',
  vatNativeName: 'Umsatzsteuer',
  vatOnPrivateOwnerRental: false,

  ownerCommissionRate: 0.15,
  renterServiceFeeRate: 0.1,
  renterServiceFeeMin: 500,
  renterServiceFeeMax: 15000,

  minDriverAge: 21,
  youngDriverAgeThreshold: 25,
  youngDriverDailySurcharge: 900,
  minLicenceHeldMonths: 12,
  premiumCategoryMinAge: 27,
  premiumCategoryMinLicenceMonths: 36,

  requiredRenterDocuments: ['DRIVING_LICENSE', 'NATIONAL_ID', 'SELFIE_LIVENESS'],
  requiredOwnerDocuments: ['NATIONAL_ID', 'PROOF_OF_ADDRESS'],
  requiredVehicleDocuments: ['VEHICLE_REGISTRATION', 'VEHICLE_INSURANCE', 'TECHNICAL_INSPECTION'],

  licenceRules: [
    {
      issuingRegion: 'DOMESTIC',
      requiresInternationalPermit: false,
      requiresTranslation: false,
      validForResidentMonths: null,
      validForVisitorMonths: null,
      note: 'German class B licence — accepted without further documents.',
    },
    {
      issuingRegion: 'EU_EEA',
      requiresInternationalPermit: false,
      requiresTranslation: false,
      validForResidentMonths: null,
      validForVisitorMonths: null,
      note: 'EU/EEA licences are valid throughout Germany with no conversion deadline.',
    },
    {
      issuingRegion: '*',
      requiresInternationalPermit: true,
      requiresTranslation: true,
      validForResidentMonths: 6,
      validForVisitorMonths: 6,
      note:
        'Non-EU licences require an International Driving Permit or certified translation. ' +
        'After six months of residence in Germany the licence must be converted (§ 29 FeV).',
    },
  ],

  mandatoryLiability: {
    name: 'Motor third-party liability insurance',
    nativeName: 'Kfz-Haftpflichtversicherung',
    minBodilyInjuryCover: 750_000_000,
    minPropertyDamageCover: 122_000_000,
    minFinancialLossCover: 5_000_000,
    note:
      'Compulsory under the Pflichtversicherungsgesetz. Cover follows the vehicle, ' +
      'so every trip is liability-insured before any KarRent protection is added.',
  },

  depositMin: 25_000,
  depositMax: 300_000,
  depositInstrument: 'CARD_PREAUTH',
  depositReleaseDays: 7,

  payoutMethods: ['SEPA'],
  payoutDelayDaysAfterTripEnd: 2,

  crossBorderAllowed: [
    'AT', 'BE', 'CH', 'CZ', 'DK', 'ES', 'FR', 'IT', 'LU', 'NL', 'PL', 'PT', 'SI', 'SK',
  ],
  crossBorderForbidden: ['UA', 'RU', 'BY', 'MD', 'AL', 'RS', 'BA', 'MK', 'XK', 'TR'],
  crossBorderDailyFee: 900,

  seasons: [
    { fromMonth: 7, fromDay: 1, toMonth: 8, toDay: 31, label: 'Summer holidays', multiplier: 1.25 },
    { fromMonth: 12, fromDay: 18, toMonth: 1, toDay: 6, label: 'Christmas & New Year', multiplier: 1.3 },
    { fromMonth: 9, fromDay: 20, toMonth: 10, toDay: 6, label: 'Oktoberfest', multiplier: 1.15 },
    { fromMonth: 2, fromDay: 1, toMonth: 2, toDay: 28, label: 'Winter low season', multiplier: 0.88 },
    { fromMonth: 11, fromDay: 1, toMonth: 11, toDay: 30, label: 'Autumn low season', multiplier: 0.9 },
  ],

  seasonalRequirements: [
    {
      code: 'WINTER_TYRES',
      label: 'Winter or all-season tyres (M+S with the alpine symbol)',
      fromMonth: 10,
      toMonth: 4,
      legalBasis:
        '§ 2 Abs. 3a StVO — situational winter tyre obligation in black ice, snow, slush or frost.',
      blocking: true,
    },
    {
      code: 'ENVIRONMENTAL_BADGE',
      label: 'Umweltplakette for low-emission zones',
      fromMonth: 1,
      toMonth: 12,
      legalBasis: '35. BImSchV — required to enter the Umweltzone of most large German cities.',
      blocking: false,
    },
  ],

  weekendUplift: 0.12,
  defaultIncludedKmPerDay: 250,
  defaultExtraKmPrice: 29,
  lateReturnGraceMinutes: 59,
  lateReturnHourlyRateOfDaily: 0.2,
  refuelServicePricePerLitre: 260,

  legalNotes: [
    'Every listed vehicle carries statutory Kfz-Haftpflichtversicherung; KarRent protection sits on top of it.',
    'A valid Hauptuntersuchung (TÜV) sticker is required for a vehicle to stay listed.',
    'Private owners do not charge VAT on the rental; VAT applies to the KarRent service fee.',
  ],
  withdrawalRight: {
    applies: false,
    note:
      'Vehicle rental for a specified date is exempt from the 14-day distance-selling ' +
      'withdrawal right under § 312g Abs. 2 Nr. 9 BGB. The cancellation policy chosen by ' +
      'the owner applies instead.',
  },
  languages: ['de', 'en'],
  cities: [
    { name: 'Berlin', lat: 52.52, lng: 13.405 },
    { name: 'Munich', lat: 48.1351, lng: 11.582 },
    { name: 'Hamburg', lat: 53.5511, lng: 9.9937 },
    { name: 'Frankfurt am Main', lat: 50.1109, lng: 8.6821 },
    { name: 'Cologne', lat: 50.9375, lng: 6.9603 },
    { name: 'Stuttgart', lat: 48.7758, lng: 9.1829 },
    { name: 'Düsseldorf', lat: 51.2277, lng: 6.7735 },
    { name: 'Leipzig', lat: 51.3397, lng: 12.3731 },
  ],
};

export const LEBANON: CountryConfig = {
  code: 'LB',
  name: 'Lebanon',
  nativeName: 'لبنان',
  flag: '🇱🇧',
  locale: 'ar-LB',
  timezone: 'Asia/Beirut',
  phonePrefix: '+961',
  distanceUnit: 'km',
  drivingSide: 'RIGHT',
  /**
   * Lebanon prices in "fresh" US dollars. The lira is shown alongside for
   * reference but is not a settlement currency on the platform.
   */
  currency: 'USD',
  displayCurrencies: ['USD', 'LBP'],

  vatRate: 0.11,
  vatName: 'VAT',
  vatNativeName: 'الضريبة على القيمة المضافة',
  vatOnPrivateOwnerRental: false,

  ownerCommissionRate: 0.12,
  renterServiceFeeRate: 0.08,
  renterServiceFeeMin: 300,
  renterServiceFeeMax: 10_000,

  minDriverAge: 21,
  youngDriverAgeThreshold: 24,
  youngDriverDailySurcharge: 700,
  minLicenceHeldMonths: 12,
  premiumCategoryMinAge: 26,
  premiumCategoryMinLicenceMonths: 36,

  requiredRenterDocuments: ['DRIVING_LICENSE', 'PASSPORT', 'SELFIE_LIVENESS'],
  requiredOwnerDocuments: ['NATIONAL_ID'],
  requiredVehicleDocuments: ['VEHICLE_REGISTRATION', 'VEHICLE_INSURANCE', 'TECHNICAL_INSPECTION'],

  licenceRules: [
    {
      issuingRegion: 'DOMESTIC',
      requiresInternationalPermit: false,
      requiresTranslation: false,
      validForResidentMonths: null,
      validForVisitorMonths: null,
      note: 'Lebanese licence — accepted without further documents.',
    },
    {
      issuingRegion: 'GCC',
      requiresInternationalPermit: false,
      requiresTranslation: false,
      validForResidentMonths: 3,
      validForVisitorMonths: 3,
      note: 'GCC licences are accepted for short visits; longer stays require conversion.',
    },
    {
      issuingRegion: '*',
      requiresInternationalPermit: true,
      requiresTranslation: false,
      validForResidentMonths: 3,
      validForVisitorMonths: 3,
      note:
        'Visitors drive on a home licence together with an International Driving Permit ' +
        'for up to three months. Residents must obtain a Lebanese licence.',
    },
  ],

  mandatoryLiability: {
    name: 'Compulsory third-party bodily injury insurance',
    nativeName: 'التأمين الإلزامي على المسؤولية المدنية',
    minBodilyInjuryCover: 5_000_000,
    minPropertyDamageCover: 0,
    minFinancialLossCover: 0,
    note:
      'Lebanese law mandates third-party bodily-injury cover only; property damage is ' +
      'not covered by the statutory policy, so KarRent protection carries it.',
  },

  depositMin: 20_000,
  depositMax: 250_000,
  depositInstrument: 'CARD_PREAUTH_OR_CASH',
  depositReleaseDays: 10,

  payoutMethods: ['WHISH', 'OMT', 'BANK_TRANSFER_LB', 'CASH'],
  payoutDelayDaysAfterTripEnd: 3,

  crossBorderAllowed: [],
  crossBorderForbidden: ['SY', 'IL', 'IQ', 'JO'],
  crossBorderDailyFee: 0,

  seasons: [
    { fromMonth: 6, fromDay: 15, toMonth: 9, toDay: 15, label: 'Summer & diaspora season', multiplier: 1.4 },
    { fromMonth: 12, fromDay: 18, toMonth: 1, toDay: 8, label: 'Holiday season', multiplier: 1.35 },
    { fromMonth: 4, fromDay: 1, toMonth: 4, toDay: 30, label: 'Spring shoulder', multiplier: 1.05 },
    { fromMonth: 1, fromDay: 9, toMonth: 3, toDay: 15, label: 'Winter low season', multiplier: 0.85 },
  ],

  seasonalRequirements: [
    {
      code: 'MOUNTAIN_KIT',
      label: 'Snow chains for mountain roads (Faraya, Cedars, Laklouk)',
      fromMonth: 12,
      toMonth: 3,
      legalBasis: 'Internal Security Forces winter advisories for high-altitude roads.',
      blocking: false,
    },
    {
      code: 'MECANIQUE',
      label: 'Valid annual Mécanique inspection certificate',
      fromMonth: 1,
      toMonth: 12,
      legalBasis: 'Ministry of Interior vehicle inspection requirement.',
      blocking: true,
    },
  ],

  weekendUplift: 0.15,
  defaultIncludedKmPerDay: 150,
  defaultExtraKmPrice: 25,
  lateReturnGraceMinutes: 89,
  lateReturnHourlyRateOfDaily: 0.18,
  refuelServicePricePerLitre: 180,

  legalNotes: [
    'Statutory Lebanese insurance covers third-party bodily injury only — property damage is carried by KarRent protection.',
    'A valid Mécanique certificate is required for a vehicle to stay listed.',
    'Driving a KarRent vehicle across any land border voids all protection.',
  ],
  withdrawalRight: {
    applies: false,
    note:
      'Dated vehicle rental is not subject to a statutory cooling-off period in Lebanon. ' +
      'The cancellation policy chosen by the owner applies.',
  },
  languages: ['ar', 'fr', 'en'],
  cities: [
    { name: 'Beirut', lat: 33.8938, lng: 35.5018 },
    { name: 'Jounieh', lat: 33.9808, lng: 35.6178 },
    { name: 'Tripoli', lat: 34.4367, lng: 35.8497 },
    { name: 'Byblos', lat: 34.1230, lng: 35.6519 },
    { name: 'Saida', lat: 33.5571, lng: 35.3729 },
    { name: 'Tyre', lat: 33.2705, lng: 35.2038 },
    { name: 'Zahle', lat: 33.8463, lng: 35.9019 },
    { name: 'Batroun', lat: 34.2553, lng: 35.6581 },
  ],
};

export const COUNTRY_CONFIG: Record<CountryCode, CountryConfig> = {
  DE: GERMANY,
  LB: LEBANON,
};

export function getCountry(code: CountryCode): CountryConfig {
  const config = COUNTRY_CONFIG[code];
  if (!config) throw new Error(`Unsupported market: ${code}`);
  return config;
}

export const SUPPORTED_COUNTRIES: readonly CountryConfig[] = [GERMANY, LEBANON];

/** True when `date` falls inside a season window, handling year wrap-around. */
export function isWithinSeason(date: Date, season: SeasonWindow): boolean {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const value = month * 100 + day;
  const from = season.fromMonth * 100 + season.fromDay;
  const to = season.toMonth * 100 + season.toDay;
  return from <= to ? value >= from && value <= to : value >= from || value <= to;
}

/**
 * Resolves the season multiplier for a single day. When windows overlap the
 * strongest one wins, so a public holiday inside the summer window does not
 * silently get discounted by a shoulder-season rule.
 */
export function seasonMultiplierFor(country: CountryConfig, date: Date): {
  multiplier: number;
  label: string | null;
} {
  let best: SeasonWindow | null = null;
  for (const season of country.seasons) {
    if (!isWithinSeason(date, season)) continue;
    if (!best || Math.abs(season.multiplier - 1) > Math.abs(best.multiplier - 1)) {
      best = season;
    }
  }
  return best ? { multiplier: best.multiplier, label: best.label } : { multiplier: 1, label: null };
}

/** Seasonal legal requirements in force on a given date. */
export function activeSeasonalRequirements(
  country: CountryConfig,
  date: Date,
): readonly SeasonalRequirement[] {
  const month = date.getUTCMonth() + 1;
  return country.seasonalRequirements.filter((req) =>
    req.fromMonth <= req.toMonth
      ? month >= req.fromMonth && month <= req.toMonth
      : month >= req.fromMonth || month <= req.toMonth,
  );
}

/** Picks the licence rule that applies to a licence issued in `region`. */
export function licenceRuleFor(
  country: CountryConfig,
  region: LicenceRule['issuingRegion'],
): LicenceRule {
  return (
    country.licenceRules.find((rule) => rule.issuingRegion === region) ??
    country.licenceRules.find((rule) => rule.issuingRegion === '*')!
  );
}

const EU_EEA = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT',
  'NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO',
]);
const GCC = new Set(['AE', 'SA', 'KW', 'QA', 'BH', 'OM']);

/** Maps an ISO country of issue to the licence regions used by the rules. */
export function licenceRegionOf(
  issuingCountry: string,
  market: CountryCode,
): LicenceRule['issuingRegion'] {
  const iso = issuingCountry.toUpperCase();
  if (iso === market) return 'DOMESTIC';
  if (EU_EEA.has(iso)) return 'EU_EEA';
  if (GCC.has(iso)) return 'GCC';
  return 'OTHER';
}
