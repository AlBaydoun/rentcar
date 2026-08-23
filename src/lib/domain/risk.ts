import type { CountryConfig } from './countries';
import type { Money, RiskTier, VehicleCategory } from './types';
import { toDecimal } from './money';
import { categoryRiskFactor } from './insurance';

/**
 * Renter risk scoring.
 *
 * The score exists so the owner has something concrete to decide on. It is
 * deliberately explainable: every point is attributed to a named factor with a
 * sentence the owner can read, because "computer says no" is not a decision an
 * owner can stand behind when they hand over their own car.
 *
 * Scale: 0 (impeccable) to 100 (do not rent). It is a *risk* score, so lower
 * is better.
 */

export interface RiskSignals {
  readonly age: number;
  readonly licenceHeldMonths: number | null;
  /** Share of required documents verified, 0-100. */
  readonly documentCompleteness: number;
  readonly accountAgeDays: number;
  readonly completedTrips: number;
  readonly cancelledTripsByRenter: number;
  /** Average rating received from owners, 1-5, or null when unrated. */
  readonly averageRating: number | null;
  /** Damage claims where this renter was found liable. */
  readonly liableClaims: number;
  readonly lateReturns: number;
  /** Hours between the request and pickup. */
  readonly leadTimeHours: number;
  readonly tripDays: number;
  readonly vehicleValue: Money;
  readonly vehicleCategory: VehicleCategory;
  readonly crossBorder: boolean;
  /** Renter's residence differs from the market they are booking in. */
  readonly isVisitor: boolean;
  /** Payment method previously declined or charged back. */
  readonly paymentFlags: number;
  /** Renter's phone/email verified. */
  readonly contactVerified: boolean;
}

export interface RiskFactor {
  readonly code: string;
  readonly label: string;
  /** Points added (positive) or removed (negative). */
  readonly points: number;
  readonly explanation: string;
  readonly direction: 'RAISES' | 'LOWERS';
}

