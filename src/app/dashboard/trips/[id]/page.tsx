import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Info, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatusPill } from '@/components/dashboard/StatusPill';
import { BookingTimeline, EventLog } from '@/components/dashboard/BookingTimeline';
import { MessageThread } from '@/components/dashboard/MessageThread';
import { CancelBooking, PayNow, TripStep } from '@/components/dashboard/TripActions';
import { Badge, Card, KeyValue } from '@/components/ui';
import { STATUS_NARRATIVE } from '@/lib/domain/booking-state-machine';
import { addressIsRevealed } from '@/lib/server/booking-service';
import { getCountry } from '@/lib/domain/countries';
import { previewPolicy, POLICY_SPECS } from '@/lib/domain/cancellation';
import { formatMoney, money } from '@/lib/domain/money';
import { parseJson } from '@/lib/server/mappers';
import type {
  BookingStatus,
  CancellationPolicy,
  CountryCode,
  Currency,
} from '@/lib/domain/types';

export const metadata: Metadata = { title: 'Trip' };
export const dynamic = 'force-dynamic';

interface QuoteLine {
  code: string;
  label: string;
  detail?: string;
  amount: number;
  kind: string;
  payer: string;
}

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  if (!user) redirect(`/signin?next=/dashboard/trips/${id}`);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      vehicle: { include: { owner: true } },
      owner: true,
      events: { orderBy: { createdAt: 'asc' } },
      messages: { include: { sender: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!booking) notFound();
  if (booking.renterId !== user.id) redirect('/dashboard');

  const country = getCountry(booking.country as CountryCode);
  const currency = booking.currency as Currency;
  const status = booking.status as BookingStatus;
  const narrative = STATUS_NARRATIVE[status];
  const revealed = addressIsRevealed(status);
  const quote = parseJson<{ lines: QuoteLine[] } | null>(booking.quoteJson, null);
  const policy = POLICY_SPECS[booking.vehicle.cancellationPolicy as CancellationPolicy];

  const refundPreview = previewPolicy({
    policy: booking.vehicle.cancellationPolicy as CancellationPolicy,
    tripStart: booking.startAt,
    total: money(booking.renterTotal, currency),
  });
  const currentTier = refundPreview.find((row) => row.current);

  const cancellable = [
    'PENDING_DOCUMENTS',
    'AWAITING_OWNER_APPROVAL',
    'DOCUMENTS_REQUESTED',
    'APPROVED_AWAITING_PAYMENT',
    'CONFIRMED',
  ].includes(status);

  return (
    <DashboardShell active="trips">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-mist transition-colors hover:text-chalk"
      >
        <ArrowLeft size={14} />
        All trips
      </Link>

      {query.submitted ? (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-cedar-500/25 bg-cedar-500/10 p-4">
          <ShieldCheck size={17} className="mt-px shrink-0 text-cedar-400" />
          <div>
            <p className="text-[13.5px] font-medium text-cedar-400">Request sent</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-mist">
              {booking.owner.fullName.split(' ')[0]} has been notified. Nothing has been charged to
              you, and nothing will be until they approve.
            </p>
          </div>
        </div>
      ) : null}

      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={booking.status} />
            <span className="numeric text-[12px] text-slate-dim">{booking.reference}</span>
          </div>
          <h1 className="display mt-3 text-2xl text-chalk">
            {booking.vehicle.make} {booking.vehicle.model}
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
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="numeric text-2xl font-bold text-chalk">
            {formatMoney(money(booking.renterTotal, currency))}
          </p>
          <p className="text-[12px] text-slate-dim">
            {['PENDING_DOCUMENTS', 'AWAITING_OWNER_APPROVAL', 'DOCUMENTS_REQUESTED'].includes(status)
              ? 'not charged yet'
              : 'trip total'}
          </p>
        </div>
      </header>

      {narrative ? (
        <p className="mt-5 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 text-[13.5px] leading-relaxed text-mist">
          {narrative.renter}
        </p>
      ) : null}

      <div className="mt-6">
        <BookingTimeline status={booking.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-6">
          {/* Price breakdown */}
          <Card className="p-6">
            <h2 className="text-[15px] font-semibold text-chalk">What you are paying</h2>
            {quote?.lines?.length ? (
              <KeyValue
                className="mt-4"
                rows={quote.lines
                  .filter(
                    (line) =>
                      line.payer === 'RENTER' && line.kind !== 'INFO' && line.kind !== 'DEPOSIT',
                  )
                  .map((line) => ({
                    label: line.label,
                    hint: line.detail,
                    value: formatMoney(money(line.amount, currency)),
                  }))}
              />
            ) : (
              <KeyValue
                className="mt-4"
                rows={[
                  {
                    label: 'Rental and extras',
                    value: formatMoney(money(booking.ownerGross, currency)),
                  },
                  {
                    label: `${country.vatName} (${Math.round(country.vatRate * 100)}%)`,
                    value: formatMoney(money(booking.vatAmount, currency)),
                  },
                ]}
              />
            )}
            <div className="mt-4 flex items-baseline justify-between border-t border-white/[0.07] pt-4">
              <span className="text-[14px] font-medium text-chalk">Total</span>
              <span className="numeric text-lg font-bold text-chalk">
                {formatMoney(money(booking.renterTotal, currency))}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-[12.5px] text-slate-dim">Refundable deposit</span>
              <span className="numeric text-[12.5px] text-mist">
                {formatMoney(money(booking.deposit, currency))}
              </span>
            </div>
          </Card>

          {/* Pickup details */}
          <Card className="p-6">
            <h2 className="text-[15px] font-semibold text-chalk">Pickup</h2>
            {revealed ? (
              <div className="mt-4 space-y-3">
                <p className="flex items-start gap-2.5 text-[13.5px] text-chalk">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-amber-400" />
                  {booking.vehicle.exactAddress}
                </p>
                <p className="flex items-center gap-2.5 text-[13.5px] text-chalk">
                  <Phone size={15} className="shrink-0 text-amber-400" />
                  {booking.owner.phone ?? 'Message the owner in the thread below'}
                </p>
                <p className="numeric text-[12.5px] text-slate-dim">
                  Registration {booking.vehicle.licensePlate}
                </p>
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-2.5 rounded-xs border border-white/[0.07] bg-white/[0.02] p-4">
                <Info size={15} className="mt-px shrink-0 text-slate-dim" />
                <p className="text-[13px] leading-relaxed text-mist">
                  The area is <span className="text-chalk">{booking.vehicle.city}</span>. The exact
                  address, the registration and the owner&rsquo;s phone number appear here once the
                  booking is confirmed — that protects the owner&rsquo;s home address until a real
                  commitment exists on both sides.
                </p>
              </div>
            )}
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

        <div className="space-y-6 lg:sticky lg:top-24">
          {status === 'APPROVED_AWAITING_PAYMENT' ? (
            <PayNow
              bookingId={booking.id}
              total={booking.renterTotal}
              deposit={booking.deposit}
              currency={currency}
            />
          ) : null}

          {status === 'CONFIRMED' ? (
            <TripStep
              bookingId={booking.id}
              event="START_HANDOVER"
              label="Start the handover"
              description="Open the joint inspection when you meet the owner. You will photograph the car together and both sign before the keys change hands."
            />
          ) : null}

          {status === 'ACTIVE' ? (
            <TripStep
              bookingId={booking.id}
              event="START_RETURN"
              label="Start the return"
              description="Open the return inspection when you bring the car back. Fuel and mileage are compared against the handover."
            />
          ) : null}

          {booking.declineReason ? (
            <Card className="p-6">
              <h2 className="text-[14px] font-semibold text-chalk">Why it was declined</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-mist">{booking.declineReason}</p>
              <p className="mt-3 text-[12px] text-slate-dim">
                Nothing was charged. Other cars in {booking.vehicle.city} may suit these dates.
              </p>
            </Card>
          ) : null}

          {booking.documentsRequested ? (
            <Card className="p-6">
              <Badge tone="warn">Owner asked for something</Badge>
              <p className="mt-3 text-[13px] leading-relaxed text-mist">
                {booking.documentsRequested}
              </p>
              <p className="mt-3 text-[12px] text-slate-dim">
                Reply in the message thread and the request goes straight back to them.
              </p>
            </Card>
          ) : null}

          <Card className="p-6">
            <h2 className="text-[14px] font-semibold text-chalk">Protection</h2>
            <p className="mt-2 text-[13px] text-mist">
              {booking.insuranceTier} tier — your excess is{' '}
              {booking.insuranceExcess === 0
                ? 'zero'
                : formatMoney(money(booking.insuranceExcess, currency))}
              .
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-slate-dim">
              {country.mandatoryLiability.note}
            </p>
          </Card>

          {cancellable ? (
            <CancelBooking
              bookingId={booking.id}
              refundHint={
                status === 'CONFIRMED'
                  ? `${policy.name} policy — cancelling now refunds ${currentTier ? Math.round(currentTier.rate * 100) : 0}% of the rental. Protection and extras always come back in full.`
                  : 'Nothing has been charged, so cancelling costs you nothing.'
              }
            />
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
