import 'server-only';
import { prisma } from '@/lib/db';
import { getCountry } from '@/lib/domain/countries';
import { checkRenterEligibility, monthsBetween } from '@/lib/domain/documents';
import { checkAvailability, demandIndexFromUtilisation, utilisation } from '@/lib/domain/availability';
import {
  approvalDeadline,
  blocksCalendar,
  transition,
  type BookingEvent as StateEvent,
  type TransitionEffect,
} from '@/lib/domain/booking-state-machine';
import { assessRisk } from '@/lib/domain/risk';
import { quote, type PriceQuote } from '@/lib/domain/pricing';
import { computeRefund } from '@/lib/domain/cancellation';
import { money } from '@/lib/domain/money';
import type {
  BookingActor,
  BookingStatus,
  CancellationPolicy,
  CountryCode,
  ExtraCode,
  InsuranceTier,
  VehicleCategory,
} from '@/lib/domain/types';
import {
  bookingReference,
  ownerTypeOf,
  parseJson,
  toAvailabilityRules,
  toPricingProfile,
  toRenterProfile,
  toRiskSignals,
} from './mappers';

/**
 * Booking orchestration.
 *
 * Everything that changes a booking goes through here, and every state change
 * goes through the domain state machine. The service's job is to evaluate
 * guards against real data, persist the result, and run the effects the
 * machine asked for — never to invent a transition of its own.
 */

export class BookingError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

const PREMIUM_CATEGORIES: readonly VehicleCategory[] = ['LUXURY', 'SPORTS', 'CONVERTIBLE'];

export interface QuoteParams {
  vehicleId: string;
  renterId?: string;
  start: Date;
  end: Date;
  insuranceTier: InsuranceTier;
  extras?: { code: ExtraCode; quantity: number }[];
  deliveryDistanceKm?: number;
  crossBorderCountries?: string[];
  estimatedKm?: number;
  promoPercentOff?: number;
}

export interface QuoteResult {
  quote: PriceQuote;
  availability: ReturnType<typeof checkAvailability>;
  eligibility: ReturnType<typeof checkRenterEligibility> | null;
  risk: ReturnType<typeof assessRisk> | null;
  vehicle: Awaited<ReturnType<typeof loadVehicle>>;
}

async function loadVehicle(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { owner: true, blocks: true },
  });
  if (!vehicle) throw new BookingError('That car no longer exists.', 'VEHICLE_NOT_FOUND', 404);
  return vehicle;
}

/**
 * Prices a trip and, when a renter is known, checks whether they may take it.
 * This is the same call the booking page and the API use, so what a renter is
 * shown is exactly what gets persisted if they proceed.
 */
