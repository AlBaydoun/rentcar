'use client';

import { useActionState, useRef } from 'react';
import { Send } from 'lucide-react';
import { sendMessageAction, type ActionState } from '@/lib/actions/booking';
import { Button, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

const initial: ActionState = { ok: false };

export function MessageThread({
  bookingId,
  currentUserId,
  messages,
}: {
  bookingId: string;
  currentUserId: string;
  messages: { id: string; senderId: string; senderName: string; body: string; createdAt: string }[];
}) {
  const [state, action, pending] = useActionState(sendMessageAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="surface rounded-lg p-6">
      <h2 className="text-[15px] font-semibold text-chalk">Messages</h2>

      <ul className="mt-5 space-y-3">
        {messages.length === 0 ? (
          <li className="text-[13px] text-slate-dim">No messages yet.</li>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === currentUserId;
            return (
              <li key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-md px-4 py-2.5',
                    mine
                      ? 'bg-amber-500/12 text-chalk'
                      : 'border border-white/[0.07] bg-white/[0.03] text-mist',
                  )}
                >
                  <p className="record text-[11px] text-slate-dim">
                    {mine ? 'You' : message.senderName.split(' ')[0]} ·{' '}
                    {new Date(message.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed">
                    {message.body}
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <form
        ref={formRef}
        action={async (formData) => {
          await action(formData);
          formRef.current?.reset();
        }}
        className="mt-5"
      >
        <input type="hidden" name="bookingId" value={bookingId} />
        <Textarea
          name="body"
          placeholder="Write a message…"
          className="min-h-20 text-[13px]"
          maxLength={2000}
          required
        />
        {state.errors?.body ? (
          <p className="mt-1.5 text-[12px] text-danger">{state.errors.body}</p>
        ) : null}
        <Button type="submit" size="sm" className="mt-3" disabled={pending}>
          <Send size={13} />
          {pending ? 'Sending…' : 'Send'}
        </Button>
      </form>
    </div>
  );
}
