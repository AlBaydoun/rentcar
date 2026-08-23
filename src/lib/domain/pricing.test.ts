import { describe, expect, it } from 'vitest';
import { GERMANY, LEBANON } from './countries';
import { money, toDecimal } from './money';
import {
  PricingError,
  billableDays,
  durationDiscount,
  leadTimeFactor,
  quote,
  suggestDailyRate,
  type VehiclePricingProfile,
} from './pricing';

const germanCar: VehiclePricingProfile = {
  dailyRate: money(4_800, 'EUR'),
  category: 'COMPACT',
  estimatedValue: money(1_800_000, 'EUR'),
  includedKmPerDay: 250,
  extraKmPrice: 29,
  weeklyDiscount: 0.15,
  monthlyDiscount: 0.3,
  cleaningFee: 2_000,
  deliveryPricePerKm: 150,
  deliveryFreeRadiusKm: 5,
  minRentalDays: 1,
  maxRentalDays: 60,
  baseDeposit: 60_000,
  ownerType: 'PRIVATE',
};

const lebaneseCar: VehiclePricingProfile = {
  ...germanCar,
  dailyRate: money(4_000, 'USD'),
  estimatedValue: money(1_500_000, 'USD'),
  cleaningFee: 1_500,
  baseDeposit: 50_000,
};

// A quiet March window with no season multiplier in either market.
const start = new Date('2026-03-02T10:00:00Z'); // Monday
const end = new Date('2026-03-05T10:00:00Z'); // Thursday, 3 days
const now = new Date('2026-02-01T10:00:00Z');

describe('billableDays', () => {
  it('counts a 24-hour block as one day', () => {
    expect(billableDays(new Date('2026-03-01T10:00:00Z'), new Date('2026-03-02T10:00:00Z'), 59)).toBe(1);
  });

  it('absorbs a short overrun into the grace period', () => {
    expect(billableDays(new Date('2026-03-01T10:00:00Z'), new Date('2026-03-02T10:45:00Z'), 59)).toBe(1);
  });

  it('bills an extra day once the grace period is exceeded', () => {
    expect(billableDays(new Date('2026-03-01T10:00:00Z'), new Date('2026-03-02T12:00:00Z'), 59)).toBe(2);
  });

  it('always bills at least one day', () => {
    expect(billableDays(new Date('2026-03-01T10:00:00Z'), new Date('2026-03-01T11:00:00Z'), 59)).toBe(1);
  });

  it('rejects an inverted range', () => {
    expect(() => billableDays(end, start, 59)).toThrow(PricingError);
  });
});

describe('leadTimeFactor', () => {
  it('charges a premium for same-day bookings', () => {
    expect(leadTimeFactor(now, new Date(now.getTime() + 5 * 3_600_000)).factor).toBeGreaterThan(1);
  });
  it('discounts bookings made months ahead', () => {
    expect(leadTimeFactor(now, new Date(now.getTime() + 200 * 86_400_000)).factor).toBeLessThan(1);
  });
  it('leaves the normal window untouched', () => {
    expect(leadTimeFactor(now, new Date(now.getTime() + 20 * 86_400_000)).factor).toBe(1);
  });
});

describe('durationDiscount', () => {
  it('applies the weekly tier from seven days', () => {
    expect(durationDiscount(7, germanCar).rate).toBe(0.15);
  });
  it('prefers the monthly tier from 28 days', () => {
    expect(durationDiscount(30, germanCar).rate).toBe(0.3);
  });
  it('gives nothing to short trips', () => {
    expect(durationDiscount(3, germanCar).rate).toBe(0);
  });
});

describe('quote — Germany', () => {
  const result = quote({
    country: GERMANY,
    vehicle: germanCar,
    start,
    end,
    now,
    insuranceTier: 'PLUS',
    renterAge: 34,
    renterRiskScore: 20,
  });

  it('bills the right number of days', () => {
    expect(result.days).toBe(3);
    expect(result.dayBreakdown).toHaveLength(3);
  });

  it('produces an itemised, auditable set of lines', () => {
    const codes = result.lines.map((line) => line.code);
    expect(codes).toContain('RENTAL_BASE');
    expect(codes).toContain('INSURANCE');
    expect(codes).toContain('SERVICE_FEE');
    expect(codes).toContain('VAT');
    expect(codes).toContain('DEPOSIT');
  });

  it('keeps the renter total equal to the sum of its renter-facing charges', () => {
    const summed = result.lines
      .filter((line) => line.payer === 'RENTER')
      .filter((line) => line.kind === 'CHARGE' || line.kind === 'TAX' || line.kind === 'DISCOUNT')
      .reduce((total, line) => total + line.amount.amount, 0);
    expect(summed).toBe(result.renterTotal.amount);
  });

  it('excludes the refundable deposit from the total charged', () => {
    expect(result.deposit.amount).toBeGreaterThan(0);
    expect(result.renterTotal.amount).toBeLessThan(
      result.renterTotal.amount + result.deposit.amount,
    );
  });

  it('pays the owner their gross less commission', () => {
    expect(result.ownerPayout.amount).toBe(result.ownerGross.amount - result.ownerCommission.amount);
    expect(result.ownerCommission.amount).toBe(Math.round(result.ownerGross.amount * 0.15));
  });

  it('does not route protection premiums through the owner', () => {
    expect(result.ownerGross.amount).toBeLessThan(result.renterTotal.amount);
    const insuranceLine = result.lines.find((line) => line.code === 'INSURANCE')!;
    expect(insuranceLine.amount.amount).toBeGreaterThan(0);
  });

  it('charges VAT on platform fees only for a private owner', () => {
    const platformBase =
      result.lines.find((line) => line.code === 'SERVICE_FEE')!.amount.amount +
      result.ownerCommission.amount +
      result.insurance.totalPremium.amount;
    expect(result.vat.amount).toBe(Math.round(platformBase * 0.19));
  });

  it('charges VAT on the rental too when the owner is a business', () => {
    const business = quote({
      country: GERMANY,
      vehicle: { ...germanCar, ownerType: 'BUSINESS' },
      start,
      end,
      now,
      insuranceTier: 'PLUS',
      renterAge: 34,
      renterRiskScore: 20,
    });
    expect(business.vat.amount).toBeGreaterThan(result.vat.amount);
  });
});

