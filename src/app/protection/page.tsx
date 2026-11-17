import type { Metadata } from 'next';
import { AlertTriangle, X } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Protection } from '@/components/home/Protection';
import { Card, Container, SectionHeading } from '@/components/ui';
import { Reveal, ScrollProgress } from '@/components/motion/primitives';
import { INSURANCE_TIER_SPECS } from '@/lib/domain/insurance';
import { SUPPORTED_COUNTRIES } from '@/lib/domain/countries';
import { formatMoney, money } from '@/lib/domain/money';
import { INSURANCE_TIERS } from '@/lib/domain/types';

export const metadata: Metadata = {
  title: 'Protection',
  description:
    'What KarRent protection covers, what your excess is, and how statutory insurance works in Germany and Lebanon.',
};

export default async function ProtectionPage() {
  const user = await getCurrentUser();

  return (
    <>
      <ScrollProgress />
      <SiteHeader user={user} />

      <main className="pt-32">
        <Container>
          <Reveal>
            <SectionHeading
              align="center"
              title={
                <>
                  Statutory cover is not something{' '}
                  <span className="text-amber-400">we sell you</span>
                </>
              }
              description="Every vehicle on KarRent already carries the liability insurance its country requires by law. What you buy here is damage protection for the vehicle itself — and how much of a repair bill stays with you."
            />
          </Reveal>
        </Container>

        {/* Statutory position per market */}
        <section className="relative py-20">
          <Container>
            <div className="grid gap-5 lg:grid-cols-2">
              {SUPPORTED_COUNTRIES.map((country, index) => (
                <Reveal key={country.code} delay={index * 0.08}>
                  <Card className="h-full p-7">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden>
                        {country.flag}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-[16px] font-semibold text-chalk">
                          {country.mandatoryLiability.name}
                        </h3>
                        <p className="text-[12.5px] text-slate-dim">
                          {country.mandatoryLiability.nativeName}
                        </p>
                      </div>
                    </div>

                    <p className="mt-5 text-[13.5px] leading-relaxed text-mist">
                      {country.mandatoryLiability.note}
                    </p>

                    <dl className="mt-6 space-y-3">
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-[12.5px] text-slate-dim">Bodily injury, minimum</dt>
                        <dd className="numeric text-[13px] text-chalk">
                          {formatMoney(
                            money(country.mandatoryLiability.minBodilyInjuryCover, country.currency),
                            { compact: true },
                          )}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-[12.5px] text-slate-dim">Property damage, minimum</dt>
                        <dd
                          className={
                            country.mandatoryLiability.minPropertyDamageCover === 0
                              ? 'text-[13px] text-warn'
                              : 'numeric text-[13px] text-chalk'
                          }
                        >
                          {country.mandatoryLiability.minPropertyDamageCover === 0
                            ? 'Not covered by law'
                            : formatMoney(
                                money(
                                  country.mandatoryLiability.minPropertyDamageCover,
                                  country.currency,
                                ),
                                { compact: true },
                              )}
                        </dd>
                      </div>
                    </dl>

                    {country.mandatoryLiability.minPropertyDamageCover === 0 ? (
                      <div className="mt-5 flex items-start gap-2.5 rounded-xs border border-warn/25 bg-warn/10 p-3.5">
                        <AlertTriangle size={14} className="mt-px shrink-0 text-warn" />
                        <p className="text-[12.5px] leading-relaxed text-warn">
                          This is precisely the gap KarRent protection fills in {country.name}.
                          Without it, damage to property is uninsured.
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-6 border-t border-white/[0.07] pt-5">
                      <p className="record text-[11px] text-slate-dim">
                        Deposits here
                      </p>
                      <p className="mt-2 text-[13px] text-mist">
                        {formatMoney(money(country.depositMin, country.currency), { compact: true })}{' '}
                        to{' '}
                        {formatMoney(money(country.depositMax, country.currency), { compact: true })},{' '}
                        {country.depositInstrument === 'CARD_PREAUTH'
                          ? 'held on your card'
                          : 'held on your card or handed over in cash'}
                        , released {country.depositReleaseDays} days after the trip.
                      </p>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        <Protection />

        {/* Exclusions — the part a comparison table cannot carry */}
        <section className="relative py-20">
          <Container>
            <Reveal>
              <SectionHeading
                title="What is never covered"
                description="Worth reading once. These hold regardless of which tier you buy, and they are the only situations where a claim comes back to you in full."
              />
            </Reveal>

            <dl className="mt-10 max-w-3xl">
              {INSURANCE_TIERS.map((tier, index) => {
                const spec = INSURANCE_TIER_SPECS[tier];
                return (
                  <Reveal key={tier} delay={index * 0.06}>
                    <div
                      className={
                        'grid gap-x-8 gap-y-3 border-t border-[var(--hairline)] py-6 sm:grid-cols-[132px_minmax(0,1fr)]'
                      }
                    >
                      <dt>
                        <span className="display display-tight text-[15px] text-chalk">
                          {spec.name}
                        </span>
                        {spec.excessRateOfValue === 0 ? (
                          <span className="record mt-1 block text-[11px] text-cedar-400">
                            zero excess
                          </span>
                        ) : null}
                      </dt>
                      <dd>
                        <ul className="space-y-2.5">
                          {spec.excludes.map((item) => (
                            <li
                              key={item}
                              className="flex gap-2.5 text-[13.5px] leading-relaxed text-mist"
                            >
                              <X size={14} className="mt-0.5 shrink-0 text-danger" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  </Reveal>
                );
              })}
            </dl>
          </Container>
        </section>

      </main>

      <SiteFooter />
    </>
  );
}
