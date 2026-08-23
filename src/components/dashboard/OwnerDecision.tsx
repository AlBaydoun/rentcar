'use client';

import { useActionState, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, MessageSquarePlus, X } from 'lucide-react';
import { ownerDecisionAction, type ActionState } from '@/lib/actions/booking';
import { Button, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

type Choice = 'APPROVE' | 'DECLINE' | 'REQUEST_DOCUMENTS' | null;

const initial: ActionState = { ok: false };

const DECLINE_REASONS = [
  'The dates clash with plans I have for the car.',
  'The trip is longer than I am comfortable lending it for.',
  'I would rather not have this car driven that far.',
  'I could not get comfortable with the profile.',
];

const DOCUMENT_ASKS = [
  'Could you send a second form of ID?',
  'Could we do a short video call before I confirm?',
  'Could you share proof of address from the last three months?',
  'Could you tell me a bit more about the trip?',
];

/**
 * The approval controls.
 *
 * Declining and asking for more both require a written reason — the renter is
 * a person waiting on an answer, and "declined" with no explanation is the
 * single most corrosive thing a marketplace can do to them.
 */
export function OwnerDecision({
  bookingId,
  renterFirstName,
  deadline,
}: {
  bookingId: string;
  renterFirstName: string;
  deadline: Date | null;
}) {
  const [choice, setChoice] = useState<Choice>(null);
  const [note, setNote] = useState('');
  const [state, action, pending] = useActionState(ownerDecisionAction, initial);

  if (state.ok) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel rounded-lg p-6 text-center"
      >
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-cedar-500/15 text-cedar-400">
          <Check size={20} />
        </span>
        <p className="mt-4 text-[14px] font-medium text-chalk">Decision recorded</p>
        <p className="mt-1.5 text-[13px] text-mist">
          {renterFirstName} has been notified. Refresh to see the updated status.
        </p>
      </motion.div>
    );
  }

  const hoursLeft = deadline
    ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3_600_000))
    : null;

  return (
    <div className="panel panel-lit rounded-lg p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-chalk">Your decision</h2>
          <p className="mt-1 text-[12.5px] text-slate-dim">
            {renterFirstName} has not been charged anything.
          </p>
        </div>
        {hoursLeft !== null ? (
          <span
            className={cn(
              'numeric shrink-0 rounded-full border px-2.5 py-1 text-[11px]',
              hoursLeft <= 2
                ? 'border-danger/30 bg-danger/10 text-danger'
                : 'border-white/10 text-slate-dim',
            )}
          >
            {hoursLeft}h left
          </span>
        ) : null}
      </div>

      {state.message ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xs border border-danger/25 bg-danger/10 p-3 text-[12.5px] text-danger">
          <AlertCircle size={14} className="mt-px shrink-0" />
          {state.message}
        </div>
      ) : null}

      <form action={action}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <input type="hidden" name="decision" value={choice ?? ''} />
        <input type="hidden" name="note" value={note} />

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => {
              setChoice('APPROVE');
              setNote('');
            }}
            className={cn(
              'flex items-center gap-3 rounded-xs border px-4 py-3.5 text-left transition-colors',
              choice === 'APPROVE'
                ? 'border-cedar-500/50 bg-cedar-500/12'
                : 'border-white/10 hover:border-white/25',
            )}
          >
            <Check size={16} className="shrink-0 text-cedar-400" />
            <span>
              <span className="block text-[13.5px] font-medium text-chalk">Approve</span>
              <span className="block text-[11.5px] text-slate-dim">
                They will be asked to pay. Your calendar blocks once they do.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setChoice('REQUEST_DOCUMENTS')}
            className={cn(
              'flex items-center gap-3 rounded-xs border px-4 py-3.5 text-left transition-colors',
              choice === 'REQUEST_DOCUMENTS'
                ? 'border-steel-500/50 bg-steel-500/12'
                : 'border-white/10 hover:border-white/25',
            )}
          >
            <MessageSquarePlus size={16} className="shrink-0 text-steel-400" />
            <span>
              <span className="block text-[13.5px] font-medium text-chalk">Ask for more first</span>
              <span className="block text-[11.5px] text-slate-dim">
                The request comes back to you once they answer.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setChoice('DECLINE')}
            className={cn(
              'flex items-center gap-3 rounded-xs border px-4 py-3.5 text-left transition-colors',
              choice === 'DECLINE'
                ? 'border-danger/50 bg-danger/12'
                : 'border-white/10 hover:border-white/25',
            )}
          >
            <X size={16} className="shrink-0 text-danger" />
            <span>
              <span className="block text-[13.5px] font-medium text-chalk">Decline</span>
              <span className="block text-[11.5px] text-slate-dim">
                No penalty to you. It is your car.
              </span>
            </span>
          </button>
        </div>

        <AnimatePresence>
          {choice === 'DECLINE' || choice === 'REQUEST_DOCUMENTS' ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-5">
                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-dim">
                  {choice === 'DECLINE' ? 'Reason' : 'What do you need?'}
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {(choice === 'DECLINE' ? DECLINE_REASONS : DOCUMENT_ASKS).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNote(preset)}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-[11.5px] text-mist transition-colors hover:border-white/25 hover:text-chalk"
                    >
                      {preset.length > 42 ? `${preset.slice(0, 40)}…` : preset}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={
                    choice === 'DECLINE'
                      ? `A sentence is plenty. ${renterFirstName} will see this.`
                      : `Ask ${renterFirstName} for what you need.`
                  }
                  className="min-h-20 text-[13px]"
                  maxLength={600}
                />
                {state.errors?.note ? (
                  <p className="mt-1.5 text-[12px] text-danger">{state.errors.note}</p>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <Button
          type="submit"
          size="lg"
          variant={choice === 'DECLINE' ? 'danger' : 'primary'}
          className="mt-5 w-full"
          disabled={!choice || pending}
        >
          {pending
            ? 'Sending…'
            : choice === 'APPROVE'
              ? 'Approve this request'
              : choice === 'DECLINE'
                ? 'Decline this request'
                : choice === 'REQUEST_DOCUMENTS'
                  ? 'Send the question'
                  : 'Choose an option'}
        </Button>
      </form>
    </div>
  );
}