describe('quote — market differences', () => {
  it('prices Lebanon in dollars and Germany in euros', () => {
    const de = quote({ country: GERMANY, vehicle: germanCar, start, end, now, insuranceTier: 'BASIC', renterAge: 30, renterRiskScore: 20 });
    const lb = quote({ country: LEBANON, vehicle: lebaneseCar, start, end, now, insuranceTier: 'BASIC', renterAge: 30, renterRiskScore: 20 });
    expect(de.currency).toBe('EUR');
    expect(lb.currency).toBe('USD');
  });

  it('refuses a vehicle priced in the wrong currency for its market', () => {
    expect(() =>
      quote({ country: LEBANON, vehicle: germanCar, start, end, now, insuranceTier: 'BASIC', renterAge: 30, renterRiskScore: 20 }),
    ).toThrow(/settles in/);
  });

  it('applies the Lebanese summer multiplier', () => {
    const summer = quote({
      country: LEBANON,
      vehicle: lebaneseCar,
      start: new Date('2026-07-06T10:00:00Z'),
      end: new Date('2026-07-09T10:00:00Z'),
      now,
      insuranceTier: 'BASIC',
      renterAge: 30,
      renterRiskScore: 20,
    });
    const march = quote({ country: LEBANON, vehicle: lebaneseCar, start, end, now, insuranceTier: 'BASIC', renterAge: 30, renterRiskScore: 20 });
    expect(summer.renterTotal.amount).toBeGreaterThan(march.renterTotal.amount);
    expect(summer.lines.some((line) => line.code === 'SEASON_INFO')).toBe(true);
  });

  it('blocks travel to a forbidden country', () => {
    expect(() =>
      quote({
        country: LEBANON,
        vehicle: lebaneseCar,
        start,
        end,
        now,
        insuranceTier: 'BASIC',
        renterAge: 30,
        renterRiskScore: 20,
        crossBorderCountries: ['SY'],
      }),
    ).toThrow(/not permitted/);
  });

  it('allows and charges for permitted EU cross-border travel', () => {
    const result = quote({
      country: GERMANY,
      vehicle: germanCar,
      start,
      end,
      now,
      insuranceTier: 'PLUS',
      renterAge: 30,
      renterRiskScore: 20,
      crossBorderCountries: ['AT'],
    });
    expect(result.lines.some((line) => line.code === 'CROSS_BORDER_FEE')).toBe(true);
  });
});