export async function buildQuote(params: QuoteParams): Promise<QuoteResult> {
  const vehicle = await loadVehicle(params.vehicleId);
  const country = getCountry(vehicle.country as CountryCode);

  const availability = checkAvailability({
    requested: { start: params.start, end: params.end },
    blocks: vehicle.blocks.map((block) => ({
      start: block.start,
      end: block.end,
      reason: block.reason as 'BOOKED' | 'OWNER_BLOCKED' | 'MAINTENANCE',
      bookingId: block.bookingId ?? undefined,
    })),
    rules: toAvailabilityRules(vehicle),
  });

  // Demand is measured across the city's fleet, not this one car — a single
  // busy owner should not be able to move the market price.
  const cityFleet = await prisma.availabilityBlock.findMany({
    where: {
      reason: 'BOOKED',
      vehicle: { city: vehicle.city, country: vehicle.country, status: 'LISTED' },
      start: { lte: params.end },
      end: { gte: params.start },
    },
    take: 500,
  });
  const fleetSize = await prisma.vehicle.count({
    where: { city: vehicle.city, country: vehicle.country, status: 'LISTED' },
  });
  const rate =
    fleetSize === 0
      ? 0
      : utilisation({
          blocks: cityFleet.map((block) => ({
            start: block.start,
            end: block.end,
            reason: 'BOOKED' as const,
          })),
          window: { start: params.start, end: params.end },
        }).rate / fleetSize;

  let eligibility: QuoteResult['eligibility'] = null;
  let risk: QuoteResult['risk'] = null;
  let renterAge = 30;
  let riskScore = 25;

  if (params.renterId) {
    const renter = await prisma.user.findUnique({
      where: { id: params.renterId },
      include: { documents: true },
    });
    if (!renter) throw new BookingError('Renter not found.', 'RENTER_NOT_FOUND', 404);

    const isPremium = PREMIUM_CATEGORIES.includes(vehicle.category as VehicleCategory);
    eligibility = checkRenterEligibility({
      profile: toRenterProfile(renter, renter.documents),
      country,
      tripStart: params.start,
      tripEnd: params.end,
      isPremiumCategory: isPremium,
    });

    renterAge = eligibility.age;

    const licence = renter.documents.find((doc) => doc.type === 'DRIVING_LICENSE');
    risk = assessRisk(
      toRiskSignals({
        renter,
        documentCompleteness: eligibility.completeness,
        licenceHeldMonths: licence?.issuedAt ? monthsBetween(licence.issuedAt, params.start) : null,
        age: eligibility.age,
        vehicle,
        tripDays: Math.max(
          1,
          Math.ceil((params.end.getTime() - params.start.getTime()) / 86_400_000),
        ),
        leadTimeHours: (params.start.getTime() - Date.now()) / 3_600_000,
        crossBorder: (params.crossBorderCountries ?? []).length > 0,
      }),
      country,
    );
    riskScore = risk.score;
  }

  const priced = quote({
    country,
    vehicle: { ...toPricingProfile(vehicle), ownerType: ownerTypeOf(vehicle.owner) },
    start: params.start,
    end: params.end,
    insuranceTier: params.insuranceTier,
    extras: params.extras,
    renterAge,
    renterRiskScore: riskScore,
    deliveryDistanceKm: params.deliveryDistanceKm,
    crossBorderCountries: params.crossBorderCountries,
    demandIndex: demandIndexFromUtilisation(rate),
    estimatedKm: params.estimatedKm,
    promoPercentOff: params.promoPercentOff,
  });

  return { quote: priced, availability, eligibility, risk, vehicle };
}

export interface CreateBookingParams extends QuoteParams {
  renterId: string;
  message?: string;
}

/**
 * Creates a request and pushes it as far along the machine as the facts allow.
 *
 * A renter whose documents are already verified goes straight to the owner's
 * inbox; one with paperwork outstanding waits in PENDING_DOCUMENTS. Either
 * way nothing is charged and the calendar is not blocked.
 */
