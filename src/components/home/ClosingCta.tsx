'use client';

import { ArrowRight } from 'lucide-react';
import { ButtonLink, Container } from '@/components/ui';
import { Magnetic, Reveal } from '@/components/motion/primitives';

export function ClosingCta() {
  return (
    <section className="relative py-28 sm:py-36">
      <Container>
        <Reveal>
          <div className="surface relative overflow-hidden rounded-2xl px-8 py-16 text-center sm:px-16 sm:py-24">
            <div
              className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-[radial-gradient(50%_60%_at_50%_50%,rgba(255,166,43,0.22),transparent_70%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 -bottom-40 h-80 bg-[radial-gradient(50%_60%_at_50%_50%,rgba(34,201,140,0.14),transparent_70%)]"
              aria-hidden
            />

            <h2 className="display relative mx-auto max-w-3xl text-[clamp(2.1rem,5.4vw,3.8rem)]">
              Somebody near you has a car{' '}
              <span className="text-amber-400">doing nothing this weekend.</span>
            </h2>

            <p className="relative mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-mist">
              Browse what is available in Berlin, Beirut and everywhere in between — or put your own
              car to work and decide for yourself who drives it.
            </p>

            <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
              <Magnetic>
                <ButtonLink href="/search" size="xl" className="group">
                  Find a car
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </ButtonLink>
              </Magnetic>
              <ButtonLink href="/host" variant="secondary" size="xl">
                List your car
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
