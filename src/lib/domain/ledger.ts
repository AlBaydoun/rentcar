import type { CountryConfig } from './countries';
import { add, money, multiply, negate, zero } from './money';
import type {
  LedgerEntryType,
  Money,
  PayoutMethod,
  PaymentStatus,
} from './types';
import type { PriceQuote } from './pricing';

/**
 * The money ledger.
 *
 * Every cent that moves is an immutable entry with a direction, a counterparty
 * and a booking. Balances are always derived, never stored, so the platform's
 * position can be reconstructed from the log alone.
 */

export type Account = 'RENTER' | 'OWNER' | 'PLATFORM' | 'TAX_AUTHORITY' | 'INSURER' | 'DEPOSIT_HOLD';

export interface LedgerEntry {
  readonly id: string;
  readonly bookingId: string;
  readonly type: LedgerEntryType;
  readonly amount: Money;
  readonly from: Account;
  readonly to: Account;
  readonly occurredAt: Date;
  readonly description: string;
  /** Reference from the payment provider, when there is one. */
  readonly externalRef?: string;
  /** Deposit holds are not revenue and never count towards a balance. */
  readonly isHold: boolean;
}

let sequence = 0;
function entryId(): string {
  sequence += 1;
  return `led_${Date.now().toString(36)}_${sequence.toString(36)}`;
}

export function createEntry(params: Omit<LedgerEntry, 'id' | 'isHold'> & { isHold?: boolean }): LedgerEntry {
  return { id: entryId(), isHold: params.isHold ?? false, ...params };
}

/**
 * Turns a quote into the entries produced at capture time.
 *
 * Note the ordering against the booking lifecycle: this runs at
 * `HANDOVER_COMPLETED`, not at confirmation. The renter's card is authorised
 * when the owner approves and only captured once the keys actually change
 * hands, so a no-show owner never results in a captured payment.
 */
export function entriesForCapture(params: {
  bookingId: string;
  quote: PriceQuote;
  country: CountryConfig;
  occurredAt: Date;
  externalRef?: string;
}): LedgerEntry[] {
  const { quote, country, bookingId, occurredAt, externalRef } = params;
  const entries: LedgerEntry[] = [];
  const push = (
    type: LedgerEntryType,
    amount: Money,
    from: Account,
    to: Account,
    description: string,
    isHold = false,
  ) => {
    if (amount.amount === 0) return;
    entries.push(createEntry({ bookingId, type, amount, from, to, occurredAt, description, externalRef, isHold }));
  };

  const rentalLine = quote.lines.find((line) => line.code === 'RENTAL_BASE');
  const rentalNet = quote.ownerGross;

  push('RENTAL_CHARGE', rentalNet, 'RENTER', 'OWNER', rentalLine?.detail ?? 'Rental');
  push('INSURANCE_CHARGE', quote.insurance.totalPremium, 'RENTER', 'INSURER', `${quote.insurance.spec.name} protection`);

  const serviceFee = quote.lines.find((line) => line.code === 'SERVICE_FEE')?.amount;
  if (serviceFee) push('SERVICE_FEE', serviceFee, 'RENTER', 'PLATFORM', 'KarRent service fee');

  push('PLATFORM_COMMISSION', quote.ownerCommission, 'OWNER', 'PLATFORM', `${Math.round(country.ownerCommissionRate * 100)}% commission`);
  push('VAT', quote.vat, 'RENTER', 'TAX_AUTHORITY', `${country.vatName} at ${Math.round(country.vatRate * 100)}%`);
  push('DEPOSIT_HOLD', quote.deposit, 'RENTER', 'DEPOSIT_HOLD', 'Refundable security deposit', true);

  return entries;
}

export function entriesForSettlement(params: {
  bookingId: string;
  lines: readonly { code: string; label: string; amount: Money }[];
  depositReturned: Money;
  occurredAt: Date;
}): LedgerEntry[] {
  const entries: LedgerEntry[] = [];

  for (const line of params.lines) {
    if (line.amount.amount === 0) continue;
    const type = (line.code as LedgerEntryType) ?? 'DAMAGE_CHARGE';
    entries.push(
      createEntry({
        bookingId: params.bookingId,
        type,
        amount: line.amount,
        from: 'DEPOSIT_HOLD',
        to: 'OWNER',
        occurredAt: params.occurredAt,
        description: line.label,
      }),
    );
  }

  if (params.depositReturned.amount > 0) {
    entries.push(
      createEntry({
        bookingId: params.bookingId,
        type: 'DEPOSIT_RELEASE',
        amount: params.depositReturned,
        from: 'DEPOSIT_HOLD',
        to: 'RENTER',
        occurredAt: params.occurredAt,
        description: 'Security deposit released',
        isHold: true,
      }),
    );
  }

  return entries;
}

