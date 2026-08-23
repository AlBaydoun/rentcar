# KarRent

A peer-to-peer car rental marketplace for **Germany** and **Lebanon**. Owners
list their own cars, set their own price, and decide personally who is allowed
to drive them. Renters verify their documents once and can then book in either
country.

The organising principle is the approval gate: **nothing is charged until an
owner has said yes, and nothing is captured until the keys actually change
hands.** Everything else — the pricing engine, the risk score, the calendar,
the inspection record — exists to make that decision a well-informed one.

---

## Quick start

```bash
npm install
cp .env.example .env          # SQLite + a dev signing secret
npx prisma db push            # create the schema
npm run db:seed               # 20 cars, 11 accounts, bookings mid-lifecycle
npm run dev                   # http://localhost:3000
```

### Seeded accounts

Password for all of them: `karrent2026`

| Email | Role |
| --- | --- |
| `lukas@example.de` | Owner, Germany — 41 trips hosted |
| `sophie@example.de` | Owner, Germany — requests waiting for a decision |
| `karim@example.lb` | Owner, Lebanon — 88 trips hosted |
| `amira@example.com` | Renter, Germany — verified, 12 trips |
| `omar@example.lb` | Renter, Lebanon — verified, 19 trips |
| `admin@karrent.app` | Operations — document review queue |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm test` | Domain test suite (152 tests, no database needed) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:reset` | Drop, recreate and reseed the database |
| `npm run db:studio` | Prisma Studio |

---

## The booking lifecycle

Every state change in the system goes through one guarded state machine
(`src/lib/domain/booking-state-machine.ts`). No code path anywhere mutates a
booking's status directly.

```
DRAFT
  └─ SUBMIT_REQUEST (renter)
PENDING_DOCUMENTS                    ← eligibility checked before the owner is disturbed
  └─ DOCUMENTS_COMPLETED (system)
AWAITING_OWNER_APPROVAL              ← owner sees a verified profile + explainable risk score
  ├─ OWNER_REQUEST_DOCUMENTS → DOCUMENTS_REQUESTED → back here
  ├─ OWNER_DECLINE           → DECLINED    (reason required)
  ├─ EXPIRE                  → EXPIRED     (response window closes)
  └─ OWNER_APPROVE
APPROVED_AWAITING_PAYMENT            ← card AUTHORISED, not captured
  └─ PAYMENT_AUTHORIZED
CONFIRMED                            ← calendar blocks, deposit held, exact address revealed
  └─ START_HANDOVER
HANDOVER_PENDING                     ← joint walk-around, both signatures required
  └─ HANDOVER_COMPLETED              ← payment CAPTURED here, and only here
ACTIVE
  └─ START_RETURN
RETURN_PENDING
  └─ RETURN_COMPLETED
COMPLETED                            ← deposit released, payout scheduled, reviews requested
```

Three invariants are enforced by the machine and covered by tests:

- No edge authorises payment from a state the owner has not approved.
- The only edge that captures payment is `HANDOVER_PENDING → ACTIVE`.
- The exact address is revealed on exactly one edge, into `CONFIRMED`.

---

## Domain layer

`src/lib/domain/` is pure TypeScript — no Prisma, no React, no I/O. It is the
part worth reading first.

| Module | Responsibility |
| --- | --- |
| `countries.ts` | Everything that differs between DE and LB: VAT treatment, licence recognition, statutory insurance, deposits, payout rails, seasons, seasonal legal requirements |
| `money.ts` | Integer minor units, lossless allocation, VAT extraction, a zero-decimal Lebanese pound |
| `pricing.ts` | Itemised quotes — per-day season and weekend rates, lead time, demand, duration discounts, extras, surcharges, service fee, VAT, deposit, owner payout |
| `insurance.ts` | Three protection tiers priced off vehicle value, category risk and renter risk |
| `documents.ts` | Renter eligibility and vehicle compliance; licence tenure, expiry against the trip window, name matching, IDP requirements |
| `risk.ts` | Explainable 0–100 renter scoring with per-factor attribution; owner reliability scoring |
| `availability.ts` | Half-open interval conflict detection, turnaround buffers, calendar building, utilisation → demand index |
| `booking-state-machine.ts` | The lifecycle above, with guards and effects |
| `cancellation.ts` | Policy ladders, grace windows, asymmetric owner penalties |
| `inspection.ts` | Handover/return records, damage estimation, return settlement |
| `ledger.ts` | Double-entry entries that balance to zero, payout scheduling, authorisation validity |

### Two markets, modelled rather than approximated

|  | 🇩🇪 Germany | 🇱🇧 Lebanon |
| --- | --- | --- |
| Settlement currency | EUR | USD (lira shown at the official peg) |
| VAT | 19% Umsatzsteuer | 11% |
| Commission / service fee | 15% / 10% | 12% / 8% |
| Statutory cover | Kfz-Haftpflichtversicherung — injury **and** property | Bodily injury only; property damage is uninsured by law |
| Foreign licences | EU/EEA accepted outright; others need an IDP and must convert after 6 months (§ 29 FeV) | Visitors on home licence + IDP for 3 months; GCC accepted without |
| Seasonal duty | Winter tyres, § 2 Abs. 3a StVO | Valid Mécanique certificate |
| Payouts | SEPA, no fee, 2 days | Whish / OMT / bank transfer, 3 days |
| Peak season | Summer, Christmas, Oktoberfest | Diaspora summer, Christmas |

