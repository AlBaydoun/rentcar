'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { AlertCircle } from 'lucide-react';
import { signInAction, type ActionState } from '@/lib/actions/auth';
import { Button, Field, Input } from '@/components/ui';

const initial: ActionState = { ok: false };

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, initial);

  return (
    <form action={action} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.message ? (
        <div className="flex items-start gap-2.5 rounded-xs border border-danger/25 bg-danger/10 p-3.5 text-[13px] text-danger">
          <AlertCircle size={15} className="mt-px shrink-0" />
          {state.message}
        </div>
      ) : null}

      <Field label="Email" error={state.errors?.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" error={state.errors?.password}>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-center text-[13px] text-mist">
        No account yet?{' '}
        <Link href="/signup" className="font-medium text-amber-400 hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
