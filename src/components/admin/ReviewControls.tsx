'use client';

import { useActionState, useState } from 'react';
import { Check, X } from 'lucide-react';
import { reviewDocumentAction, type ActionState } from '@/lib/actions/booking';
import { Button, Input } from '@/components/ui';

const initial: ActionState = { ok: false };

/** Approve or reject one document. Rejection always carries a reason. */
export function ReviewControls({ documentId }: { documentId: string }) {
  const [state, action, pending] = useActionState(reviewDocumentAction, initial);
  const [rejecting, setRejecting] = useState(false);

  if (state.ok) {
    return <p className="text-[12.5px] text-cedar-400">{state.message}</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="documentId" value={documentId} />

      {rejecting ? (
        <>
          <div className="min-w-56 flex-1">
            <Input
              name="reason"
              placeholder="Why is it being rejected?"
              className="h-9 text-[12.5px]"
              required
            />
            {state.errors?.reason ? (
              <p className="mt-1 text-[11.5px] text-danger">{state.errors.reason}</p>
            ) : null}
          </div>
          <Button
            type="submit"
            name="decision"
            value="REJECT"
            variant="danger"
            size="sm"
            disabled={pending}
          >
            Confirm rejection
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Button
            type="submit"
            name="decision"
            value="APPROVE"
            variant="success"
            size="sm"
            disabled={pending}
          >
            <Check size={13} />
            Approve
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(true)}>
            <X size={13} />
            Reject
          </Button>
        </>
      )}

      {state.message && !state.ok ? (
        <p className="w-full text-[11.5px] text-danger">{state.message}</p>
      ) : null}
    </form>
  );
}
