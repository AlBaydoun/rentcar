import { licenceRegionOf, licenceRuleFor, type CountryConfig } from './countries';
import type { CountryCode, DocumentType, VerificationStatus } from './types';

/**
 * Document requirements and driver eligibility.
 *
 * A renter cannot reach an owner's inbox until this module says their paperwork
 * is coherent: the right documents exist, none of them has expired, the names
 * agree, they are old enough, and the licence they hold is actually legal to
 * drive on in the market they are booking in.
 */

export interface StoredDocument {
  readonly id: string;
  readonly type: DocumentType;
  readonly status: VerificationStatus;
  /** ISO-3166 alpha-2 of the issuing authority. */
  readonly issuingCountry: string;
  readonly documentNumber?: string;
  readonly issuedAt?: Date | null;
  readonly expiresAt?: Date | null;
  /** Name exactly as printed on the document. */
  readonly holderName?: string;
  readonly rejectionReason?: string | null;
  readonly reviewedAt?: Date | null;
}

export interface RenterProfileForChecks {
  readonly fullName: string;
  readonly dateOfBirth: Date;
  /** Where the renter lives, which decides whether visitor rules apply. */
  readonly residenceCountry: string;
  readonly documents: readonly StoredDocument[];
}

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  DRIVING_LICENSE: 'Driving licence',
  PASSPORT: 'Passport',
  NATIONAL_ID: 'National ID card',
  RESIDENCE_PERMIT: 'Residence permit',
  INTERNATIONAL_DRIVING_PERMIT: 'International Driving Permit',
  PROOF_OF_ADDRESS: 'Proof of address',
  SELFIE_LIVENESS: 'Identity selfie',
  VEHICLE_REGISTRATION: 'Vehicle registration',
  VEHICLE_INSURANCE: 'Insurance certificate',
  TECHNICAL_INSPECTION: 'Technical inspection certificate',
};

export const DOCUMENT_HINTS: Record<DocumentType, string> = {
  DRIVING_LICENSE: 'Both sides, all four corners visible, no glare over the licence number.',
  PASSPORT: 'The photo page, including the two machine-readable lines at the bottom.',
  NATIONAL_ID: 'Both sides of the card.',
  RESIDENCE_PERMIT: 'The card showing your permit type and validity date.',
  INTERNATIONAL_DRIVING_PERMIT: 'The page carrying your photo and vehicle categories.',
  PROOF_OF_ADDRESS: 'A utility bill or bank statement from the last three months.',
  SELFIE_LIVENESS: 'A short head-turn video so we can match you to your ID.',
  VEHICLE_REGISTRATION: 'Zulassungsbescheinigung Teil I in Germany, or the Lebanese registration card.',
  VEHICLE_INSURANCE: 'The certificate showing cover valid through your listing period.',
  TECHNICAL_INSPECTION: 'A valid TÜV report in Germany, or the Mécanique certificate in Lebanon.',
};

export type CheckSeverity = 'BLOCKER' | 'WARNING' | 'INFO';

export interface EligibilityIssue {
  readonly code: string;
  readonly severity: CheckSeverity;
  readonly message: string;
  /** What the renter can do about it. */
  readonly remedy?: string;
  readonly documentType?: DocumentType;
}

export interface EligibilityResult {
  readonly eligible: boolean;
  readonly issues: readonly EligibilityIssue[];
  readonly missingDocuments: readonly DocumentType[];
  readonly pendingDocuments: readonly DocumentType[];
  /** Percentage of the required set that is verified. */
  readonly completeness: number;
  readonly age: number;
  readonly licenceHeldMonths: number | null;
  readonly licenceRegion: ReturnType<typeof licenceRegionOf>;
}

export function ageOn(dateOfBirth: Date, at: Date): number {
  let age = at.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDiff = at.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth()) -
    (to.getUTCDate() < from.getUTCDate() ? 1 : 0)
  );
}

/**
 * Normalises a name for comparison: casing, accents, punctuation and the
 * ordering of given/family names all vary between an ID card and a profile.
 */
export function normaliseName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z؀-ۿ\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

