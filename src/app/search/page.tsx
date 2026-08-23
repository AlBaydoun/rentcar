import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CarFront } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchBar } from '@/components/search/SearchBar';
import { SortSelect } from '@/components/search/SortSelect';
import { CarCard } from '@/components/cars/CarCard';
import { Container, EmptyState } from '@/components/ui';
import { searchVehicles } from '@/lib/server/search';
import { searchSchema } from '@/lib/validation';

export const metadata: Metadata = { title: 'Find a car' };
export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const raw = await searchParams;
  const parsed = searchSchema.safeParse(raw);
  const input = parsed.success ? parsed.data : {};

  const [outcome, user] = await Promise.all([searchVehicles(input), getCurrentUser()]);
  const currency = input.country === 'LB' ? 'USD' : 'EUR';

  const dateLabel =
    input.from && input.to
      ? `${new Date(input.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(
          input.to,
        ).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
      : null;

  return (
    <>
      <SiteHeader user={user} />

      <main className="pt-28 sm:pt-32">
        <Container>
          <Suspense fallback={<div className="h-20" />}>
            <SearchBar />
          </Suspense>

          <div className="mt-8 grid gap-8 lg:grid-cols-[264px_minmax(0,1fr)]">
            <Suspense fallback={<div />}>
              <SearchFilters facets={outcome.facets} currency={currency} />
            </Suspense>

            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="display text-2xl text-chalk">
                    {outcome.total} {outcome.total === 1 ? 'car' : 'cars'}
                    {input.city ? ` in ${input.city}` : ''}
                  </h1>
                  <p className="mt-1.5 text-[13px] text-slate-dim">
                    {dateLabel ? `Available ${dateLabel}. ` : ''}
                    {outcome.unavailableForDates > 0
                      ? `${outcome.unavailableForDates} more are booked or blocked for those dates.`
                      : 'Prices shown are the owner\'s daily rate before fees.'}
                  </p>
                </div>
                <Suspense fallback={<div />}>
                  <SortSelect />
                </Suspense>
              </div>

              {outcome.results.length === 0 ? (
                <EmptyState
                  icon={<CarFront size={30} />}
                  title="Nothing matches those filters"
                  description={
                    outcome.unavailableForDates > 0
                      ? 'Some cars are unavailable for your dates. Try widening the window or clearing a filter.'
                      : 'Try a different city, or clear a filter or two.'
                  }
                />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {outcome.results.map((car, index) => (
                    <CarCard
                      key={car.id}
                      car={car}
                      index={index}
                      href={
                        input.from && input.to
                          ? `/cars/${car.id}?from=${input.from}&to=${input.to}`
                          : `/cars/${car.id}`
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}
