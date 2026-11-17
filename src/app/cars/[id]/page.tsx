import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  BadgeCheck,
  Ban,
  CalendarDays,
  Check,
  Cigarette,
  Dog,
  Fuel,
  Gauge,
  MapPin,
  Route,
  Star,
  Users,
} from 'lucide-react';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { CarViewer } from '@/components/three/CarViewer';
import { bodyStyleForCategory } from '@/lib/body-style';
import { paintHex } from '@/lib/paint';
import { BookingPanel, type ExtraOption } from '@/components/cars/BookingPanel';
import { AvailabilityCalendar } from '@/components/cars/AvailabilityCalendar';
import { Badge, Container, Divider } from '@/components/ui';
import { getCountry } from '@/lib/domain/countries';
import { EXTRA_CATALOGUE } from '@/lib/domain/pricing';
import { POLICY_SPECS } from '@/lib/domain/cancellation';
import { formatMoney, money } from '@/lib/domain/money';
import { assessOwner } from '@/lib/domain/risk';
import { parseJson, toOwnerSignals } from '@/lib/server/mappers';
import type { CancellationPolicy, CountryCode } from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

async function loadVehicle(id: string) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      owner: true,
      blocks: true,
      documents: true,
      reviews: {
        where: { publishedAt: { not: null } },
        include: { author: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: { make: true, model: true, year: true, city: true },
  });
  if (!vehicle) return { title: 'Car not found' };
  return {
    title: `${vehicle.make} ${vehicle.model} (${vehicle.year}) in ${vehicle.city}`,
  };
}

