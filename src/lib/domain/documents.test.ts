import { describe, expect, it } from 'vitest';
import { GERMANY, LEBANON } from './countries';
import {
  ageOn,
  autoScreenDocument,
  canTransitionDocument,
  checkRenterEligibility,
  checkVehicleCompliance,
  monthsBetween,
  namesMatch,
  type StoredDocument,
} from './documents';

const now = new Date('2026-03-01T00:00:00Z');
const tripStart = new Date('2026-04-01T10:00:00Z');
const tripEnd = new Date('2026-04-05T10:00:00Z');

const verified = (
  type: StoredDocument['type'],
  overrides: Partial<StoredDocument> = {},
): StoredDocument => ({
  id: `${type}-1`,
  type,
  status: 'VERIFIED',
  issuingCountry: 'DE',
  holderName: 'Amira Haddad',
  issuedAt: new Date('2015-06-01T00:00:00Z'),
  expiresAt: new Date('2032-06-01T00:00:00Z'),
  reviewedAt: new Date('2026-02-01T00:00:00Z'),
  ...overrides,
});

const germanProfile = {
  fullName: 'Amira Haddad',
  dateOfBirth: new Date('1994-05-12T00:00:00Z'),
  residenceCountry: 'DE',
  documents: [verified('DRIVING_LICENSE'), verified('NATIONAL_ID'), verified('SELFIE_LIVENESS')],
};

describe('helpers', () => {
  it('computes age without rolling over early', () => {
    expect(ageOn(new Date('1994-05-12T00:00:00Z'), new Date('2026-05-11T00:00:00Z'))).toBe(31);
    expect(ageOn(new Date('1994-05-12T00:00:00Z'), new Date('2026-05-12T00:00:00Z'))).toBe(32);
  });

  it('counts whole months only', () => {
    expect(monthsBetween(new Date('2025-01-15T00:00:00Z'), new Date('2026-01-14T00:00:00Z'))).toBe(11);
    expect(monthsBetween(new Date('2025-01-15T00:00:00Z'), new Date('2026-01-15T00:00:00Z'))).toBe(12);
  });

  it('matches names across ordering, case and accents', () => {
    expect(namesMatch('Amira Haddad', 'HADDAD AMIRA')).toBe(true);
    expect(namesMatch('Jürgen Müller', 'Jurgen Muller')).toBe(true);
    expect(namesMatch('Amira Haddad', 'Karim Nasser')).toBe(false);
  });
});