export interface RiskAssessment {
  readonly score: number;
  readonly tier: RiskTier;
  readonly factors: readonly RiskFactor[];
  /** Multiplier the pricing engine applies to the base deposit. */
  readonly depositMultiplier: number;
  /** Whether the platform recommends the owner accept. */
  readonly recommendation: 'ACCEPT' | 'REVIEW' | 'DECLINE';
  readonly summary: string;
  /** Concrete things the owner may want to ask for before approving. */
  readonly suggestedConditions: readonly string[];
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

/**
 * Scores one prospective booking.
 *
 * Note the asymmetry: a thin profile is treated as *unknown*, not as bad. A
 * brand-new renter with complete documents lands in the middle of the range,
 * which is where an owner should be making a judgement call rather than the
 * algorithm making it for them.
 */
export function assessRisk(signals: RiskSignals, country: CountryConfig): RiskAssessment {
  const factors: RiskFactor[] = [];
  const add = (
    code: string,
    label: string,
    points: number,
    explanation: string,
  ) => {
    if (points === 0) return;
    factors.push({
      code,
      label,
      points,
      explanation,
      direction: points > 0 ? 'RAISES' : 'LOWERS',
    });
  };

  // Start from a neutral-unknown baseline rather than zero.
  let score = 30;

  // ---- Driver seasoning ---------------------------------------------------
  if (signals.age < country.youngDriverAgeThreshold) {
    const points = signals.age < 23 ? 14 : 8;
    add(
      'AGE',
      'Young driver',
      points,
      `${signals.age} years old — below the ${country.youngDriverAgeThreshold} threshold where claim frequency drops sharply.`,
    );
  } else if (signals.age >= 30) {
    add('AGE', 'Experienced age band', -6, `${signals.age} years old — the lowest-claim age band.`);
  }

  if (signals.licenceHeldMonths === null) {
    add('LICENCE_UNKNOWN', 'Licence age unknown', 6, 'The issue date on the licence could not be read.');
  } else if (signals.licenceHeldMonths < 24) {
    add(
      'LICENCE_NEW',
      'Recently licensed',
      12,
      `Licence held for ${signals.licenceHeldMonths} months. The first two years carry the highest claim rate.`,
    );
  } else if (signals.licenceHeldMonths >= 120) {
    add('LICENCE_SEASONED', 'Long-held licence', -8, `Licence held for ${Math.floor(signals.licenceHeldMonths / 12)} years.`);
  }

  // ---- Identity confidence -------------------------------------------------
  if (signals.documentCompleteness >= 100) {
    add('DOCS_COMPLETE', 'Fully verified', -10, 'Every required document has passed review.');
  } else {
    add(
      'DOCS_INCOMPLETE',
      'Verification incomplete',
      Math.round((100 - signals.documentCompleteness) / 4),
      `${signals.documentCompleteness}% of required documents are verified.`,
    );
  }

  if (!signals.contactVerified) {
    add('CONTACT_UNVERIFIED', 'Contact not confirmed', 8, 'Phone or email has not been confirmed.');
  }

  // ---- Platform history ----------------------------------------------------
  if (signals.completedTrips === 0) {
    add('NO_HISTORY', 'First trip', 8, 'No completed trips on KarRent yet — there is no track record to lean on.');
  } else {
    const historyCredit = Math.min(18, Math.round(Math.log2(signals.completedTrips + 1) * 6));
    add(
      'TRIP_HISTORY',
      'Completed trips',
      -historyCredit,
      `${signals.completedTrips} completed ${signals.completedTrips === 1 ? 'trip' : 'trips'} without incident.`,
    );
  }

  if (signals.averageRating !== null) {
    if (signals.averageRating >= 4.8) {
      add('RATING_HIGH', 'Excellent reviews', -8, `Rated ${signals.averageRating.toFixed(1)}/5 by previous owners.`);
    } else if (signals.averageRating < 4.0) {
      add(
        'RATING_LOW',
        'Below-average reviews',
        Math.round((4.5 - signals.averageRating) * 12),
        `Rated ${signals.averageRating.toFixed(1)}/5 by previous owners.`,
      );
    }
  }

  const totalTrips = signals.completedTrips + signals.cancelledTripsByRenter;
  if (totalTrips >= 3) {
    const cancelRate = signals.cancelledTripsByRenter / totalTrips;
    if (cancelRate > 0.25) {
      add(
        'CANCELLATIONS',
        'Frequent canceller',
        Math.round(cancelRate * 30),
        `${Math.round(cancelRate * 100)}% of this renter's bookings were cancelled by them.`,
      );
    }
  }

  if (signals.liableClaims > 0) {
    add(
      'CLAIMS',
      'Previous damage claims',
      Math.min(40, signals.liableClaims * 18),
      `Found liable in ${signals.liableClaims} previous ${signals.liableClaims === 1 ? 'claim' : 'claims'}.`,
    );
  }

  if (signals.lateReturns > 0) {
    add(
      'LATE_RETURNS',
      'Late returns',
      Math.min(12, signals.lateReturns * 5),
      `Returned a car late ${signals.lateReturns} ${signals.lateReturns === 1 ? 'time' : 'times'}.`,
    );
  }

  if (signals.paymentFlags > 0) {
    add(
      'PAYMENT_FLAGS',
      'Payment problems',
      Math.min(35, signals.paymentFlags * 15),
      `${signals.paymentFlags} declined ${signals.paymentFlags === 1 ? 'payment or chargeback' : 'payments or chargebacks'} on file.`,
    );
  }

  if (signals.accountAgeDays < 2 && signals.completedTrips === 0) {
    add('NEW_ACCOUNT', 'Account created today', 10, 'The account is less than 48 hours old.');
  } else if (signals.accountAgeDays > 365) {
    add('ESTABLISHED_ACCOUNT', 'Long-standing member', -4, `Member for ${Math.floor(signals.accountAgeDays / 365)} years.`);
  }

  // ---- Booking shape --------------------------------------------------------
  if (signals.leadTimeHours < 3) {
    add('URGENT_BOOKING', 'Immediate pickup', 10, 'Requested for pickup within three hours, leaving no time for checks.');
  } else if (signals.leadTimeHours < 24) {
    add('SHORT_NOTICE', 'Short notice', 4, 'Requested for pickup within 24 hours.');
  }

  if (signals.tripDays > 21) {
    add('LONG_TRIP', 'Extended rental', 8, `${signals.tripDays} days — long trips carry more exposure between check-ins.`);
  }

  const valueDecimal = toDecimal(signals.vehicleValue);
  if (valueDecimal > 60_000) {
    add('HIGH_VALUE', 'High-value vehicle', 12, `The car is valued at about ${Math.round(valueDecimal / 1000)}k.`);
  } else if (valueDecimal > 30_000) {
    add('MID_VALUE', 'Above-average vehicle value', 6, `The car is valued at about ${Math.round(valueDecimal / 1000)}k.`);
  }

  const categoryFactor = categoryRiskFactor(signals.vehicleCategory);
  if (categoryFactor >= 1.4) {
    add(
      'CATEGORY',
      'Performance or luxury category',
      Math.round((categoryFactor - 1) * 20),
      `${signals.vehicleCategory.toLowerCase()} cars see disproportionately severe claims.`,
    );
  }

  if (signals.crossBorder) {
    add('CROSS_BORDER', 'Cross-border trip', 7, 'Recovery and repair are slower once the car leaves the country.');
  }

  if (signals.isVisitor) {
    add('VISITOR', 'Non-resident renter', 5, 'The renter lives outside this market, which complicates fine and claim follow-up.');
  }

  score += factors.reduce((sum, factor) => sum + factor.points, 0);
  score = clampScore(score);

  // ---- Hard blocks ----------------------------------------------------------
  const blocked =
    signals.liableClaims >= 3 ||
    signals.paymentFlags >= 3 ||
    (signals.averageRating !== null && signals.averageRating < 2.5 && signals.completedTrips >= 3);

  const tier: RiskTier = blocked
    ? 'BLOCKED'
    : score >= 60
      ? 'HIGH'
      : score >= 35
        ? 'MEDIUM'
        : 'LOW';

  const depositMultiplier = blocked
    ? 2
    : tier === 'HIGH'
      ? 1.6
      : tier === 'MEDIUM'
        ? 1.2
        : 1;

  const recommendation: RiskAssessment['recommendation'] = blocked
    ? 'DECLINE'
    : tier === 'HIGH'
      ? 'REVIEW'
      : tier === 'MEDIUM'
        ? 'REVIEW'
        : 'ACCEPT';

  const suggestedConditions: string[] = [];
  if (tier !== 'LOW') {
    suggestedConditions.push('Ask for a higher protection tier before approving.');
  }
  if (signals.completedTrips === 0) {
    suggestedConditions.push('Request a short video call to confirm identity.');
  }
  if (signals.documentCompleteness < 100) {
    suggestedConditions.push('Wait for the outstanding documents to clear verification.');
  }
  if (signals.crossBorder) {
    suggestedConditions.push('Confirm the exact countries on the itinerary in the message thread.');
  }
  if (signals.tripDays > 14) {
    suggestedConditions.push('Agree a mid-trip check-in and photo update.');
  }

  const raising = factors.filter((factor) => factor.direction === 'RAISES').sort((a, b) => b.points - a.points);
  const summary = blocked
    ? 'This renter meets one of the platform\'s hard-block criteria. KarRent recommends declining.'
    : raising.length === 0
      ? 'No risk factors of note. This is about as clean as a request gets.'
      : `Main considerations: ${raising.slice(0, 3).map((factor) => factor.label.toLowerCase()).join(', ')}.`;

  return {
    score,
    tier,
    factors: factors.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    depositMultiplier,
    recommendation,
    summary,
    suggestedConditions,
  };
}

/**
 * Owner-side reliability, shown to renters. Same idea in reverse: a renter
 * deciding whether this owner will actually be there at handover time.
 */
export interface OwnerSignals {
  readonly responseRate: number;
  readonly medianResponseMinutes: number;
  readonly acceptanceRate: number;
  readonly cancelledByOwner: number;
  readonly completedTrips: number;
  readonly averageRating: number | null;
  readonly accountAgeDays: number;
  readonly verified: boolean;
}

export interface OwnerReliability {
  readonly score: number;
  readonly badge: 'NEW_HOST' | 'RELIABLE' | 'SUPERHOST' | 'AT_RISK';
  readonly highlights: readonly string[];
  readonly concerns: readonly string[];
}

export function assessOwner(signals: OwnerSignals): OwnerReliability {
  const highlights: string[] = [];
  const concerns: string[] = [];
  let score = 50;

  if (signals.responseRate >= 0.95) {
    score += 12;
    highlights.push(`Responds to ${Math.round(signals.responseRate * 100)}% of requests`);
  } else if (signals.responseRate < 0.7) {
    score -= 15;
    concerns.push(`Only responds to ${Math.round(signals.responseRate * 100)}% of requests`);
  }

  if (signals.medianResponseMinutes <= 60) {
    score += 10;
    highlights.push('Usually replies within an hour');
  } else if (signals.medianResponseMinutes > 720) {
    score -= 8;
    concerns.push('Often takes more than half a day to reply');
  }

  if (signals.acceptanceRate >= 0.8) {
    score += 8;
    highlights.push(`Approves ${Math.round(signals.acceptanceRate * 100)}% of requests`);
  }

  if (signals.completedTrips >= 25) {
    score += 12;
    highlights.push(`${signals.completedTrips} completed trips`);
  } else if (signals.completedTrips === 0) {
    concerns.push('Has not hosted a trip yet');
  }

  if (signals.averageRating !== null) {
    if (signals.averageRating >= 4.8) {
      score += 15;
      highlights.push(`Rated ${signals.averageRating.toFixed(1)} by renters`);
    } else if (signals.averageRating < 4.2) {
      score -= 12;
      concerns.push(`Rated ${signals.averageRating.toFixed(1)} by renters`);
    }
  }

  if (signals.cancelledByOwner > 0) {
    const rate = signals.cancelledByOwner / Math.max(1, signals.completedTrips + signals.cancelledByOwner);
    score -= Math.round(rate * 40);
    if (rate > 0.05) concerns.push(`Cancelled ${signals.cancelledByOwner} confirmed bookings`);
  }

  if (signals.verified) {
    score += 8;
    highlights.push('Identity verified');
  } else {
    concerns.push('Identity not yet verified');
  }

  score = clampScore(score);

  const badge: OwnerReliability['badge'] =
    signals.completedTrips === 0
      ? 'NEW_HOST'
      : score >= 85 && signals.averageRating !== null && signals.averageRating >= 4.8
        ? 'SUPERHOST'
        : score < 45
          ? 'AT_RISK'
          : 'RELIABLE';

  return { score, badge, highlights, concerns };
}
