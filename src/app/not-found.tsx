import Link from 'next/link';
import { ButtonLink, Container } from '@/components/ui';
import { Wordmark } from '@/components/layout/Wordmark';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Container className="text-center">
        <Link href="/" className="inline-block">
          <Wordmark />
        </Link>
        <p className="numeric mt-12 text-[11px] uppercase tracking-[0.25em] text-slate-dim">
          404
        </p>
        <h1 className="display mt-4 text-[clamp(2rem,5vw,3.4rem)] text-gradient">
          That page has been driven away
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-mist">
          The link may be stale, or the car it pointed at is no longer listed.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/search" size="lg">
            Browse cars
          </ButtonLink>
          <ButtonLink href="/" variant="secondary" size="lg">
            Back home
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}
