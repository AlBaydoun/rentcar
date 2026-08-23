'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import { getCountry } from '@/lib/domain/countries';
import { suggestDailyRate } from '@/lib/domain/pricing';
import { money } from '@/lib/domain/money';
import { fieldErrors } from '@/lib/validation';
import {
  CANCELLATION_POLICIES,
  COUNTRIES,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CATEGORIES,
  type CountryCode,
  type VehicleCategory,
} from '@/lib/domain/types';

/**
 * Listing creation.
 *
 * The owner sets the price; the platform only suggests a range from
 * comparable cars nearby. Nothing here overrides what they choose.
 */

const listingSchema = z.object({
  make: z.string().trim().min(1, 'Which make?').max(40),
  model: z.string().trim().min(1, 'Which model?').max(40),
  variant: z.string().trim().max(60).optional(),
  year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
  category: z.enum(VEHICLE_CATEGORIES),
  transmission: z.enum(TRANSMISSIONS),
  fuelType: z.enum(FUEL_TYPES),
  seats: z.coerce.number().int().min(2).max(9),
  doors: z.coerce.number().int().min(2).max(5),
  colour: z.string().trim().min(1, 'What colour is it?').max(40),
  licensePlate: z.string().trim().min(3, 'Enter the registration').max(20),
  odometerKm: z.coerce.number().int().min(0).max(1_000_000),

  country: z.enum(COUNTRIES),
  city: z.string().trim().min(1, 'Which city?').max(80),
  exactAddress: z.string().trim().min(5, 'Where is it kept?').max(200),

  dailyRate: z.coerce.number().int().min(100, 'That is too low to be worth listing'),
  estimatedValue: z.coerce.number().int().min(10_000, 'Enter the car\'s approximate value'),
  weeklyDiscount: z.coerce.number().min(0).max(0.5),
  monthlyDiscount: z.coerce.number().min(0).max(0.6),
  cleaningFee: z.coerce.number().int().min(0).max(50_000),
  includedKmPerDay: z.coerce.number().int().min(50).max(1000),

  minRentalDays: z.coerce.number().int().min(1).max(30),
  maxRentalDays: z.coerce.number().int().min(1).max(180),
  advanceNoticeHours: z.coerce.number().int().min(1).max(168),
  bufferHours: z.coerce.number().int().min(0).max(48),
  cancellationPolicy: z.enum(CANCELLATION_POLICIES),

  smokingAllowed: z.coerce.boolean().optional(),
  petsAllowed: z.coerce.boolean().optional(),
  crossBorderAllowed: z.coerce.boolean().optional(),

  features: z.string().optional(),
  description: z.string().trim().min(20, 'Tell renters something useful — 20 characters minimum').max(2_000),
});

export interface ListingState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  vehicleId?: string;
}

export async function createListingAction(
  _prev: ListingState,
  formData: FormData,
): Promise<ListingState> {
  const user = await requireUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = listingSchema.safeParse({
    ...raw,
    smokingAllowed: raw.smokingAllowed === 'on',
    petsAllowed: raw.petsAllowed === 'on',
    crossBorderAllowed: raw.crossBorderAllowed === 'on',
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const data = parsed.data;
  const country = getCountry(data.country as CountryCode);

  if (data.maxRentalDays < data.minRentalDays) {
    return {
      ok: false,
      errors: { maxRentalDays: 'The maximum cannot be shorter than the minimum.' },
    };
  }

  const cityMeta = country.cities.find((entry) => entry.name === data.city);
  // Public coordinates are jittered by roughly 500 m so the listing never
  // discloses where the car actually sits.
  const jitter = () => (Math.random() - 0.5) * 0.012;
  const lat = cityMeta?.lat ?? country.cities[0].lat;
  const lng = cityMeta?.lng ?? country.cities[0].lng;

  const features = (data.features ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);

  const deposit = Math.min(
    country.depositMax,
    Math.max(country.depositMin, Math.round(data.estimatedValue * 0.025)),
  );

  const vehicle = await prisma.vehicle.create({
    data: {
      ownerId: user.id,
      make: data.make,
      model: data.model,
      variant: data.variant || null,
      year: data.year,
      category: data.category,
      transmission: data.transmission,
      fuelType: data.fuelType,
      seats: data.seats,
      doors: data.doors,
      colour: data.colour,
      licensePlate: data.licensePlate,
      odometerKm: data.odometerKm,
      tankCapacityL: data.fuelType === 'ELECTRIC' ? 0 : 55,

      country: data.country,
      city: data.city,
      areaLat: lat + jitter(),
      areaLng: lng + jitter(),
      exactAddress: data.exactAddress,
      exactLat: lat,
      exactLng: lng,

      dailyRate: data.dailyRate,
      estimatedValue: data.estimatedValue,
      weeklyDiscount: data.weeklyDiscount,
      monthlyDiscount: data.monthlyDiscount,
      cleaningFee: data.cleaningFee,
      baseDeposit: deposit,
      includedKmPerDay: data.includedKmPerDay,
      extraKmPrice: country.defaultExtraKmPrice,
      deliveryPricePerKm: country.code === 'DE' ? 150 : 120,
      deliveryFreeRadiusKm: 5,

      minRentalDays: data.minRentalDays,
      maxRentalDays: data.maxRentalDays,
      advanceNoticeHours: data.advanceNoticeHours,
      bufferHours: data.bufferHours,
      cancellationPolicy: data.cancellationPolicy,

      smokingAllowed: Boolean(data.smokingAllowed),
      petsAllowed: Boolean(data.petsAllowed),
      crossBorderAllowed: Boolean(data.crossBorderAllowed),

      features: JSON.stringify(features),
      photos: JSON.stringify([]),
      description: data.description,

      // A new listing waits on its paperwork before it can be booked.
      status: 'PENDING_REVIEW',
    },
  });

  // Placeholders so the owner can see exactly what is outstanding.
  await prisma.document.createMany({
    data: country.requiredVehicleDocuments.map((type) => ({
      vehicleId: vehicle.id,
      type,
      status: 'UNVERIFIED',
      issuingCountry: data.country,
    })),
  });

  // Owners who signed up only to rent become hosts the moment they list.
  if (user.role === 'RENTER') {
    await prisma.user.update({ where: { id: user.id }, data: { role: 'BOTH' } });
  }

  revalidatePath('/dashboard/cars');
  redirect(`/dashboard/cars?created=${vehicle.id}`);
}

/** Comparable-set pricing suggestion for the listing wizard. */
export async function suggestPriceAction(input: {
  country: CountryCode;
  city: string;
  category: VehicleCategory;
  year: number;
}): Promise<{ suggested: number; low: number; high: number; sampleSize: number } | null> {
  const country = getCountry(input.country);

  // Prefer comparables in the same city, then fall back to the whole market.
  let comparables = await prisma.vehicle.findMany({
    where: { country: input.country, city: input.city, category: input.category, status: 'LISTED' },
    select: { dailyRate: true },
    take: 40,
  });

  if (comparables.length < 3) {
    comparables = await prisma.vehicle.findMany({
      where: { country: input.country, category: input.category, status: 'LISTED' },
      select: { dailyRate: true },
      take: 40,
    });
  }

  const result = suggestDailyRate(
    comparables.map((entry) => money(entry.dailyRate, country.currency)),
    input.category,
    input.year,
    new Date().getFullYear(),
  );

  if (!result) return null;
  return {
    suggested: result.suggested.amount,
    low: result.low.amount,
    high: result.high.amount,
    sampleSize: result.sampleSize,
  };
}
