import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCountry } from '@/lib/domain/countries';
import { checkAvailability, toAvailabilityRules } from './availability-helpers';
import type { CountryCode } from '@/lib/domain/types';
import type { SearchInput } from '@/lib/validation';

/**
 * Vehicle search.
 *
 * Date filtering happens after the database query rather than inside it: a
 * car is only genuinely available if it clears the owner's buffer, notice and
 * pickup-window rules, and those live in the domain layer, not in SQL.
 */

export interface SearchResultItem {
  id: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  category: string;
  transmission: string;
  fuelType: string;
  seats: number;
  colour: string;
  city: string;
  country: string;
  currency: 'EUR' | 'USD';
  dailyRate: number;
  rating: number | null;
  ratingCount: number;
  tripCount: number;
  instantBook: boolean;
}

export interface SearchOutcome {
  results: SearchResultItem[];
  total: number;
  /** Cars excluded purely because of the chosen dates. */
  unavailableForDates: number;
  facets: {
    cities: { name: string; count: number }[];
    categories: { name: string; count: number }[];
    priceRange: { min: number; max: number } | null;
  };
}

export async function searchVehicles(input: SearchInput): Promise<SearchOutcome> {
  const where: Prisma.VehicleWhereInput = { status: 'LISTED' };

  if (input.country) where.country = input.country;
  if (input.city) where.city = { contains: input.city };
  if (input.category) where.category = input.category;
  if (input.transmission) where.transmission = input.transmission;
  if (input.fuelType) where.fuelType = input.fuelType;
  if (input.seats) where.seats = { gte: input.seats };
  if (input.instantBook) where.instantBook = true;
  if (input.minPrice !== undefined || input.maxPrice !== undefined) {
    where.dailyRate = {
      ...(input.minPrice !== undefined ? { gte: input.minPrice } : {}),
      ...(input.maxPrice !== undefined ? { lte: input.maxPrice } : {}),
    };
  }

  const orderBy: Prisma.VehicleOrderByWithRelationInput[] =
    input.sort === 'PRICE_ASC'
      ? [{ dailyRate: 'asc' }]
      : input.sort === 'PRICE_DESC'
        ? [{ dailyRate: 'desc' }]
        : input.sort === 'RATING'
          ? [{ ratingSum: 'desc' }, { ratingCount: 'desc' }]
          : input.sort === 'NEWEST'
            ? [{ createdAt: 'desc' }]
            : [{ tripCount: 'desc' }, { ratingCount: 'desc' }];

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy,
    include: { blocks: true },
    take: 120,
  });

  const start = input.from ? new Date(`${input.from}T10:00:00Z`) : null;
  const end = input.to ? new Date(`${input.to}T10:00:00Z`) : null;
  const datesValid = start && end && end > start;

  let unavailableForDates = 0;

  const filtered = vehicles.filter((vehicle) => {
    if (!datesValid) return true;
    const result = checkAvailability({
      requested: { start, end },
      blocks: vehicle.blocks.map((block) => ({
        start: block.start,
        end: block.end,
        reason: block.reason as 'BOOKED' | 'OWNER_BLOCKED' | 'MAINTENANCE',
        bookingId: block.bookingId ?? undefined,
      })),
      rules: toAvailabilityRules(vehicle),
    });
    // Time-of-day conflicts are not a reason to hide a car from a date search.
    const blocking = result.conflicts.filter((conflict) => conflict.code !== 'PICKUP_WINDOW');
    if (blocking.length > 0) {
      unavailableForDates += 1;
      return false;
    }
    return true;
  });

  const results: SearchResultItem[] = filtered.map((vehicle) => ({
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    year: vehicle.year,
    category: vehicle.category,
    transmission: vehicle.transmission,
    fuelType: vehicle.fuelType,
    seats: vehicle.seats,
    colour: vehicle.colour,
    city: vehicle.city,
    country: vehicle.country,
    currency: getCountry(vehicle.country as CountryCode).currency as 'EUR' | 'USD',
    dailyRate: vehicle.dailyRate,
    rating: vehicle.ratingCount > 0 ? vehicle.ratingSum / vehicle.ratingCount : null,
    ratingCount: vehicle.ratingCount,
    tripCount: vehicle.tripCount,
    instantBook: vehicle.instantBook,
  }));

  // Facets come from the country-filtered set so the counts match what a
  // reader can actually reach from here.
  const facetPool = await prisma.vehicle.findMany({
    where: input.country ? { status: 'LISTED', country: input.country } : { status: 'LISTED' },
    select: { city: true, category: true, dailyRate: true },
  });

  const cityCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  let min = Number.POSITIVE_INFINITY;
  let max = 0;

  for (const vehicle of facetPool) {
    cityCounts.set(vehicle.city, (cityCounts.get(vehicle.city) ?? 0) + 1);
    categoryCounts.set(vehicle.category, (categoryCounts.get(vehicle.category) ?? 0) + 1);
    min = Math.min(min, vehicle.dailyRate);
    max = Math.max(max, vehicle.dailyRate);
  }

  return {
    results,
    total: results.length,
    unavailableForDates,
    facets: {
      cities: [...cityCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      categories: [...categoryCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      priceRange: facetPool.length > 0 ? { min, max } : null,
    },
  };
}
