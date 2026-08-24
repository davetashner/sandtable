# 0010 — The type floor: nothing below 11px, and one mark that is not type

- **Status:** accepted
- **Date:** 2026-08-23
- **Bead:** `sand-neh.3`

## Context

The design review (`sand-1l0.15`, `docs/design-review.md`) walked seventeen
scenes × two themes × desktop and phone and audited the rendered DOM. Seven of
its eight defects were fixed there. The eighth was not a defect in any one
component: **`--fs-xs` renders at 10.5px**, it is the size of eyebrows,
credits, chips, gauge readouts, breadcrumbs, timeline tick and marker labels,
footnote references and media captions, and it is below the audit's 11px
legibility floor on every scene at every viewport. The review parked it as
"known and deliberate" and handed the question here, because the answer is
either "the instrument-panel voice is genuinely this small" or "the scale is
wrong" — and both are token decisions, not per-component patches.

The 10.5px came out of arithmetic rather than reading. The scale was declared
as "a 1.2 ratio from a 14.5px body", and 14.5 ÷ 1.2 ÷ 1.2 = 10.07, rounded up
to 10.5. That works upward, where a ratio buys hierarchy. Downward it walks
straight off the floor after two steps, and it did: two of the eight rungs
were unreadable at arm's length, one of them (`--fs-xs`) carrying most of the
instrument panel — 48 rules across fifteen stylesheets.

Worse, the scale was not actually the authority. Alongside the token, the
component CSS had accumulated twenty-three literal font sizes at 9, 10, 10.5
and 11px doing exactly the same job: `.eyebrow` at 11px next to
`.card__eyebrow` at 10.5, the crumbs at 11.5 shrinking to 10.5 on a phone, the
same footnote reference written three times in three files. A floor that lives
in one token is worth nothing while a dozen components size themselves by
hand.

## Decision

**11px is a floor, not a target.** The ratio governs the scale upward from the
body size; below the body size the floor governs and the steps compress.

| Token       | was           | now        | Use                                                  |
| ----------- | ------------- | ---------- | ---------------------------------------------------- |
| `--fs-xs`   | 10.5px        | **11.5px** | eyebrows, credits, chips, readouts, crumbs, captions |
| `--fs-sm`   | 12px          | **12.5px** | meta lines, sources, secondary prose                 |
| `--fs-md` … | 14.5px upward | unchanged  | body and up — a ≈1.2 ratio, as before                |

`--fs-sm` moves with `--fs-xs` so the bottom of the scale keeps a step at all;
11.5 against 12 would have been two rungs with the same size and no reason to
exist. The two now sit 1.09 apart in size and further apart in voice: `xs` is
mono, uppercase and tracked out — the instrument panel — while `sm` is
sentence case.

Three rules follow, and they are what makes the floor real:

1. **Nothing in the app is smaller than `--fs-xs`.** A literal `font-size`
   below it is a bug. Twenty-two of the twenty-three literals
   are gone: every one that was the instrument voice now reads
   `var(--fs-xs)`, and the hand-written
   `letter-spacing: 0.12em`/`0.14em` beside them now reads
   `var(--track-eyebrow)`.
2. **The floor governs type — what a reader reads as words.** A glyph standing
   alone as an icon is sized to its frame. Exactly one thing in the app is
   below the floor under this rule: the aria-hidden `?` in the branch toggle's
   14px ring (`.branch-toggle__mark`, 9px), which is the hypothetical mark and
   is never read as a word. It is commented as such.
3. **The phone does not get smaller type.** The one override that shrank the
   breadcrumb below the floor at ≤ 699px is deleted. Small screens are held
   further away, not closer.

The component gallery (`gallery.html`, `src/gallery/`) is where this is
reviewed: every component in both themes on one page, so a change to the
bottom of the scale can be read rather than reasoned about.

## Alternatives considered

- **Keep 10.5px and write the justification.** The honest version of this
  argument is that a war room's instrument panel is finely engraved and the
  reader leans in. It does not survive contact with the medium: the reader is
  not leaning into a phone held at arm's length in daylight, the eyebrows
  carry the only labels some panels have, and IBM Plex Mono at 10.5px
  uppercase and tracked out loses its counters on a 1× display. "Deliberate"
  is not a defence when the same defect appears on every scene.
- **Raise the audit's floor to 10.5px instead.** Moving the ruler to fit the
  wall. The 11px floor is the one the audit was written around and the one
  every accessibility review will apply next.
- **Patch the components the audit flagged.** What the review explicitly
  refused, and rightly: the same size would have grown back through the next
  component, because the token still said 10.5.
- **Retire `--fs-xs` and let the instrument panel use `--fs-sm`.** Tempting —
  one fewer rung — but 48 rules would have jumped 12.5/10.5 = 19%, which is a
  visual redesign of every panel, and the design does want a step below the
  meta line.
- **Move the whole scale up (body 15 or 16px).** A larger change than the
  defect warrants, and it would push the dossier's line count past what the
  340px column holds. The body size stays 14.5px.

## Consequences

- `src/styles/tokens.ts` is the only place either size is written;
  `npm run tokens` regenerates `tokens.css` and the drift test guards it.
- Everything sized `var(--fs-xs)` grew by 1px: eyebrows, gauge readouts,
  timeline tick and marker labels, chips, captions, credits, footnote
  references. The timeline band label keeps its 22px line box, so the band
  geometry is unchanged.
- `docs/design-review.md`'s "known and deliberate" 10.5px entry is closed by
  this record; a re-run of `scripts/visual-review.mjs` should report no
  `tiny-text` other than the branch-toggle mark.
- The generated token CSS now scopes the two `[data-theme]` blocks to any
  element rather than `:root`, so a subtree can open a theme. That is what
  lets the gallery show both themes side by side; the app's behaviour is
  unchanged.
- Type sizes that are neither the floor nor the scale — 13px, 13.5px, 15px,
  15.5px literals in the dossier, the tour and the cards — are still out
  there. They are legible and out of scope here; the sweep that puts the whole
  library on the scale is its own story.
