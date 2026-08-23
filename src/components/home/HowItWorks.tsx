'use client';

import { motion } from 'framer-motion';
import { CarFront, IdCard, KeyRound, ScanFace } from 'lucide-react';
import { Container, SectionHeading } from '@/components/ui';
import { Reveal } from '@/components/motion/primitives';

const RENTER_STEPS = [
  {
    icon: ScanFace,
    title: 'Verify once',
    body: 'Upload your licence and ID. We check tenure, expiry against your travel dates, name match and whether your licence is legal to drive on in that country. Do it once, book anywhere.',
  },
  {
    icon: CarFront,
    title: 'Ask for the car you want',
    body: 'Pick your dates, protection tier and extras. You see the full itemised price — every fee, every tax, the deposit — before you send anything.',
  },
  {
    icon: IdCard,
    title: 'The owner decides',
    body: 'They see a verified profile and an explainable risk score. They can approve, decline, or ask you for one more thing. Nothing is charged while they think.',
  },
  {
    icon: KeyRound,
    title: 'Walk around and drive',
    body: 'Photograph the car together, agree its condition, sign. The card is captured at that moment — not before. The return is measured against those same photos.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-28 sm:py-32">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="Four steps, and one of them is not yours"
            description="The renter does three things. The owner does the one that matters."
          />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {RENTER_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ duration: 0.6, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] }}
                className="panel panel-lit group relative overflow-hidden rounded-lg p-6 transition-colors hover:border-white/20"
              >
                <span
                  className="numeric absolute right-5 top-4 text-[3.4rem] font-bold leading-none text-white/[0.045] transition-colors group-hover:text-white/[0.07]"
                  aria-hidden
                >
                  {index + 1}
                </span>

                <span className="relative grid h-11 w-11 place-items-center rounded-xs border border-amber-500/25 bg-amber-500/10 text-amber-400">
                  <Icon size={18} />
                </span>

                <h3 className="relative mt-5 text-[15px] font-semibold text-chalk">{step.title}</h3>
                <p className="relative mt-2.5 text-[13px] leading-relaxed text-mist">{step.body}</p>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
