import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { buildQuote, BookingError } from '@/lib/server/booking-service';
import { serialiseQuote } from '@/lib/server/booking-service';
import { PricingError } from '@/lib/domain/pricing';
import { quoteSchema } from '@/lib/validation';
import type { InsuranceTier } from '@/lib/domain/types';

/**
 * Live quoting for the booking panel.
 *
 * The panel re-prices on every change — dates, protection tier, extras — and
 * this is the same code path `createBookingRequest` uses, so the figure on
 * screen is the figure that gets persisted.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();

  try {
    const { quote, availability, eligibility, risk } = await buildQuote({
      vehicleId: parsed.data.vehicleId,
      renterId: user?.id,
      start: new Date(parsed.data.start),
      end: new Date(parsed.data.end),
      insuranceTier: parsed.data.insuranceTier as InsuranceTier,
      extras: parsed.data.extras,
      deliveryDistanceKm: parsed.data.deliveryDistanceKm,
      crossBorderCountries: parsed.data.crossBorderCountries,
      estimatedKm: parsed.data.estimatedKm,
    });

    return NextResponse.json({
      quote: {
        ...serialiseQuote(quote),
        currency: quote.currency,
        days: quote.days,
        renterTotal: quote.renterTotal.amount,
        deposit: quote.deposit.amount,
        insuranceExcess: quote.insuranceExcess.amount,
        ownerPayout: quote.ownerPayout.amount,
        vat: quote.vat.amount,
        averageDailyRate: quote.averageDailyRate.amount,
        includedKm: Number.isFinite(quote.includedKm) ? quote.includedKm : null,
        extraKmPrice: quote.extraKmPrice,
        insuranceTier: quote.insurance.tier,
      },
      availability: {
        available: availability.available,
        conflicts: availability.conflicts.map((conflict) => ({
          code: conflict.code,
          message: conflict.message,
        })),
      },
      eligibility: eligibility
        ? {
            eligible: eligibility.eligible,
            completeness: eligibility.completeness,
            issues: eligibility.issues,
            missingDocuments: eligibility.missingDocuments,
          }
        : null,
      risk: risk ? { score: risk.score, tier: risk.tier, recommendation: risk.recommendation } : null,
      signedIn: Boolean(user),
    });
  } catch (error) {
    if (error instanceof PricingError || error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    throw error;
  }
}
