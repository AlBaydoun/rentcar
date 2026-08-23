'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { createSession, destroySession, hashPassword, verifyPassword } from '@/lib/auth/session';
import { fieldErrors, signInSchema, signUpSchema } from '@/lib/validation';

export interface ActionState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    dateOfBirth: formData.get('dateOfBirth'),
    country: formData.get('country'),
    residenceCountry: formData.get('residenceCountry') || formData.get('country'),
    city: formData.get('city') || undefined,
    intent: formData.get('intent') || 'BOTH',
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const data = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { ok: false, errors: { email: 'An account already exists for that address.' } };
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      fullName: data.fullName,
      dateOfBirth: new Date(data.dateOfBirth),
      country: data.country,
      residenceCountry: data.residenceCountry,
      city: data.city ?? null,
      role: data.intent === 'RENT' ? 'RENTER' : data.intent === 'HOST' ? 'OWNER' : 'BOTH',
      locale: data.country === 'DE' ? 'de' : 'en',
    },
  });

  const agent = (await headers()).get('user-agent') ?? undefined;
  await createSession(user.id, agent);

  redirect('/dashboard/verification');
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Same message either way — a differing response would confirm which
  // addresses have accounts.
  const invalid: ActionState = { ok: false, message: 'That email and password do not match.' };
  if (!user) return invalid;

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return invalid;

  const agent = (await headers()).get('user-agent') ?? undefined;
  await createSession(user.id, agent);

  const next = String(formData.get('next') || '');
  redirect(next.startsWith('/') ? next : user.role === 'ADMIN' ? '/admin' : '/dashboard');
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect('/');
}
