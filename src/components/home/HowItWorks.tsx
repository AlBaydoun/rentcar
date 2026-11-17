'use client';

import { motion } from 'framer-motion';
import { Container, SectionHeading } from '@/components/ui';
import { Reveal } from '@/components/motion/primitives';

/**
 * The renter's path, as a sequence rather than a card grid.
 *
 * Numbers are used here because this genuinely is an ordered process and the
 * order carries information — step three is the one the reader does not
 * control, which is the whole point of the section.
 */

const STEPS = [
  {
    title: 'Verify once',
    actor: 'You',
    body: 'Upload your licence and ID. We check tenure, expiry against your travel dates, name match, and whether your licence is legal to drive on in that country. Do it once, book in either market.',
  },
  {
    title: 'Ask for the car you want',
    actor: 'You',
    body: 'Pick your dates, protection tier and extras. You see the full itemised price — every fee, every tax, the deposit — before you send anything.',
  },
  {
    title: 'The owner decides',
    actor: 'Them',
    body: 'They see a verified profile and an explainable risk score. They can approve, decline, or ask you for one more thing. Nothing is charged while they think.',
  },
  {
    title: 'Walk around and drive',
    actor: 'Both',
    body: 'Photograph the car together, agree its condition, sign. The card is captured at that moment — not before. The return is measured against those same photos.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-24 sm:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            title="Four steps, and one of them is not yours"
            description="You do three things. The owner does the one that matters."
          />
        </Reveal>

        <ol className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const theirs = step.actor === 'Them';
            return (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-12%' }}
                transition={{
                  duration: 0.55,
                  delay: index * 0.07,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative"
              >
                {/* The rule carries the eye along the sequence. */}
                <div className="flex items-center gap-3">
                  <span
                    className={
                      theirs
                        ? 'numeric text-[13px] font-bold text-amber-400'
                        : 'numeric text-[13px] font-bold text-slate-dim'
                    }
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={
                      theirs
                        ? 'h-px flex-1 bg-amber-500/60'
                        : 'h-px flex-1 bg-[var(--hairline-strong)]'
                    }
                  />
                  <span
                    className={
                      theirs
                        ? 'record text-[10.5px] text-amber-400'
                        : 'record text-[10.5px] text-slate-dim'
                    }
                  >
                    {step.actor}
                  </span>
                </div>

                <h3 className="display display-tight mt-5 text-[17px] text-chalk">{step.title}</h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-mist">{step.body}</p>
              </motion.li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