export async function createBookingRequest(params: CreateBookingParams) {
  const { quote: priced, availability, eligibility, risk, vehicle } = await buildQuote(params);

  if (vehicle.status !== 'LISTED') {
    throw new BookingError('This car is not currently accepting bookings.', 'NOT_LISTED');
  }
  if (vehicle.ownerId === params.renterId) {
    throw new BookingError('You cannot book your own car.', 'SELF_BOOKING');
  }
  if (!availability.available) {
    throw new BookingError(
      availability.conflicts[0]?.message ?? 'Those dates are not available.',
      'UNAVAILABLE',
      409,
    );
  }
  if (!eligibility) {
    throw new BookingError('Sign in to request this car.', 'NOT_AUTHENTICATED', 401);
  }
  if (risk?.tier === 'BLOCKED') {
    throw new BookingError(
      'Your account cannot request bookings at the moment. Contact support.',
      'RISK_BLOCKED',
      403,
    );
  }

  const booking = await prisma.booking.create({
    data: {
      reference: bookingReference(),
      vehicleId: vehicle.id,
      renterId: params.renterId,
      ownerId: vehicle.ownerId,
      country: vehicle.country,
      startAt: params.start,
      endAt: params.end,
      status: 'DRAFT',
      currency: priced.currency,
      days: priced.days,
      insuranceTier: params.insuranceTier,
      extrasJson: JSON.stringify(params.extras ?? []),
      quoteJson: JSON.stringify(serialiseQuote(priced)),
      renterTotal: priced.renterTotal.amount,
      deposit: priced.deposit.amount,
      insuranceExcess: priced.insuranceExcess.amount,
      ownerGross: priced.ownerGross.amount,
      ownerCommission: priced.ownerCommission.amount,
      ownerPayout: priced.ownerPayout.amount,
      vatAmount: priced.vat.amount,
      includedKm: Number.isFinite(priced.includedKm) ? priced.includedKm : -1,
      deliveryDistanceKm: params.deliveryDistanceKm ?? 0,
      crossBorderJson: JSON.stringify(params.crossBorderCountries ?? []),
      renterMessage: params.message ?? null,
      riskScore: risk?.score ?? null,
      riskTier: risk?.tier ?? null,
      riskJson: risk ? JSON.stringify(risk) : null,
    },
  });

  await applyEvent({
    bookingId: booking.id,
    event: 'SUBMIT_REQUEST',
    actor: 'RENTER',
    actorId: params.renterId,
  });

  // If verification is already clear, hand it to the owner immediately.
  if (eligibility.eligible && eligibility.pendingDocuments.length === 0) {
    await applyEvent({
      bookingId: booking.id,
      event: 'DOCUMENTS_COMPLETED',
      actor: 'SYSTEM',
      guards: { eligibilityPassed: true },
    });
  }

  return prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
}

export interface ApplyEventParams {
  bookingId: string;
  event: StateEvent;
  actor: BookingActor;
  actorId?: string;
  note?: string;
  guards?: Parameters<typeof transition>[2]['guards'];
}

/**
 * The single entry point for moving a booking.
 *
 * It asks the state machine for permission, records the event, then performs
 * the effects the machine listed. Effects are executed in the same
 * transaction as the status change so a booking can never end up confirmed
 * with an unblocked calendar.
 */
