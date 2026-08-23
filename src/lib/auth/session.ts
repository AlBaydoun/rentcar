import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import type { CountryCode, UserRole } from '@/lib/domain/types';

/**
 * Session handling.
 *
 * Sessions are signed JWTs in an httpOnly cookie, mirrored by a `Session` row
 * so that a session can be revoked server-side — a signed token alone cannot
 * be taken back, and "log out everywhere" has to actually work.
 */

const COOKIE_NAME = 'karrent_session';
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error('AUTH_SECRET must be set to at least 32 characters. See .env.example.');
  }
  return new TextEncoder().encode(value);
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  country: CountryCode;
  avatarUrl: string | null;
  verificationStatus: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, userAgent?: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  await prisma.session.create({
    data: { userId, token, expiresAt, userAgent: userAgent ?? null },
  });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  store.delete(COOKIE_NAME);
}

/** Returns the signed-in user, or null. Never throws on a bad cookie. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = payload.sub;
    if (typeof userId !== 'string') return null;

    // The row is the authority: a revoked session fails here even though the
    // JWT signature is still valid.
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date() || session.userId !== userId) return null;

    return {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role as UserRole,
      country: session.user.country as CountryCode,
      avatarUrl: session.user.avatarUrl,
      verificationStatus: session.user.verificationStatus,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('You must be signed in to do that.', 401);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw new AuthError('Administrator access required.', 403);
  return user;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 = 401,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
