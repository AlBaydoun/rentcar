import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, FileSearch } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { Wordmark } from '@/components/layout/Wordmark';
import { ReviewControls } from '@/components/admin/ReviewControls';
import { Badge, Card, Container, EmptyState } from '@/components/ui';
import { DOCUMENT_LABELS, autoScreenDocument } from '@/lib/domain/documents';
import { toStoredDocument } from '@/lib/server/mappers';
import { formatMoney, money } from '@/lib/domain/money';
import type { Currency } from '@/lib/domain/types';

export const metadata: Metadata = { title: 'Operations' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/signin?next=/admin');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const [queue, stats, disputes, recentBookings] = await Promise.all([
    prisma.document.findMany({
      where: { status: { in: ['PENDING', 'IN_REVIEW'] } },
      include: { user: true, vehicle: true },
      orderBy: { createdAt: 'asc' },
      take: 40,
    }),
    Promise.all([
      prisma.user.count(),
      prisma.vehicle.count({ where: { status: 'LISTED' } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'AWAITING_OWNER_APPROVAL' } }),
    ]),
    prisma.claim.findMany({
      where: { status: { in: ['OPEN', 'EVIDENCE_REQUESTED', 'UNDER_REVIEW'] } },
      include: { booking: true },
      take: 20,
    }),
    prisma.booking.findMany({
      include: { vehicle: true, renter: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);

  const [users, listed, bookings, awaiting] = stats;

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/[0.07]">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/">
            <Wordmark />
          </Link>
          <Badge tone="amber">Operations</Badge>
        </Container>
      </header>

      <Container className="py-10">
        <h1 className="display text-2xl text-chalk">Operations</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Accounts', value: users },
            { label: 'Cars listed', value: listed },
            { label: 'Bookings', value: bookings },
            { label: 'Awaiting owner', value: awaiting },
          ].map((stat) => (
            <Card key={stat.label} className="p-5">
              <p className="numeric text-2xl font-bold text-chalk">{stat.value}</p>
              <p className="mt-1 text-[12px] text-slate-dim">{stat.label}</p>
            </Card>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="text-[15px] font-semibold text-chalk">Document review queue</h2>
          <p className="mt-1.5 text-[13px] text-slate-dim">
            Automated screening has already rejected the obviously invalid. These need a human.
          </p>

          {queue.length === 0 ? (
            <EmptyState
              className="mt-5"
              icon={<FileSearch size={28} />}
              title="Queue is empty"
              description="Every submitted document has been reviewed."
            />
          ) : (
            <ul className="mt-5 space-y-3">
              {queue.map((document) => {
                const screening = document.user
                  ? autoScreenDocument(toStoredDocument(document), {
                      fullName: document.user.fullName,
                      dateOfBirth: document.user.dateOfBirth,
                    })
                  : null;

                return (
                  <li key={document.id}>
                    <Card className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[14px] font-medium text-chalk">
                              {DOCUMENT_LABELS[document.type as keyof typeof DOCUMENT_LABELS] ??
                                document.type}
                            </h3>
                            <Badge tone="warn">{document.status.toLowerCase()}</Badge>
                            <Badge tone="neutral">issued in {document.issuingCountry}</Badge>
                          </div>
                          <p className="mt-1 text-[12.5px] text-slate-dim">
                            {document.user
                              ? `${document.user.fullName} · ${document.user.email}`
                              : document.vehicle
                                ? `${document.vehicle.make} ${document.vehicle.model}`
                                : 'Unattached'}
                          </p>
                          {document.expiresAt ? (
                            <p className="numeric mt-1 text-[11.5px] text-slate-dim">
                              Valid to{' '}
                              {document.expiresAt.toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {screening && screening.verdict === 'AUTO_REJECT' ? (
                        <div className="mt-4 rounded-xs border border-danger/25 bg-danger/10 p-3.5">
                          <p className="flex items-center gap-2 text-[12px] font-medium text-danger">
                            <AlertTriangle size={13} />
                            Automated screening flagged this
                          </p>
                          <ul className="mt-2 space-y-1">
                            {screening.reasons.map((reason) => (
                              <li key={reason} className="text-[12px] text-danger/90">
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="mt-4 border-t border-white/[0.07] pt-4">
                        <ReviewControls documentId={document.id} />
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {disputes.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-[15px] font-semibold text-chalk">Open claims</h2>
            <ul className="mt-5 space-y-3">
              {disputes.map((claim) => (
                <li key={claim.id}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Badge tone="warn">{claim.status.toLowerCase().replace(/_/g, ' ')}</Badge>
                        <p className="mt-2 text-[13.5px] text-chalk">{claim.description}</p>
                        <p className="numeric mt-1 text-[11.5px] text-slate-dim">
                          {claim.booking.reference}
                        </p>
                      </div>
                      <p className="numeric shrink-0 text-[15px] font-semibold text-chalk">
                        {formatMoney(money(claim.claimedAmount, claim.booking.currency as Currency))}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-12">
          <h2 className="text-[15px] font-semibold text-chalk">Recent bookings</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-white/[0.07] text-[11px] uppercase tracking-wider text-slate-dim">
                  <th className="pb-3 pr-4 font-medium">Reference</th>
                  <th className="pb-3 pr-4 font-medium">Renter</th>
                  <th className="pb-3 pr-4 font-medium">Car</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Risk</th>
                  <th className="pb-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="text-[12.5px]">
                    <td className="numeric py-3 pr-4 text-mist">{booking.reference}</td>
                    <td className="py-3 pr-4 text-chalk">{booking.renter.fullName}</td>
                    <td className="py-3 pr-4 text-mist">
                      {booking.vehicle.make} {booking.vehicle.model}
                    </td>
                    <td className="py-3 pr-4 text-mist">
                      {booking.status.toLowerCase().replace(/_/g, ' ')}
                    </td>
                    <td className="numeric py-3 pr-4 text-mist">{booking.riskScore ?? '—'}</td>
                    <td className="numeric py-3 text-right text-chalk">
                      {formatMoney(money(booking.renterTotal, booking.currency as Currency))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Container>
    </div>
  );
}