export async function applyEvent(params: ApplyEventParams) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { vehicle: true, owner: true, renter: true },
  });
  if (!booking) throw new BookingError('Booking not found.', 'NOT_FOUND', 404);

  const guards = {
    ownerVerified: booking.owner.verificationStatus === 'VERIFIED',
    paymentMethodOnFile: true,
    ...params.guards,
  };

  const result = transition(booking.status as BookingStatus, params.event, {
    actor: params.actor,
    guards,
  });

  if (!result.ok) {
    throw new BookingError(result.error, 'ILLEGAL_TRANSITION', 409);
  }

  const outcome = result.value;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const data: Record<string, unknown> = { status: outcome.to };

    if (outcome.effects.includes('START_APPROVAL_TIMER')) {
      data.approvalDeadline = approvalDeadline(now, booking.startAt);
    }
    if (outcome.effects.includes('CANCEL_APPROVAL_TIMER')) {
      data.approvalDeadline = null;
      data.decidedAt = now;
    }
    if (params.event === 'OWNER_DECLINE') {
      data.declineReason = params.note ?? null;
    }
    if (params.event === 'OWNER_REQUEST_DOCUMENTS') {
      data.documentsRequested = params.note ?? null;
    }
    if (outcome.effects.includes('AUTHORIZE_PAYMENT')) {
      data.paymentStatus = 'AUTHORIZATION_PENDING';
    }
    if (params.event === 'PAYMENT_AUTHORIZED') {
      data.paymentStatus = 'AUTHORIZED';
      data.authorizedAt = now;
    }
    if (outcome.effects.includes('CAPTURE_PAYMENT')) {
      data.paymentStatus = 'CAPTURED';
      data.capturedAt = now;
    }

    await tx.booking.update({ where: { id: booking.id }, data });

    await tx.bookingEvent.create({
      data: {
        bookingId: booking.id,
        actorId: params.actorId ?? null,
        actorRole: params.actor,
        event: params.event,
        fromStatus: outcome.from,
        toStatus: outcome.to,
        effects: JSON.stringify(outcome.effects),
        note: params.note ?? null,
      },
    });

    await runEffects(tx, outcome.effects, booking, now);
  });

  // Owner response statistics, used by the reliability score.
  if (params.actor === 'OWNER' && ['OWNER_APPROVE', 'OWNER_DECLINE'].includes(params.event)) {
    const minutes = Math.max(
      0,
      Math.round((now.getTime() - booking.createdAt.getTime()) / 60_000),
    );
    await prisma.user.update({
      where: { id: booking.ownerId },
      data: {
        requestsAnswered: { increment: 1 },
        requestsApproved: { increment: params.event === 'OWNER_APPROVE' ? 1 : 0 },
        responseCount: { increment: 1 },
        responseTotalMinutes: { increment: minutes },
      },
    });
  }

  return { from: outcome.from, to: outcome.to, effects: outcome.effects };
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function runEffects(
  tx: Tx,
  effects: readonly TransitionEffect[],
  booking: Awaited<ReturnType<typeof prisma.booking.findUnique>> & {
    vehicle: { id: string; ownerId: string };
    owner: { id: string };
    renter: { id: string; fullName: string };
  },
  now: Date,
) {
  for (const effect of effects) {
    switch (effect) {
      case 'BLOCK_CALENDAR':
        await tx.availabilityBlock.create({
          data: {
            vehicleId: booking.vehicleId,
            start: booking.startAt,
            end: booking.endAt,
            reason: 'BOOKED',
            bookingId: booking.id,
          },
        });
        break;

      case 'RELEASE_CALENDAR':
        await tx.availabilityBlock.deleteMany({ where: { bookingId: booking.id } });
        break;

      case 'NOTIFY_OWNER':
        await tx.notification.create({
          data: {
            userId: booking.ownerId,
            kind: 'BOOKING',
            title: notificationTitle(booking.status as BookingStatus, 'OWNER'),
            body: `Booking ${booking.reference} — ${booking.renter.fullName}`,
            href: `/dashboard/owner/bookings/${booking.id}`,
          },
        });
        await tx.user.update({
          where: { id: booking.ownerId },
          data: { requestsReceived: { increment: 1 } },
        });
        break;

      case 'NOTIFY_RENTER':
        await tx.notification.create({
          data: {
            userId: booking.renterId,
            kind: 'BOOKING',
            title: notificationTitle(booking.status as BookingStatus, 'RENTER'),
            body: `Booking ${booking.reference}`,
            href: `/dashboard/trips/${booking.id}`,
          },
        });
        break;

      case 'OPEN_INSPECTION': {
        const phase = booking.status === 'CONFIRMED' ? 'HANDOVER' : 'RETURN';
        await tx.inspection.upsert({
          where: { bookingId_phase: { bookingId: booking.id, phase } },
          create: { bookingId: booking.id, phase },
          update: {},
        });
        break;
      }

      case 'CLOSE_INSPECTION': {
        const phase = booking.status === 'HANDOVER_PENDING' ? 'HANDOVER' : 'RETURN';
        await tx.inspection.updateMany({
          where: { bookingId: booking.id, phase },
          data: { completedAt: now },
        });
        break;
      }

      case 'SCHEDULE_OWNER_PAYOUT': {
        const country = getCountry(booking.country as CountryCode);
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            payoutScheduledAt: new Date(
              booking.endAt.getTime() + country.payoutDelayDaysAfterTripEnd * 86_400_000,
            ),
          },
        });
        await tx.user.update({
          where: { id: booking.ownerId },
          data: { completedTripsAsOwner: { increment: 1 } },
        });
        await tx.user.update({
          where: { id: booking.renterId },
          data: { completedTripsAsRenter: { increment: 1 } },
        });
        await tx.vehicle.update({
          where: { id: booking.vehicleId },
          data: { tripCount: { increment: 1 } },
        });
        break;
      }

      case 'ISSUE_REFUND': {
        const country = getCountry(booking.country as CountryCode);
        const parsed = parseJson<SerialisedQuote | null>(booking.quoteJson, null);
        if (parsed) {
          const refund = computeRefund({
            policy: (await tx.vehicle.findUnique({ where: { id: booking.vehicleId } }))
              ?.cancellationPolicy as CancellationPolicy,
            country,
            cancelledBy: booking.status === 'CONFIRMED' ? 'RENTER' : 'OWNER',
            bookedAt: booking.createdAt,
            tripStart: booking.startAt,
            cancelledAt: now,
            rentalAmount: money(parsed.rentalNet, booking.currency as 'EUR' | 'USD'),
            insuranceAmount: money(parsed.insurance, booking.currency as 'EUR' | 'USD'),
            extrasAmount: money(parsed.extras, booking.currency as 'EUR' | 'USD'),
            serviceFee: money(parsed.serviceFee, booking.currency as 'EUR' | 'USD'),
            vat: money(booking.vatAmount, booking.currency as 'EUR' | 'USD'),
            depositHeld: money(booking.deposit, booking.currency as 'EUR' | 'USD'),
          });
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              refundedAmount: refund.totalRefund.amount,
              settlementJson: JSON.stringify(refund),
              paymentStatus: refund.totalRefund.amount >= booking.renterTotal ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
            },
          });
        }
        const counter = booking.status === 'CONFIRMED' ? 'cancelledAsRenter' : 'cancelledAsOwner';
        await tx.user.update({
          where: { id: counter === 'cancelledAsRenter' ? booking.renterId : booking.ownerId },
          data: { [counter]: { increment: 1 } },
        });
        break;
      }

      case 'CAPTURE_PAYMENT': {
        const country = getCountry(booking.country as CountryCode);
        const parsed = parseJson<SerialisedQuote | null>(booking.quoteJson, null);
        if (parsed) {
          const currency = booking.currency as 'EUR' | 'USD';
          const rows = [
            { type: 'RENTAL_CHARGE', amount: booking.ownerGross, from: 'RENTER', to: 'OWNER', description: 'Rental' },
            { type: 'INSURANCE_CHARGE', amount: parsed.insurance, from: 'RENTER', to: 'INSURER', description: 'Protection' },
            { type: 'SERVICE_FEE', amount: parsed.serviceFee, from: 'RENTER', to: 'PLATFORM', description: 'Service fee' },
            { type: 'PLATFORM_COMMISSION', amount: booking.ownerCommission, from: 'OWNER', to: 'PLATFORM', description: 'Commission' },
            { type: 'VAT', amount: booking.vatAmount, from: 'RENTER', to: 'TAX_AUTHORITY', description: country.vatName },
            { type: 'DEPOSIT_HOLD', amount: booking.deposit, from: 'RENTER', to: 'DEPOSIT_HOLD', description: 'Security deposit', isHold: true },
          ].filter((row) => row.amount > 0);

          await tx.ledgerEntry.createMany({
            data: rows.map((row) => ({
              bookingId: booking.id,
              type: row.type,
              amount: row.amount,
              currency,
              fromAccount: row.from,
              toAccount: row.to,
              description: row.description,
              isHold: row.isHold ?? false,
              occurredAt: now,
            })),
          });
        }
        break;
      }

      case 'RELEASE_DEPOSIT':
        await tx.booking.update({
          where: { id: booking.id },
          data: { depositReturned: booking.deposit },
        });
        break;

      case 'REQUEST_REVIEWS':
        for (const userId of [booking.renterId, booking.ownerId]) {
          await tx.notification.create({
            data: {
              userId,
              kind: 'REVIEW',
              title: 'How did the trip go?',
              body: `Leave a review for booking ${booking.reference}.`,
              href: `/dashboard/trips/${booking.id}/review`,
            },
          });
        }
        break;

      // Effects handled outside the transaction or by the payment adapter.
      case 'RUN_ELIGIBILITY_CHECK':
      case 'RUN_RISK_ASSESSMENT':
      case 'AUTHORIZE_PAYMENT':
      case 'VOID_AUTHORIZATION':
      case 'HOLD_DEPOSIT':
      case 'REVEAL_EXACT_ADDRESS':
      case 'START_APPROVAL_TIMER':
      case 'CANCEL_APPROVAL_TIMER':
      case 'FREEZE_PAYOUT':
        break;
    }
  }
}

