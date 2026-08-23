import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AlertTriangle, Check, Clock, FileText, ShieldCheck, X } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Badge, Card, ProgressBar } from '@/components/ui';
import { getCountry, licenceRegionOf, licenceRuleFor } from '@/lib/domain/countries';
import {
  DOCUMENT_HINTS,
  DOCUMENT_LABELS,
  checkRenterEligibility,
} from '@/lib/domain/documents';
import { toRenterProfile } from '@/lib/server/mappers';
import type { CountryCode, DocumentType } from '@/lib/domain/types';

export const metadata: Metadata = { title: 'Verification' };
export const dynamic = 'force-dynamic';

const STATUS_ICON = {
  VERIFIED: { icon: Check, tone: 'cedar' as const, label: 'Verified' },
  IN_REVIEW: { icon: Clock, tone: 'warn' as const, label: 'In review' },
  PENDING: { icon: Clock, tone: 'warn' as const, label: 'Submitted' },
  REJECTED: { icon: X, tone: 'danger' as const, label: 'Rejected' },
  EXPIRED: { icon: AlertTriangle, tone: 'danger' as const, label: 'Expired' },
  UNVERIFIED: { icon: FileText, tone: 'neutral' as const, label: 'Not submitted' },
};

export default async function VerificationPage() {
  const session = await getCurrentUser();
  if (!session) redirect('/signin?next=/dashboard/verification');

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    include: { documents: true },
  });

  const country = getCountry(user.country as CountryCode);
  const required = country.requiredRenterDocuments;

  const licence = user.documents.find((doc) => doc.type === 'DRIVING_LICENSE');
  const region = licence
    ? licenceRegionOf(licence.issuingCountry, user.country as CountryCode)
    : 'OTHER';
  const rule = licenceRuleFor(country, region);

  const allRequired: DocumentType[] = rule.requiresInternationalPermit
    ? [...required, 'INTERNATIONAL_DRIVING_PERMIT']
    : [...required];

  // Score the profile against a hypothetical trip a month out, which is what
  // the renter is really asking: "can I book right now?"
  const tripStart = new Date(Date.now() + 30 * 86_400_000);
  const tripEnd = new Date(Date.now() + 33 * 86_400_000);
  const eligibility = checkRenterEligibility({
    profile: toRenterProfile(user, user.documents),
    country,
    tripStart,
    tripEnd,
  });

  return (
    <DashboardShell active="verification">
      <header>
        <h1 className="display text-2xl text-chalk">Verification</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mist">
          Verify once and you can request cars in both Germany and Lebanon. Owners never see your
          documents — only whether each one passed, and where it was issued.
        </p>
      </header>

      <Card className="mt-8 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-dim">
              Profile completeness
            </p>
            <p className="numeric mt-2 text-3xl font-bold text-chalk">
              {eligibility.completeness}%
            </p>
          </div>
          <Badge tone={eligibility.eligible ? 'cedar' : 'warn'}>
            {eligibility.eligible ? (
              <>
                <ShieldCheck size={11} />
                Ready to book
              </>
            ) : (
              'Action needed'
            )}
          </Badge>
        </div>
        <ProgressBar
          className="mt-4"
          value={eligibility.completeness}
          tone={eligibility.completeness === 100 ? 'cedar' : 'amber'}
        />
      </Card>

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold text-chalk">
          What {country.name} requires
        </h2>
        <p className="mt-1.5 text-[13px] text-slate-dim">{rule.note}</p>

        <ul className="mt-5 space-y-2.5">
          {allRequired.map((type) => {
            const doc = user.documents.find((entry) => entry.type === type);
            const meta = STATUS_ICON[(doc?.status ?? 'UNVERIFIED') as keyof typeof STATUS_ICON];
            const Icon = meta.icon;

            return (
              <li key={type}>
                <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[14px] font-medium text-chalk">
                        {DOCUMENT_LABELS[type]}
                      </h3>
                      <Badge tone={meta.tone}>
                        <Icon size={10} />
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-dim">
                      {doc?.rejectionReason ?? DOCUMENT_HINTS[type]}
                    </p>
                    {doc?.expiresAt ? (
                      <p className="numeric mt-2 text-[11.5px] text-slate-dim">
                        Issued in {doc.issuingCountry} · valid to{' '}
                        {doc.expiresAt.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      {eligibility.issues.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[15px] font-semibold text-chalk">Checks we run</h2>
          <p className="mt-1.5 text-[13px] text-slate-dim">
            These run automatically against every request you send, using the dates of that specific
            trip.
          </p>
          <ul className="mt-4 space-y-2">
            {eligibility.issues.map((issue) => (
              <li
                key={issue.code}
                className="flex gap-3 rounded-xs border border-white/[0.07] px-4 py-3"
              >
                <span
                  className={
                    issue.severity === 'BLOCKER'
                      ? 'text-danger'
                      : issue.severity === 'WARNING'
                        ? 'text-warn'
                        : 'text-slate-dim'
                  }
                >
                  {issue.severity === 'BLOCKER' ? (
                    <X size={14} />
                  ) : issue.severity === 'WARNING' ? (
                    <AlertTriangle size={14} />
                  ) : (
                    <Check size={14} />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] text-chalk">{issue.message}</p>
                  {issue.remedy ? (
                    <p className="mt-1 text-[12px] text-slate-dim">{issue.remedy}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Card className="mt-8 p-6">
        <h2 className="text-[14px] font-semibold text-chalk">Uploads in this environment</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-mist">
          Document capture is stubbed here — the seeded accounts already carry verified documents so
          the booking flow can be exercised end to end. In production this step is a guided camera
          capture with automated pre-screening, followed by human review.
        </p>
      </Card>
    </DashboardShell>
  );
}