describe('renter eligibility — Germany', () => {
  it('passes a complete German profile', () => {
    const result = checkRenterEligibility({ profile: germanProfile, country: GERMANY, tripStart, tripEnd, now });
    expect(result.eligible).toBe(true);
    expect(result.completeness).toBe(100);
    expect(result.licenceRegion).toBe('DOMESTIC');
  });

  it('blocks a driver below the market minimum age', () => {
    const result = checkRenterEligibility({
      profile: { ...germanProfile, dateOfBirth: new Date('2007-01-01T00:00:00Z') },
      country: GERMANY,
      tripStart,
      tripEnd,
      now,
    });
    expect(result.eligible).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'MIN_AGE')).toBe(true);
  });

  it('blocks a licence that expires during the trip', () => {
    const result = checkRenterEligibility({
      profile: {
        ...germanProfile,
        documents: [
          verified('DRIVING_LICENSE', { expiresAt: new Date('2026-04-03T00:00:00Z') }),
          verified('NATIONAL_ID'),
          verified('SELFIE_LIVENESS'),
        ],
      },
      country: GERMANY,
      tripStart,
      tripEnd,
      now,
    });
    expect(result.eligible).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'LICENCE_EXPIRES_DURING_TRIP')).toBe(true);
  });

  it('blocks a licence held for less than the required period', () => {
    const result = checkRenterEligibility({
      profile: {
        ...germanProfile,
        documents: [
          verified('DRIVING_LICENSE', { issuedAt: new Date('2025-10-01T00:00:00Z') }),
          verified('NATIONAL_ID'),
          verified('SELFIE_LIVENESS'),
        ],
      },
      country: GERMANY,
      tripStart,
      tripEnd,
      now,
    });
    expect(result.issues.some((issue) => issue.code === 'LICENCE_TOO_NEW')).toBe(true);
  });

  it('applies stricter rules to premium categories', () => {
    const youngButLegal = {
      ...germanProfile,
      dateOfBirth: new Date('2003-01-01T00:00:00Z'),
      documents: [
        verified('DRIVING_LICENSE', { issuedAt: new Date('2024-01-01T00:00:00Z') }),
        verified('NATIONAL_ID'),
        verified('SELFIE_LIVENESS'),
      ],
    };
    const standard = checkRenterEligibility({ profile: youngButLegal, country: GERMANY, tripStart, tripEnd, now });
    const premium = checkRenterEligibility({ profile: youngButLegal, country: GERMANY, tripStart, tripEnd, now, isPremiumCategory: true });
    expect(standard.eligible).toBe(true);
    expect(premium.eligible).toBe(false);
  });

  it('blocks a name that does not match the profile', () => {
    const result = checkRenterEligibility({
      profile: {
        ...germanProfile,
        documents: [
          verified('DRIVING_LICENSE', { holderName: 'Someone Else Entirely' }),
          verified('NATIONAL_ID'),
          verified('SELFIE_LIVENESS'),
        ],
      },
      country: GERMANY,
      tripStart,
      tripEnd,
      now,
    });
    expect(result.issues.some((issue) => issue.code === 'NAME_MISMATCH')).toBe(true);
  });

  it('demands an International Driving Permit for a non-EU licence', () => {
    const result = checkRenterEligibility({
      profile: {
        ...germanProfile,
        residenceCountry: 'LB',
        documents: [
          verified('DRIVING_LICENSE', { issuingCountry: 'LB' }),
          verified('NATIONAL_ID'),
          verified('SELFIE_LIVENESS'),
        ],
      },
      country: GERMANY,
      tripStart,
      tripEnd,
      now,
    });
    expect(result.licenceRegion).toBe('OTHER');
    expect(result.missingDocuments).toContain('INTERNATIONAL_DRIVING_PERMIT');
    expect(result.eligible).toBe(false);
  });

  it('accepts an EU licence without an International Driving Permit', () => {
    const result = checkRenterEligibility({
      profile: {
        ...germanProfile,
        residenceCountry: 'FR',
        documents: [
          verified('DRIVING_LICENSE', { issuingCountry: 'FR' }),
          verified('NATIONAL_ID'),
          verified('SELFIE_LIVENESS'),
        ],
      },
      country: GERMANY,
      tripStart,
      tripEnd,
      now,
    });
    expect(result.licenceRegion).toBe('EU_EEA');
    expect(result.eligible).toBe(true);
  });

  it('surfaces pending documents as a warning, not a pass', () => {
    const result = checkRenterEligibility({
      profile: {
        ...germanProfile,
        documents: [
          verified('DRIVING_LICENSE'),
          verified('NATIONAL_ID', { status: 'IN_REVIEW' }),
          verified('SELFIE_LIVENESS'),
        ],
      },
      country: GERMANY,
      tripStart,
      tripEnd,
      now,
    });
    expect(result.pendingDocuments).toContain('NATIONAL_ID');
    expect(result.completeness).toBeLessThan(100);
    expect(result.eligible).toBe(true);
  });

  it('blocks a rejected document', () => {
    const result = checkRenterEligibility({
      profile: {
        ...germanProfile,
        documents: [
          verified('DRIVING_LICENSE', { status: 'REJECTED', rejectionReason: 'Photo was blurred' }),
          verified('NATIONAL_ID'),
          verified('SELFIE_LIVENESS'),
        ],
      },
      country: GERMANY,
      tripStart,
      tripEnd,
      now,
    });
    expect(result.eligible).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('blurred'))).toBe(true);
  });

  it('blocks a pickup date in the past', () => {
    const result = checkRenterEligibility({
      profile: germanProfile,
      country: GERMANY,
      tripStart: new Date('2026-02-01T00:00:00Z'),
      tripEnd: new Date('2026-02-03T00:00:00Z'),
      now,
    });
    expect(result.issues.some((issue) => issue.code === 'PAST_TRIP')).toBe(true);
  });
});