### Pricing

A quote is an ordered list of `PriceLine`s where every figure traces back to a
rule. Nothing in the UI recomputes a price — it renders what the engine
returns, which is what keeps the renter's total, the owner's payout and the
ledger reconcilable.

Order: per-day base (season × weekend × demand × lead time) → duration
discount → promotion → protection → extras → young-driver surcharge →
delivery → cleaning → cross-border → service fee → VAT → deposit → owner
payout.

Protection premiums and platform extras never touch the owner's balance;
promotions are funded by the platform, so a discount never reduces what the
owner earns.

---

## Architecture

```
src/
├─ app/                     Next.js App Router
│  ├─ page.tsx              Landing — 3D hero, live marketplace stats
│  ├─ search/               Filters, sorting, date-aware availability
│  ├─ cars/[id]/            3D viewer, availability grid, live-quoting panel
│  ├─ dashboard/
│  │  ├─ page.tsx           Renter trips
│  │  ├─ cars/new/          Listing wizard with a live 3D preview
│  │  ├─ trips/[id]/        Trip detail, payment, cancellation
│  │  ├─ trips/[id]/inspection/   Joint walk-around with 3D damage pinning
│  │  ├─ owner/             Request inbox
│  │  └─ owner/bookings/[id]/     The approval screen
│  ├─ admin/                Document review queue
│  └─ api/quote/            Live pricing for the booking panel
├─ lib/
│  ├─ domain/               Pure rules (above)
│  ├─ server/               Prisma ↔ domain mappers, booking orchestration, search
│  ├─ actions/              Server actions
│  └─ auth/                 Sessions
└─ components/
   ├─ three/                3D — procedural car, stage, viewer, damage inspector
   ├─ motion/               Reveal, Stagger, Magnetic, Counter, Parallax, TiltCard…
   ├─ cars/  search/  dashboard/  home/  ui/
```

### 3D, with zero downloaded assets

The car is generated in code: two extruded side profiles (body and glasshouse)
per body style, plus wheels, rims, arches, emissive lamps and shut lines. The
environment map is rendered in-scene from `Lightformer` planes rather than
fetched as an HDRI. Nothing in the 3D layer depends on the network, so it
cannot half-load.

The same five profiles drive a 2D SVG silhouette used on cards, so a car looks
like itself in the search grid and in the viewer — a search page cannot afford
twenty WebGL canvases.

`SceneCanvas` guards for missing WebGL and `prefers-reduced-motion`, and caps
device pixel ratio at 2.

### Motion

Every primitive in `components/motion/primitives.tsx` checks
`useReducedMotion` and degrades to a plain, fully-visible element. Motion is
decoration; content is never hidden behind an animation that might not run.

---

## Listing a car

`/dashboard/cars/new` is a five-step wizard — the car, where it lives, the
price, the rules, the listing copy. Two things about it are worth calling out:

- The 3D preview updates as the owner picks a category and a colour, so they
  are looking at their own car by the time they set a price on it.
- The suggested price range comes from `suggestDailyRate` run against real
  comparable listings in the same city (falling back to the whole market when
  there are fewer than three), depreciated for the car's age. It is a
  suggestion the owner can ignore — nothing overrides what they type.

A new listing is created as `PENDING_REVIEW` with placeholder rows for the
documents its market requires, and cannot be booked until those clear.

## Privacy decisions worth knowing

- **Owners never see document scans.** They see which checks passed, the
  issuing country, the expiry month, and a risk score with every contributing
  factor named and weighted.
- **Approximate location until commitment.** Listings expose jittered
  coordinates and a city. The exact address, registration and owner's phone
  number are released on exactly one state transition — into `CONFIRMED`.
- **Risk scores are explainable by construction.** `assessRisk` returns an
  array of factors, each with points and a sentence, because an owner handing
  over their own car needs to be able to disagree with the reasoning.

---

## Testing

```bash
npm test
```

152 tests over the domain layer, needing no database: money arithmetic and
allocation, day counting and grace periods, seasonal and market differences,
cross-border rules, eligibility edge cases (licence expiring mid-trip, name
mismatch, IDP requirements, premium-category minimums), availability buffers,
state-machine invariants, cancellation ladders, return settlement caps, and
double-entry ledger balance.

---

## Production notes

This runs on SQLite for local development. To deploy:

1. Point `DATABASE_URL` at PostgreSQL and change the `provider` in
   `prisma/schema.prisma`. The schema avoids native enums and arrays
   specifically so this is a one-line change.
2. Set a real `AUTH_SECRET` (`openssl rand -base64 48`).
3. Replace the mock payment adapter. `src/lib/domain/ledger.ts` already models
   authorisation/capture separately and knows authorisations expire after
   seven days — `needsReauthorization()` is the hook for the re-auth job.
4. Wire real document capture and storage. `autoScreenDocument` runs the cheap
   checks; the admin queue is where a human takes over.
5. Schedule `expireStaleRequests()` so unanswered requests release the
   calendar.
