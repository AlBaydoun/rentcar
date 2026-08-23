import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CarFront, Plus } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Badge, ButtonLink, Card, EmptyState, ProgressBar } from '@/components/ui';
import { CarSilhouette } from '@/components/cars/CarSilhouette';
import { bodyStyleForCategory } from '@/lib/body-style';
import { paintHex } from '@/lib/paint';
import { getCountry } from '@/lib/domain/countries';
import { checkVehicleCompliance } from '@/lib/domain/documents';
import { utilisation } from '@/lib/domain/availability';
import { formatMoney, money } from '@/lib/domain/money';
import { toStoredDocument } from '@/lib/server/mappers';
import type { CountryCode } from '@/lib/domain/types';

export const metadata: Metadata = { title: 'My cars' };
export const dynamic = 'force-dynamic';

export default async function MyCarsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/signin?next=/dashboard/cars');

  const vehicles = await prisma.vehicle.findMany({
    where: { ownerId: user.id },
    include: { documents: true, blocks: true },
    orderBy: { createdAt: 'desc' },
  });

  const windowStart = new Date();
  const windowEnd = new Date(Date.now() + 90 * 86_400_000);

  return (
    <DashboardShell active="cars">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-2xl text-chalk">My cars</h1>
          <p className="mt-2 text-[14px] text-mist">
            {vehicles.length} {vehicles.length === 1 ? 'listing' : 'listings'}.
          </p>
        </div>
        <ButtonLink href="/host" size="sm">
          <Plus size={14} />
          List another car
        </ButtonLink>
      </header>

      {vehicles.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<CarFront size={30} />}
          title="No cars listed yet"
          description="Set your own price, block the dates you need it, and approve only the people you want driving it."
          action={
            <ButtonLink href="/host" size="lg">
              List your car
            </ButtonLink>
          }
        />
      ) : (
        <ul className="mt-8 space-y-4">
          {vehicles.map((vehicle) => {
            const country = getCountry(vehicle.country as CountryCode);
            const compliance = checkVehicleCompliance({
              documents: vehicle.documents.map(toStoredDocument),
              country,
            });
            const used = utilisation({
              blocks: vehicle.blocks.map((block) => ({
                start: block.start,
                end: block.end,
                reason: block.reason as 'BOOKED' | 'OWNER_BLOCKED' | 'MAINTENANCE',
              })),
              window: { start: windowStart, end: windowEnd },
            });

            return (
              <li key={vehicle.id}>
                <Card className="flex flex-wrap gap-6 p-5 sm:flex-nowrap">
                  <div className="h-24 w-40 shrink-0 rounded-xs bg-white/[0.03] p-2">
                    <CarSilhouette
                      bodyStyle={bodyStyleForCategory(vehicle.category)}
                      colour={paintHex(vehicle.colour)}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-medium text-chalk">
                        {vehicle.make} {vehicle.model}
                      </h2>
                      <Badge
                        tone={
                          vehicle.status === 'LISTED'
                            ? 'cedar'
                            : vehicle.status === 'PAUSED'
                              ? 'warn'
                              : 'neutral'
                        }
                      >
                        {vehicle.status.toLowerCase()}
                      </Badge>
                      {!compliance.compliant ? (
                        <Badge tone="danger">Paperwork needs attention</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12.5px] text-slate-dim">
                      {vehicle.year} · {vehicle.city} · {vehicle.tripCount} trips
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="numeric text-[15px] font-semibold text-chalk">
                          {formatMoney(money(vehicle.dailyRate, country.currency))}
                        </p>
                        <p className="text-[11px] text-slate-dim">per day</p>
                      </div>
                      <div>
                        <p className="numeric text-[15px] font-semibold text-chalk">
                          {Math.round(used.rate * 100)}%
                        </p>
                        <p className="text-[11px] text-slate-dim">booked, next 90 days</p>
                      </div>
                      <div>
                        <p className="numeric text-[15px] font-semibold text-chalk">
                          {vehicle.ratingCount > 0
                            ? (vehicle.ratingSum / vehicle.ratingCount).toFixed(1)
                            : '—'}
                        </p>
                        <p className="text-[11px] text-slate-dim">rating</p>
                      </div>
                    </div>

                    <ProgressBar className="mt-4" value={used.rate * 100} tone="amber" />

                    {compliance.issues.length > 0 ? (
                      <ul className="mt-4 space-y-1">
                        {compliance.issues.slice(0, 2).map((issue) => (
                          <li
                            key={issue.code}
                            className={
                              issue.severity === 'BLOCKER'
                                ? 'text-[12px] text-danger'
                                : 'text-[12px] text-warn'
                            }
                          >
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <Link
                      href={`/cars/${vehicle.id}`}
                      className="mt-4 inline-block text-[12.5px] font-medium text-amber-400 hover:underline"
                    >
                      View the listing →
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
