import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CarFront, Plane } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatusPill } from '@/components/dashboard/StatusPill';
import { ButtonLink, EmptyState } from '@/components/ui';
import { STATUS_NARRATIVE } from '@/lib/domain/booking-state-machine';
import { formatMoney, money } from '@/lib/domain/money';
import type { BookingStatus, Currency } from '@/lib/domain/types';

export const metadata: Metadata = { title: 'My trips' };
export const dynamic = 'force-dynamic';

const LIVE = [
  'PENDING_DOCUMENTS',
  'AWAITING_OWNER_APPROVAL',
  'DOCUMENTS_REQUESTED',
  'APPROVED_AWAITING_PAYMENT',
  'CONFIRMED',
  'HANDOVER_PENDING',
  'ACTIVE',
  'RETURN_PENDING',
];

export default async function TripsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/signin?next=/dashboard');

  const bookings = await prisma.booking.findMany({
    where: { renterId: user.id },
    include: { vehicle: true, owner: true },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  const live = bookings.filter((booking) => LIVE.includes(booking.status));
  const past = bookings.filter((booking) => !LIVE.includes(booking.status));

  const Row = ({ booking }: { booking: (typeof bookings)[number] }) => {
    const currency = booking.currency as Currency;
    const narrative = STATUS_NARRATIVE[booking.status as BookingStatus];

    return (
      <li>
        <Link
          href={`/dashboard/trips/${booking.id}`}
          className="panel block rounded-lg p-5 transition-colors hover:border-white/20"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={booking.status} />
                <span className="numeric text-[11.5px] text-slate-dim">{booking.reference}</span>
              </div>
              <h3 className="mt-2.5 text-[15px] font-medium text-chalk">
                {booking.vehicle.make} {booking.vehicle.model}
              </h3>
              <p className="mt-1 text-[12.5px] text-slate-dim">
                {booking.vehicle.city} ·{' '}
                {booking.startAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
                {booking.endAt.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="numeric text-[16px] font-semibold text-chalk">
                {formatMoney(money(booking.renterTotal, currency))}
              </p>
              <p className="text-[11px] text-slate-dim">
                {booking.status === 'AWAITING_OWNER_APPROVAL' ||
                booking.status === 'PENDING_DOCUMENTS'
                  ? 'not charged'
                  : 'total'}
              </p>
            </div>
          </div>

          {narrative ? (
            <p className="mt-4 border-t border-white/[0.06] pt-3.5 text-[12.5px] leading-relaxed text-mist">
              {narrative.renter}
            </p>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <DashboardShell active="trips">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-2xl text-chalk">My trips</h1>
          <p className="mt-2 text-[14px] text-mist">
            {live.length > 0
              ? `${live.length} ${live.length === 1 ? 'trip' : 'trips'} in progress.`
              : 'Nothing booked at the moment.'}
          </p>
        </div>
        <ButtonLink href="/search" size="sm">
          Find a car
        </ButtonLink>
      </header>

      {live.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-amber-400">
            In progress
          </h2>
          <ul className="space-y-3">
            {live.map((booking) => (
              <Row key={booking.id} booking={booking} />
            ))}
          </ul>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-dim">Past</h2>
          <ul className="space-y-3 opacity-75">
            {past.map((booking) => (
              <Row key={booking.id} booking={booking} />
            ))}
          </ul>
        </section>
      ) : null}

      {bookings.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<Plane size={30} />}
          title="No trips yet"
          description="Find a car in Germany or Lebanon, send a request, and the owner decides. You are not charged while they think it over."
          action={
            <ButtonLink href="/search" size="lg">
              <CarFront size={15} />
              Browse cars
            </ButtonLink>
          }
        />
      ) : null}
    </DashboardShell>
  );
}
