import type { Metadata } from 'next';
import {
  BadgeCheck,
  CalendarX2,
  Camera,
  HandCoins,
  ScanFace,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { EarningsCalculator } from '@/components/home/EarningsCalculator';
import { ButtonLink, Card, Container, SectionHeading } from '@/components/ui';
import { Reveal, ScrollProgress, Stagger, StaggerItem } from '@/components/motion/primitives';
import { HostHero } from '@/components/host/HostHero';
import { SUPPORTED_COUNTRIES } from '@/lib/domain/countries';
import { payoutMethodLabel } from '@/lib/domain/ledger';

export const metadata: Metadata = {
  title: 'Rent out your car',
  description:
    'Set your own price, keep the dates you need, and approve every renter yourself. KarRent takes a commission only when you actually earn.',
};

const CONTROLS = [
  {
    icon: HandCoins,
    title: 'You set the price',
    body: 'Your daily rate, your weekly and monthly discounts, your cleaning fee, your distance allowance. We suggest a range from comparable cars nearby; we never override you.',
  },
  {
    icon: BadgeCheck,
    title: 'You choose the renter',
    body: 'Every request arrives verified, with an explainable risk score. Approve, decline with a reason, or ask for one more thing first. No penalty for saying no.',
  },
  {
    icon: CalendarX2,
    title: 'You keep your calendar',
    body: 'Block the dates you need the car. Set a turnaround buffer between trips, minimum notice, and how far ahead people can book.',
  },
  {
    icon: Camera,
    title: 'You document the handover',
    body: 'A joint walk-around photographed and signed by both of you. The return is measured against that record, not against anyone\'s memory.',
  },
];

const PROTECTIONS = [
  {
    icon: ShieldCheck,
    title: 'Protection sits on top of your own policy',
    body: 'Your statutory liability cover is untouched and always in force. KarRent damage protection is bought by the renter, not deducted from you.',
  },
  {
    icon: Wallet,
    title: 'A deposit is held on every trip',
    body: 'Scaled to your car\'s value, the renter\'s protection tier and their risk profile. Anything owed at return comes out of it before it reaches your pocket.',
  },
  {
    icon: ScanFace,
    title: 'Nobody drives unverified',
    body: 'Licence tenure, expiry against the trip dates, name match, age for the category, and whether the licence is even legal in that country — all checked before you see the request.',
  },
];

export default async function HostPage() {
  const user = await getCurrentUser();

  return (
    <>
      <ScrollProgress />
      <SiteHeader user={user} />

      <main>
        <HostHero />

        <section id="control" className="relative py-28 sm:py-32">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="What stays yours"
                title={
                  <>
                    It is your car.
                    <br />
                    <span className="amber-gradient">The decisions stay with you.</span>
                  </>
                }
                description="A marketplace that quietly takes control of your pricing and your calendar is a fleet operator wearing a marketplace costume. This one isn't."
              />
            </Reveal>

            <Stagger className="mt-14 grid gap-5 sm:grid-cols-2">
              {CONTROLS.map((item) => {
                const Icon = item.icon;
                return (
                  <StaggerItem key={item.title}>
                    <Card className="h-full p-7">
                      <span className="grid h-11 w-11 place-items-center rounded-xs border border-amber-500/25 bg-amber-500/10 text-amber-400">
                        <Icon size={18} />
                      </span>
                      <h3 className="mt-5 text-[16px] font-semibold text-chalk">{item.title}</h3>
                      <p className="mt-2.5 text-[13.5px] leading-relaxed text-mist">{item.body}</p>
                    </Card>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </Container>
        </section>

        <EarningsCalculator />

        <section id="approval" className="relative py-28 sm:py-32">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="Protection"
                title="What happens if something goes wrong"
                description="The honest answer to the question every owner actually asks."
              />
            </Reveal>

            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {PROTECTIONS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.title} delay={index * 0.08}>
                    <Card className="h-full p-7">
                      <span className="grid h-11 w-11 place-items-center rounded-xs border border-cedar-500/25 bg-cedar-500/10 text-cedar-400">
                        <Icon size={18} />
                      </span>
                      <h3 className="mt-5 text-[15.5px] font-semibold text-chalk">{item.title}</h3>
                      <p className="mt-2.5 text-[13.5px] leading-relaxed text-mist">{item.body}</p>
                    </Card>
                  </Reveal>
                );
              })}
            </div>
          </Container>
        </section>

        <section id="payouts" className="relative py-28 sm:py-32">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="Getting paid"
                title="Money moves the way it actually moves where you live"
                description="A German owner gets a SEPA transfer. A Lebanese owner gets Whish or OMT. Pretending both markets work the same way is how platforms strand people."
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
                      <div>
                        <h3 className="text-[16px] font-semibold text-chalk">{country.name}</h3>
                        <p className="numeric text-[12px] text-slate-dim">
                          Settled in {country.currency}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-6 space-y-3.5">
                      {[
                        {
                          label: 'Commission',
                          value: `${Math.round(country.ownerCommissionRate * 100)}% of your gross`,
                        },
                        {
                          label: 'Listing fee',
                          value: 'None',
                        },
                        {
                          label: 'Payout timing',
                          value: `${country.payoutDelayDaysAfterTripEnd} days after each trip ends`,
                        },
                        {
                          label: 'Methods',
                          value: country.payoutMethods.map(payoutMethodLabel).join(', '),
                        },
                        {
                          label: country.vatName,
                          value: `${Math.round(country.vatRate * 100)}% — on platform fees, not on a private owner's rental income`,
                        },
                      ].map((row) => (
                        <div key={row.label} className="flex items-baseline justify-between gap-6">
                          <dt className="shrink-0 text-[13px] text-slate-dim">{row.label}</dt>
                          <dd className="text-right text-[13px] text-chalk">{row.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-6 border-t border-white/[0.07] pt-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-dim">
                        Required to list here
                      </p>
                      <ul className="mt-2.5 space-y-1.5">
                        {country.requiredVehicleDocuments.map((doc) => (
                          <li key={doc} className="text-[12.5px] text-mist">
                            {doc
                              .toLowerCase()
                              .replace(/_/g, ' ')
                              .replace(/^\w/, (character) => character.toUpperCase())}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        <section className="relative pb-32">
          <Container>
            <Reveal>
              <Card className="relative overflow-hidden px-8 py-14 text-center sm:px-16">
                <div
                  className="pointer-events-none absolute inset-x-0 -top-32 h-64 bg-[radial-gradient(50%_60%_at_50%_50%,rgba(255,166,43,0.2),transparent_70%)]"
                  aria-hidden
                />
                <h2 className="display relative text-[clamp(1.9rem,4.4vw,3rem)] text-gradient">
                  List it once. Decide every time.
                </h2>
                <p className="relative mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-mist">
                  Setting up a listing takes about ten minutes. Approving a request takes about ten
                  seconds.
                </p>
                <ButtonLink href="/signup" size="xl" className="relative mt-9">
                  Get started
                </ButtonLink>
              </Card>
            </Reveal>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
