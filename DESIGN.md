# KarRent — design system

What is actually in the code, and why. If you are about to add a surface, read
the **Forms** and **Refusals** sections first: most of the work in this system
went into *not* reaching for the default shape.

---

## The scene

An owner in Beirut, in bed at eleven at night, gets a notification that a
stranger wants their car tomorrow. They have to read a risk profile and decide
— on a phone, without turning the light on.

That scene forces the rest: a dark surface, text that stays legible at small
sizes, and numerals you can read at a glance. It is not "dark mode because
tools look good dark".

---

## Colour

**Strategy: restrained.** Tinted neutrals plus one accent. Amber carries every
primary action and nothing else.

A cool-cast near-black ramp (`ink-950` → `ink-600`), all at hue 262 with chroma
rising from 0.008 to 0.016 — the tint leans toward the brand's own hue rather
than defaulting warm.

### The two market colours are functional

`steel` always means Germany. `cedar` always means Lebanon. They appear nowhere
else and never decoratively. A reader who learns the pairing once can read any
market split in the product without a legend.

### Contrast is measured, not estimated

Every text colour against every surface it is allowed to sit on:

| | ink-950 | ink-900 | ink-850 |
|---|---|---|---|
| `chalk` | 18.16 | 17.32 | 15.49 |
| `mist` | 11.07 | 10.56 | 9.44 |
| `slate-dim` | 6.92 | 6.60 | 5.90 |
| `amber-400` | 12.71 | 12.13 | 10.84 |
| `amber-500` | 10.07 | 9.61 | 8.59 |
| `cedar-400` | 13.10 | 12.50 | 11.18 |
| `steel-400` | 9.62 | 9.18 | 8.21 |

Worst case in the system is 5.90:1 — comfortably past the 4.5:1 body-text
threshold. `slate-dim` carries most of the small metadata in the product, so it
is held to body-text contrast rather than treated as a decorative grey. If you
add a text colour, verify it against `ink-850`, the lightest surface body text
ever sits on.

> Note when auditing in the browser: Chromium returns authored `oklch()`
> verbatim from `getComputedStyle`, so regex colour parsing silently fails.
> Resolve colours through a canvas `fillStyle` / `getImageData` round-trip.

---

## Type

**Archivo** (variable, `wdth` axis) and **JetBrains Mono**. One sans in multiple
weights and widths, paired against a mono on a genuine contrast axis — not two
sans faces that are similar but not identical.

Four classes carry the whole system:

| class | job |
|---|---|
| `.display` | headings — `wdth` 112, `-0.021em`, `text-wrap: balance` |
| `.display-tight` | sub-headings — `wdth` 100, `-0.015em` |
| `.numeric` | figures — tabular, `-0.02em` so a column reads as one block |
| `.record` | machine-record labels — always 10–12px, `+0.02em` |

Display sits at `-0.021em`. The floor is about `-0.04em` — tighter than that
and the letters start to touch, which reads as cramped rather than designed.

`.numeric` and `.record` share the mono face but not the tracking, and the split
is deliberate: figures want tightening, 11px labels want air.

### Mono is a second voice, not a numeral style

It marks machine-written record data — prices, references, plates, state names,
timestamps — apart from human prose. If a human wrote it, it is not mono.

**On the zero:** JetBrains Mono carries a centre dot in the default glyph and
exposes nothing that removes it. `"zero"` and every stylistic set `ss01`–`ss20`
render an identical glyph — measured, not assumed. Do not add a rule claiming
to turn it off; there was one here and it was dead code.

### Measure

`.lede` caps at 62ch, `.prose-measure` at 68ch. Long prose gets
`text-wrap: pretty`, headings get `text-wrap: balance`.

---

## Surfaces

| class | background | border |
|---|---|---|
| `.surface` | `ink-900` | hairline |
| `.surface-raised` | `ink-880` | hairline |
| `.surface-sunken` | `oklch(0.125 …)` | hairline |
| `.inset-note` | `ink-950` | **none** |
| `.glass-nav` | blurred | hairline |

**Radii top out at 14px on panels.** Anything rounder reads as a toy, and this
product is closer to a registration document than a game.

