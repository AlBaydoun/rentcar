'use client';

import { useActionState, useEffect, useMemo, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Sparkles, TrendingUp } from 'lucide-react';
import { CarViewer } from '@/components/three/CarViewer';
import { bodyStyleForCategory } from '@/lib/body-style';
import { paintHex } from '@/lib/paint';
import { CATEGORY_LABELS, PAINT_OPTIONS } from '@/lib/labels';
import { createListingAction, suggestPriceAction, type ListingState } from '@/lib/actions/listing';
import { Badge, Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { GERMANY, LEBANON } from '@/lib/domain/countries';
import { formatMoney, money } from '@/lib/domain/money';
import { POLICY_SPECS } from '@/lib/domain/cancellation';
import {
  CANCELLATION_POLICIES,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CATEGORIES,
  type CancellationPolicy,
  type CountryCode,
  type VehicleCategory,
} from '@/lib/domain/types';
import { cn } from '@/lib/cn';

const initial: ListingState = { ok: false };

const STEPS = [
  { key: 'car', label: 'The car' },
  { key: 'where', label: 'Where it lives' },
  { key: 'price', label: 'Your price' },
  { key: 'rules', label: 'Your rules' },
  { key: 'story', label: 'The listing' },
] as const;

/** Converts minor units to a plain decimal string for an input, and back. */
const toMajor = (minor: string) => (minor ? String(Number(minor) / 100) : '');
const toMinor = (major: string) =>
  String(Math.round(Number(major.replace(/[^\d.]/g, '') || '0') * 100));

/**
 * The listing wizard.
 *
 * The 3D preview updates as the owner picks a category and a colour, so they
 * are looking at their own car by the time they set a price on it — and the
 * suggested range is computed from real comparable listings, not invented.
 */
export function ListingWizard({ defaultCountry }: { defaultCountry: CountryCode }) {
  const [step, setStep] = useState(0);
  const [state, action, submitting] = useActionState(createListingAction, initial);

  const [form, setForm] = useState({
    make: '',
    model: '',
    variant: '',
    year: String(new Date().getFullYear() - 3),
    category: 'COMPACT' as VehicleCategory,
    transmission: 'MANUAL',
    fuelType: 'PETROL',
    seats: '5',
    doors: '5',
    colour: 'Alpine White',
    licensePlate: '',
    odometerKm: '60000',
    country: defaultCountry,
    city: '',
    exactAddress: '',
    dailyRate: '',
    estimatedValue: '',
    weeklyDiscount: '0.12',
    monthlyDiscount: '0.28',
    cleaningFee: defaultCountry === 'DE' ? '2000' : '1500',
    includedKmPerDay: defaultCountry === 'DE' ? '250' : '150',
    minRentalDays: '1',
    maxRentalDays: '30',
    advanceNoticeHours: '4',
    bufferHours: '2',
    cancellationPolicy: 'MODERATE' as CancellationPolicy,
    smokingAllowed: false,
    petsAllowed: false,
    crossBorderAllowed: false,
    features: '',
    description: '',
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const country = form.country === 'DE' ? GERMANY : LEBANON;
  const currency = country.currency;

  const [suggestion, setSuggestion] = useState<{
    suggested: number;
    low: number;
    high: number;
    sampleSize: number;
  } | null>(null);
  const [loadingSuggestion, startSuggestion] = useTransition();

  // Ask for a comparable-set suggestion once the owner reaches the price step.
  useEffect(() => {
    if (step !== 2) return;
    startSuggestion(async () => {
      const result = await suggestPriceAction({
        country: form.country,
        city: form.city,
        category: form.category,
        year: Number(form.year) || new Date().getFullYear(),
      });
      setSuggestion(result);
      setForm((previous) =>
        previous.dailyRate === '' && result
          ? { ...previous, dailyRate: String(result.suggested) }
          : previous,
      );
    });
  }, [step, form.country, form.city, form.category, form.year]);

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(form.make && form.model && form.colour && form.licensePlate);
      case 1:
        return Boolean(form.city && form.exactAddress.length >= 5);
      case 2:
        return Number(form.dailyRate) >= 100 && Number(form.estimatedValue) >= 10_000;
      case 3:
        return Number(form.maxRentalDays) >= Number(form.minRentalDays);
      case 4:
        return form.description.trim().length >= 20;
      default:
        return true;
    }
  }, [step, form]);

  const last = step === STEPS.length - 1;
  const deposit = Math.min(
    country.depositMax,
    Math.max(country.depositMin, Math.round(Number(form.estimatedValue) * 0.025)),
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <form action={action} className="min-w-0">
        {/* Every field is submitted regardless of which step is on screen. */}
        {Object.entries(form).map(([key, value]) =>
          typeof value === 'boolean' ? (
            value ? <input key={key} type="hidden" name={key} value="on" /> : null
          ) : (
            <input key={key} type="hidden" name={key} value={String(value)} />
          ),
        )}

        <ol className="flex gap-1.5">
          {STEPS.map((entry, index) => (
            <li key={entry.key} className="flex-1">
              <button
                type="button"
                onClick={() => index < step && setStep(index)}
                disabled={index > step}
                className="w-full text-left"
              >
                <div
                  className={cn(
                    'h-1 rounded-full transition-colors',
                    index < step
                      ? 'bg-cedar-500'
                      : index === step
                        ? 'bg-amber-500'
                        : 'bg-white/[0.08]',
                  )}
                />
                <span
                  className={cn(
                    'mt-2 block text-[11px]',
                    index === step ? 'text-chalk' : 'text-slate-dim',
                  )}
                >
                  {entry.label}
                </span>
              </button>
            </li>
          ))}
        </ol>

        {state.message ? (
          <div className="mt-6 flex items-start gap-2.5 rounded-xs border border-danger/25 bg-danger/10 p-3.5 text-[13px] text-danger">
            <AlertCircle size={15} className="mt-px shrink-0" />
            {state.message}
          </div>
        ) : null}

        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 ? (
                <Card className="p-6 sm:p-7">
                  <h2 className="display text-xl text-chalk">What are you listing?</h2>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Field label="Make" error={state.errors?.make}>
                      <Input
                        value={form.make}
                        onChange={(event) => set('make', event.target.value)}
                        placeholder="Volkswagen"
                      />
                    </Field>
                    <Field label="Model" error={state.errors?.model}>
                      <Input
                        value={form.model}
                        onChange={(event) => set('model', event.target.value)}
                        placeholder="Golf"
                      />
                    </Field>
                    <Field label="Variant" hint="Optional">
                      <Input
                        value={form.variant}
                        onChange={(event) => set('variant', event.target.value)}
                        placeholder="1.5 TSI Life"
                      />
                    </Field>
                    <Field label="Year" error={state.errors?.year}>
                      <Input
                        value={form.year}
                        onChange={(event) => set('year', event.target.value.replace(/\D/g, ''))}
                        inputMode="numeric"
                        className="numeric"
                      />
                    </Field>
                  </div>

                  <Field label="Category" className="mt-5">
                    <div className="flex flex-wrap gap-1.5">
                      {VEHICLE_CATEGORIES.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => set('category', category)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-[12.5px] transition-colors',
                            form.category === category
                              ? 'border-amber-500/50 bg-amber-500/12 text-amber-400'
                              : 'border-white/10 text-mist hover:border-white/25 hover:text-chalk',
                          )}
                        >
                          {CATEGORY_LABELS[category]}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field label="Gearbox">
                      <Select
                        value={form.transmission}
                        onChange={(event) => set('transmission', event.target.value)}
                      >
                        {TRANSMISSIONS.map((entry) => (
                          <option key={entry} value={entry}>
                            {entry === 'AUTOMATIC' ? 'Automatic' : 'Manual'}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Fuel">
                      <Select
                        value={form.fuelType}
                        onChange={(event) => set('fuelType', event.target.value)}
                      >
                        {FUEL_TYPES.map((entry) => (
                          <option key={entry} value={entry}>
                            {entry.charAt(0) + entry.slice(1).toLowerCase().replace('_', ' ')}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Seats">
                      <Select
                        value={form.seats}
                        onChange={(event) => set('seats', event.target.value)}
                      >
                        {[2, 4, 5, 7, 8, 9].map((entry) => (
                          <option key={entry} value={entry}>
                            {entry}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Doors">
                      <Select
                        value={form.doors}
                        onChange={(event) => set('doors', event.target.value)}
                      >
                        {[2, 3, 4, 5].map((entry) => (
                          <option key={entry} value={entry}>
                            {entry}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <Field label="Colour" className="mt-5">
                    <div className="flex flex-wrap gap-1.5">
                      {PAINT_OPTIONS.map((colour) => (
                        <button
                          key={colour}
                          type="button"
                          onClick={() => set('colour', colour)}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors',
                            form.colour === colour
                              ? 'border-amber-500/50 text-chalk'
                              : 'border-white/10 text-mist hover:border-white/25',
                          )}
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-white/20"
                            style={{ background: paintHex(colour) }}
                          />
                          {colour}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Registration"
                      error={state.errors?.licensePlate}
                      hint="Shown in full only on confirmed bookings."
                    >
                      <Input
                        value={form.licensePlate}
                        onChange={(event) => set('licensePlate', event.target.value.toUpperCase())}
                        placeholder={form.country === 'DE' ? 'B-KR 1234' : '123/G 4567'}
                        className="numeric uppercase"
                      />
                    </Field>
                    <Field label="Odometer (km)">
                      <Input
                        value={form.odometerKm}
                        onChange={(event) =>
                          set('odometerKm', event.target.value.replace(/\D/g, ''))
                        }
                        inputMode="numeric"
                        className="numeric"
                      />
                    </Field>
                  </div>
                </Card>
              ) : null}

              {step === 1 ? (
                <Card className="p-6 sm:p-7">
                  <h2 className="display text-xl text-chalk">Where does it live?</h2>
                  <p className="mt-2 text-[13px] text-mist">
                    Renters see the city and an approximate area. Your exact address is released
                    only once a booking is confirmed and paid.
                  </p>

                  <Field label="Market" className="mt-6">
                    <div className="grid grid-cols-2 gap-2">
                      {(['DE', 'LB'] as const).map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            set('country', code);
                            set('city', '');
                            set('cleaningFee', code === 'DE' ? '2000' : '1500');
                            set('includedKmPerDay', code === 'DE' ? '250' : '150');
                            if (code === 'LB') set('crossBorderAllowed', false);
                          }}
                          className={cn(
                            'rounded-xs border px-4 py-3 text-[13px] font-medium transition-colors',
                            form.country === code
                              ? 'border-amber-500/50 bg-amber-500/12 text-amber-400'
                              : 'border-white/10 text-mist hover:border-white/25',
                          )}
                        >
                          {code === 'DE' ? '🇩🇪 Germany' : '🇱🇧 Lebanon'}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="City" error={state.errors?.city} className="mt-5">
                    <Select value={form.city} onChange={(event) => set('city', event.target.value)}>
                      <option value="">Choose a city</option>
                      {country.cities.map((entry) => (
                        <option key={entry.name} value={entry.name}>
                          {entry.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    label="Exact address"
                    error={state.errors?.exactAddress}
                    hint="Street and number. Only confirmed renters ever see this."
                    className="mt-5"
                  >
                    <Input
                      value={form.exactAddress}
                      onChange={(event) => set('exactAddress', event.target.value)}
                      placeholder={
                        form.country === 'DE' ? 'Kastanienallee 12, Berlin' : 'Rue Gouraud, Beirut'
                      }
                    />
                  </Field>

                  <div className="mt-6 inset-note p-4">
                    <p className="text-[12.5px] font-medium text-chalk">
                      To list in {country.name} you will need
                    </p>
                    <ul className="mt-2 space-y-1">
                      {country.requiredVehicleDocuments.map((doc) => (
                        <li key={doc} className="text-[12.5px] text-mist">
                          {doc
                            .toLowerCase()
                            .replace(/_/g, ' ')
                            .replace(/^\w/, (character) => character.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-[11.5px] leading-relaxed text-slate-dim">
                      You can save the listing now and upload these afterwards — it stays unlisted
                      until they clear.
                    </p>
                  </div>
                </Card>
              ) : null}

              {step === 2 ? (
                <Card className="p-6 sm:p-7">
                  <h2 className="display text-xl text-chalk">What do you want to charge?</h2>
                  <p className="mt-2 text-[13px] text-mist">
                    This is your number. The suggestion below comes from comparable cars actually
                    listed near you — take it or ignore it.
                  </p>

                  {loadingSuggestion ? (
                    <div className="mt-6 h-24 animate-pulse rounded-xs bg-white/[0.04]" />
                  ) : suggestion ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 rounded-xs border border-amber-500/25 bg-amber-500/[0.07] p-4"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-amber-400" />
                        <p className="text-[12.5px] font-medium text-amber-400">
                          Comparable {CATEGORY_LABELS[form.category].toLowerCase()}s
                          {form.city ? ` in ${form.city}` : ''}
                        </p>
                      </div>
                      <p className="numeric mt-2 text-2xl font-bold text-chalk">
                        {formatMoney(money(suggestion.low, currency))} –{' '}
                        {formatMoney(money(suggestion.high, currency))}
                      </p>
                      <p className="mt-1.5 text-[11.5px] text-slate-dim">
                        From {suggestion.sampleSize} listing
                        {suggestion.sampleSize === 1 ? '' : 's'}, adjusted for a {form.year} car.
                      </p>
                    </motion.div>
                  ) : (
                    <p className="mt-6 text-[12.5px] text-slate-dim">
                      No comparable listings yet — you are setting the benchmark.
                    </p>
                  )}

                  <Field
                    label={`Daily rate (${currency})`}
                    error={state.errors?.dailyRate}
                    className="mt-6"
                  >
                    <Input
                      value={toMajor(form.dailyRate)}
                      onChange={(event) => set('dailyRate', toMinor(event.target.value))}
                      inputMode="decimal"
                      className="numeric text-lg"
                      placeholder="45"
                    />
                  </Field>

                  <Field
                    label={`What is the car worth? (${currency})`}
                    error={state.errors?.estimatedValue}
                    hint="Drives the deposit and the protection excess. An estimate is fine."
                    className="mt-5"
                  >
                    <Input
                      value={toMajor(form.estimatedValue)}
                      onChange={(event) => set('estimatedValue', toMinor(event.target.value))}
                      inputMode="decimal"
                      className="numeric"
                      placeholder="18000"
                    />
                  </Field>

                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 flex items-baseline justify-between">
                        <span className="record text-[11px] text-mist">
                          Weekly discount
                        </span>
                        <span className="numeric text-[13px] text-chalk">
                          {Math.round(Number(form.weeklyDiscount) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={0.35}
                        step={0.01}
                        value={form.weeklyDiscount}
                        onChange={(event) => set('weeklyDiscount', event.target.value)}
                        className="w-full accent-amber-500"
                      />
                    </div>
                    <div>
                      <div className="mb-2 flex items-baseline justify-between">
                        <span className="record text-[11px] text-mist">
                          Monthly discount
                        </span>
                        <span className="numeric text-[13px] text-chalk">
                          {Math.round(Number(form.monthlyDiscount) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={0.5}
                        step={0.01}
                        value={form.monthlyDiscount}
                        onChange={(event) => set('monthlyDiscount', event.target.value)}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field label={`Cleaning fee (${currency})`}>
                      <Input
                        value={toMajor(form.cleaningFee)}
                        onChange={(event) => set('cleaningFee', toMinor(event.target.value))}
                        inputMode="decimal"
                        className="numeric"
                      />
                    </Field>
                    <Field label="Kilometres included per day">
                      <Input
                        value={form.includedKmPerDay}
                        onChange={(event) =>
                          set('includedKmPerDay', event.target.value.replace(/\D/g, ''))
                        }
                        inputMode="numeric"
                        className="numeric"
                      />
                    </Field>
                  </div>
                </Card>
              ) : null}

              {step === 3 ? (
                <Card className="p-6 sm:p-7">
                  <h2 className="display text-xl text-chalk">Your rules</h2>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Field label="Minimum rental (days)">
                      <Input
                        value={form.minRentalDays}
                        onChange={(event) =>
                          set('minRentalDays', event.target.value.replace(/\D/g, ''))
                        }
                        inputMode="numeric"
                        className="numeric"
                      />
                    </Field>
                    <Field label="Maximum rental (days)" error={state.errors?.maxRentalDays}>
                      <Input
                        value={form.maxRentalDays}
                        onChange={(event) =>
                          set('maxRentalDays', event.target.value.replace(/\D/g, ''))
                        }
                        inputMode="numeric"
                        className="numeric"
                      />
                    </Field>
                    <Field
                      label="Notice you need (hours)"
                      hint="How long before pickup a request must arrive."
                    >
                      <Input
                        value={form.advanceNoticeHours}
                        onChange={(event) =>
                          set('advanceNoticeHours', event.target.value.replace(/\D/g, ''))
                        }
                        inputMode="numeric"
                        className="numeric"
                      />
                    </Field>
                    <Field
                      label="Turnaround buffer (hours)"
                      hint="Kept free between two trips to clean and check the car."
                    >
                      <Input
                        value={form.bufferHours}
                        onChange={(event) =>
                          set('bufferHours', event.target.value.replace(/\D/g, ''))
                        }
                        inputMode="numeric"
                        className="numeric"
                      />
                    </Field>
                  </div>

                  <Field label="Cancellation policy" className="mt-5">
                    <div className="space-y-2">
                      {CANCELLATION_POLICIES.map((policy) => {
                        const spec = POLICY_SPECS[policy];
                        return (
                          <button
                            key={policy}
                            type="button"
                            onClick={() => set('cancellationPolicy', policy)}
                            className={cn(
                              'flex w-full items-start gap-3 rounded-xs border p-4 text-left transition-colors',
                              form.cancellationPolicy === policy
                                ? 'border-amber-500/50 bg-amber-500/[0.08]'
                                : 'border-white/10 hover:border-white/25',
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                                form.cancellationPolicy === policy
                                  ? 'border-amber-500 bg-amber-500'
                                  : 'border-white/25',
                              )}
                            >
                              {form.cancellationPolicy === policy ? (
                                <Check size={9} className="text-ink-950" />
                              ) : null}
                            </span>
                            <span>
                              <span className="block text-[13px] font-medium text-chalk">
                                {spec.name}
                              </span>
                              <span className="mt-0.5 block text-[12px] text-slate-dim">
                                {spec.summary}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="House rules" className="mt-5">
                    <div className="space-y-2">
                      {[
                        { key: 'smokingAllowed' as const, label: 'Smoking allowed in the car' },
                        { key: 'petsAllowed' as const, label: 'Pets allowed' },
                        {
                          key: 'crossBorderAllowed' as const,
                          label:
                            form.country === 'DE'
                              ? 'May be driven into neighbouring EU countries'
                              : 'Cross-border travel — not permitted from Lebanon',
                          disabled: form.country === 'LB',
                        },
                      ].map((rule) => (
                        <label
                          key={rule.key}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-xs border border-white/[0.07] px-4 py-3',
                            rule.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                          )}
                        >
                          <span className="text-[13px] text-mist">{rule.label}</span>
                          <input
                            type="checkbox"
                            checked={form[rule.key]}
                            disabled={rule.disabled}
                            onChange={(event) => set(rule.key, event.target.checked)}
                            className="h-4 w-4 accent-amber-500"
                          />
                        </label>
                      ))}
                    </div>
                  </Field>
                </Card>
              ) : null}

              {step === 4 ? (
                <Card className="p-6 sm:p-7">
                  <h2 className="display text-xl text-chalk">Tell renters about it</h2>

                  <Field
                    label="Description"
                    error={state.errors?.description}
                    hint="What is it actually like to drive and live with?"
                    className="mt-6"
                  >
                    <Textarea
                      value={form.description}
                      onChange={(event) => set('description', event.target.value)}
                      placeholder="My daily Golf — easy to park, cheap on fuel, winter tyres from October. Handover at the S-Bahn if that is easier for you."
                      className="min-h-36"
                      maxLength={2000}
                    />
                  </Field>

                  <Field
                    label="Features"
                    hint="Comma separated — Apple CarPlay, roof rails, tow bar…"
                    className="mt-5"
                  >
                    <Input
                      value={form.features}
                      onChange={(event) => set('features', event.target.value)}
                      placeholder="Apple CarPlay, Parking sensors, Winter tyres"
                    />
                  </Field>

                  <div className="mt-6 flex items-start gap-2.5 inset-note p-4">
                    <Sparkles size={15} className="mt-px shrink-0 text-amber-400" />
                    <p className="text-[12.5px] leading-relaxed text-mist">
                      Saving creates the listing in{' '}
                      <span className="text-chalk">pending review</span>. Upload the{' '}
                      {country.requiredVehicleDocuments.length} required documents and it goes live
                      — and only then can anyone request it.
                    </p>
                  </div>
                </Card>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
          >
            <ArrowLeft size={14} />
            Back
          </Button>

          {last ? (
            <Button type="submit" size="lg" disabled={!stepValid || submitting}>
              {submitting ? 'Creating…' : 'Create the listing'}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}
              disabled={!stepValid}
            >
              Continue
              <ArrowRight size={14} />
            </Button>
          )}
        </div>
      </form>

      {/* Live preview */}
      <div className="lg:sticky lg:top-24">
        <Card className="overflow-hidden">
          <CarViewer
            bodyStyle={bodyStyleForCategory(form.category)}
            colour={paintHex(form.colour)}
            className="aspect-[4/3] bg-gradient-to-b from-white/[0.04] to-transparent"
          />
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-chalk">
                  {form.make || 'Your car'} {form.model}
                </h3>
                <p className="mt-0.5 truncate text-[12.5px] text-slate-dim">
                  {form.variant ? `${form.variant} · ` : ''}
                  {form.year} · {form.colour}
                </p>
              </div>
              {form.dailyRate ? (
                <div className="shrink-0 text-right">
                  <p className="numeric text-[17px] font-bold text-chalk">
                    {formatMoney(money(Number(form.dailyRate), currency), { compact: true })}
                  </p>
                  <p className="text-[11px] text-slate-dim">per day</p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge tone={form.country === 'DE' ? 'steel' : 'cedar'}>
                {country.flag} {form.city || country.name}
              </Badge>
              <Badge tone="neutral">{CATEGORY_LABELS[form.category]}</Badge>
              <Badge tone="neutral">
                {form.transmission === 'AUTOMATIC' ? 'Automatic' : 'Manual'}
              </Badge>
            </div>

            {Number(form.estimatedValue) > 0 ? (
              <p className="mt-4 border-t border-white/[0.06] pt-4 text-[12px] leading-relaxed text-slate-dim">
                The deposit on this car would be{' '}
                <span className="numeric text-chalk">{formatMoney(money(deposit, currency))}</span>,
                and you would keep{' '}
                <span className="numeric text-cedar-400">
                  {Math.round((1 - country.ownerCommissionRate) * 100)}%
                </span>{' '}
                of the rental.
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
