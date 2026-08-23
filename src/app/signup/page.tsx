import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignUpForm } from '@/components/auth/SignUpForm';

export const metadata: Metadata = { title: 'Create an account' };

const POINTS = [
  {
    title: 'Verify once, book anywhere',
    body: 'Your licence and ID are checked a single time. After that, requesting a car takes under a minute in either country.',
  },
  {
    title: 'Nothing is charged until an owner says yes',
    body: 'Your card is authorised when they approve and captured only when the keys change hands.',
  },
  {
    title: 'You see the whole price before you ask',
    body: 'Every line — protection, service fee, VAT, deposit, distance allowance — itemised before you send a request.',
  },
];

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <AuthShell
      title="Create your account"
      subtitle="One profile covers both markets. Tell us which side of the marketplace you are on and we will set up the right checks."
      aside={
        <div className="max-w-md space-y-8">
          {POINTS.map((point) => (
            <div key={point.title} className="flex gap-4">
              <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-cedar-400" />
              <div>
                <h3 className="text-[15px] font-semibold text-chalk">{point.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-mist">{point.body}</p>
              </div>
            </div>
          ))}
        </div>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
