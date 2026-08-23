import { z } from 'zod';
import { COUNTRIES, EXTRA_CODES, INSURANCE_TIERS } from '@/lib/domain/types';

/** Input schemas shared by server actions and route handlers. */

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(120),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    password: z
      .string()
      .min(10, 'Use at least 10 characters')
      .max(200, 'That password is too long'),
    dateOfBirth: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Enter your date of birth'),
    country: z.enum(COUNTRIES),
    residenceCountry: z.string().trim().length(2, 'Use a two-letter country code').toUpperCase(),
    city: z.string().trim().max(80).optional(),
    intent: z.enum(['RENT', 'HOST', 'BOTH']).default('BOTH'),
  })
  .refine(
    (value) => {
      const age = (Date.now() - Date.parse(value.dateOfBirth)) / (365.25 * 86_400_000);
      return age >= 18;
    },
    { message: 'You must be at least 18 to create an account', path: ['dateOfBirth'] },
  );

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const quoteSchema = z.object({
  vehicleId: z.string().min(1),
  start: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid pickup date'),
  end: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid return date'),
  insuranceTier: z.enum(INSURANCE_TIERS),
  extras: z
    .array(z.object({ code: z.enum(EXTRA_CODES), quantity: z.number().int().min(0).max(5) }))
    .max(12)
    .optional(),
  deliveryDistanceKm: z.number().min(0).max(300).optional(),
  crossBorderCountries: z.array(z.string().length(2)).max(8).optional(),
  estimatedKm: z.number().min(0).max(50_000).optional(),
});

export const bookingRequestSchema = quoteSchema.extend({
  message: z.string().trim().max(1_200).optional(),
});

export const ownerDecisionSchema = z.object({
  bookingId: z.string().min(1),
  decision: z.enum(['APPROVE', 'DECLINE', 'REQUEST_DOCUMENTS']),
  note: z.string().trim().max(600).optional(),
});

export const messageSchema = z.object({
  bookingId: z.string().min(1),
  body: z.string().trim().min(1, 'Write a message').max(2_000),
});

export const searchSchema = z.object({
  country: z.enum(COUNTRIES).optional(),
  city: z.string().trim().max(80).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
  transmission: z.string().optional(),
  fuelType: z.string().optional(),
  seats: z.coerce.number().int().min(1).max(9).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  instantBook: z.coerce.boolean().optional(),
  sort: z.enum(['RECOMMENDED', 'PRICE_ASC', 'PRICE_DESC', 'RATING', 'NEWEST']).optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type SearchInput = z.infer<typeof searchSchema>;

/** Turns a ZodError into a field -> message map for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const output: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!output[key]) output[key] = issue.message;
  }
  return output;
}