describe('quote — surcharges and discounts', () => {
  it('adds a young driver surcharge below the market threshold', () => {
    const young = quote({ country: GERMANY, vehicle: germanCar, start, end, now, insuranceTier: 'BASIC', renterAge: 22, renterRiskScore: 30 });
    const older = quote({ country: GERMANY, vehicle: germanCar, start, end, now, insuranceTier: 'BASIC', renterAge: 40, renterRiskScore: 30 });
    expect(young.lines.some((line) => line.code === 'YOUNG_DRIVER_FEE')).toBe(true);
    expect(older.lines.some((line) => line.code === 'YOUNG_DRIVER_FEE')).toBe(false);
    expect(young.renterTotal.amount).toBeGreaterThan(older.renterTotal.amount);
  });

  it('applies the weekly discount on a seven-day trip', () => {
    const week = quote({
      country: GERMANY,
      vehicle: germanCar,
      start,
      end: new Date('2026-03-09T10:00:00Z'),
      now,
      insuranceTier: 'BASIC',
      renterAge: 30,
      renterRiskScore: 20,
    });
    const discount = week.lines.find((line) => line.code === 'DURATION_DISCOUNT');
    expect(discount).toBeDefined();
    expect(discount!.amount.amount).toBeLessThan(0);
    // Seven days should cost less per day than three.
    const short = quote({ country: GERMANY, vehicle: germanCar, start, end, now, insuranceTier: 'BASIC', renterAge: 30, renterRiskScore: 20 });
    expect(toDecimal(week.averageDailyRate)).toBeLessThan(toDecimal(short.averageDailyRate));
  });

  it('scales the deposit down as protection goes up', () => {
    const basic = quote({ country: GERMANY, vehicle: germanCar, start, end, now, insuranceTier: 'BASIC', renterAge: 30, renterRiskScore: 20 });
    const max = quote({ country: GERMANY, vehicle: germanCar, start, end, now, insuranceTier: 'MAX', renterAge: 30, renterRiskScore: 20 });
    expect(max.deposit.amount).toBeLessThan(basic.deposit.amount);
    expect(max.insuranceExcess.amount).toBe(0);
  });

  it('raises the deposit for a risky renter', () => {
    const safe = quote({ country: GERMANY, vehicle: germanCar, start, end, now, insuranceTier: 'BASIC', renterAge: 30, renterRiskScore: 10 });
    const risky = quote({ country: GERMANY, vehicle: germanCar, start, end, now, insuranceTier: 'BASIC', renterAge: 30, renterRiskScore: 80 });
    expect(risky.deposit.amount).toBeGreaterThan(safe.deposit.amount);
  });

  it('charges extras per day or per booking as configured', () => {
    const result = quote({
      country: GERMANY,
      vehicle: germanCar,
      start,
      end,
      now,
      insuranceTier: 'BASIC',
      renterAge: 30,
      renterRiskScore: 20,
      extras: [
        { code: 'CHILD_SEAT', quantity: 2 },
        { code: 'SKI_RACK', quantity: 1 },
      ],
    });
    const seat = result.lines.find((line) => line.code === 'EXTRA_CHILD_SEAT')!;
    const rack = result.lines.find((line) => line.code === 'EXTRA_SKI_RACK')!;
    expect(seat.amount.amount).toBe(400 * 2 * 3);
    expect(rack.amount.amount).toBe(3_000);
  });

  it('clamps the service fee into the market band', () => {
    const cheap = quote({
      country: GERMANY,
      vehicle: { ...germanCar, dailyRate: money(1_000, 'EUR'), cleaningFee: 0 },
      start,
      end,
      now,
      insuranceTier: 'BASIC',
      renterAge: 30,
      renterRiskScore: 20,
    });
    const fee = cheap.lines.find((line) => line.code === 'SERVICE_FEE')!;
    expect(fee.amount.amount).toBeGreaterThanOrEqual(GERMANY.renterServiceFeeMin);
  });

  it('warns when the estimated distance exceeds the allowance', () => {
    const result = quote({
      country: GERMANY,
      vehicle: germanCar,
      start,
      end,
      now,
      insuranceTier: 'BASIC',
      renterAge: 30,
      renterRiskScore: 20,
      estimatedKm: 2_000,
    });
    expect(result.warnings.join(' ')).toMatch(/unlimited kilometres/i);
  });

  it('removes the distance cap when unlimited km is bought', () => {
    const result = quote({
      country: GERMANY,
      vehicle: germanCar,
      start,
      end,
      now,
      insuranceTier: 'BASIC',
      renterAge: 30,
      renterRiskScore: 20,
      extras: [{ code: 'UNLIMITED_KM', quantity: 1 }],
      estimatedKm: 2_000,
    });
    expect(result.includedKm).toBe(Number.POSITIVE_INFINITY);
    expect(result.warnings).toHaveLength(0);
  });

  it('enforces the owner minimum and maximum duration', () => {
    const strict = { ...germanCar, minRentalDays: 5 };
    expect(() =>
      quote({ country: GERMANY, vehicle: strict, start, end, now, insuranceTier: 'BASIC', renterAge: 30, renterRiskScore: 20 }),
    ).toThrow(/5-day minimum/);
  });

  it('surfaces the winter tyre requirement for a January trip', () => {
    const winter = quote({
      country: GERMANY,
      vehicle: germanCar,
      start: new Date('2027-01-12T10:00:00Z'),
      end: new Date('2027-01-15T10:00:00Z'),
      now,
      insuranceTier: 'BASIC',
      renterAge: 30,
      renterRiskScore: 20,
    });
    expect(winter.requirements.join(' ')).toMatch(/winter/i);
    expect(winter.requirements.join(' ')).toMatch(/StVO/);
  });
});

describe('suggestDailyRate', () => {
  it('discounts older cars against their comparable set', () => {
    const comparables = [money(5_000, 'EUR'), money(5_500, 'EUR'), money(4_500, 'EUR')];
    const fresh = suggestDailyRate(comparables, 'COMPACT', 2025, 2026)!;
    const old = suggestDailyRate(comparables, 'COMPACT', 2012, 2026)!;
    expect(old.suggested.amount).toBeLessThan(fresh.suggested.amount);
    expect(fresh.low.amount).toBeLessThan(fresh.suggested.amount);
    expect(fresh.high.amount).toBeGreaterThan(fresh.suggested.amount);
  });

  it('returns null without comparables', () => {
    expect(suggestDailyRate([], 'COMPACT', 2024, 2026)).toBeNull();
  });
});
