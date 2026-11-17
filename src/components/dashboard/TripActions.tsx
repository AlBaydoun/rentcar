'use client';

import { useActionState } from 'react';
import { AlertCircle, CreditCard, KeyRound, Undo2 } from 'lucide-react';
import {
  cancelBookingAction,
  payBookingAction,
  tripEventAction,
  type ActionState,
} from '@/lib/actions/booking';
import { Button } from '@/components/ui';
import { formatMoney, money } from '@/lib/domain/money';
import type { Currency } from '@/lib/domain/types';

const initial: ActionState = { ok: false };

/** Payment step, shown once an owner has approved. */
export function PayNow({
  bookingId,
  total,
  deposit,
  currency,
}: {
  bookingId: string;
  total: number;
  deposit: number;
  currency: Currency;
}) {
  const [state, action, pending] = useActionState(payBookingAction, initial);

  return (
    <div className="surface rounded-lg p-6">
      <h2 className="text-[15px] font-semibold text-chalk">Complete your payment</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-mist">
        The owner approved your request. Authorising now locks the dates; the money is only taken
        when you actually collect the car.
      </p>

      <dl className="mt-5 space-y-2.5 border-t border-white/[0.07] pt-4">
        <div className="flex items-baseline justify-between">
          <dt className="text-[13px] text-mist">Trip total</dt>
          <dd className="numeric text-[15px] font-semibold text-chalk">
            {formatMoney(money(total, currency))}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-[13px] text-mist">Refundable deposit held</dt>
          <dd className="numeric text-[13px] text-mist">{formatMoney(money(deposit, currency))}</dd>
        </div>
      </dl>

      {state.message && !state.ok ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xs border border-danger/25 bg-danger/10 p-3 text-[12.5px] text-danger">
          <AlertCircle size={14} className="mt-px shrink-0" />
          {state.message}
        </div>
      ) : null}

      <form action={action}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending || state.ok}>
          <CreditCard size={15} />
          {state.ok ? 'Confirmed' : pending ? 'Authorising…' : 'Authorise and confirm'}
        </Button>
      </form>

      <p className="mt-3 text-center text-[11px] text-slate-dim">
        Mock payment adapter — no real card is charged in this environment.
      </p>
    </div>
  );
}

/** Handover and return controls. */
export function TripStep({
  bookingId,
  event,
  label,
  description,
}: {
  bookingId: string;
  event: string;
  label: string;
  description: string;
}) {
  const [state, action, pending] = useActionState(tripEventAction, initial);

  return (
    <div className="surface rounded-lg p-6">
      <h2 className="text-[15px] font-semibold text-chalk">{label}</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-mist">{description}</p>

      {state.message && !state.ok ? (
        <p className="mt-3 text-[12.5px] text-danger">{state.message}</p>
      ) : null}

      <form action={action}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <input type="hidden" name="event" value={event} />
        <Button type="submit" size="md" className="mt-4 w-full" disabled={pending}>
          <KeyRound size={14} />
          {pending ? 'Working…' : label}
        </Button>
      </form>
    </div>
  );
}

export function CancelBooking({
  bookingId,
  refundHint,
}: {
  bookingId: string;
  refundHint: string;
}) {
  const [state, action, pending] = useActionState(cancelBookingAction, initial);

  return (
    <form action={action} className="surface rounded-lg p-6">
      <input type="hidden" name="bookingId" value={bookingId} />
      <h2 className="text-[14px] font-semibold text-chalk">Need to cancel?</h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-mist">{refundHint}</p>
      {state.message && !state.ok ? (
        <p className="mt-3 text-[12.5px] text-danger">{state.message}</p>
      ) : null}
      <Button type="submit" variant="ghost" size="sm" className="mt-4" disabled={pending}>
        <Undo2 size={13} />
        {pending ? 'Cancelling…' : 'Cancel this booking'}
      </Button>
    </form>
  );
}
