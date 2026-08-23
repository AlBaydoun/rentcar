import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Notifications' };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/signin?next=/dashboard/notifications');

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  // Opening the page is the read receipt.
  if (notifications.some((entry) => entry.readAt === null)) {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return (
    <DashboardShell active="notifications">
      <header>
        <h1 className="display text-2xl text-chalk">Notifications</h1>
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Bell size={30} />}
          title="Nothing yet"
          description="Booking requests, approvals and messages land here."
        />
      ) : (
        <ul className="mt-8 space-y-2.5">
          {notifications.map((notification) => {
            const body = (
              <Card
                className={cn(
                  'p-5 transition-colors',
                  notification.href && 'hover:border-white/20',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {notification.readAt === null ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      ) : null}
                      <h2 className="text-[14px] font-medium text-chalk">{notification.title}</h2>
                    </div>
                    <p className="mt-1 text-[13px] text-mist">{notification.body}</p>
                  </div>
                  <span className="numeric shrink-0 text-[11px] text-slate-dim">
                    {notification.createdAt.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </Card>
            );

            return (
              <li key={notification.id}>
                {notification.href ? <Link href={notification.href}>{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
