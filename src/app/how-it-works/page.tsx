import type { Metadata } from 'next';
import { Check, FileCheck2, Info, X } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { HowItWorks } from '@/components/home/HowItWorks';
import { ApprovalFlow } from '@/components/home/ApprovalFlow';
import { Badge, Card, Container, SectionHeading } from '@/components/ui';
import { Reveal, ScrollProgress } from '@/components/motion/primitives';
import { SUPPORTED_COUNTRIES } from '@/lib/domain/countries';
import { DOCUMENT_HINTS, DOCUMENT_LABELS } from '@/lib/domain/documents';
import { PHOTO_REQUIREMENTS } from '@/lib/domain/inspection';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Verification, owner approval, handover inspections and settlement — what actually happens at each step of a KarRent booking.',
};

export default async function HowItWorksPage() {
  const user = await getCurrentUser();

  return (
    <>
      <ScrollProgress />
      <SiteHeader user={user} />

      <main className="pt-32">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title={
                <>
                  Verified once.
                  <br />
                  <span className="amber-gradient">Approved every time.</span>
                </>
              }
              description="Renting someone's private car is a different transaction from renting from a counter, and the process is built around that rather than around hiding it."
            />
          </Reveal>
        </Container>

        <HowItWorks />
        <ApprovalFlow />

        {/* Verification */}
        <section id="verification" className="relative py-28 sm:py-32">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="Verification"
                title="What we check, and what an owner sees"
                description="Owners never see your documents. They see which checks passed, where each document was issued, and a risk score with its reasoning attached."
              />
            </Reveal>

            <div className="mt-14 grid gap-5 lg:grid-cols-2">
              {SUPPORTED_COUNTRIES.map((country, index) => (
                <Reveal key={country.code} delay={index * 0.08}>
                  <Card className="h-full p-7">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden>
                        {country.flag}
                      </span>
                      <h3 className="text-[16px] font-semibold text-chalk">
                        Renting in {country.name}
                      </h3>
                    </div>

                    <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-slate-dim">
                      Documents required
                    </p>
                    <ul className="mt-3 space-y-2.5">
                      {country.requiredRenterDocuments.map((doc) => (
                        <li key={doc} className="flex gap-2.5">
                          <FileCheck2 size={14} className="mt-0.5 shrink-0 text-cedar-400" />
                          <div className="min-w-0">
                            <p className="text-[13px] text-chalk">{DOCUMENT_LABELS[doc]}</p>
                            <p className="mt-0.5 text-[11.5px] leading-snug text-slate-dim">
                              {DOCUMENT_HINTS[doc]}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-slate-dim">
                      Licence rules
                    </p>
                    <ul className="mt-3 space-y-2.5">
                      {country.licenceRules.map((rule) => (
                        <li
                          key={rule.issuingRegion}
                          className="rounded-xs border border-white/[0.07] p-3.5"
                        >
                          <div className="flex items-center gap-2">
                            <Badge tone={rule.requiresInternationalPermit ? 'warn' : 'cedar'}>
                              {rule.issuingRegion === '*'
                                ? 'Everywhere else'
                                : rule.issuingRegion.replace('_', '/')}
                            </Badge>
                            {rule.requiresInternationalPermit ? (
                              <span className="text-[11px] text-warn">needs an IDP</span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-[12.5px] leading-relaxed text-mist">{rule.note}</p>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-xs border border-white/[0.07] p-3.5">
                        <p className="numeric text-lg font-semibold text-chalk">
                          {country.minDriverAge}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-dim">minimum age</p>
                      </div>
                      <div className="rounded-xs border border-white/[0.07] p-3.5">
                        <p className="numeric text-lg font-semibold text-chalk">
                          {country.minLicenceHeldMonths} mo
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-dim">licence held</p>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* Inspection */}
        <section id="inspection" className="relative py-28 sm:py-32">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="Handover"
                title="The walk-around is the whole defence"
                description="Both parties photograph the same car at the same moment and both sign. The return is scored against that record, so a scratch either was there or it was not."
              />
            </Reveal>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {PHOTO_REQUIREMENTS.map((requirement, index) => (
                <Reveal key={requirement.code} delay={Math.min(index * 0.05, 0.35)}>
                  <Card className="h-full p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[14px] font-medium text-chalk">{requirement.label}</h3>
                      {requirement.required ? (
                        <Badge tone="amber">required</Badge>
                      ) : (
                        <Badge tone="neutral">optional</Badge>
                      )}
                    </div>
                    <p className="mt-2.5 text-[12.5px] leading-relaxed text-mist">
                      {requirement.guidance}
                    </p>
                  </Card>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.15}>
              <Card className="mt-6 p-7">
                <h3 className="text-[15px] font-semibold text-chalk">At the return</h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    'Distance driven against your included allowance, with the overage priced per kilometre.',
                    'Fuel level against the handover level, charged per litre at the market service rate.',
                    'Late return billed per started hour, capped at one extra rental day.',
                    'New damage capped at your protection excess, never more.',
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-mist">
                      <Check size={14} className="mt-0.5 shrink-0 text-cedar-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-start gap-2.5 rounded-xs border border-white/[0.07] bg-white/[0.02] p-4">
                  <Info size={15} className="mt-px shrink-0 text-amber-400" />
                  <p className="text-[12.5px] leading-relaxed text-mist">
                    New damage opens a claim rather than being taken from your deposit
                    automatically. Both sides get to comment before any money moves.
                  </p>
                </div>
              </Card>
            </Reveal>
          </Container>
        </section>

        {/* What we don't do */}
        <section className="relative pb-32">
          <Container>
            <Reveal>
              <Card className="p-8 sm:p-12">
                <h2 className="display text-2xl text-chalk">Things this platform does not do</h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    'Charge you before an owner has agreed to rent to you.',
                    'Capture your card before the keys are actually in your hand.',
                    'Show an owner your document scans.',
                    'Give an owner a score with no explanation behind it.',
                    'Reveal an owner\'s home address before a booking is confirmed.',
                    'Take a cut of the protection premium out of the owner\'s payout.',
                    'Penalise an owner for declining a request.',
                    'Charge you for damage that was recorded at handover.',
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 text-[13.5px] leading-relaxed text-mist">
                      <X size={15} className="mt-0.5 shrink-0 text-danger" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