function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function CarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const vehicle = await loadVehicle(id);
  if (!vehicle || vehicle.status !== 'LISTED') notFound();

  const country = getCountry(vehicle.country as CountryCode);
  const currency = country.currency;
  const hex = paintHex(vehicle.colour);
  const features = parseJson<string[]>(vehicle.features, []);
  const rating = vehicle.ratingCount > 0 ? vehicle.ratingSum / vehicle.ratingCount : null;
  const reliability = assessOwner(toOwnerSignals(vehicle.owner));
  const policy = POLICY_SPECS[vehicle.cancellationPolicy as CancellationPolicy];

  const extras: ExtraOption[] = EXTRA_CATALOGUE[vehicle.country as 'DE' | 'LB']
    .filter((spec) => spec.price > 0)
    .map((spec) => ({
      code: spec.code,
      label: spec.label,
      description: spec.description,
      billing: spec.billing,
      price: spec.price,
      maxQuantity: spec.maxQuantity,
    }));

  const defaultFrom = query.from ?? isoDaysFromNow(7);
  const defaultTo = query.to ?? isoDaysFromNow(7 + Math.max(2, vehicle.minRentalDays));

  const specs = [
    { icon: Users, label: `${vehicle.seats} seats` },
    { icon: Gauge, label: vehicle.transmission === 'AUTOMATIC' ? 'Automatic' : 'Manual' },
    {
      icon: Fuel,
      label: vehicle.fuelType.charAt(0) + vehicle.fuelType.slice(1).toLowerCase().replace('_', ' '),
    },
    { icon: Route, label: `${vehicle.includedKmPerDay} km/day included` },
  ];

  return (
    <>
      <SiteHeader user={user} />

      <main className="pt-28 sm:pt-32">
        <Container>
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={vehicle.country === 'DE' ? 'steel' : 'cedar'}>
                  <MapPin size={11} />
                  {vehicle.city}, {country.name}
                </Badge>
                {rating !== null ? (
                  <span className="inline-flex items-center gap-1 text-[12.5px]">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span className="numeric font-medium text-chalk">{rating.toFixed(1)}</span>
                    <span className="text-slate-dim">({vehicle.ratingCount} reviews)</span>
                  </span>
                ) : null}
                <span className="text-[12.5px] text-slate-dim">
                  {vehicle.tripCount} {vehicle.tripCount === 1 ? 'trip' : 'trips'}
                </span>
              </div>

              <h1 className="display mt-3 text-[clamp(1.9rem,4.4vw,3rem)] text-chalk">
                {vehicle.make} {vehicle.model}
              </h1>
              <p className="mt-1.5 text-[14px] text-mist">
                {vehicle.variant ? `${vehicle.variant} · ` : ''}
                {vehicle.year} · {vehicle.colour}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_368px] lg:items-start">
            <div className="min-w-0">
              <CarViewer
                bodyStyle={bodyStyleForCategory(vehicle.category)}
                colour={hex}
                className="aspect-[16/10] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent"
              />

              {/* Specs */}
              <ul className="mt-6 grid grid-cols-2 border-y border-[var(--hairline)] sm:grid-cols-4">
                {specs.map((spec, index) => {
                  const Icon = spec.icon;
                  return (
                    <li
                      key={spec.label}
                      className={
                        'flex items-center gap-2.5 py-4 ' +
                        (index % 2 === 1 ? 'pl-4 ' : '') +
                        (index > 0 ? 'border-l border-[var(--hairline)] pl-4 ' : '') +
                        (index === 2 ? 'border-l-0 pl-0 sm:border-l sm:pl-4 ' : '')
                      }
                    >
                      <Icon size={15} className="shrink-0 text-amber-400" />
                      <span className="text-[13px] text-chalk">{spec.label}</span>
                    </li>
                  );
                })}
              </ul>

              {/* Description */}
              <section className="mt-10">
                <h2 className="display text-xl text-chalk">From the owner</h2>
                <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-mist">
                  {vehicle.description}
                </p>
              </section>

              {/* Owner */}
              <section className="surface mt-8 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-500 text-lg font-bold text-ink-950">
                    {vehicle.owner.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-semibold text-chalk">
                        {vehicle.owner.fullName.split(' ')[0]}
                      </h3>
                      {vehicle.owner.verificationStatus === 'VERIFIED' ? (
                        <Badge tone="cedar">
                          <BadgeCheck size={11} />
                          Verified
                        </Badge>
                      ) : null}
                      {reliability.badge === 'SUPERHOST' ? (
                        <Badge tone="amber">Superhost</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[12px] text-slate-dim">
                      Member since{' '}
                      {vehicle.owner.createdAt.toLocaleDateString('en-GB', {
                        month: 'long',
                        year: 'numeric',
                      })}
                      {vehicle.owner.ownerType === 'BUSINESS' ? ' · Registered business' : ''}
                    </p>
                    {vehicle.owner.bio ? (
                      <p className="mt-3 text-[13.5px] leading-relaxed text-mist">
                        {vehicle.owner.bio}
                      </p>
                    ) : null}
                    {reliability.highlights.length > 0 ? (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {reliability.highlights.slice(0, 4).map((highlight) => (
                          <li
                            key={highlight}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11.5px] text-mist"
                          >
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </section>

              {/* Features */}
              {features.length > 0 ? (
                <section className="mt-10">
                  <h2 className="display text-xl text-chalk">What is included</h2>
                  <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-[13.5px] text-mist">
                        <Check size={14} className="shrink-0 text-cedar-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {/* Rules */}
              <section className="mt-10">
                <h2 className="display text-xl text-chalk">House rules</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      icon: Cigarette,
                      label: vehicle.smokingAllowed ? 'Smoking allowed' : 'No smoking',
                      allowed: vehicle.smokingAllowed,
                    },
                    {
                      icon: Dog,
                      label: vehicle.petsAllowed ? 'Pets welcome' : 'No pets',
                      allowed: vehicle.petsAllowed,
                    },
                    {
                      icon: Route,
                      label: vehicle.crossBorderAllowed
                        ? `Cross-border allowed (${country.crossBorderAllowed.slice(0, 5).join(', ')}…)`
                        : 'No cross-border travel',
                      allowed: vehicle.crossBorderAllowed,
                    },
                    {
                      icon: CalendarDays,
                      label: `${vehicle.minRentalDays}–${vehicle.maxRentalDays} day rentals`,
                      allowed: true,
                    },
                  ].map((rule) => {
                    const Icon = rule.icon;
                    return (
                      <div
                        key={rule.label}
                        className="flex items-center gap-3 rounded-xs border border-white/[0.07] px-4 py-3"
                      >
                        <Icon
                          size={15}
                          className={rule.allowed ? 'text-cedar-400' : 'text-slate-dim'}
                        />
                        <span className="text-[13px] text-mist">{rule.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 inset-note p-4">
                  <p className="text-[12.5px] font-medium text-chalk">
                    Distance: {vehicle.includedKmPerDay} km per day included
                  </p>
                  <p className="mt-1 text-[12px] text-slate-dim">
                    Beyond that, {formatMoney(money(vehicle.extraKmPrice, currency))} per extra
                    kilometre. Unlimited distance can be added as an extra.
                  </p>
                </div>
              </section>

              {/* Cancellation */}
              <section className="mt-10">
                <h2 className="display text-xl text-chalk">If you need to cancel</h2>
                <p className="mt-2 text-[13.5px] text-mist">
                  {policy.name} policy — {policy.summary}
                </p>
                <ul className="mt-4 space-y-2">
                  {policy.tiers.map((tier) => (
                    <li
                      key={tier.label}
                      className="flex items-center justify-between gap-4 rounded-xs border border-white/[0.07] px-4 py-3 text-[13px]"
                    >
                      <span className="text-mist">{tier.label}</span>
                      <span
                        className={
                          tier.refundRate === 1
                            ? 'text-cedar-400'
                            : tier.refundRate === 0
                              ? 'text-danger'
                              : 'text-warn'
                        }
                      >
                        {Math.round(tier.refundRate * 100)}% refunded
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[12px] leading-relaxed text-slate-dim">
                  {country.withdrawalRight.note}
                </p>
              </section>

              {/* Availability */}
              <section className="mt-10">
                <h2 className="display text-xl text-chalk">Availability</h2>
                <p className="mt-2 text-[13.5px] text-mist">
                  The owner keeps {vehicle.bufferHours} hours between trips and needs{' '}
                  {vehicle.advanceNoticeHours} hours&rsquo; notice.
                </p>
                <div className="mt-5">
                  <AvailabilityCalendar
                    blocks={vehicle.blocks.map((block) => ({
                      start: block.start.toISOString(),
                      end: block.end.toISOString(),
                      reason: block.reason,
                    }))}
                    rules={{
                      bufferHours: vehicle.bufferHours,
                      advanceNoticeHours: vehicle.advanceNoticeHours,
                      bookingHorizonDays: vehicle.bookingHorizonDays,
                      minRentalDays: vehicle.minRentalDays,
                      maxRentalDays: vehicle.maxRentalDays,
                      blockedWeekdays: vehicle.blockedWeekdays
                        .split(',')
                        .map(Number)
                        .filter((value) => Number.isInteger(value)),
                      pickupWindow: [vehicle.pickupWindowStart, vehicle.pickupWindowEnd],
                    }}
                  />
                </div>
              </section>

              {/* Legal notes */}
              <section className="mt-10">
                <h2 className="display text-xl text-chalk">
                  What applies in {country.name}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {country.legalNotes.map((note) => (
                    <li key={note} className="flex gap-2.5 text-[13px] leading-relaxed text-mist">
                      <Check size={14} className="mt-0.5 shrink-0 text-cedar-400" />
                      {note}
                    </li>
                  ))}
                  <li className="flex gap-2.5 text-[13px] leading-relaxed text-mist">
                    <Ban size={14} className="mt-0.5 shrink-0 text-danger" />
                    Driving into {country.crossBorderForbidden.slice(0, 4).join(', ')} voids all
                    protection.
                  </li>
                </ul>
              </section>

              <Divider className="my-12" />

              <p className="text-[12px] text-slate-dim">
                Registration {vehicle.licensePlate.slice(0, 2)}•• is shown in full once a booking is
                confirmed, along with the exact pickup address.
              </p>
            </div>

            {/* Booking surface */}
            <div className="lg:sticky lg:top-24">
              <BookingPanel
                vehicleId={vehicle.id}
                currency={currency}
                dailyRate={vehicle.dailyRate}
                minRentalDays={vehicle.minRentalDays}
                cancellationPolicy={policy.name}
                extras={extras}
                defaultFrom={defaultFrom}
                defaultTo={defaultTo}
                signedIn={Boolean(user)}
              />

              <p className="mt-4 px-2 text-center text-[11.5px] leading-relaxed text-slate-dim">
                <Link href="/protection" className="text-mist hover:text-chalk hover:underline">
                  How protection works
                </Link>
                {' · '}
                <Link href="/how-it-works" className="text-mist hover:text-chalk hover:underline">
                  How booking works
                </Link>
              </p>
            </div>
          </div>
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}