export function namesMatch(a: string, b: string): boolean {
  const left = normaliseName(a).split(' ');
  const right = normaliseName(b).split(' ');
  if (left.length === 0 || right.length === 0) return false;
  const shared = left.filter((token) => right.includes(token));
  // Two shared name tokens, or every token of the shorter name, is a match.
  return shared.length >= 2 || shared.length === Math.min(left.length, right.length);
}

function latest(documents: readonly StoredDocument[], type: DocumentType): StoredDocument | undefined {
  return documents
    .filter((doc) => doc.type === type)
    .sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0))[0];
}

/**
 * The full pre-request eligibility check.
 *
 * `tripEnd` matters as much as `tripStart`: a licence that expires mid-trip is
 * as much of a blocker as one that has already expired.
 */
export function checkRenterEligibility(params: {
  profile: RenterProfileForChecks;
  country: CountryConfig;
  tripStart: Date;
  tripEnd: Date;
  isPremiumCategory?: boolean;
  now?: Date;
}): EligibilityResult {
  const { profile, country, tripStart, tripEnd } = params;
  const now = params.now ?? new Date();
  const issues: EligibilityIssue[] = [];

  const required = [...country.requiredRenterDocuments];
  const licence = latest(profile.documents, 'DRIVING_LICENSE');
  const licenceRegion = licence
    ? licenceRegionOf(licence.issuingCountry, country.code as CountryCode)
    : 'OTHER';
  const rule = licenceRuleFor(country, licenceRegion);

  if (rule.requiresInternationalPermit) {
    required.push('INTERNATIONAL_DRIVING_PERMIT');
  }

  // ---- Age ---------------------------------------------------------------
  const age = ageOn(profile.dateOfBirth, tripStart);
  const minAge = params.isPremiumCategory ? country.premiumCategoryMinAge : country.minDriverAge;
  if (age < minAge) {
    issues.push({
      code: 'MIN_AGE',
      severity: 'BLOCKER',
      message: `You must be at least ${minAge} to book this car in ${country.name}. You will be ${age} at pickup.`,
      remedy: age >= country.minDriverAge ? 'Choose a car outside the premium categories.' : undefined,
    });
  } else if (age < country.youngDriverAgeThreshold) {
    issues.push({
      code: 'YOUNG_DRIVER',
      severity: 'INFO',
      message: `A young driver surcharge applies below ${country.youngDriverAgeThreshold}.`,
    });
  }

  // ---- Licence -----------------------------------------------------------
  let licenceHeldMonths: number | null = null;

  if (!licence) {
    issues.push({
      code: 'LICENCE_MISSING',
      severity: 'BLOCKER',
      message: 'Add your driving licence before requesting a car.',
      documentType: 'DRIVING_LICENSE',
    });
  } else {
    if (licence.status === 'REJECTED') {
      issues.push({
        code: 'LICENCE_REJECTED',
        severity: 'BLOCKER',
        message: licence.rejectionReason
          ? `Your licence was rejected: ${licence.rejectionReason}`
          : 'Your licence was rejected during review.',
        remedy: 'Upload a clearer photo of both sides.',
        documentType: 'DRIVING_LICENSE',
      });
    }
    if (licence.expiresAt && licence.expiresAt <= tripEnd) {
      issues.push({
        code: 'LICENCE_EXPIRES_DURING_TRIP',
        severity: 'BLOCKER',
        message: `Your licence expires on ${licence.expiresAt.toISOString().slice(0, 10)}, before this trip ends.`,
        documentType: 'DRIVING_LICENSE',
      });
    }
    if (licence.issuedAt) {
      licenceHeldMonths = monthsBetween(licence.issuedAt, tripStart);
      const minMonths = params.isPremiumCategory
        ? country.premiumCategoryMinLicenceMonths
        : country.minLicenceHeldMonths;
      if (licenceHeldMonths < minMonths) {
        issues.push({
          code: 'LICENCE_TOO_NEW',
          severity: 'BLOCKER',
          message: `This car needs a licence held for ${minMonths} months. Yours will be ${Math.max(0, licenceHeldMonths)} months old at pickup.`,
          documentType: 'DRIVING_LICENSE',
        });
      }
    }
    if (licence.holderName && !namesMatch(licence.holderName, profile.fullName)) {
      issues.push({
        code: 'NAME_MISMATCH',
        severity: 'BLOCKER',
        message: 'The name on your licence does not match your profile.',
        remedy: 'Update your profile name to match your documents exactly.',
        documentType: 'DRIVING_LICENSE',
      });
    }

    // Residence-based validity of a foreign licence.
    const isResident = profile.residenceCountry.toUpperCase() === country.code;
    const limitMonths = isResident ? rule.validForResidentMonths : rule.validForVisitorMonths;
    if (limitMonths !== null && licenceRegion !== 'DOMESTIC') {
      issues.push({
        code: 'FOREIGN_LICENCE_LIMIT',
        severity: isResident ? 'WARNING' : 'INFO',
        message: rule.note,
        remedy: isResident
          ? `As a ${country.name} resident you must convert to a local licence within ${limitMonths} months.`
          : undefined,
        documentType: 'DRIVING_LICENSE',
      });
    }

    if (rule.requiresTranslation && licenceRegion !== 'DOMESTIC') {
      issues.push({
        code: 'TRANSLATION_REQUIRED',
        severity: 'WARNING',
        message: 'A certified translation of your licence must be carried with you on the trip.',
        documentType: 'DRIVING_LICENSE',
      });
    }
  }

  // ---- Every required document -------------------------------------------
  const missingDocuments: DocumentType[] = [];
  const pendingDocuments: DocumentType[] = [];
  let verifiedCount = 0;

  for (const type of required) {
    const doc = latest(profile.documents, type);
    if (!doc) {
      missingDocuments.push(type);
      issues.push({
        code: `MISSING_${type}`,
        severity: 'BLOCKER',
        message: `${DOCUMENT_LABELS[type]} is required in ${country.name}.`,
        remedy: DOCUMENT_HINTS[type],
        documentType: type,
      });
      continue;
    }

    if (doc.expiresAt && doc.expiresAt <= tripEnd && type !== 'DRIVING_LICENSE') {
      issues.push({
        code: `EXPIRED_${type}`,
        severity: 'BLOCKER',
        message: `Your ${DOCUMENT_LABELS[type].toLowerCase()} expires before this trip ends.`,
        documentType: type,
      });
    }

    switch (doc.status) {
      case 'VERIFIED':
        verifiedCount += 1;
        break;
      case 'PENDING':
      case 'IN_REVIEW':
        pendingDocuments.push(type);
        issues.push({
          code: `PENDING_${type}`,
          severity: 'WARNING',
          message: `Your ${DOCUMENT_LABELS[type].toLowerCase()} is still being reviewed. Most checks finish within a few hours.`,
          documentType: type,
        });
        break;
      case 'REJECTED':
        issues.push({
          code: `REJECTED_${type}`,
          severity: 'BLOCKER',
          message: doc.rejectionReason ?? `Your ${DOCUMENT_LABELS[type].toLowerCase()} was rejected.`,
          remedy: DOCUMENT_HINTS[type],
          documentType: type,
        });
        break;
      case 'EXPIRED':
        issues.push({
          code: `STALE_${type}`,
          severity: 'BLOCKER',
          message: `Your ${DOCUMENT_LABELS[type].toLowerCase()} is no longer valid.`,
          documentType: type,
        });
        break;
      default:
        missingDocuments.push(type);
        issues.push({
          code: `UNVERIFIED_${type}`,
          severity: 'BLOCKER',
          message: `${DOCUMENT_LABELS[type]} has not been submitted for verification.`,
          documentType: type,
        });
    }
  }

  if (tripStart < now) {
    issues.push({
      code: 'PAST_TRIP',
      severity: 'BLOCKER',
      message: 'Pickup cannot be in the past.',
    });
  }

  const completeness = required.length === 0 ? 100 : Math.round((verifiedCount / required.length) * 100);
  const eligible = !issues.some((issue) => issue.severity === 'BLOCKER');

  return {
    eligible,
    issues,
    missingDocuments,
    pendingDocuments,
    completeness,
    age,
    licenceHeldMonths,
    licenceRegion,
  };
}

