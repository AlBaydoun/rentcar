import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Hero } from '@/components/home/Hero';
import { TrustStrip } from '@/components/home/TrustStrip';
import { HowItWorks } from '@/components/home/HowItWorks';
import { ApprovalFlow } from '@/components/home/ApprovalFlow';
import { Markets } from '@/components/home/Markets';
import { Protection } from '@/components/home/Protection';
import { EarningsCalculator } from '@/components/home/EarningsCalculator';
import { ClosingCta } from '@/components/home/ClosingCta';
import { CarCard, type CarCardData } from '@/components/cars/CarCard';
import { ButtonLink, Container, SectionHeading } from '@/components/ui';
import { Reveal, ScrollProgress } from '@/components/motion/primitives';
import { getCountry } from '@/lib/domain/countries';
import type { CountryCode } from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

async function loadHomeData() {
  const [vehicles, carCount, ownerCount, cities] = await Promise.all([
    prisma.vehicle.findMany({
      where: { status: 'LISTED' },
      orderBy: [{ ratingCount: 'desc' }, { tripCount: 'desc' }],
      take: 8,
    }),
    prisma.vehicle.count({ where: { status: 'LISTED' } }),
    prisma.user.count({ where: { verificationStatus: 'VERIFIED', vehicles: { some: {} } } }),
    prisma.vehicle.findMany({
      where: { status: 'LISTED' },
      select: { city: true },
      distinct: ['city'],
    }),
  ]);

  const featured: CarCardData[] = vehicles.map((vehicle) => ({
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
    currency: getCountry(vehicle.country as CountryCode).currency,
    dailyRate: vehicle.dailyRate,
    rating: vehicle.ratingCount > 0 ? vehicle.ratingSum / vehicle.ratingCount : null,
    ratingCount: vehicle.ratingCount,
    tripCount: vehicle.tripCount,
    instantBook: vehicle.instantBook,
  }));

  return {
    featured,
    stats: { cars: carCount, cities: cities.length, owners: ownerCount },
  };
}

export default async function HomePage() {
  const [{ featured, stats }, user] = await Promise.all([loadHomeData(), getCurrentUser()]);

  return (
    <>
      <ScrollProgress />
      <SiteHeader user={user} />

      <main>
        <Hero />
        <TrustStrip stats={stats} />
        <HowItWorks />
        <ApprovalFlow />

        {featured.length > 0 && (
          <section className="relative py-28 sm:py-32">
            <Container>
              <Reveal>
                <div className="flex flex-wrap items-end justify-between gap-6">
                  <SectionHeading
                    title="Cars people are actually lending"
                    description="Every one of these belongs to a verified private owner or a registered small business, not a rental desk."
                  />
                  <ButtonLink href="/search" variant="secondary" size="md" className="group shrink-0">
                    See all {stats.cars} cars
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </ButtonLink>
                </div>
              </Reveal>

              <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((car, index) => (
                  <CarCard key={car.id} car={car} index={index} />
                ))}
              </div>
            </Container>
          </section>
        )}

        <Markets />
        <Protection />
        <EarningsCalculator />
        <ClosingCta />
      </main>

      <SiteFooter />
    </>
  );
}
