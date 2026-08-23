import Link from 'next/link';
import { Wordmark } from '@/components/layout/Wordmark';

/** Split layout shared by sign-in and sign-up. */
export function AuthShell({
  title,
  subtitle,
  children,
  aside,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  aside: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="inline-block">
            <Wordmark />
          </Link>
          <h1 className="display mt-10 text-[clamp(1.9rem,4vw,2.6rem)] text-chalk">{title}</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-mist">{subtitle}</p>
          <div className="mt-9">{children}</div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-white/[0.07] lg:block">
        <div
          className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,rgba(255,166,43,0.14),transparent_65%),radial-gradient(50%_40%_at_20%_80%,rgba(34,201,140,0.1),transparent_65%)]"
          aria-hidden
        />
        <div className="relative flex h-full items-center px-16">{aside}</div>
      </div>
    </div>
  );
}