function notificationTitle(status: BookingStatus, audience: 'OWNER' | 'RENTER'): string {
  if (audience === 'OWNER') {
    switch (status) {
      case 'PENDING_DOCUMENTS':
        return 'New booking request';
      case 'AWAITING_OWNER_APPROVAL':
        return 'A verified renter is waiting on you';
      case 'APPROVED_AWAITING_PAYMENT':
        return 'Renter is completing payment';
      default:
        return 'Booking update';
    }
  }
  switch (status) {
    case 'AWAITING_OWNER_APPROVAL':
      return 'Your documents cleared';
    case 'APPROVED_AWAITING_PAYMENT':
      return 'The owner approved your request';
    case 'CONFIRMED':
      return 'Your trip is confirmed';
    default:
      return 'Booking update';
  }
}

export interface SerialisedQuote {
  rentalNet: number;
  insurance: number;
  extras: number;
  serviceFee: number;
  lines: { code: string; label: string; detail?: string; amount: number; kind: string; payer: string }[];
  dayBreakdown: { date: string; total: number; seasonLabel: string | null; weekendUplift: boolean }[];
  warnings: string[];
  requirements: string[];
}

export function serialiseQuote(priced: PriceQuote): SerialisedQuote {
  const lineAmount = (code: string) =>
    priced.lines.find((line) => line.code === code)?.amount.amount ?? 0;

  const extras = priced.lines
    .filter((line) => line.code.startsWith('EXTRA_'))
    .reduce((total, line) => total + line.amount.amount, 0);

  return {
    rentalNet: priced.ownerGross.amount,
    insurance: priced.insurance.totalPremium.amount,
    extras,
    serviceFee: lineAmount('SERVICE_FEE'),
    lines: priced.lines.map((line) => ({
      code: line.code,
      label: line.label,
      detail: line.detail,
      amount: line.amount.amount,
      kind: line.kind,
      payer: line.payer,
    })),
    dayBreakdown: priced.dayBreakdown.map((day) => ({
      date: day.date,
      total: day.total.amount,
      seasonLabel: day.seasonLabel,
      weekendUplift: day.weekendUplift,
    })),
    warnings: [...priced.warnings],
    requirements: [...priced.requirements],
  };
}

/** Expires requests the owner never answered. Run from a scheduled job. */
export async function expireStaleRequests(now = new Date()): Promise<number> {
  const stale = await prisma.booking.findMany({
    where: {
      status: { in: ['AWAITING_OWNER_APPROVAL', 'DOCUMENTS_REQUESTED'] },
      approvalDeadline: { lt: now },
    },
    select: { id: true },
    take: 200,
  });

  for (const booking of stale) {
    await applyEvent({ bookingId: booking.id, event: 'EXPIRE', actor: 'SYSTEM' });
  }
  return stale.length;
}

/** True when the renter may see the exact address and plate. */
export function addressIsRevealed(status: BookingStatus): boolean {
  return blocksCalendar(status) || status === 'COMPLETED';
}
