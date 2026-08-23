'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { HeroScene } from '@/components/three/HeroScene';
import { Badge, ButtonLink, Container } from '@/components/ui';
import { Magnetic, SplitText } from '@/components/motion/primitives';

/** Owner-facing hero — the scene sits on the left, mirroring the renter hero. */
export function HostHero() {
  const { scrollY } = useScroll();
  const sceneY = useTransform(scrollY, [0, 700], [0, 90]);
  const sceneOpacity = useTransform(scrollY, [0, 520], [1, 0.2]);

  return (
    <section className="relative flex min-h-[92svh] flex-col justify-center overflow-hidden pt-32 pb-24">
      <motion.div
        style={{
          y: sceneY,
          opacity: sceneOpacity,
          maskImage:
            'radial-gradient(115% 92% at 50% 46%, #000 42%, rgba(0,0,0,0.55) 68%, transparent 88%)',
          WebkitMaskImage:
            'radial-gradient(115% 92% at 50% 46%, #000 42%, rgba(0,0,0,0.55) 68%, transparent 88%)',
        }}
        className="pointer-events-none absolute bottom-0 left-1/2 h-[44svh] w-[125%] -translate-x-1/2 lg:left-[-8%] lg:top-1/2 lg:h-[84svh] lg:w-[60%] lg:-translate-x-0 lg:-translate-y-1/2"
      >
        <HeroScene bodyStyle="SUV" colour="#4ee0a5" className="h-full w-full" />
      </motion.div>

      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(6,7,10,0.92)_2%,transparent_38%)] lg:bg-[linear-gradient(to_left,rgba(6,7,10,0.9)_18%,transparent_62%)]"
        aria-hidden
      />

      <Container className="relative">
        <div className="ml-auto max-w-2xl lg:text-right">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <Badge tone="cedar">For owners</Badge>
          </motion.div>

          <h1 className="display mt-6 text-[clamp(2.4rem,5.4vw,4.2rem)]">
            <span className="block text-gradient">
              <SplitText text="Your car is idle" />
            </span>
            <span className="block">
              <SplitText text="96% of the time." delay={0.16} wordClassName="amber-gradient" />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-7 text-[16px] leading-relaxed text-mist lg:ml-auto lg:max-w-xl"
          >
            Set your own price. Keep the dates you need. Approve every single person who drives it,
            with their verified profile and risk assessment in front of you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-9 flex flex-wrap gap-3 lg:justify-end"
          >
            <Magnetic>
              <ButtonLink href="/signup" size="xl" className="group">
                List your car
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </ButtonLink>
            </Magnetic>
            <ButtonLink href="#earnings" variant="secondary" size="xl">
              See what you could earn
            </ButtonLink>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
