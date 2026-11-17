import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { EarningsCalculator } from '@/components/home/EarningsCalculator';
import { ButtonLink, Container, SectionHeading } from '@/components/ui';
import { Reveal, ScrollProgress } from '@/components/motion/primitives';
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
    keeps: 'The price',
    body: 'Your daily rate, your weekly and monthly discounts, your cleaning fee, your distance allowance. We suggest a range from comparable cars nearby; we never override you.',
  },
  {
    keeps: 'The renter',
    body: 'Every request arrives verified, with an explainable risk score. Approve, decline with a reason, or ask for one more thing first. No penalty for saying no.',
  },
  {
    keeps: 'The calendar',
    body: 'Block the dates you need the car. Set a turnaround buffer between trips, minimum notice, and how far ahead people can book.',
  },
  {
    keeps: 'The record',
    body: 'A joint walk-around photographed and signed by both of you. The return is measured against that record, not against anyone’s memory.',
  },
];

export default async function HostPage() {
  const user = await getCurrentUser();
  const startHref = user ? '/dashboard/cars/new' : '/signup';

  return (
    <>
      <ScrollProgress />
      <SiteHeader user={user} />

      <main>
        <HostHero startHref={startHref} />

        {/* What stays yours — editorial definition rows, not a card grid. */}
        <section id="control" className="relative py-24 sm:py-32">
          <Container>
            <Reveal>
              <SectionHeading
                title="It is your car. The decisions stay with you."
                description="A marketplace that quietly takes over your pricing and your calendar is a fleet operator wearing a marketplace costume. This one isn't."
              />
            </Reveal>

            <dl className="mt-14">
              {CONTROLS.map((item, index) => (
                <Reveal key={item.keeps} delay={index * 0.06}>
                  <div className="grid gap-x-10 gap-y-2 border-t border-[var(--hairline)] py-7 sm:grid-cols-[minmax(0,210px)_minmax(0,1fr)]">
                    <dt className="display display-tight text-[19px] text-chalk">{item.keeps}</dt>
                    <dd className="prose-measure text-[14.5px] leading-relaxed text-mist">
                      {item.body}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </Container>
        </section>

        <EarningsCalculator />

        {/* Deliberately prose, to break the list rhythm of the page. */}
        <section id="approval" className="relative py-24 sm:py-32">
          <Container>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <Reveal>
                <h2 className="display text-[clamp(1.75rem,3.6vw,2.6rem)] text-chalk">
                  What happens if something goes wrong
                </h2>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="space-y-6 text-[15px] leading-relaxed text-mist">
                  <p className="prose-measure">
                    <span className="text-chalk">
                      Your own policy is never touched and never replaced.
                    </span>{' '}
                    The statutory liability cover that already follows your car stays in force for
                    every trip. KarRent damage protection sits on top of it, is bought by the
                    renter, and is never deducted from what you earn.
                  </p>
                  <p className="prose-measure">
                    <span className="text-chalk">A deposit is held on every single trip,</span>{' '}
                    scaled to your car&rsquo;s value, the renter&rsquo;s protection tier and their
                    risk profile. Anything owed at return — extra kilometres, missing fuel, a late
                    hour — comes out of that before it ever reaches your pocket.
                  </p>
                  <p className="prose-measure">
                    <span className="text-chalk">Nobody unverified gets near the keys.</span>{' '}
                    Licence tenure, expiry against the trip dates, name match, age for the
                    category, and whether the licence is even legal to drive on in that country —
                    all checked before the request reaches you. New damage opens a claim where both
                    sides submit evidence; it is never quietly taken from the deposit.
                  </p>
                </div>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* Payouts — the numbers an owner actually asks for, side by side. */}
        <section id="payouts" className="relative py-24 sm:py-32">
          <Container>
            <Reveal>
              <SectionHeading
                title="Money moves the way it actually moves where you live"
                description="A German owner gets a SEPA transfer. A Lebanese owner gets Whish or OMT. Pretending both markets work the same way is how platforms strand people."
              />
            </Reveal>

            <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2">
              {SUPPORTED_COUNTRIES.map((country, index) => (
                <Reveal key={country.code} delay={index * 0.08}>
                  <div>
                    <p className="flex items-baseline gap-2.5 border-b border-[var(--hairline-strong)] pb-4">
                      <span className="text-xl" aria-hidden>
                        {country.flag}
                      </span>
                      <span className="display display-tight text-lg text-chalk">
                        {country.name}
                      </span>
                      <span className="numeric ml-auto text-[13px] text-slate-dim">
                        {country.currency}
                      </span>
                    </p>

                    <p className="mt-7 flex items-baseline gap-3">
                      <span className="numeric text-[2.6rem] font-bold leading-none text-chalk">
                        {Math.round((1 - country.ownerCommissionRate) * 100)}%
                      </span>
                      <span className="text-[13.5px] leading-snug text-mist">
                        of the rental
                        <br />
                        stays with you
                      </span>
                    </p>

                    <dl className="mt-8 space-y-4">
                      {[
                        {
                          label: 'Paid by',
                          value: country.payoutMethods.map(payoutMethodLabel).join(', '),
                        },
                        {
                          label: 'Paid after',
                          value: `${country.payoutDelayDaysAfterTripEnd} days from the trip ending`,
                        },
                        { label: 'Listing fee', value: 'None' },
                        {
                          label: country.vatName,
                          value: `${Math.round(country.vatRate * 100)}% on KarRent's fee — not on a private owner's rental income`,
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="grid gap-1 sm:grid-cols-[minmax(0,86px)_minmax(0,1fr)] sm:gap-4"
                        >
                          <dt className="text-[12.5px] text-slate-dim">{row.label}</dt>
                          <dd className="text-[13.5px] leading-relaxed text-mist">{row.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <p className="mt-7 text-[12.5px] text-slate-dim">
                      To list here you need:
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {country.requiredVehicleDocuments.map((doc) => (
                        <li
                          key={doc}
                          className="flex items-center gap-2 text-[13px] text-mist"
                        >
                          <Check size={13} className="shrink-0 text-cedar-400" />
                          {doc
                            .toLowerCase()
                            .replace(/_/g, ' ')
                            .replace(/^\w/, (character) => character.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        <section className="relative pb-32">
          <Container>
            <Reveal>
              <div className="border-t border-[var(--hairline-strong)] pt-14 text-center">
                <h2 className="display mx-auto max-w-2xl text-[clamp(1.75rem,3.6vw,2.6rem)] text-chalk">
                  List it once. Decide every time.
                </h2>
                <p className="lede mx-auto mt-5 text-[15px] leading-relaxed text-mist">
                  Setting up a listing takes about ten minutes. Approving a request takes about ten
                  seconds.
                </p>
                <ButtonLink href={startHref} size="xl" className="mt-9">
                  {user ? 'List your car' : 'Get started'}
                </ButtonLink>
              </div>
            </Reveal>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
