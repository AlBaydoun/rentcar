import type { Metadata } from 'next';
import { AlertTriangle, Check, ShieldCheck, X } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Protection } from '@/components/home/Protection';
import { Badge, Card, Container, SectionHeading } from '@/components/ui';
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
              eyebrow="Protection"
              title={
                <>
                  Statutory cover is not something
                  <br />
                  <span className="amber-gradient">we sell you.</span>
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
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-dim">
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

        {/* Full tier comparison */}
        <section className="relative py-20">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="Line by line"
                title="What each tier does and does not cover"
              />
            </Reveal>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {INSURANCE_TIERS.map((tier, index) => {
                const spec = INSURANCE_TIER_SPECS[tier];
                return (
                  <Reveal key={tier} delay={index * 0.08}>
                    <Card className="h-full p-7">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="display text-xl text-chalk">{spec.name}</h3>
                        {spec.excessRateOfValue === 0 ? (
                          <Badge tone="cedar">
                            <ShieldCheck size={11} />
                            Zero excess
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-mist">{spec.tagline}</p>

                      <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-cedar-400">
                        Covered
                      </p>
                      <ul className="mt-3 space-y-2">
                        {spec.covers.map((item) => (
                          <li
                            key={item}
                            className="flex gap-2.5 text-[12.5px] leading-relaxed text-mist"
                          >
                            <Check size={13} className="mt-0.5 shrink-0 text-cedar-400" />
                            {item}
                          </li>
                        ))}
                      </ul>

                      <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-danger">
                        Not covered
                      </p>
                      <ul className="mt-3 space-y-2">
                        {spec.excludes.map((item) => (
                          <li
                            key={item}
                            className="flex gap-2.5 text-[12.5px] leading-relaxed text-slate-dim"
                          >
                            <X size={13} className="mt-0.5 shrink-0 text-danger" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </Reveal>
                );
              })}
            </div>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
