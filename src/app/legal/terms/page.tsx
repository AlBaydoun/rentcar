import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Card, Container } from '@/components/ui';
import { SUPPORTED_COUNTRIES } from '@/lib/domain/countries';

export const metadata: Metadata = { title: 'Terms' };

export default async function TermsPage() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader user={user} />
      <main className="pt-32 pb-24">
        <Container className="max-w-3xl">
          <h1 className="display text-[clamp(2rem,4.5vw,3rem)] text-chalk">Terms of service</h1>
          <p className="mt-4 text-[14px] leading-relaxed text-mist">
            KarRent is a marketplace. The rental contract is between the vehicle&rsquo;s owner and
            the renter; KarRent facilitates discovery, verification, payment and dispute handling.
          </p>

          <div className="mt-10 space-y-8">
            {[
              {
                title: 'The owner decides',
                body: 'Owners set their own price and terms and may accept or decline any request without giving a reason to KarRent. Declining carries no ranking penalty. A booking is only formed once the owner has approved and the renter has completed payment authorisation.',
              },
              {
                title: 'When money moves',
                body: 'A renter is not charged when a request is submitted. The payment method is authorised when the owner approves, and captured when the handover inspection is completed by both parties. A security deposit is held separately and released after the trip, less any amounts properly owed under the return settlement.',
              },
              {
                title: 'Eligibility',
                body: 'Renters must hold a valid licence that is legal to drive on in the market where the vehicle is listed, meet the minimum age and licence-tenure requirements for the vehicle category, and have completed identity verification. Licences that expire before the trip ends are not accepted.',
              },
              {
                title: 'Insurance',
                body: 'Every listed vehicle carries the statutory liability cover its jurisdiction requires. KarRent protection is additional damage cover purchased by the renter; it does not replace statutory cover and does not apply where the driver was unlicensed, intoxicated, or outside the vehicle\'s permitted area.',
              },
              {
                title: 'Cancellation',
                body: 'The cancellation policy shown on the listing governs renter cancellations. Owner cancellations of confirmed bookings always refund the renter in full and carry a penalty on the owner that scales with how close to pickup the cancellation occurs.',
              },
              {
                title: 'Claims',
                body: 'Damage identified at return that was not present at handover opens a claim. Both parties may submit evidence before any amount is taken from the deposit. A renter\'s liability for vehicle damage is capped at the excess of their chosen protection tier.',
              },
            ].map((section) => (
              <section key={section.title}>
                <h2 className="text-[16px] font-semibold text-chalk">{section.title}</h2>
                <p className="mt-2.5 text-[14px] leading-relaxed text-mist">{section.body}</p>
              </section>
            ))}
          </div>

          <Card className="mt-12 p-6">
            <h2 className="text-[15px] font-semibold text-chalk">Right of withdrawal</h2>
            <div className="mt-4 space-y-4">
              {SUPPORTED_COUNTRIES.map((country) => (
                <div key={country.code}>
                  <p className="text-[13px] font-medium text-chalk">
                    {country.flag} {country.name}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-mist">
                    {country.withdrawalRight.note}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <p className="mt-10 text-[12px] leading-relaxed text-slate-dim">
            This is a demonstration document written to describe how the platform in this repository
            actually behaves. It is not legal advice and has not been reviewed by counsel in either
            jurisdiction.
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
