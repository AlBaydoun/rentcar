'use client';

import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Motion primitives.
 *
 * Every one of these checks `useReducedMotion` and degrades to a plain,
 * fully-visible element. Motion is the decoration; the content is never
 * hidden behind an animation that might not run.
 */

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Distance travelled, in pixels. */
  distance?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  once?: boolean;
  as?: 'div' | 'section' | 'li' | 'span' | 'article' | 'header';
}

/** Fades and slides an element in the first time it enters the viewport. */
export function Reveal({
  children,
  className,
  delay = 0,
  distance = 26,
  direction = 'up',
  once = true,
  as = 'div',
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-12% 0px -10% 0px' });
  const reduced = useReducedMotion();
  const Component = motion[as] as typeof motion.div;

  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const sign = direction === 'down' || direction === 'right' ? -1 : 1;

  return (
    <Component
      ref={ref}
      className={className}
      initial={reduced ? false : { opacity: 0, [axis]: distance * sign }}
      animate={
        reduced || inView
          ? { opacity: 1, x: 0, y: 0 }
          : { opacity: 0, [axis]: distance * sign }
      }
      transition={{ duration: 0.72, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </Component>
  );
}

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.06 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT_EXPO } },
};

/** Reveals children one after another. */
export function Stagger({
  children,
  className,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-10% 0px' });
  const reduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={staggerContainer}
      initial={reduced ? 'show' : 'hidden'}
      animate={reduced || inView ? 'show' : 'hidden'}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * A button that leans toward the cursor. The pull is deliberately small —
 * enough to feel responsive, not enough to make the target hard to hit.
 */
export function Magnetic({
  children,
  className,
  strength = 0.28,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 20, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 260, damping: 20, mass: 0.4 });

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={cn('inline-block', className)}
      style={{ x: springX, y: springY }}
      onPointerMove={(event) => {
        const element = ref.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
        y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Counts to a target once visible. Formatting is delegated to the caller. */
export function Counter({
  to,
  from = 0,
  duration = 1.6,
  format,
  className,
}: {
  to: number;
  from?: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : from);

  useEffect(() => {
    if (!inView || reduced) {
      if (reduced) setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / (duration * 1000));
      // Ease-out cubic: fast at first, settles gently on the number.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, from, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {format ? format(value) : Math.round(value).toLocaleString()}
    </span>
  );
}

/** Translates a child as the page scrolls past it. */
export function Parallax({
  children,
  className,
  offset = 60,
}: {
  children: React.ReactNode;
  className?: string;
  offset?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={reduced ? undefined : { y }}>{children}</motion.div>
    </div>
  );
}

/** A card that tilts toward the cursor in 3D. */
export function TiltCard({
  children,
  className,
  max = 8,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 1000 }}
      onPointerMove={(event) => {
        const element = ref.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        rotateY.set(px * max * 2);
        rotateX.set(-py * max * 2);
      }}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Splits a heading into words that rise into place. */
export function SplitText({
  text,
  className,
  wordClassName,
  delay = 0,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const words = text.split(' ');

  if (reduced) return <span className={className}>{text}</span>;

  return (
    <span className={cn('inline', className)}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className={cn('inline-block', wordClassName)}
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.8,
              delay: delay + index * 0.055,
              ease: EASE_OUT_EXPO,
            }}
          >
            {word}
          </motion.span>
          {index < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}

/** A thin progress bar tracking how far down the page the reader is. */
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26, restDelta: 0.001 });

  return (
    <motion.div
      className={cn(
        'fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-amber-500 via-amber-400 to-cedar-400',
        className,
      )}
      style={{ scaleX }}
      aria-hidden
    />
  );
}

export { motion, useReducedMotion };
