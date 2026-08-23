import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Clock, Inbox } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatusPill } from '@/components/dashboard/StatusPill';
import { Badge, EmptyState } from '@/components/ui';
import { formatMoney, money } from '@/lib/domain/money';
import type { Currency } from '@/lib/domain/types';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Requests' };
export const dynamic = 'force-dynamic';

const ACTIVE_STATUSES = [
  'AWAITING_OWNER_APPROVAL',
  'DOCUMENTS_REQUESTED',
  'APPROVED_AWAITING_PAYMENT',
  'CONFIRMED',
  'HANDOVER_PENDING',
  'ACTIVE',
  'RETURN_PENDING',
];

export default async function OwnerInboxPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/signin?next=/dashboard/owner');

  const bookings = await prisma.booking.findMany({
    where: { ownerId: user.id },
    include: { vehicle: true, renter: true },
    orderBy: [{ createdAt: 'desc' }],
    take: 60,
  });

  const waiting = bookings.filter((booking) =>
    ['AWAITING_OWNER_APPROVAL', 'DOCUMENTS_REQUESTED'].includes(booking.status),
  );
  const upcoming = bookings.filter(
    (booking) =>
      ACTIVE_STATUSES.includes(booking.status) &&
      !['AWAITING_OWNER_APPROVAL', 'DOCUMENTS_REQUESTED'].includes(booking.status),
  );
  const past = bookings.filter((booking) => !ACTIVE_STATUSES.includes(booking.status));

  const Row = ({ booking }: { booking: (typeof bookings)[number] }) => {
    const currency = booking.currency as Currency;
    const hoursLeft = booking.approvalDeadline
      ? Math.round((booking.approvalDeadline.getTime() - Date.now()) / 3_600_000)
      : null;

    return (
      <li>
        <Link
          href={`/dashboard/owner/bookings/${booking.id}`}
          className="panel group flex flex-wrap items-center gap-4 rounded-lg p-4 transition-colors hover:border-white/20 sm:flex-nowrap"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-[15px] font-bold text-ink-950">
            {booking.renter.fullName.charAt(0)}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-medium text-chalk">
                {booking.renter.fullName}
              </span>
              <StatusPill status={booking.status} />
              {booking.riskTier ? (
                <Badge
                  tone={
                    booking.riskTier === 'LOW'
                      ? 'cedar'
                      : booking.riskTier === 'MEDIUM'
                        ? 'warn'
                        : 'danger'
                  }
                >
                  Risk {booking.riskScore}
                </Badge>
              ) : null}
            </span>
            <span className="mt-1 block truncate text-[12.5px] text-slate-dim">
              {booking.vehicle.make} {booking.vehicle.model} ·{' '}
              {booking.startAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
              {booking.endAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ·{' '}
              {booking.days} {booking.days === 1 ? 'day' : 'days'}
            </span>
          </span>

          <span className="shrink-0 text-right">
            <span className="numeric block text-[15px] font-semibold text-chalk">
              {formatMoney(money(booking.ownerPayout, currency))}
            </span>
            <span className="block text-[11px] text-slate-dim">your payout</span>
          </span>

          {hoursLeft !== null && hoursLeft >= 0 ? (
            <span
              className={cn(
                'numeric inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]',
                hoursLeft <= 2
                  ? 'border-danger/30 bg-danger/10 text-danger'
                  : 'border-white/10 text-slate-dim',
              )}
            >
              <Clock size={11} />
              {hoursLeft}h
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <DashboardShell active="owner">
      <header>
        <h1 className="display text-2xl text-chalk">Requests</h1>
        <p className="mt-2 text-[14px] text-mist">
          {waiting.length > 0
            ? `${waiting.length} ${waiting.length === 1 ? 'person is' : 'people are'} waiting on your answer. Nobody has been charged.`
            : 'Nothing waiting on you right now.'}
        </p>
      </header>

      {waiting.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-amber-400">
            Waiting on you
          </h2>
          <ul className="space-y-2.5">
            {waiting.map((booking) => (
              <Row key={booking.id} booking={booking} />
            ))}
          </ul>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-dim">
            Confirmed and in progress
          </h2>
          <ul className="space-y-2.5">
            {upcoming.map((booking) => (
              <Row key={booking.id} booking={booking} />
            ))}
          </ul>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-dim">Past</h2>
          <ul className="space-y-2.5 opacity-70">
            {past.slice(0, 12).map((booking) => (
              <Row key={booking.id} booking={booking} />
            ))}
          </ul>
        </section>
      ) : null}

      {bookings.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<Inbox size={30} />}
          title="No requests yet"
          description="Once your car is listed, requests from verified renters land here with their risk profile attached."
        />
      ) : null}
    </DashboardShell>
  );
}
