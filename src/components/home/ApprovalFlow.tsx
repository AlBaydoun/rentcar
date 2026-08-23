'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  BadgeCheck,
  Ban,
  CircleDollarSign,
  Clock,
  FileCheck2,
  Handshake,
  KeyRound,
  MessageSquareMore,
  ShieldQuestion,
} from 'lucide-react';
import { Badge, Container, SectionHeading } from '@/components/ui';
import { Reveal } from '@/components/motion/primitives';
import { cn } from '@/lib/cn';

/**
 * An auto-playing walkthrough of the booking lifecycle.
 *
 * The whole product hinges on one idea — the owner decides, and nothing is
 * charged until they do — so it gets its own section rather than a bullet in
 * a feature list. The steps mirror the real state machine in
 * `src/lib/domain/booking-state-machine.ts`.
 */

interface Step {
  status: string;
  label: string;
  actor: 'Renter' | 'Platform' | 'Owner' | 'Both';
  icon: typeof FileCheck2;
  headline: string;
  detail: string;
  money: string;
  tone: 'neutral' | 'amber' | 'cedar' | 'steel';
}

const STEPS: Step[] = [
  {
    status: 'PENDING_DOCUMENTS',
    label: 'Checking documents',
    actor: 'Platform',
    icon: FileCheck2,
    headline: 'The request is verified before the owner ever sees it',
    detail:
      'Licence tenure, expiry dates against the trip window, name match, minimum age for the category, and whether the licence is legal to drive on in that country at all.',
    money: 'Nothing charged',
    tone: 'neutral',
  },
  {
    status: 'AWAITING_OWNER_APPROVAL',
    label: 'Waiting for the owner',
    actor: 'Owner',
    icon: ShieldQuestion,
    headline: 'The owner sees a verified profile and a risk score they can read',
    detail:
      'Not a black-box number: every point is attributed. "Licence held 8 months", "first trip on KarRent", "cross-border itinerary". The owner decides on facts.',
    money: 'Still nothing charged',
    tone: 'amber',
  },
  {
    status: 'DOCUMENTS_REQUESTED',
    label: 'Owner asks for more',
    actor: 'Owner',
    icon: MessageSquareMore,
    headline: 'Or they ask for one more thing first',
    detail:
      'A second ID, proof of address, a short video call. The request goes back to the renter and returns to the owner\'s inbox once answered.',
    money: 'Still nothing charged',
    tone: 'steel',
  },
  {
    status: 'APPROVED_AWAITING_PAYMENT',
    label: 'Approved',
    actor: 'Renter',
    icon: BadgeCheck,
    headline: 'Only now is the renter asked to pay',
    detail:
      'The card is authorised, not captured. If the owner never hands the car over, there is nothing to refund because nothing was taken.',
    money: 'Authorised',
    tone: 'cedar',
  },
  {
    status: 'CONFIRMED',
    label: 'Confirmed',
    actor: 'Both',
    icon: CircleDollarSign,
    headline: 'Dates lock, deposit is held, exact address is revealed',
    detail:
      'Up to this point the renter has only seen an approximate area. The precise address and the owner\'s number appear the moment money is committed on both sides.',
    money: 'Deposit held',
    tone: 'cedar',
  },
  {
    status: 'HANDOVER_PENDING',
    label: 'Handover',
    actor: 'Both',
    icon: Handshake,
    headline: 'A joint walk-around, photographed and signed by both',
    detail:
      'Nine angles, odometer, fuel level, and any existing damage pinned on a 3D model of the car. This is the baseline the return is measured against.',
    money: 'Captured at handover',
    tone: 'amber',
  },
  {
    status: 'ACTIVE',
    label: 'Trip in progress',
    actor: 'Renter',
    icon: KeyRound,
    headline: 'The trip runs',
    detail:
      'Distance allowance, protection tier and the return time were all agreed before the keys moved. Nothing changes mid-trip.',
    money: 'Settled at return',
    tone: 'cedar',
  },
];

const DECLINE: Step = {
  status: 'DECLINED',
  label: 'Declined',
  actor: 'Owner',
  icon: Ban,
  headline: 'And the owner can always say no',
  detail:
    'With a reason the renter can see. No penalty, no pressure, no ranking punishment for being careful about who drives their car.',
  money: 'Nothing charged',
  tone: 'neutral',
};

const DURATION = 4200;

