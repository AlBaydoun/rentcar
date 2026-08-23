import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Bell,
  CarFront,
  Inbox,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { signOutAction } from '@/lib/actions/auth';
import { prisma } from '@/lib/db';
import { Wordmark } from '@/components/layout/Wordmark';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * Shared dashboard chrome.
 *
 * The nav adapts to what the account actually is: a pure renter never sees the
 * owner inbox, and the pending-request count only appears when there is one.
 */
export async function DashboardShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: 'trips' | 'owner' | 'cars' | 'earnings' | 'verification' | 'notifications';
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/signin?next=/dashboard');

  const [pendingRequests, unreadNotifications, vehicleCount, record] = await Promise.all([
    prisma.booking.count({
      where: {
        ownerId: user.id,
        status: { in: ['AWAITING_OWNER_APPROVAL', 'DOCUMENTS_REQUESTED'] },
      },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.vehicle.count({ where: { ownerId: user.id } }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { verificationStatus: true, documents: { select: { status: true } } },
    }),
  ]);

  const hosts = user.role === 'OWNER' || user.role === 'BOTH' || vehicleCount > 0;
  const verified = record?.verificationStatus === 'VERIFIED';

  const links = [
    { href: '/dashboard', label: 'My trips', icon: LayoutDashboard, key: 'trips' as const, show: true },
    {
      href: '/dashboard/owner',
      label: 'Requests',
      icon: Inbox,
      key: 'owner' as const,
      show: hosts,
      badge: pendingRequests || undefined,
    },
    { href: '/dashboard/cars', label: 'My cars', icon: CarFront, key: 'cars' as const, show: hosts },
    { href: '/dashboard/earnings', label: 'Earnings', icon: Wallet, key: 'earnings' as const, show: hosts },
    {
      href: '/dashboard/verification',
      label: 'Verification',
      icon: ShieldCheck,
      key: 'verification' as const,
      show: true,
      warn: !verified,
    },
    {
      href: '/dashboard/notifications',
      label: 'Notifications',
      icon: Bell,
      key: 'notifications' as const,
      show: true,
      badge: unreadNotifications || undefined,
    },
  ].filter((link) => link.show);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-6 px-5 sm:px-8">
          <Link href="/" aria-label="KarRent home">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-[13px] text-mist sm:inline">{user.fullName}</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-[13px] font-bold text-ink-950">
              {user.fullName.charAt(0)}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="grid h-9 w-9 place-items-center rounded-xs text-slate-dim transition-colors hover:bg-white/[0.06] hover:text-chalk"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[228px_minmax(0,1fr)]">
        <nav className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col">
            {links.map((link) => {
              const Icon = link.icon;
              const current = link.key === active;
              return (
                <li key={link.href} className="shrink-0 lg:shrink">
                  <Link
                    href={link.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xs px-3.5 py-2.5 text-[13.5px] transition-colors',
                      current
                        ? 'bg-white/[0.07] font-medium text-chalk'
                        : 'text-mist hover:bg-white/[0.04] hover:text-chalk',
                    )}
                  >
                    <Icon
                      size={15}
                      className={cn(
                        current ? 'text-amber-400' : 'text-slate-dim',
                        link.warn && 'text-warn',
                      )}
                    />
                    <span className="whitespace-nowrap">{link.label}</span>
                    {link.badge ? (
                      <Badge tone="amber" className="ml-auto !px-1.5 !py-0.5">
                        {link.badge}
                      </Badge>
                    ) : link.warn ? (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-warn" aria-hidden />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