/** Net position of one account across a set of entries. */
export function balanceOf(entries: readonly LedgerEntry[], account: Account): Money {
  const real = entries.filter((entry) => !entry.isHold);
  if (real.length === 0) return zero('EUR');
  const currency = real[0].amount.currency;
  let total = 0;
  for (const entry of real) {
    if (entry.to === account) total += entry.amount.amount;
    if (entry.from === account) total -= entry.amount.amount;
  }
  return money(total, currency);
}

/** Every entry must balance: the sum across all accounts is always zero. */
export function assertBalanced(entries: readonly LedgerEntry[]): boolean {
  const accounts: Account[] = ['RENTER', 'OWNER', 'PLATFORM', 'TAX_AUTHORITY', 'INSURER', 'DEPOSIT_HOLD'];
  const total = accounts.reduce((sum, account) => sum + balanceOf(entries, account).amount, 0);
  return total === 0;
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

export interface PayoutDestination {
  readonly method: PayoutMethod;
  readonly label: string;
  /** Masked reference shown in the UI. */
  readonly reference: string;
}

export interface PayoutSchedule {
  readonly amount: Money;
  readonly availableAt: Date;
  readonly method: PayoutMethod;
  readonly fee: Money;
  readonly netAmount: Money;
  readonly estimatedArrival: string;
  readonly blockers: readonly string[];
}

/** Rail costs, in minor units plus a percentage. */
const PAYOUT_FEES: Record<PayoutMethod, { fixed: number; rate: number; arrival: string; label: string }> = {
  SEPA: { fixed: 0, rate: 0, arrival: '1-2 business days', label: 'SEPA transfer' },
  WHISH: { fixed: 100, rate: 0.01, arrival: 'Within an hour', label: 'Whish Money' },
  OMT: { fixed: 200, rate: 0.015, arrival: 'Same day, collect in branch', label: 'OMT cash pickup' },
  BANK_TRANSFER_LB: { fixed: 500, rate: 0, arrival: '2-5 business days', label: 'Lebanese bank transfer' },
  CASH: { fixed: 0, rate: 0, arrival: 'Arranged with the renter', label: 'Cash at handover' },
};

export function schedulePayout(params: {
  ownerGross: Money;
  commission: Money;
  country: CountryConfig;
  method: PayoutMethod;
  tripEnd: Date;
  hasOpenClaim: boolean;
  ownerVerified: boolean;
  settlementCredits?: Money;
}): PayoutSchedule {
  const currency = params.ownerGross.currency;
  const base = add(
    params.ownerGross,
    negate(params.commission),
    params.settlementCredits ?? zero(currency),
  );

  const config = PAYOUT_FEES[params.method];
  const fee = money(config.fixed + multiply(base, config.rate).amount, currency);
  const netAmount = money(Math.max(0, base.amount - fee.amount), currency);

  const availableAt = new Date(
    params.tripEnd.getTime() + params.country.payoutDelayDaysAfterTripEnd * 86_400_000,
  );

  const blockers: string[] = [];
  if (params.hasOpenClaim) {
    blockers.push('A claim is open on this trip — the payout is held until it closes.');
  }
  if (!params.ownerVerified) {
    blockers.push('Complete identity verification to receive payouts.');
  }
  if (!params.country.payoutMethods.includes(params.method)) {
    blockers.push(`${config.label} is not available in ${params.country.name}.`);
  }

  return {
    amount: base,
    availableAt,
    method: params.method,
    fee,
    netAmount,
    estimatedArrival: config.arrival,
    blockers,
  };
}

export function payoutMethodLabel(method: PayoutMethod): string {
  return PAYOUT_FEES[method].label;
}

// ---------------------------------------------------------------------------
// Payment authorisation model
// ---------------------------------------------------------------------------

export interface PaymentIntent {
  readonly id: string;
  readonly bookingId: string;
  readonly status: PaymentStatus;
  readonly authorizedAmount: Money;
  readonly capturedAmount: Money;
  readonly refundedAmount: Money;
  readonly depositHold: Money;
  readonly provider: 'stripe' | 'areeba' | 'whish' | 'mock';
  readonly authorizedAt: Date | null;
  readonly capturedAt: Date | null;
  /** Card authorisations lapse; the platform must capture or re-authorise. */
  readonly authorizationExpiresAt: Date | null;
}

/**
 * Card authorisations typically last seven days. A trip approved three weeks
 * out therefore needs re-authorisation before handover, which the scheduler
 * uses this to detect.
 */
export const AUTHORIZATION_VALIDITY_DAYS = 7;

export function needsReauthorization(intent: PaymentIntent, tripStart: Date): boolean {
  if (intent.status !== 'AUTHORIZED' || !intent.authorizationExpiresAt) return false;
  return intent.authorizationExpiresAt < tripStart;
}

export function providerFor(countryCode: 'DE' | 'LB'): PaymentIntent['provider'] {
  const configured =
    countryCode === 'DE' ? process.env.PAYMENT_PROVIDER_DE : process.env.PAYMENT_PROVIDER_LB;
  if (configured === 'stripe' || configured === 'areeba' || configured === 'whish') return configured;
  return 'mock';
}
