'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import {
  applyEvent,
  BookingError,
  createBookingRequest,
} from '@/lib/server/booking-service';
import { PricingError } from '@/lib/domain/pricing';
import {
  bookingRequestSchema,
  fieldErrors,
  messageSchema,
  ownerDecisionSchema,
} from '@/lib/validation';
import type { ExtraCode, InsuranceTier } from '@/lib/domain/types';

export interface ActionState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  bookingId?: string;
}

function parseExtras(raw: FormDataEntryValue | null): { code: ExtraCode; quantity: number }[] {
  if (typeof raw !== 'string' || raw.length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Renter submits a request. Creates the booking and runs it through the machine. */
export async function requestBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = bookingRequestSchema.safeParse({
    vehicleId: formData.get('vehicleId'),
    start: formData.get('start'),
    end: formData.get('end'),
    insuranceTier: formData.get('insuranceTier'),
    extras: parseExtras(formData.get('extras')),
    deliveryDistanceKm: Number(formData.get('deliveryDistanceKm') ?? 0) || undefined,
    crossBorderCountries: parseExtras(formData.get('crossBorder')) as unknown as string[],
    message: formData.get('message') || undefined,
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  let bookingId: string;
  try {
    const booking = await createBookingRequest({
      vehicleId: parsed.data.vehicleId,
      renterId: user.id,
      start: new Date(parsed.data.start),
      end: new Date(parsed.data.end),
      insuranceTier: parsed.data.insuranceTier as InsuranceTier,
      extras: parsed.data.extras,
      deliveryDistanceKm: parsed.data.deliveryDistanceKm,
      crossBorderCountries: Array.isArray(parsed.data.crossBorderCountries)
        ? parsed.data.crossBorderCountries
        : [],
      message: parsed.data.message,
    });
    bookingId = booking.id;
  } catch (error) {
    if (error instanceof BookingError || error instanceof PricingError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  revalidatePath('/dashboard');
  redirect(`/dashboard/trips/${bookingId}?submitted=1`);
}

/**
 * The owner's decision.
 *
 * The service refuses anything the state machine does not allow, so the only
 * job here is confirming this user is the owner of that particular booking.
 */
export async function ownerDecisionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = ownerDecisionSchema.safeParse({
    bookingId: formData.get('bookingId'),
    decision: formData.get('decision'),
    note: formData.get('note') || undefined,
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    select: { ownerId: true },
  });
  if (!booking || booking.ownerId !== user.id) {
    return { ok: false, message: 'That booking is not yours to decide on.' };
  }

  if (parsed.data.decision === 'DECLINE' && !parsed.data.note) {
    return { ok: false, errors: { note: 'Give the renter a reason — it takes a moment and it matters.' } };
  }
  if (parsed.data.decision === 'REQUEST_DOCUMENTS' && !parsed.data.note) {
    return { ok: false, errors: { note: 'Say what you would like them to send.' } };
  }

  const event =
    parsed.data.decision === 'APPROVE'
      ? 'OWNER_APPROVE'
      : parsed.data.decision === 'DECLINE'
        ? 'OWNER_DECLINE'
        : 'OWNER_REQUEST_DOCUMENTS';

  try {
    await applyEvent({
      bookingId: parsed.data.bookingId,
      event,
      actor: 'OWNER',
      actorId: user.id,
      note: parsed.data.note,
    });
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, message: error.message };
    throw error;
  }

  revalidatePath('/dashboard/owner');
  revalidatePath(`/dashboard/owner/bookings/${parsed.data.bookingId}`);
  return { ok: true, message: 'Decision recorded.', bookingId: parsed.data.bookingId };
}

/** Renter completes payment on an approved booking. */
export async function payBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const bookingId = String(formData.get('bookingId') ?? '');

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { renterId: true },
  });
  if (!booking || booking.renterId !== user.id) {
    return { ok: false, message: 'That booking is not yours.' };
  }

  try {
    // The mock provider authorises immediately. A real adapter would return a
    // client secret here and confirm through a webhook instead.
    await applyEvent({
      bookingId,
      event: 'PAYMENT_AUTHORIZED',
      actor: 'RENTER',
      actorId: user.id,
      guards: { paymentMethodOnFile: true },
    });
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, message: error.message };
    throw error;
  }

  revalidatePath(`/dashboard/trips/${bookingId}`);
  return { ok: true, message: 'Payment authorised and your trip is confirmed.' };
}

