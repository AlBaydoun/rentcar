import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatusPill } from '@/components/dashboard/StatusPill';
import { Badge, Card, EmptyState, KeyValue } from '@/components/ui';
import { getCountry } from '@/lib/domain/countries';
import { formatMoney, money } from '@/lib/domain/money';
import { payoutMethodLabel, schedulePayout } from '@/lib/domain/ledger';
import type { CountryCode, Currency, PayoutMethod } from '@/lib/domain/types';

export const metadata: Metadata = { title: 'Earnings' };
export const dynamic = 'force-dynamic';

export default async function EarningsPage() {
  const session = await getCurrentUser();
  if (!session) redirect('/signin?next=/dashboard/earnings');

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
  const country = getCountry(user.country as CountryCode);
  const currency = country.currency;

  const bookings = await prisma.booking.findMany({
    where: { ownerId: user.id },
    include: { vehicle: true, claims: { where: { status: { notIn: ['WITHDRAWN'] } } } },
    orderBy: { endAt: 'desc' },
    take: 50,
  });

  const settled = bookings.filter((booking) => booking.status === 'COMPLETED');
  const upcoming = bookings.filter((booking) =>
    ['CONFIRMED', 'HANDOVER_PENDING', 'ACTIVE', 'RETURN_PENDING'].includes(booking.status),
  );

  const lifetime = settled.reduce((total, booking) => total + booking.ownerPayout, 0);
  const pending = upcoming.reduce((total, booking) => total + booking.ownerPayout, 0);
  const commissionPaid = settled.reduce((total, booking) => total + booking.ownerCommission, 0);

  const method = (user.payoutMethod as PayoutMethod) ?? country.payoutMethods[0];

  return (
    <DashboardShell active="earnings">
      <header>
        <h1 className="display text-2xl text-chalk">Earnings</h1>
        <p className="mt-2 text-[14px] text-mist">
          Paid via {payoutMethodLabel(method)}, {country.payoutDelayDaysAfterTripEnd} days after
          each trip ends.
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Paid out', value: lifetime, hint: `${settled.length} completed trips` },
          { label: 'In progress', value: pending, hint: `${upcoming.length} trips running` },
          { label: 'Commission paid', value: commissionPaid, hint: `${Math.round(country.ownerCommissionRate * 100)}% rate` },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="record text-[11px] text-slate-dim">{stat.label}</p>
            <p className="numeric mt-2.5 text-2xl font-bold text-chalk">
              {formatMoney(money(stat.value, currency), { compact: true })}
            </p>
            <p className="mt-1 text-[11.5px] text-slate-dim">{stat.hint}</p>
          </Card>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-[15px] font-semibold text-chalk">Payouts</h2>

        {bookings.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<Wallet size={30} />}
            title="Nothing earned yet"
            description="Your first payout appears here a few days after your first completed trip."
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {[...settled, ...upcoming].slice(0, 20).map((booking) => {
              const bookingCountry = getCountry(booking.country as CountryCode);
              const payout = schedulePayout({
                ownerGross: money(booking.ownerGross, booking.currency as Currency),
                commission: money(booking.ownerCommission, booking.currency as Currency),
                country: bookingCountry,
                method,
                tripEnd: booking.endAt,
                hasOpenClaim: booking.claims.some((claim) =>
                  ['OPEN', 'EVIDENCE_REQUESTED', 'UNDER_REVIEW'].includes(claim.status),
                ),
                ownerVerified: user.verificationStatus === 'VERIFIED',
              });

              return (
                <li key={booking.id}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[14px] font-medium text-chalk">
                            {booking.vehicle.make} {booking.vehicle.model}
                          </h3>
                          <StatusPill status={booking.status} />
                        </div>
                        <p className="numeric mt-1 text-[12px] text-slate-dim">
                          {booking.reference} ·{' '}
                          {booking.endAt.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="numeric text-[16px] font-semibold text-chalk">
                          {formatMoney(payout.netAmount)}
                        </p>
                        <p className="text-[11px] text-slate-dim">
                          {payout.blockers.length > 0
                            ? 'on hold'
                            : booking.status === 'COMPLETED'
                              ? 'paid'
                              : `available ${payout.availableAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                        </p>
                      </div>
                    </div>

                    {payout.blockers.length > 0 ? (
                      <ul className="mt-3 space-y-1">
                        {payout.blockers.map((blocker) => (
                          <li key={blocker} className="text-[12px] text-warn">
                            {blocker}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <KeyValue
                      className="mt-4"
                      rows={[
                        { label: 'Gross', value: formatMoney(money(booking.ownerGross, booking.currency as Currency)) },
                        {
                          label: 'Commission',
                          value: `−${formatMoney(money(booking.ownerCommission, booking.currency as Currency))}`,
                        },
                        ...(payout.fee.amount > 0
                          ? [{ label: `${payoutMethodLabel(method)} fee`, value: `−${formatMoney(payout.fee)}` }]
                          : []),
                      ]}
                    />
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Card className="mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[14px] font-semibold text-chalk">Payout method</h2>
            <p className="mt-1.5 text-[13px] text-mist">
              {payoutMethodLabel(method)} — {user.payoutReference ?? 'not set up yet'}
            </p>
          </div>
          <Badge tone="neutral">{country.flag} {country.name}</Badge>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-slate-dim">
          Available in {country.name}: {country.payoutMethods.map(payoutMethodLabel).join(', ')}.
        </p>
      </Card>
    </DashboardShell>
  );
}
