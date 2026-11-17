import type { Metadata } from 'next';
import { Check, X } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { HowItWorks } from '@/components/home/HowItWorks';
import { ApprovalFlow } from '@/components/home/ApprovalFlow';
import { Card, Container, SectionHeading } from '@/components/ui';
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
              title={
                <>
                  Verified once.{' '}
                  <span className="text-amber-400">Approved every time.</span>
                </>
              }
              description="Renting someone's private car is a different transaction from renting from a counter, and the process is built around that rather than around hiding it."
            />
          </Reveal>
        </Container>

        <HowItWorks />
        <ApprovalFlow />

        {/* Verification — documents and licence law, per market. */}
        <section id="verification" className="relative py-24 sm:py-32">
          <Container>
            <Reveal>
              <SectionHeading
                title="What we check, and what an owner sees"
                description="Owners never see your documents. They see which checks passed, where each document was issued, and a risk score with its reasoning attached."
              />
            </Reveal>

            <div className="mt-12 grid gap-x-10 gap-y-14 lg:grid-cols-2">
              {SUPPORTED_COUNTRIES.map((country, index) => (
                <Reveal key={country.code} delay={index * 0.08}>
                  <div>
                    <p className="flex items-baseline gap-2.5 border-b border-[var(--hairline-strong)] pb-4">
                      <span className="text-xl" aria-hidden>
                        {country.flag}
                      </span>
                      <span className="display display-tight text-lg text-chalk">
                        Renting in {country.name}
                      </span>
                    </p>

                    <div className="mt-6 flex gap-8">
                      <p>
                        <span className="numeric block text-[22px] font-bold leading-none text-chalk">
                          {country.minDriverAge}
                        </span>
                        <span className="mt-1.5 block text-[12px] text-slate-dim">
                          minimum age
                        </span>
                      </p>
                      <p>
                        <span className="numeric block text-[22px] font-bold leading-none text-chalk">
                          {country.minLicenceHeldMonths} mo
                        </span>
                        <span className="mt-1.5 block text-[12px] text-slate-dim">
                          licence held
                        </span>
                      </p>
                    </div>

                    <h3 className="mt-8 text-[13px] font-medium text-chalk">Documents required</h3>
                    <dl className="mt-3">
                      {country.requiredRenterDocuments.map((doc) => (
                        <div
                          key={doc}
                          className="border-t border-[var(--hairline)] py-3"
                        >
                          <dt className="text-[13.5px] text-mist">{DOCUMENT_LABELS[doc]}</dt>
                          <dd className="mt-1 text-[12.5px] leading-relaxed text-slate-dim">
                            {DOCUMENT_HINTS[doc]}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <h3 className="mt-8 text-[13px] font-medium text-chalk">
                      Which licences are legal here
                    </h3>
                    <dl className="mt-3">
                      {country.licenceRules.map((rule) => (
                        <div
                          key={rule.issuingRegion}
                          className="grid gap-x-5 gap-y-1 border-t border-[var(--hairline)] py-3 sm:grid-cols-[minmax(0,96px)_minmax(0,1fr)]"
                        >
                          <dt className="record text-[11.5px] text-slate-dim">
                            {rule.issuingRegion === '*'
                              ? 'everywhere else'
                              : rule.issuingRegion.toLowerCase().replace('_', '/')}
                          </dt>
                          <dd className="text-[12.5px] leading-relaxed text-mist">
                            {rule.note}
                            {rule.requiresInternationalPermit ? (
                              <span className="mt-1 block text-warn">
                                International Driving Permit required.
                              </span>
                            ) : null}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* Handover — a checklist, set as a checklist. */}
        <section id="inspection" className="relative py-24 sm:py-32">
          <Container>
            <Reveal>
              <SectionHeading
                title="The walk-around is the whole defence"
                description="Both parties photograph the same car at the same moment and both sign. The return is scored against that record, so a scratch either was there or it was not."
              />
            </Reveal>

            <div className="mt-12 grid gap-x-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start">
              <Reveal delay={0.06}>
                <ol className="columns-1 gap-x-10 sm:columns-2 lg:columns-1 xl:columns-2">
                  {PHOTO_REQUIREMENTS.map((requirement, index) => (
                    <li
                      key={requirement.code}
                      className="mb-5 break-inside-avoid border-t border-[var(--hairline)] pt-3"
                    >
                      <p className="flex items-baseline gap-2.5">
                        <span className="numeric text-[11px] text-slate-dim">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={
                            requirement.required
                              ? 'text-[13.5px] font-medium text-chalk'
                              : 'text-[13.5px] text-mist'
                          }
                        >
                          {requirement.label}
                        </span>
                        {!requirement.required ? (
                          <span className="record text-[10.5px] text-slate-dim">optional</span>
                        ) : null}
                      </p>
                      <p className="mt-1 pl-[26px] text-[12.5px] leading-relaxed text-slate-dim">
                        {requirement.guidance}
                      </p>
                    </li>
                  ))}
                </ol>
              </Reveal>

              <Reveal delay={0.12}>
                <div className="surface-sunken mt-10 rounded-lg p-7 lg:mt-0">
                  <h3 className="display display-tight text-[17px] text-chalk">At the return</h3>
                  <ul className="mt-5 space-y-4">
                    {[
                      'Distance driven against your included allowance, with the overage priced per kilometre.',
                      'Fuel level against the handover level, charged per litre at the market service rate.',
                      'Late return billed per started hour, capped at one extra rental day.',
                      'New damage capped at your protection excess, never more.',
                    ].map((item) => (
                      <li key={item} className="flex gap-3 text-[13.5px] leading-relaxed text-mist">
                        <Check size={14} className="mt-1 shrink-0 text-cedar-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 border-t border-[var(--hairline)] pt-5 text-[12.5px] leading-relaxed text-slate-dim">
                    New damage opens a claim rather than being taken from your deposit
                    automatically. Both sides get to comment before any money moves.
                  </p>
                </div>
              </Reveal>
            </div>
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