export async function cancelBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const bookingId = String(formData.get('bookingId') ?? '');

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { renterId: true, ownerId: true },
  });
  if (!booking) return { ok: false, message: 'Booking not found.' };

  const isRenter = booking.renterId === user.id;
  const isOwner = booking.ownerId === user.id;
  if (!isRenter && !isOwner) return { ok: false, message: 'That booking is not yours.' };

  try {
    await applyEvent({
      bookingId,
      event: isRenter ? 'CANCEL_BY_RENTER' : 'CANCEL_BY_OWNER',
      actor: isRenter ? 'RENTER' : 'OWNER',
      actorId: user.id,
      note: String(formData.get('reason') ?? '') || undefined,
    });
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, message: error.message };
    throw error;
  }

  revalidatePath('/dashboard');
  return { ok: true, message: 'Booking cancelled.' };
}

/** Moves a booking along the handover/return path. */
export async function tripEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const bookingId = String(formData.get('bookingId') ?? '');
  const event = String(formData.get('event') ?? '') as
    | 'START_HANDOVER'
    | 'HANDOVER_COMPLETED'
    | 'START_RETURN'
    | 'RETURN_COMPLETED';

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { renterId: true, ownerId: true },
  });
  if (!booking) return { ok: false, message: 'Booking not found.' };

  const actor =
    booking.ownerId === user.id ? 'OWNER' : booking.renterId === user.id ? 'RENTER' : null;
  if (!actor) return { ok: false, message: 'That booking is not yours.' };

  // Both inspections must be signed off before their closing transitions.
  const inspections = await prisma.inspection.findMany({ where: { bookingId } });
  const signed = (phase: string) => {
    const record = inspections.find((item) => item.phase === phase);
    return Boolean(record?.ownerSignedAt && record?.renterSignedAt);
  };

  try {
    await applyEvent({
      bookingId,
      event,
      actor,
      actorId: user.id,
      guards: { handoverSigned: signed('HANDOVER'), returnSigned: signed('RETURN') },
    });
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, message: error.message };
    throw error;
  }

  revalidatePath(`/dashboard/trips/${bookingId}`);
  revalidatePath(`/dashboard/owner/bookings/${bookingId}`);
  return { ok: true, message: 'Updated.' };
}

export async function sendMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = messageSchema.safeParse({
    bookingId: formData.get('bookingId'),
    body: formData.get('body'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    select: { renterId: true, ownerId: true },
  });
  if (!booking || (booking.renterId !== user.id && booking.ownerId !== user.id)) {
    return { ok: false, message: 'You are not part of that conversation.' };
  }

  await prisma.message.create({
    data: { bookingId: parsed.data.bookingId, senderId: user.id, body: parsed.data.body },
  });

  const recipient = booking.renterId === user.id ? booking.ownerId : booking.renterId;
  await prisma.notification.create({
    data: {
      userId: recipient,
      kind: 'MESSAGE',
      title: `New message from ${user.fullName.split(' ')[0]}`,
      body: parsed.data.body.slice(0, 120),
      href:
        booking.ownerId === recipient
          ? `/dashboard/owner/bookings/${parsed.data.bookingId}`
          : `/dashboard/trips/${parsed.data.bookingId}`,
    },
  });

  revalidatePath(`/dashboard/trips/${parsed.data.bookingId}`);
  revalidatePath(`/dashboard/owner/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}