/** Whether a vehicle's own paperwork lets it stay listed. */
export function checkVehicleCompliance(params: {
  documents: readonly StoredDocument[];
  country: CountryConfig;
  now?: Date;
}): { compliant: boolean; issues: readonly EligibilityIssue[] } {
  const now = params.now ?? new Date();
  const issues: EligibilityIssue[] = [];

  for (const type of params.country.requiredVehicleDocuments) {
    const doc = latest(params.documents, type);
    if (!doc) {
      issues.push({
        code: `VEHICLE_MISSING_${type}`,
        severity: 'BLOCKER',
        message: `${DOCUMENT_LABELS[type]} is required to list a car in ${params.country.name}.`,
        remedy: DOCUMENT_HINTS[type],
        documentType: type,
      });
      continue;
    }
    if (doc.status !== 'VERIFIED') {
      issues.push({
        code: `VEHICLE_UNVERIFIED_${type}`,
        severity: doc.status === 'REJECTED' ? 'BLOCKER' : 'WARNING',
        message: `${DOCUMENT_LABELS[type]} is ${doc.status.toLowerCase().replace('_', ' ')}.`,
        documentType: type,
      });
    }
    if (doc.expiresAt) {
      const daysLeft = Math.floor((doc.expiresAt.getTime() - now.getTime()) / 86_400_000);
      if (daysLeft < 0) {
        issues.push({
          code: `VEHICLE_EXPIRED_${type}`,
          severity: 'BLOCKER',
          message: `${DOCUMENT_LABELS[type]} expired ${Math.abs(daysLeft)} days ago. The listing is paused until it is renewed.`,
          documentType: type,
        });
      } else if (daysLeft < 30) {
        issues.push({
          code: `VEHICLE_EXPIRING_${type}`,
          severity: 'WARNING',
          message: `${DOCUMENT_LABELS[type]} expires in ${daysLeft} days.`,
          documentType: type,
        });
      }
    }
  }

  return {
    compliant: !issues.some((issue) => issue.severity === 'BLOCKER'),
    issues,
  };
}

