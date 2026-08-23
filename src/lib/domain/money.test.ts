import { describe, expect, it } from 'vitest';
import {
  add,
  allocate,
  allocateByWeights,
  convert,
  formatMoney,
  fromDecimal,
  money,
  multiply,
  subtract,
  toDecimal,
  vatFromGross,
  vatOnNet,
} from './money';

describe('money', () => {
  it('adds and subtracts within a currency', () => {
    expect(add(money(1000, 'EUR'), money(250, 'EUR')).amount).toBe(1250);
    expect(subtract(money(1000, 'EUR'), money(250, 'EUR')).amount).toBe(750);
  });

  it('refuses to mix currencies', () => {
    expect(() => add(money(100, 'EUR'), money(100, 'USD'))).toThrow(/mismatch/i);
  });

  it('rounds half away from zero so discounts do not favour the platform', () => {
    expect(multiply(money(101, 'EUR'), 0.5).amount).toBe(51);
    expect(multiply(money(-101, 'EUR'), 0.5).amount).toBe(-51);
  });

  it('allocates without losing a cent', () => {
    const parts = allocate(money(1000, 'EUR'), 3);
    expect(parts.map((part) => part.amount)).toEqual([334, 333, 333]);
    expect(parts.reduce((sum, part) => sum + part.amount, 0)).toBe(1000);
  });

  it('allocates by weights without losing a cent', () => {
    const parts = allocateByWeights(money(10_000, 'EUR'), [1, 1, 1]);
    expect(parts.reduce((sum, part) => sum + part.amount, 0)).toBe(10_000);
  });

  it('extracts VAT from a gross amount', () => {
    // 119.00 gross at 19% contains 19.00 of VAT.
    expect(vatFromGross(money(11_900, 'EUR'), 0.19).amount).toBe(1_900);
    expect(vatOnNet(money(10_000, 'EUR'), 0.19).amount).toBe(1_900);
  });

  it('round-trips decimals', () => {
    expect(toDecimal(fromDecimal(49.99, 'EUR'))).toBeCloseTo(49.99);
  });

  it('treats the lira as a zero-decimal currency', () => {
    const converted = convert(money(10_000, 'USD'), 'LBP');
    expect(converted.currency).toBe('LBP');
    // $100 at the 89,500 peg is 8,950,000 lira, stored as whole lira.
    expect(converted.amount).toBe(8_950_000);
  });

  it('formats per locale', () => {
    expect(formatMoney(money(4_999, 'EUR'))).toContain('49,99');
    expect(formatMoney(money(4_999, 'USD'))).toContain('49.99');
  });
});
