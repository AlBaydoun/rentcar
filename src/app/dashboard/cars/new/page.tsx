import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ListingWizard } from '@/components/listing/ListingWizard';
import type { CountryCode } from '@/lib/domain/types';

export const metadata: Metadata = { title: 'List your car' };
export const dynamic = 'force-dynamic';

export default async function NewListingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/signin?next=/dashboard/cars/new');

  return (
    <DashboardShell active="cars">
      <Link
        href="/dashboard/cars"
        className="inline-flex items-center gap-1.5 text-[13px] text-mist transition-colors hover:text-chalk"
      >
        <ArrowLeft size={14} />
        My cars
      </Link>

      <header className="mt-5">
        <h1 className="display text-2xl text-chalk">List your car</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mist">
          Five steps. You set the price, the rules and the calendar — and you approve every person
          who drives it.
        </p>
      </header>

      <div className="mt-8">
        <ListingWizard defaultCountry={user.country as CountryCode} />
      </div>
    </DashboardShell>
  );
}