export function ApprovalFlow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-20% 0px -20% 0px' });

  useEffect(() => {
    if (!inView || paused) return;
    const timer = setTimeout(() => setIndex((value) => (value + 1) % STEPS.length), DURATION);
    return () => clearTimeout(timer);
  }, [index, inView, paused]);

  const step = STEPS[index];
  const Icon = step.icon;

  return (
    <section id="approval" className="relative py-28 sm:py-36">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="The part that matters"
            title={
              <>
                The owner decides.
                <br />
                <span className="amber-gradient">Money waits for them.</span>
              </>
            }
            description="Most rental platforms take your money and sort out the details afterwards. Here the sequence runs the other way, and every step below is a real, guarded transition in the booking engine."
          />
        </Reveal>

        <div ref={ref} className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* Step rail */}
          <div
            className="space-y-1.5"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {STEPS.map((entry, entryIndex) => {
              const active = entryIndex === index;
              const passed = entryIndex < index;
              const EntryIcon = entry.icon;
              return (
                <button
                  key={entry.status}
                  type="button"
                  onClick={() => setIndex(entryIndex)}
                  aria-current={active}
                  className={cn(
                    'group relative flex w-full items-center gap-3.5 overflow-hidden rounded-md px-3.5 py-3 text-left transition-colors',
                    active ? 'panel' : 'hover:bg-white/[0.035]',
                  )}
                >
                  {/* Progress fill on the active step */}
                  {active && !paused && (
                    <motion.span
                      key={index}
                      className="absolute inset-y-0 left-0 bg-amber-500/[0.09]"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: DURATION / 1000, ease: 'linear' }}
                    />
                  )}

                  <span
                    className={cn(
                      'relative grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border transition-colors',
                      active
                        ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                        : passed
                          ? 'border-cedar-500/25 bg-cedar-500/10 text-cedar-400'
                          : 'border-white/10 bg-white/[0.03] text-slate-dim',
                    )}
                  >
                    <EntryIcon size={15} />
                  </span>

                  <span className="relative min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-[13.5px] font-medium transition-colors',
                        active ? 'text-chalk' : passed ? 'text-mist' : 'text-slate-dim',
                      )}
                    >
                      {entry.label}
                    </span>
                    <span className="numeric mt-0.5 block truncate text-[10.5px] uppercase tracking-wider text-slate-dim">
                      {entry.status}
                    </span>
                  </span>

                  <span
                    className={cn(
                      'relative shrink-0 text-[10.5px] font-medium transition-colors',
                      entry.money.includes('Nothing') || entry.money.includes('Still')
                        ? 'text-slate-dim'
                        : 'text-cedar-400',
                    )}
                  >
                    {entry.money}
                  </span>
                </button>
              );
            })}

            <div className="hairline-x !my-4" />

            <div className="flex items-start gap-3.5 rounded-md px-3.5 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-danger/25 bg-danger/10 text-danger">
                <DECLINE.icon size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-chalk">{DECLINE.label}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-dim">
                  Available at every stage before handover, with a reason attached.
                </p>
              </div>
            </div>
          </div>

          {/* Detail panel */}
          <div className="relative min-h-[340px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.status}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="panel panel-lit h-full rounded-xl p-7 sm:p-9"
              >
                <div className="flex items-center justify-between gap-4">
                  <Badge tone={step.tone === 'neutral' ? 'neutral' : step.tone}>
                    <Icon size={12} />
                    {step.actor} acts
                  </Badge>
                  <span className="numeric text-[11px] text-slate-dim">
                    {String(index + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
                  </span>
                </div>

                <h3 className="display mt-6 text-[clamp(1.35rem,2.5vw,2rem)] leading-[1.12] text-chalk">
                  {step.headline}
                </h3>
                <p className="mt-4 text-[14.5px] leading-relaxed text-mist">{step.detail}</p>

                <div className="hairline-x my-7" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10.5px] uppercase tracking-[0.18em] text-slate-dim">
                      Money position
                    </p>
                    <p
                      className={cn(
                        'mt-1.5 text-sm font-medium',
                        step.money.includes('Nothing') || step.money.includes('Still')
                          ? 'text-chalk'
                          : 'text-cedar-400',
                      )}
                    >
                      {step.money}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10.5px] uppercase tracking-[0.18em] text-slate-dim">
                      Calendar
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-chalk">
                      {['CONFIRMED', 'HANDOVER_PENDING', 'ACTIVE'].includes(step.status)
                        ? 'Blocked for this trip'
                        : 'Still open to others'}
                    </p>
                  </div>
                </div>

                {step.status === 'AWAITING_OWNER_APPROVAL' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="mt-7 rounded-md border border-white/10 bg-ink-950/50 p-4"
                  >
                    <p className="mb-3 text-[10.5px] uppercase tracking-[0.18em] text-slate-dim">
                      What the owner sees
                    </p>
                    <div className="space-y-2">
                      {[
                        { label: 'Licence held 11 years', points: -8, good: true },
                        { label: '12 completed trips, rated 4.9', points: -14, good: true },
                        { label: 'All documents verified', points: -10, good: true },
                        { label: 'Cross-border itinerary', points: 7, good: false },
                      ].map((factor, factorIndex) => (
                        <motion.div
                          key={factor.label}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.35 + factorIndex * 0.08 }}
                          className="flex items-center justify-between gap-3 text-[12.5px]"
                        >
                          <span className="text-mist">{factor.label}</span>
                          <span
                            className={cn(
                              'numeric shrink-0 font-medium',
                              factor.good ? 'text-cedar-400' : 'text-warn',
                            )}
                          >
                            {factor.points > 0 ? '+' : ''}
                            {factor.points}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3">
                      <span className="text-[12.5px] font-medium text-chalk">Risk score</span>
                      <span className="numeric text-sm font-bold text-cedar-400">18 · Low</span>
                    </div>
                  </motion.div>
                )}

                {step.status === 'PENDING_DOCUMENTS' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-7 flex items-center gap-2 text-[12px] text-slate-dim"
                  >
                    <Clock size={13} className="text-amber-400" />
                    Automated screening rejects the obviously invalid; a human reviews the rest.
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
}
