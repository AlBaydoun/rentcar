'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { signUpAction, type ActionState } from '@/lib/actions/auth';
import { Button, Field, Input, Select } from '@/components/ui';
import { SUPPORTED_COUNTRIES } from '@/lib/domain/countries';
import { cn } from '@/lib/cn';

const initial: ActionState = { ok: false };

const INTENTS = [
  { value: 'RENT', label: 'Rent a car', hint: 'I want to borrow someone else\'s car.' },
  { value: 'HOST', label: 'Rent mine out', hint: 'I have a car sitting idle.' },
  { value: 'BOTH', label: 'Both', hint: 'Whichever I need at the time.' },
];

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initial);
  const [intent, setIntent] = useState('BOTH');
  const [country, setCountry] = useState('DE');

  return (
    <form action={action} className="space-y-5">
      {state.message ? (
        <div className="flex items-start gap-2.5 rounded-xs border border-danger/25 bg-danger/10 p-3.5 text-[13px] text-danger">
          <AlertCircle size={15} className="mt-px shrink-0" />
          {state.message}
        </div>
      ) : null}

      <div>
        <p className="mb-2 block record text-[11px] text-mist">
          What brings you here?
        </p>
        <input type="hidden" name="intent" value={intent} />
        <div className="grid gap-2 sm:grid-cols-3">
          {INTENTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setIntent(option.value)}
              className={cn(
                'rounded-xs border p-3 text-left transition-colors',
                intent === option.value
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-white/10 hover:border-white/25',
              )}
            >
              <span
                className={cn(
                  'block text-[13px] font-medium',
                  intent === option.value ? 'text-amber-400' : 'text-chalk',
                )}
              >
                {option.label}
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-slate-dim">
                {option.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Field label="Full name" error={state.errors?.fullName} hint="Exactly as it appears on your licence.">
        <Input name="fullName" autoComplete="name" required placeholder="Amira Haddad" />
      </Field>

      <Field label="Email" error={state.errors?.email}>
        <Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>

      <Field
        label="Password"
        error={state.errors?.password}
        hint="At least 10 characters."
      >
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of birth" error={state.errors?.dateOfBirth}>
          <Input name="dateOfBirth" type="date" required className="[color-scheme:dark]" />
        </Field>

        <Field label="Where you rent" error={state.errors?.country}>
          <Select name="country" value={country} onChange={(event) => setCountry(event.target.value)}>
            {SUPPORTED_COUNTRIES.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.flag} {entry.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Country of residence"
        error={state.errors?.residenceCountry}
        hint="Two-letter code. This decides which licence rules apply to you."
      >
        <Input
          name="residenceCountry"
          maxLength={2}
          defaultValue={country}
          required
          className="uppercase"
          placeholder="DE"
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Creating your account…' : 'Create account'}
      </Button>

      <p className="text-center text-[13px] text-mist">
        Already registered?{' '}
        <Link href="/signin" className="font-medium text-amber-400 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
