import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, BadgeCheck, CalendarDays, FileCheck2, MapPin, Route } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatusPill } from '@/components/dashboard/StatusPill';
import { RiskBreakdown } from '@/components/dashboard/RiskBreakdown';
import { OwnerDecision } from '@/components/dashboard/OwnerDecision';
import { BookingTimeline, EventLog } from '@/components/dashboard/BookingTimeline';
import { MessageThread } from '@/components/dashboard/MessageThread';
import { Badge, ButtonLink, Card, KeyValue } from '@/components/ui';
import { getCountry } from '@/lib/domain/countries';
import { formatMoney, money } from '@/lib/domain/money';
import { ageOn, DOCUMENT_LABELS, monthsBetween } from '@/lib/domain/documents';
import { assessRisk } from '@/lib/domain/risk';
import { parseJson, toRiskSignals } from '@/lib/server/mappers';
import type { CountryCode, Currency, DocumentType } from '@/lib/domain/types';

export const metadata: Metadata = { title: 'Booking request' };
export const dynamic = 'force-dynamic';

export default async function OwnerBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) redirect(`/signin?next=/dashboard/owner/bookings/${id}`);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      vehicle: true,
      renter: { include: { documents: true } },
      events: { orderBy: { createdAt: 'asc' } },
      messages: { include: { sender: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!booking) notFound();
  if (booking.ownerId !== user.id) redirect('/dashboard/owner');

  const country = getCountry(booking.country as CountryCode);
  const currency = booking.currency as Currency;
  const renter = booking.renter;

  const licence = renter.documents.find((doc) => doc.type === 'DRIVING_LICENSE');
  const licenceHeldMonths = licence?.issuedAt
    ? monthsBetween(licence.issuedAt, booking.startAt)
    : null;
  const age = ageOn(renter.dateOfBirth, booking.startAt);

  const verifiedDocs = renter.documents.filter((doc) => doc.status === 'VERIFIED');
  const required = country.requiredRenterDocuments;
  const completeness = Math.round(
    (required.filter((type) => verifiedDocs.some((doc) => doc.type === type)).length /
      required.length) *
      100,
  );

  // Re-score live rather than trusting the snapshot: the renter's history may
  // have moved since the request landed.
  const risk = assessRisk(
    toRiskSignals({
      renter,
      documentCompleteness: completeness,
      licenceHeldMonths,
      age,
      vehicle: booking.vehicle,
      tripDays: booking.days,
      leadTimeHours: (booking.startAt.getTime() - booking.createdAt.getTime()) / 3_600_000,
      crossBorder: parseJson<string[]>(booking.crossBorderJson, []).length > 0,
    }),
    country,
  );

  const rating =
    renter.ratingAsRenterCount > 0
      ? renter.ratingAsRenterSum / renter.ratingAsRenterCount
      : null;

  const awaiting = ['AWAITING_OWNER_APPROVAL', 'DOCUMENTS_REQUESTED'].includes(booking.status);

  return (
    <DashboardShell active="owner">
      <Link
        href="/dashboard/owner"
        className="inline-flex items-center gap-1.5 text-[13px] text-mist transition-colors hover:text-chalk"
      >
        <ArrowLeft size={14} />
        All requests
      </Link>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={booking.status} />
            <span className="numeric text-[12px] text-slate-dim">{booking.reference}</span>
          </div>
          <h1 className="display mt-3 text-2xl text-chalk">
            {renter.fullName} wants your {booking.vehicle.make} {booking.vehicle.model}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-mist">
            {booking.startAt.toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
            })}{' '}
            →{' '}
            {booking.endAt.toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
            })}{' '}
            · {booking.days} {booking.days === 1 ? 'day' : 'days'}
          </p>
        </div>
        <div className="text-right">
          <p className="numeric text-2xl font-bold text-chalk">
            {formatMoney(money(booking.ownerPayout, currency))}
          </p>
          <p className="text-[12px] text-slate-dim">your payout after commission</p>
        </div>
      </header>

      <div className="mt-6">
        <BookingTimeline status={booking.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-6">
          {/* Renter profile */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-amber-500 text-xl font-bold text-ink-950">
                {renter.fullName.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[16px] font-semibold text-chalk">{renter.fullName}</h2>
                  {renter.verificationStatus === 'VERIFIED' ? (
                    <Badge tone="cedar">
                      <BadgeCheck size={11} />
                      Verified
                    </Badge>
                  ) : (
                    <Badge tone="warn">Verification incomplete</Badge>
                  )}
                </div>
                <p className="mt-1 text-[12.5px] text-slate-dim">
                  {age} years old · lives in {renter.residenceCountry} · member since{' '}
                  {renter.createdAt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </p>

                <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: 'Trips', value: String(renter.completedTripsAsRenter) },
                    { label: 'Rating', value: rating ? rating.toFixed(1) : '—' },
                    {
                      label: 'Licence held',
                      value:
                        licenceHeldMonths === null
                          ? '—'
                          : licenceHeldMonths >= 24
                            ? `${Math.floor(licenceHeldMonths / 12)} yrs`
                            : `${licenceHeldMonths} mo`,
                    },
                    { label: 'Cancellations', value: String(renter.cancelledAsRenter) },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <dd className="numeric text-lg font-semibold text-chalk">{stat.value}</dd>
                      <dt className="mt-0.5 text-[11px] text-slate-dim">{stat.label}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {booking.renterMessage ? (
              <div className="mt-6 inset-note p-4">
                <p className="record text-[11px] text-slate-dim">
                  What they said
                </p>
                <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-mist">
                  {booking.renterMessage}
                </p>
              </div>
            ) : null}
          </Card>

          {/* Documents */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[15px] font-semibold text-chalk">Documents</h2>
              <Badge tone={completeness === 100 ? 'cedar' : 'warn'}>
                {completeness}% verified
              </Badge>
            </div>
            <p className="mt-1.5 text-[12.5px] text-slate-dim">
              KarRent checked these before the request reached you. Document images stay with us —
              you see the outcome, not the scans.
            </p>

            <ul className="mt-5 divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
              {required.map((type) => {
                const doc = renter.documents.find((entry) => entry.type === type);
                return (
                  <li key={type} className="flex items-center justify-between gap-4 py-3.5">
                    <span className="flex items-center gap-2.5">
                      <FileCheck2
                        size={14}
                        className={doc?.status === 'VERIFIED' ? 'text-cedar-400' : 'text-warn'}
                      />
                      <span className="text-[13px] text-chalk">
                        {DOCUMENT_LABELS[type as DocumentType]}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[12px] text-mist">
                        {doc ? doc.status.toLowerCase().replace('_', ' ') : 'not submitted'}
                      </span>
                      {doc?.issuingCountry ? (
                        <span className="numeric block text-[10.5px] text-slate-dim">
                          issued in {doc.issuingCountry}
                          {doc.expiresAt
                            ? ` · valid to ${doc.expiresAt.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
                            : ''}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Trip details */}
          <Card className="p-6">
            <h2 className="text-[15px] font-semibold text-chalk">The trip</h2>
            <KeyValue
              className="mt-4"
              rows={[
                {
                  label: 'Dates',
                  value: `${booking.startAt.toLocaleDateString('en-GB')} → ${booking.endAt.toLocaleDateString('en-GB')}`,
                },
                { label: 'Duration', value: `${booking.days} days` },
                { label: 'Protection tier', value: booking.insuranceTier },
                {
                  label: 'Their excess',
                  value: formatMoney(money(booking.insuranceExcess, currency)),
                  hint: 'What they owe toward damage',
                },
                {
                  label: 'Distance included',
                  value: booking.includedKm < 0 ? 'Unlimited' : `${booking.includedKm} km`,
                },
                {
                  label: 'Deposit held',
                  value: formatMoney(money(booking.deposit, currency)),
                },
                {
                  label: 'They pay',
                  value: formatMoney(money(booking.renterTotal, currency)),
                },
                {
                  label: 'KarRent commission',
                  value: `−${formatMoney(money(booking.ownerCommission, currency))}`,
                  hint: `${Math.round(country.ownerCommissionRate * 100)}% of your gross`,
                },
                {
                  label: 'You receive',
                  value: formatMoney(money(booking.ownerPayout, currency)),
                  hint: `${country.payoutDelayDaysAfterTripEnd} days after the trip ends`,
                },
              ]}
            />
          </Card>

          <MessageThread
            bookingId={booking.id}
            currentUserId={user.id}
            messages={booking.messages.map((message) => ({
              id: message.id,
              senderId: message.senderId,
              senderName: message.sender.fullName,
              body: message.body,
              createdAt: message.createdAt.toISOString(),
            }))}
          />

          <EventLog
            events={booking.events.map((event) => ({
              id: event.id,
              event: event.event,
              fromStatus: event.fromStatus,
              toStatus: event.toStatus,
              actorRole: event.actorRole,
              note: event.note,
              effects: parseJson<string[]>(event.effects, []),
              createdAt: event.createdAt.toISOString(),
            }))}
          />
        </div>

        {/* Decision column */}
        <div className="space-y-6 lg:sticky lg:top-24">
          {awaiting ? (
            <OwnerDecision
              bookingId={booking.id}
              renterFirstName={renter.fullName.split(' ')[0]}
              deadline={booking.approvalDeadline}
            />
          ) : null}

          {['HANDOVER_PENDING', 'RETURN_PENDING'].includes(booking.status) ? (
            <Card className="p-6">
              <h2 className="text-[14px] font-semibold text-chalk">
                {booking.status === 'HANDOVER_PENDING' ? 'Handover inspection' : 'Return inspection'}
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-mist">
                Walk around the car with {renter.fullName.split(' ')[0]} and sign the record
                together.
              </p>
              <ButtonLink
                href={`/dashboard/trips/${booking.id}/inspection`}
                size="md"
                className="mt-4 w-full"
              >
                Open the inspection
              </ButtonLink>
            </Card>
          ) : null}

          <RiskBreakdown risk={risk} />

          <Card className="p-6">
            <h2 className="text-[14px] font-semibold text-chalk">Your car</h2>
            <p className="mt-2 text-[13px] text-mist">
              {booking.vehicle.make} {booking.vehicle.model} · {booking.vehicle.year}
            </p>
            <ul className="mt-4 space-y-2.5 text-[12.5px] text-mist">
              <li className="flex items-center gap-2">
                <MapPin size={13} className="text-slate-dim" />
                {booking.vehicle.city}
              </li>
              <li className="flex items-center gap-2">
                <Route size={13} className="text-slate-dim" />
                {booking.vehicle.includedKmPerDay} km/day included
              </li>
              <li className="flex items-center gap-2">
                <CalendarDays size={13} className="text-slate-dim" />
                {booking.vehicle.bufferHours}h turnaround buffer
              </li>
            </ul>
            <Link
              href={`/cars/${booking.vehicleId}`}
              className="mt-4 inline-block text-[12.5px] font-medium text-amber-400 hover:underline"
            >
              View the listing →
            </Link>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