**Nested cards are always wrong.** A bordered box inside a bordered card is the
tell. When a note needs to be set apart *inside* a card, use `.inset-note`: it
recesses to the page colour with no border, so it reads as a window cut through
the card rather than another card stacked on it.

**Glass is earned, once.** `.glass-nav` is the only blurred surface in the
system, and it earns it by floating over a live 3D scene. Nothing else gets it.

---

## Forms

The most important decisions in this system are about *shape*, not style. A row
of identical cards is the lazy answer to almost every content problem, and it
was the wrong answer in all four of these places:

| content | form it takes | why not cards |
|---|---|---|
| Protection tiers | comparison table | the reader's task is *comparing*; cards force them to hold three lists in their head |
| Germany vs Lebanon | row-by-row comparison | same attribute, two markets — the eye should travel across, not down two columns |
| How it works | numbered timeline | it genuinely is a sequence, and the order carries the point (step 3 is the one you don't control) |
| What a host keeps | definition rows | term + explanation is a definition list, so use one |

Numbers appear on the timeline because that section *is* ordered. They are not
scaffolding — `01 / 02 / 03` above every section is the eyebrow trope one tier
deeper.

---

## Motion

Reveals **enhance an already-visible default**. They never gate visibility.

Three things make that true, and all three are load-bearing:

1. `Reveal` / `Stagger` carry a 1600ms failsafe timer — if `useInView` never
   fires (hidden tab, headless renderer, a viewport that never intersects), the
   content shows anyway.
2. Every revealed element carries `data-reveal`, and a `<noscript>` block in the
   layout forces them visible with no JS at all.
3. `prefers-reduced-motion` short-circuits to the shown state.

Ease out on exponential curves (`--ease-out-expo`, `--ease-out-quint`). No
bounce, no elastic.

**Never use `AnimatePresence mode="wait"` for a step that must stay on screen.**
It empties the container between steps; a container with a fixed `min-h` and a
keyed child that remounts in the same commit does not.

---

## Stacking

Semantic, never arbitrary:

```
--z-base 0 · --z-raised 10 · --z-sticky 20 · --z-overlay 30
--z-nav 40 · --z-modal 50 · --z-toast 60 · --z-tooltip 70
```

There is no `9999` in this codebase. Keep it that way.

---

## Refusals

Things that were removed from this codebase and should not come back:

- **Gradient text** (`background-clip: text`). Emphasis comes from weight, size
  or a single solid colour.
- **Tiny uppercase tracked eyebrows above every section.** One deliberate named
  kicker is voice; an eyebrow on every heading is AI grammar. `SectionHeading`
  deliberately has no `eyebrow` prop — every usage that had one was restating
  the heading directly beneath it.
- **The hero-metric template** (big number, small label, supporting stats). The
  home page had four of these; a marketplace this size has small numbers, and a
  hero metric reading "20 cars" argues against the product. The honest version
  states inventory in a line of prose. *Counts in the ops console are a
  different thing — that is a working queue, not a brag.*
- **Identical card grids.** See **Forms**.
- **Nested cards.** See **Surfaces**.
- **`border: 1px` + `box-shadow` ≥16px blur on the same element.** Pick one.
- **`border-radius` ≥ 32px on cards.** See **Surfaces**.
- **Decorative glassmorphism.** See **Surfaces**.

---

## Invariants

These held when the design pass landed and should keep holding:

- Every route returns clean with no console errors.
- No contrast failure on any audited route.
- **0px horizontal scroll** at 390 / 768 / 1360. Note that `/` and `/protection`
  report an `html` `scrollWidth` wider than the viewport — that is the deliberate
  hero bleed, which `overflow-x: hidden` on `body` exists to clip. Measure whether
  the page *scrolls*, not what `scrollWidth` reports.
- Grid items default to `min-width: auto`, which lets a track blow past its
  container. Any grid holding content that can be wide needs explicit
  `minmax(0, 1fr)` and `min-w-0` on the item. This is what caused a 736px
  dashboard inside a 390px viewport.
- The footer hands its link columns to the parent grid at `lg`, not `md` — four
  across at 768px wraps every label in the Trust column.
