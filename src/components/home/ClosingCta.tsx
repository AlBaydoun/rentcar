'use client';

import { ArrowRight } from 'lucide-react';
import { ButtonLink, Container } from '@/components/ui';
import { Magnetic, Reveal } from '@/components/motion/primitives';

/**
 * The closing line.
 *
 * A rule and open space rather than a glowing card — the page has spent long
 * enough inside panels by this point, and the last thing a reader sees should
 * be the sentence, not the container it sits in.
 */
export function ClosingCta() {
  return (
    <section className="relative pb-24 pt-20 sm:pb-28 sm:pt-24">
      <Container>
        <Reveal>
          <div className="border-t border-[var(--hairline-strong)] pt-14 text-center">
            <h2 className="display mx-auto max-w-[27ch] text-[clamp(1.9rem,4.4vw,3.1rem)]">
              Somebody near you has a car{' '}
              <span className="text-amber-400">doing nothing this weekend.</span>
            </h2>

            <p className="lede mx-auto mt-5 text-[15px] leading-relaxed text-mist">
              Browse what is available in Berlin, Beirut and everywhere in between — or put your own
              car to work and decide for yourself who drives it.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Magnetic>
                <ButtonLink href="/search" size="xl" className="group">
                  Find a car
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
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