describe('renter eligibility — Lebanon', () => {
  it('requires a passport rather than a national ID', () => {
    const result = checkRenterEligibility({
      profile: {
        ...germanProfile,
        residenceCountry: 'LB',
        documents: [
          verified('DRIVING_LICENSE', { issuingCountry: 'LB' }),
          verified('SELFIE_LIVENESS'),
        ],
      },
      country: LEBANON,
      tripStart,
      tripEnd,
      now,
    });
    expect(result.missingDocuments).toContain('PASSPORT');
  });

  it('accepts a GCC licence without an International Driving Permit', () => {
    const result = checkRenterEligibility({
      profile: {
        fullName: 'Amira Haddad',
        dateOfBirth: new Date('1994-05-12T00:00:00Z'),
        residenceCountry: 'AE',
        documents: [
          verified('DRIVING_LICENSE', { issuingCountry: 'AE' }),
          verified('PASSPORT', { issuingCountry: 'AE' }),
          verified('SELFIE_LIVENESS'),
        ],
      },
      country: LEBANON,
      tripStart,
      tripEnd,
      now,
    });
    expect(result.licenceRegion).toBe('GCC');
    expect(result.eligible).toBe(true);
  });
});

describe('vehicle compliance', () => {
  const vehicleDocs = [
    verified('VEHICLE_REGISTRATION'),
    verified('VEHICLE_INSURANCE'),
    verified('TECHNICAL_INSPECTION'),
  ];

  it('passes a fully documented car', () => {
    expect(checkVehicleCompliance({ documents: vehicleDocs, country: GERMANY, now }).compliant).toBe(true);
  });

  it('pauses a listing whose inspection has lapsed', () => {
    const result = checkVehicleCompliance({
      documents: [
        verified('VEHICLE_REGISTRATION'),
        verified('VEHICLE_INSURANCE'),
        verified('TECHNICAL_INSPECTION', { expiresAt: new Date('2026-01-01T00:00:00Z') }),
      ],
      country: GERMANY,
      now,
    });
    expect(result.compliant).toBe(false);
  });

  it('warns before a document expires', () => {
    const result = checkVehicleCompliance({
      documents: [
        verified('VEHICLE_REGISTRATION'),
        verified('VEHICLE_INSURANCE', { expiresAt: new Date('2026-03-20T00:00:00Z') }),
        verified('TECHNICAL_INSPECTION'),
      ],
      country: GERMANY,
      now,
    });
    expect(result.compliant).toBe(true);
    expect(result.issues.some((issue) => issue.severity === 'WARNING')).toBe(true);
  });
});

describe('document verification state machine', () => {
  it('allows only legal edges', () => {
    expect(canTransitionDocument('PENDING', 'IN_REVIEW')).toBe(true);
    expect(canTransitionDocument('IN_REVIEW', 'VERIFIED')).toBe(true);
    expect(canTransitionDocument('PENDING', 'VERIFIED')).toBe(false);
    expect(canTransitionDocument('REJECTED', 'VERIFIED')).toBe(false);
  });
});

describe('auto-screening', () => {
  const profile = { fullName: 'Amira Haddad', dateOfBirth: new Date('1994-05-12T00:00:00Z') };

  it('sends a clean document to a human reviewer', () => {
    expect(autoScreenDocument(verified('DRIVING_LICENSE'), profile, now).verdict).toBe('NEEDS_REVIEW');
  });

  it('rejects an expired document without human time', () => {
    const result = autoScreenDocument(
      verified('DRIVING_LICENSE', { expiresAt: new Date('2020-01-01T00:00:00Z') }),
      profile,
      now,
    );
    expect(result.verdict).toBe('AUTO_REJECT');
    expect(result.reasons.join(' ')).toMatch(/expired/i);
  });

  it('rejects an impossible issue date', () => {
    const result = autoScreenDocument(
      verified('DRIVING_LICENSE', { issuedAt: new Date('2001-01-01T00:00:00Z') }),
      profile,
      now,
    );
    expect(result.verdict).toBe('AUTO_REJECT');
    expect(result.reasons.join(' ')).toMatch(/before the holder was 16/i);
  });

  it('rejects a name mismatch', () => {
    const result = autoScreenDocument(verified('PASSPORT', { holderName: 'Totally Different' }), profile, now);
    expect(result.verdict).toBe('AUTO_REJECT');
  });
});
