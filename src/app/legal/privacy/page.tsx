import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Container } from '@/components/ui';

export const metadata: Metadata = { title: 'Privacy' };

export default async function PrivacyPage() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader user={user} />
      <main className="pt-32 pb-24">
        <Container className="max-w-3xl">
          <h1 className="display text-[clamp(2rem,4.5vw,3rem)] text-chalk">Privacy</h1>
          <p className="mt-4 text-[14px] leading-relaxed text-mist">
            Identity documents are the most sensitive thing this platform holds, so the rules around
            them are deliberately narrow.
          </p>

          <div className="mt-10 space-y-8">
            {[
              {
                title: 'Owners never see your documents',
                body: 'An owner reviewing your request sees which checks passed, the country each document was issued in, its expiry month, and a risk score with its reasoning. They never see the scans, the document numbers, or your address.',
              },
              {
                title: 'Addresses are withheld until commitment',
                body: 'A renter browsing a listing sees an approximate area, not the owner\'s address. The exact address, the registration and the owner\'s phone number are released only once a booking is confirmed and paid.',
              },
              {
                title: 'Inspection photographs',
                body: 'Handover and return photographs are held for the duration of any claim window and are visible to both parties to that booking and to KarRent support. They are not used for anything else.',
              },
              {
                title: 'Risk scoring',
                body: 'Scoring uses your platform history, your document verification state and the shape of the booking. Every factor that contributed is shown to the owner and to you, with the points it carried. No opaque third-party scores are used.',
              },
              {
                title: 'Where data lives',
                body: 'German accounts are processed under the GDPR. Lebanese accounts are processed under the same technical controls; where the two regimes differ, the stricter one is applied.',
              },
            ].map((section) => (
              <section key={section.title}>
                <h2 className="text-[16px] font-semibold text-chalk">{section.title}</h2>
                <p className="mt-2.5 text-[14px] leading-relaxed text-mist">{section.body}</p>
              </section>
            ))}
          </div>

          <p className="mt-10 text-[12px] leading-relaxed text-slate-dim">
            A demonstration document describing the behaviour implemented in this repository. Not
            legal advice.
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
