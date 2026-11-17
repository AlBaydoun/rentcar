import { cn } from '@/lib/cn';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

const buttonBase =
  'relative inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap ' +
  'transition-[background-color,border-color,color,transform] duration-150 ' +
  'ease-[cubic-bezier(0.16,1,0.3,1)] active:translate-y-px select-none';

/*
 * A disabled control reads as inert rather than as a faded version of the
 * live one — a dimmed amber fill just looks muddy, and leaves people
 * wondering whether it is broken or merely waiting on them.
 */
const buttonDisabled =
  'disabled:pointer-events-none disabled:bg-ink-850 disabled:text-slate-dim ' +
  'disabled:border-transparent disabled:shadow-none';

/*
 * No variant pairs a border with a wide drop shadow — the "ghost card" look.
 * The primary button is a solid fill with a single hairline top highlight,
 * which is what gives a physical control its edge.
 */
const buttonVariants = {
  primary:
    'bg-amber-500 text-ink-950 font-semibold ' +
    'shadow-[0_1px_0_0_oklch(1_0_0/0.4)_inset] hover:bg-amber-400',
  secondary:
    'bg-ink-850 text-chalk border border-[var(--hairline-strong)] hover:bg-ink-800',
  ghost: 'text-mist hover:text-chalk hover:bg-ink-880',
  outline: 'border border-[var(--hairline-strong)] text-chalk hover:border-amber-500 hover:text-amber-400',
  danger: 'bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25',
  success: 'bg-cedar-500/15 text-cedar-400 border border-cedar-500/40 hover:bg-cedar-500/25',
} as const;

const buttonSizes = {
  xs: 'h-8 px-3 text-xs rounded-xs',
  sm: 'h-9 px-4 text-[13px] rounded-sm',
  md: 'h-11 px-5 text-sm rounded-sm',
  lg: 'h-12 px-6 text-[15px] rounded-md',
  xl: 'h-14 px-8 text-base rounded-md',
  icon: 'h-10 w-10 rounded-sm',
} as const;

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        buttonBase,
        buttonVariants[variant],
        buttonSizes[size],
        buttonDisabled,
        className,
      )}
      {...props}
    />
  );
}

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('surface rounded-lg', className)} {...props} />;
}

export function Panel({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('surface-raised rounded-md', className)} {...props} />;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('hairline-x my-6', className)} aria-hidden />;
}

/* -------------------------------------------------------------------------- */
/* Badge & labels                                                              */
/* -------------------------------------------------------------------------- */

const badgeTones = {
  neutral: 'bg-ink-800 text-mist border-[var(--hairline-strong)]',
  amber: 'bg-amber-500/12 text-amber-400 border-amber-500/30',
  cedar: 'bg-cedar-500/12 text-cedar-400 border-cedar-500/30',
  steel: 'bg-steel-500/14 text-steel-400 border-steel-500/30',
  danger: 'bg-danger/12 text-danger border-danger/30',
  warn: 'bg-warn/12 text-warn border-warn/30',
  success: 'bg-success/12 text-success border-success/30',
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({
  tone = 'neutral',
  className,
  children,
  ...props
}: ComponentProps<'span'> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium leading-none',
        badgeTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * A label tied to the content below it by a rule.
 *
 * Deliberately not used above every section — only where a block of data
 * genuinely needs naming, so it stays a label rather than page furniture.
 */
export function RuleLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('rule-label record text-[11px] text-slate-dim', className)}>
      <span>{children}</span>
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Form controls                                                               */
/* -------------------------------------------------------------------------- */

const fieldBase =
  'w-full rounded-sm border border-[var(--hairline-strong)] bg-ink-900 px-3.5 text-sm text-chalk ' +
  'placeholder:text-slate-dim transition-colors duration-150 ' +
  'focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 ' +
  'disabled:opacity-50';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldBase, 'h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea className={cn(fieldBase, 'min-h-28 py-3 leading-relaxed', className)} {...props} />
  );
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(fieldBase, 'h-11 appearance-none pr-9 [&>option]:bg-ink-880', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23a9b2c4' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.9rem center',
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, children, ...props }: ComponentProps<'label'>) {
  return (
    <label className={cn('mb-2 block text-[12.5px] font-medium text-mist', className)} {...props}>
      {children}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-dim">{hint}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-5 sm:px-8', className)} {...props} />;
}

/**
 * Section headings lead with the heading itself.
 *
 * There is deliberately no kicker slot: an uppercase tracked label above every
 * section is page furniture, not voice.
 */
export function SectionHeading({
  title,
  description,
  align = 'left',
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div className={cn(align === 'center' && 'text-center', className)}>
      <h2 className="display text-[clamp(1.75rem,3.6vw,2.6rem)] text-chalk">{title}</h2>
      {description ? (
        <p
          className={cn(
            'lede mt-4 text-[15px] leading-relaxed text-mist',
            align === 'center' && 'mx-auto',
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Stat({
  value,
  label,
  sub,
  className,
}: {
  value: ReactNode;
  label: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="numeric text-[clamp(1.6rem,3vw,2.3rem)] font-bold leading-none text-chalk">
        {value}
      </div>
      <div className="mt-2 text-[13px] font-medium text-chalk">{label}</div>
      {sub ? <div className="mt-1 text-xs leading-relaxed text-slate-dim">{sub}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--hairline-strong)] px-6 py-16 text-center',
        className,
      )}
    >
      {icon ? <div className="mb-4 text-slate-dim">{icon}</div> : null}
      <h3 className="text-base font-semibold text-chalk">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-mist">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Data display                                                                */
/* -------------------------------------------------------------------------- */

export function KeyValue({
  rows,
  className,
}: {
  rows: { label: string; value: ReactNode; hint?: string }[];
  className?: string;
}) {
  return (
    <dl className={cn('divide-y divide-[var(--hairline)]', className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-6 py-3">
          <dt className="text-[13px] text-mist">
            {row.label}
            {row.hint ? (
              <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-dim">
                {row.hint}
              </span>
            ) : null}
          </dt>
          <dd className="numeric shrink-0 text-right text-sm font-medium text-chalk">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({
  value,
  tone = 'amber',
  className,
}: {
  value: number;
  tone?: 'amber' | 'cedar' | 'danger' | 'steel';
  className?: string;
}) {
  const tones = {
    amber: 'bg-amber-500',
    cedar: 'bg-cedar-500',
    danger: 'bg-danger',
    steel: 'bg-steel-500',
  };
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-ink-800', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700', tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
