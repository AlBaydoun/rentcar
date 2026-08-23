import type { Currency, Money } from './types';

/**
 * Integer money.
 *
 * Every amount on the platform is stored as minor units (cents for EUR/USD,
 * whole lira for LBP) so that no rounding drift can accumulate across the
 * dozens of lines a rental quote can contain. Floats never touch a price.
 */

export const CURRENCY_META: Record<
  Currency,
  { symbol: string; decimals: number; code: Currency; name: string; symbolFirst: boolean }
> = {
  EUR: { symbol: '€', decimals: 2, code: 'EUR', name: 'Euro', symbolFirst: false },
  USD: { symbol: '$', decimals: 2, code: 'USD', name: 'US Dollar', symbolFirst: true },
  // The lira has no meaningful subunit at current magnitudes.
  LBP: { symbol: 'L£', decimals: 0, code: 'LBP', name: 'Lebanese Pound', symbolFirst: true },
};

export const money = (amount: number, currency: Currency): Money => ({
  amount: Math.round(amount),
  currency,
});

export const zero = (currency: Currency): Money => ({ amount: 0, currency });

function assertSame(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function add(...amounts: Money[]): Money {
  if (amounts.length === 0) throw new Error('add() requires at least one amount');
  const currency = amounts[0].currency;
  let total = 0;
  for (const item of amounts) {
    assertSame(amounts[0], item);
    total += item.amount;
  }
  return { amount: total, currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSame(a, b);
  return { amount: a.amount - b.amount, currency: a.currency };
}

/** Multiply by a rate, rounding half away from zero. */
export function multiply(value: Money, factor: number): Money {
  return { amount: roundHalfAwayFromZero(value.amount * factor), currency: value.currency };
}

export function negate(value: Money): Money {
  return { amount: -value.amount, currency: value.currency };
}

export function clamp(value: Money, min: number, max: number): Money {
  return { amount: Math.min(Math.max(value.amount, min), max), currency: value.currency };
}

export function isZero(value: Money): boolean {
  return value.amount === 0;
}

export function isNegative(value: Money): boolean {
  return value.amount < 0;
}

export function max(a: Money, b: Money): Money {
  assertSame(a, b);
  return a.amount >= b.amount ? a : b;
}

export function min(a: Money, b: Money): Money {
  assertSame(a, b);
  return a.amount <= b.amount ? a : b;
}

export function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * Splits an amount into `parts` shares without losing or inventing a single
 * minor unit. The remainder is distributed one unit at a time to the leading
 * shares, which is the standard "largest remainder" allocation.
 */
export function allocate(value: Money, parts: number): Money[] {
  if (parts <= 0) throw new Error('allocate() requires at least one part');
  const base = Math.trunc(value.amount / parts);
  let remainder = value.amount - base * parts;
  const step = remainder < 0 ? -1 : 1;
  remainder = Math.abs(remainder);
  return Array.from({ length: parts }, (_, index) => ({
    amount: base + (index < remainder ? step : 0),
    currency: value.currency,
  }));
}

/** Splits by weights, again preserving the total exactly. */
export function allocateByWeights(value: Money, weights: readonly number[]): Money[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return weights.map(() => zero(value.currency));
  const raw = weights.map((weight) => (value.amount * weight) / total);
  const floored = raw.map((amount) => Math.floor(amount));
  let remainder = value.amount - floored.reduce((sum, amount) => sum + amount, 0);
  const order = raw
    .map((amount, index) => ({ index, fraction: amount - Math.floor(amount) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (const { index } of order) {
    if (remainder <= 0) break;
    floored[index] += 1;
    remainder -= 1;
  }
  return floored.map((amount) => ({ amount, currency: value.currency }));
}

/**
 * VAT extraction for gross-inclusive amounts, e.g. pulling the 19% out of a
 * price that already contains it.
 */
export function vatFromGross(gross: Money, rate: number): Money {
  return multiply(gross, rate / (1 + rate));
}

export function vatOnNet(net: Money, rate: number): Money {
  return multiply(net, rate);
}

export function toDecimal(value: Money): number {
  return value.amount / 10 ** CURRENCY_META[value.currency].decimals;
}

export function fromDecimal(amount: number, currency: Currency): Money {
  return money(amount * 10 ** CURRENCY_META[currency].decimals, currency);
}

export function formatMoney(
  value: Money,
  options: { locale?: string; compact?: boolean; showCode?: boolean } = {},
): string {
  const meta = CURRENCY_META[value.currency];
  const { locale = value.currency === 'EUR' ? 'de-DE' : 'en-US', compact = false } = options;
  const decimal = toDecimal(value);
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: compact && Number.isInteger(decimal) ? 0 : meta.decimals,
    maximumFractionDigits: meta.decimals,
    notation: compact && Math.abs(decimal) >= 10_000 ? 'compact' : 'standard',
  }).format(decimal);
  return options.showCode ? `${formatted} ${value.currency}` : formatted;
}

/**
 * Reference exchange rates.
 *
 * The platform settles each market in its own currency, so these are used for
 * display only ("about €430") and for cross-market analytics. The Lebanese
 * pound uses the official 89,500 peg rather than a floating market rate.
 */
export const REFERENCE_RATES: Record<Currency, Record<Currency, number>> = {
  EUR: { EUR: 1, USD: 1.09, LBP: 97_555 },
  USD: { USD: 1, EUR: 0.917, LBP: 89_500 },
  LBP: { LBP: 1, USD: 1 / 89_500, EUR: 1 / 97_555 },
};

export function convert(value: Money, to: Currency): Money {
  if (value.currency === to) return value;
  const rate = REFERENCE_RATES[value.currency][to];
  if (!rate) throw new Error(`No reference rate ${value.currency} -> ${to}`);
  const fromDecimals = CURRENCY_META[value.currency].decimals;
  const toDecimals = CURRENCY_META[to].decimals;
  const scaled = value.amount * rate * 10 ** (toDecimals - fromDecimals);
  return { amount: roundHalfAwayFromZero(scaled), currency: to };
}

/** Rounds up to a "friendly" price point — used for suggested pricing only. */
export function roundToPricePoint(value: Money): Money {
  const meta = CURRENCY_META[value.currency];
  const unit = meta.decimals === 0 ? 5_000 : 100;
  return { amount: Math.ceil(value.amount / unit) * unit, currency: value.currency };
}
