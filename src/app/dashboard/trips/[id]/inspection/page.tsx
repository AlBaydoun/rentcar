import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { InspectionForm } from '@/components/dashboard/InspectionForm';
import { Badge } from '@/components/ui';
import { bodyStyleForCategory } from '@/lib/body-style';
import { paintHex } from '@/lib/paint';
import { parseJson } from '@/lib/server/mappers';
import type { Marker } from '@/components/three/DamageInspector';

export const metadata: Metadata = { title: 'Inspection' };
export const dynamic = 'force-dynamic';

export default async function InspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) redirect(`/signin?next=/dashboard/trips/${id}/inspection`);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { vehicle: true, owner: true, renter: true, inspections: true },
  });
  if (!booking) notFound();

  const isOwner = booking.ownerId === user.id;
  const isRenter = booking.renterId === user.id;
  if (!isOwner && !isRenter) redirect('/dashboard');

  const phase = booking.status === 'RETURN_PENDING' ? 'RETURN' : 'HANDOVER';
  const record = booking.inspections.find((entry) => entry.phase === phase);
  const handover = booking.inspections.find((entry) => entry.phase === 'HANDOVER');

  if (!['HANDOVER_PENDING', 'RETURN_PENDING'].includes(booking.status)) {
    redirect(isOwner ? `/dashboard/owner/bookings/${id}` : `/dashboard/trips/${id}`);
  }

  // Marks recorded at handover carry into the return record as pre-existing.
  const carried: Marker[] =
    phase === 'RETURN' && handover
      ? parseJson<Marker[]>(handover.damagesJson, []).map((marker) => ({
          ...marker,
          preExisting: true,
        }))
      : [];

  const existing = record ? parseJson<Marker[]>(record.damagesJson, []) : [];
  const markers = existing.length > 0 ? existing : carried;

  const signedByMe = Boolean(isOwner ? record?.ownerSignedAt : record?.renterSignedAt);
  const signedByOther = Boolean(isOwner ? record?.renterSignedAt : record?.ownerSignedAt);
  const otherParty = isOwner ? booking.renter.fullName : booking.owner.fullName;

  return (
    <DashboardShell active={isOwner ? 'owner' : 'trips'}>
      <Link
        href={isOwner ? `/dashboard/owner/bookings/${id}` : `/dashboard/trips/${id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-mist transition-colors hover:text-chalk"
      >
        <ArrowLeft size={14} />
        Back to the booking
      </Link>

      <header className="mt-5">
        <Badge tone={phase === 'HANDOVER' ? 'amber' : 'steel'}>
          {phase === 'HANDOVER' ? 'Handover inspection' : 'Return inspection'}
        </Badge>
        <h1 className="display mt-3 text-2xl text-chalk">
          {booking.vehicle.make} {booking.vehicle.model}
        </h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-mist">
          {phase === 'HANDOVER'
            ? 'Walk around the car together before the keys change hands. Everything you record here becomes the baseline the return is measured against.'
            : 'Compare the car against how it was handed over. New damage opens a claim rather than being taken from the deposit automatically.'}
        </p>
      </header>

      <div className="mt-8">
        <InspectionForm
          bookingId={booking.id}
          phase={phase}
          bodyStyle={bodyStyleForCategory(booking.vehicle.category)}
          colour={paintHex(booking.vehicle.colour)}
          initialMarkers={markers}
          initialOdometer={record?.odometerKm ?? booking.vehicle.odometerKm}
          initialFuel={record?.fuelLevel ?? 1}
          odometerAtHandover={phase === 'RETURN' ? (handover?.odometerKm ?? null) : null}
          signedByMe={signedByMe}
          signedByOther={signedByOther}
          otherPartyName={otherParty.split(' ')[0]}
        />
      </div>
    </DashboardShell>
  );
}
