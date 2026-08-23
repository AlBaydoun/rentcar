import { Badge, type BadgeTone } from '@/components/ui';
import { STATUS_LABELS } from '@/lib/domain/booking-state-machine';
import type { BookingStatus } from '@/lib/domain/types';

const TONES: Record<BookingStatus, BadgeTone> = {
  DRAFT: 'neutral',
  PENDING_DOCUMENTS: 'neutral',
  AWAITING_OWNER_APPROVAL: 'amber',
  DOCUMENTS_REQUESTED: 'warn',
  APPROVED_AWAITING_PAYMENT: 'cedar',
  CONFIRMED: 'cedar',
  HANDOVER_PENDING: 'steel',
  ACTIVE: 'success',
  RETURN_PENDING: 'steel',
  COMPLETED: 'neutral',
  DECLINED: 'danger',
  EXPIRED: 'neutral',
  CANCELLED_BY_RENTER: 'danger',
  CANCELLED_BY_OWNER: 'danger',
  DISPUTED: 'warn',
};

export function StatusPill({ status }: { status: string }) {
  const key = status as BookingStatus;
  return <Badge tone={TONES[key] ?? 'neutral'}>{STATUS_LABELS[key] ?? status}</Badge>;
}
