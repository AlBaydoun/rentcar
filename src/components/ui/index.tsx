import { cn } from '@/lib/cn';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

const buttonBase =
  'relative inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap ' +
  'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ' +
  'disabled:pointer-events-none disabled:opacity-45 select-none';

const buttonVariants = {
  primary:
    'bg-gradient-to-b from-amber-400 to-amber-600 text-ink-950 font-semibold ' +
    'shadow-[0_1px_0_0_rgba(255,255,255,0.35)_inset,0_10px_30px_-10px_rgba(255,166,43,0.7)] ' +
    'hover:brightness-110 hover:-translate-y-px active:translate-y-0 active:brightness-95',
  secondary:
    'panel text-chalk hover:bg-white/[0.09] hover:border-white/20 hover:-translate-y-px active:translate-y-0',
  ghost: 'text-mist hover:text-chalk hover:bg-white/[0.06]',
  outline: 'border border-white/15 text-chalk hover:border-amber-500/60 hover:text-amber-400',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
  success: 'bg-cedar-500/15 text-cedar-400 border border-cedar-500/30 hover:bg-cedar-500/25',
} as const;

const buttonSizes = {
  xs: 'h-8 px-3 text-xs rounded-[8px]',
  sm: 'h-9 px-4 text-[13px] rounded-[10px]',
  md: 'h-11 px-5 text-sm rounded-xs',
  lg: 'h-13 px-7 text-[15px] rounded-sm',
  xl: 'h-15 px-9 text-base rounded-md',
  icon: 'h-10 w-10 rounded-xs',
} as const;

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
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

export function Card({
  className,
  lit = true,
  ...props
}: ComponentProps<'div'> & { lit?: boolean }) {
  return (
    <div
      className={cn('panel rounded-lg', lit && 'panel-lit', className)}
      {...props}
    />
  );
}

export function Panel({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('panel-solid rounded-md', className)} {...props} />;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('hairline-x my-6', className)} aria-hidden />;
}

/* -------------------------------------------------------------------------- */
/* Badge & pills                                                               */
/* -------------------------------------------------------------------------- */

const badgeTones = {
  neutral: 'bg-white/[0.06] text-mist border-white/10',
  amber: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  cedar: 'bg-cedar-500/12 text-cedar-400 border-cedar-500/25',
  steel: 'bg-steel-500/12 text-steel-400 border-steel-500/25',
  danger: 'bg-danger/12 text-danger border-danger/25',
  warn: 'bg-warn/12 text-warn border-warn/25',
  success: 'bg-success/12 text-success border-success/25',
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
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none tracking-wide',
        badgeTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-mist',
        className,
      )}
    >
      <span className="h-px w-6 bg-gradient-to-r from-transparent to-amber-500" />
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Form controls                                                               */
/* -------------------------------------------------------------------------- */

const fieldBase =
  'w-full rounded-xs border border-white/10 bg-ink-900/70 px-3.5 text-sm text-chalk ' +
  'placeholder:text-slate-dim transition-colors duration-150 ' +
  'focus:border-amber-500/60 focus:bg-ink-900 focus:outline-none focus:ring-2 focus:ring-amber-500/15 ' +
  'disabled:opacity-50';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldBase, 'h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldBase, 'min-h-28 py-3 leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(fieldBase, 'h-11 appearance-none pr-9 [&>option]:bg-ink-880', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23a4adc0' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E\")",
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
    <label
      className={cn('mb-2 block text-[12px] font-medium uppercase tracking-wider text-mist', className)}
      {...props}
    >
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
/* Layout helpers                                                              */
/* -------------------------------------------------------------------------- */

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-[1240px] px-5 sm:px-8', className)} {...props} />;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div className={cn(align === 'center' && 'text-center', className)}>
      {eyebrow ? (
        <Eyebrow className={cn(align === 'center' && 'justify-center')}>{eyebrow}</Eyebrow>
      ) : null}
      <h2 className="display mt-4 text-[clamp(1.9rem,4.2vw,3.1rem)] text-gradient">{title}</h2>
      {description ? (
        <p
          className={cn(
            'mt-4 max-w-2xl text-[15px] leading-relaxed text-mist',
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
      <div className="numeric text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-none text-chalk">
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
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 px-6 py-16 text-center',
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
    <dl className={cn('divide-y divide-white/[0.06]', className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-6 py-3">
          <dt className="text-[13px] text-mist">
            {row.label}
            {row.hint ? (
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-dim">{row.hint}</span>
            ) : null}
          </dt>
          <dd className="numeric shrink-0 text-right text-sm font-medium text-chalk">{row.value}</dd>
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
    amber: 'from-amber-400 to-amber-600',
    cedar: 'from-cedar-400 to-cedar-500',
    danger: 'from-danger to-red-600',
    steel: 'from-steel-400 to-steel-500',
  };
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]', className)}>
      <div
        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
