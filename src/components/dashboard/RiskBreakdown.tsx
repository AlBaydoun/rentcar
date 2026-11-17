'use client';

import { motion } from 'framer-motion';
import { ChevronDown, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Badge, ProgressBar } from '@/components/ui';
import type { RiskAssessment } from '@/lib/domain/risk';
import { cn } from '@/lib/cn';

/**
 * The owner's view of a renter's risk.
 *
 * Deliberately not a single number: an owner handing over their own car needs
 * to see what the score is made of and be able to disagree with it.
 */
export function RiskBreakdown({ risk }: { risk: RiskAssessment }) {
  const [expanded, setExpanded] = useState(true);

  const tone =
    risk.tier === 'LOW'
      ? 'cedar'
      : risk.tier === 'MEDIUM'
        ? 'warn'
        : risk.tier === 'HIGH'
          ? 'danger'
          : 'danger';

  const barTone = risk.tier === 'LOW' ? 'cedar' : risk.tier === 'MEDIUM' ? 'amber' : 'danger';

  return (
    <div className="surface rounded-lg p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="record text-[11px] text-slate-dim">Risk assessment</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="numeric text-3xl font-bold text-chalk">{risk.score}</span>
            <Badge tone={tone}>{risk.tier}</Badge>
          </div>
        </div>
        <Badge
          tone={
            risk.recommendation === 'ACCEPT'
              ? 'cedar'
              : risk.recommendation === 'REVIEW'
                ? 'warn'
                : 'danger'
          }
        >
          {risk.recommendation === 'ACCEPT'
            ? 'Looks fine'
            : risk.recommendation === 'REVIEW'
              ? 'Worth a look'
              : 'We suggest declining'}
        </Badge>
      </div>

      <div className="mt-4">
        <ProgressBar value={risk.score} tone={barTone} />
        <div className="mt-1.5 flex justify-between text-[10.5px] text-slate-dim">
          <span>0 · impeccable</span>
          <span>100 · do not rent</span>
        </div>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-mist">{risk.summary}</p>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-5 flex w-full items-center justify-between border-t border-white/[0.07] pt-4 text-left"
      >
        <span className="text-[12.5px] font-medium text-chalk">
          What makes up this score ({risk.factors.length})
        </span>
        <ChevronDown
          size={14}
          className={cn('text-slate-dim transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded ? (
        <ul className="mt-3 space-y-2.5">
          {risk.factors.map((factor, index) => (
            <motion.li
              key={factor.code}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
              className="flex gap-3"
            >
              <span
                className={cn(
                  'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[7px]',
                  factor.direction === 'RAISES'
                    ? 'bg-danger/12 text-danger'
                    : 'bg-cedar-500/12 text-cedar-400',
                )}
              >
                {factor.direction === 'RAISES' ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12.5px] font-medium text-chalk">{factor.label}</span>
                  <span
                    className={cn(
                      'numeric shrink-0 text-[12px] font-medium',
                      factor.direction === 'RAISES' ? 'text-danger' : 'text-cedar-400',
                    )}
                  >
                    {factor.points > 0 ? '+' : ''}
                    {factor.points}
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-dim">
                  {factor.explanation}
                </p>
              </div>
            </motion.li>
          ))}
        </ul>
      ) : null}

      {risk.suggestedConditions.length > 0 ? (
        <div className="mt-5 rounded-xs border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="record text-[11px] text-slate-dim">
            Before you approve, you could
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {risk.suggestedConditions.map((condition) => (
              <li key={condition} className="flex gap-2 text-[12.5px] leading-relaxed text-mist">
                <Minus size={13} className="mt-0.5 shrink-0 text-slate-dim" />
                {condition}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between rounded-xs border border-white/[0.07] px-4 py-3">
        <span className="text-[12.5px] text-mist">Suggested deposit</span>
        <span className="numeric text-[13px] font-medium text-chalk">
          ×{risk.depositMultiplier.toFixed(2)} the base
        </span>
      </div>
    </div>
  );
}