/**
 * The verification state machine for a single document. Reviewers can only
 * move a document along legal edges, which keeps the audit trail honest.
 */
const DOCUMENT_TRANSITIONS: Record<VerificationStatus, readonly VerificationStatus[]> = {
  UNVERIFIED: ['PENDING'],
  PENDING: ['IN_REVIEW', 'REJECTED'],
  IN_REVIEW: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['EXPIRED', 'IN_REVIEW'],
  REJECTED: ['PENDING'],
  EXPIRED: ['PENDING'],
};

export function canTransitionDocument(from: VerificationStatus, to: VerificationStatus): boolean {
  return DOCUMENT_TRANSITIONS[from].includes(to);
}

/**
 * Automated pre-checks run the moment a document is uploaded. They cannot
 * approve a document — only flag the obvious problems so a human reviewer
 * spends their time on the genuinely ambiguous ones.
 */
export function autoScreenDocument(
  doc: StoredDocument,
  profile: { fullName: string; dateOfBirth: Date },
  now = new Date(),
): { verdict: 'AUTO_REJECT' | 'NEEDS_REVIEW'; reasons: readonly string[] } {
  const reasons: string[] = [];

  if (doc.expiresAt && doc.expiresAt <= now) {
    reasons.push('The document has already expired.');
  }
  if (doc.issuedAt && doc.issuedAt > now) {
    reasons.push('The issue date is in the future.');
  }
  if (doc.issuedAt && doc.expiresAt && doc.issuedAt >= doc.expiresAt) {
    reasons.push('The issue date is not before the expiry date.');
  }
  if (doc.holderName && !namesMatch(doc.holderName, profile.fullName)) {
    reasons.push('The name on the document does not match the profile name.');
  }
  if (doc.type === 'DRIVING_LICENSE' && doc.issuedAt) {
    const ageAtIssue = ageOn(profile.dateOfBirth, doc.issuedAt);
    if (ageAtIssue < 16) {
      reasons.push('The licence appears to have been issued before the holder was 16.');
    }
  }
  if (doc.documentNumber && doc.documentNumber.replace(/\s/g, '').length < 5) {
    reasons.push('The document number is too short to be valid.');
  }

  return reasons.length > 0
    ? { verdict: 'AUTO_REJECT', reasons }
    : { verdict: 'NEEDS_REVIEW', reasons: [] };
}
