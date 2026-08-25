# Design review — the Phase 1 polish pass

The checklist behind `sand-1l0.15`: the pass over the finished 1914 campaign
for spacing and type scale, map label collisions, token legibility at every
zoom, transitions, loading and empty states, in both themes and on a phone.
Tokens and the identity they come from are `docs/design.md`; the information
architecture is ADR 0006.

## Two walks, one scene list

The checklist is executable, and it runs twice over: as a review a human
reads, and as a gate CI runs. Both import the same scene list and the same DOM
audit from `scripts/lib/visual-scenes.mjs`, so a scene added for one is a
scene the other walks.

|          | `scripts/visual-review.mjs`               | `scripts/visual-check.mjs`                                          |
| -------- | ----------------------------------------- | ------------------------------------------------------------------- |
| For      | a person, on demand                       | CI, every pull request                                              |
| Assets   | the real bucket, over the network         | stubbed inside the browser                                          |
| Settles  | long — the map is the subject             | short — the map is not                                              |
| Output   | a screenshot of every cell, `report.json` | pass or fail, screenshots as an artifact                            |
| Fails on | nothing; it reports                       | a dead scene, a console error, a structural defect off the baseline |

The gate and the reasoning behind it are ADR 0011. It does not diff pixels,
and the record says plainly what that does and does not catch.

### The review

A third instrument runs beside them and needs no browser at all: axe-core over
jsdom in `src/a11y.test.tsx`, which is a gate on every push and checks the half
of accessibility that is structure — names, roles, lists, headings
(`docs/accessibility.md`).

```bash
npm run build
npm run preview -- --port 4174 &
npx playwright install chromium
npm run visual:review                                 # → visual-review/*.png + report.json
BASE=https://sandtable.davetashner.com npm run visual:review
```

Screenshots land in `visual-review/`, which is git-ignored — image binaries
belong in the assets bucket, not in git (ADR 0004). Regenerate them; do not
commit them.

**Always review a production-shaped build, never the dev server.** And know
the harness's one lie: `vite preview` proxies `/assets/*` to production, but
PMTiles range requests through that proxy can fail, leaving the basemap empty.
Confirm anything about map rendering against `BASE=<a deployment>` before
believing it.

### The gate

```bash
npm run build
npx playwright install chromium
npm run visual:check                                  # what CI runs
npm run visual:check -- --shots visual-check          # …and keep the pixels
npm run visual:check -- --update                      # rewrite the baseline
npm run visual:check -- --timings                     # where the time goes
```

It serves the build itself, so nothing needs to be running first. It takes
about two and a half minutes; `CONCURRENCY` and `SETTLE` tune it, and
`BASE=<url>` walks a deployment instead.

**`--timings` prints the phase table**, and the reason it exists is that the
obvious reading of the clock is wrong. The wall time around
`page.evaluate(AUDIT)` is not the audit: the app's first map render is a
single main-thread task of about five seconds — software-GL shader
compilation, once per load — and whatever the harness asks for next queues
behind it. The audit's own work inside the page is under three milliseconds,
and the table prints that on its own line so the two are never confused again
(`sand-pmz.2.6`, ADR 0011).

**Updating the baseline.** `scripts/visual-baseline.json` lists the structural
defects we have decided to live with — the "Known and deliberate" section
below, machine-readable. `--update` rewrites it, carrying every existing
reason forward and marking each new row `TODO`. Write the reason before
committing: a row nobody has justified is visible in the diff, and that is the
point of keeping the baseline as text rather than as an image.

`page-h-overflow`, `clipped-x`, `clipped-y`, `overflows-right` and
`small-target` are gated. `small-target` was not, when the gate was written,
and the reason was right: the tap targets belonged to `sand-pmz.4` and a gate
red on them would have been enforcing a rule nobody had agreed to. That bead
has since agreed it in writing (`docs/accessibility.md`), so the gate holds it,
with the two inline cases WCAG exempts by name allowed on the baseline.
`tiny-text` is still counted and never fatal: the type floor is ADR 0010's, and
what is left under it is a label inside an authored SVG rather than type on a
page.

## What the audit looks for

Five defects that reading the CSS does not catch, rolled up by element rather
than by scene so the output is a list of things to fix:

| Check             | Fails when                                                     |
| ----------------- | -------------------------------------------------------------- |
| `page-h-overflow` | the document scrolls sideways at that viewport                 |
| `clipped-x/y`     | a box hides content it is not scrolling — text cut, not hidden |
| `overflows-right` | an element crosses the right edge of the viewport              |
| `tiny-text`       | rendered type below 11px                                       |
| `small-target`    | a control smaller than 24px in either axis                     |

The 1×1 `visually-hidden` idiom is excluded; a horizontal scroll rail's own
children legitimately sit past the viewport edge and are read in context.

## Findings, August 2026

Eight defects, all confirmed against production before being fixed.

1. **Every phone scene scrolled sideways** — 405px of content in a 390px
   viewport. A grid item's `min-width: auto` is its min-content width, so the
   three-option branch toggle, which cannot break, stretched the shell's only
   column past the viewport and took the header, map and timeline with it.
   `.app > * { min-width: 0 }`.
2. **The branch names were ellipsized on a phone** — "Schlieffen's conce…",
   "What success requ…", cutting the one word the reader needs. The control
   wraps to two rows instead and every branch is named in full.
3. **Eleven chapter chips wrapped into eleven rows on a phone**, more chrome
   than map. One scrolling rail instead, its cut edge faded.
4. **Every cast portrait was cropped top and bottom.** The face is a 34px grid
   with auto tracks, so the image's `height: 100%` was cyclic and fell back to
   its intrinsic height — a 3:4 portrait rendered 30×40 in a 30px frame.
   `object-fit`/`object-position` were framing a box a third taller than the
   one on screen, quietly undoing the placement pass of `sand-y0u.8`.
5. **Timeline band labels lost their ascenders and descenders** — 11px text
   with 3px of padding measured 26px in a 22px band — and were cut mid-glyph
   at the band's edge. They now sit on the band's own line height and
   ellipsize.
6. **The casualty table was 1459px wide inside a 304px dossier**, putting the
   figures five screens off to the right. `.clock-table td` is `nowrap` so the
   clock card's readouts never break; the casualty card reuses that table, and
   its "Counted" cell carries a phrase and its notes carry prose. Everything
   there wraps now except the figures. 1459px → 319px.
7. **Tally markers were the one thing on the map outside the label layout.**
   A marker sits where an army passed, so "+1 corps" landed on Verdun and on
   the army's own label. The layout now runs in three passes — army tokens,
   then tally markers, then towns — each avoiding the boxes the passes before
   it took.
8. **Map labels piled up whenever the basemap failed to load.** `map.once('load')`
   waits for the first tiles as well as the style, so a blocked or unreadable
   tile source meant `onReady` never fired, the screen-space label layout never
   ran, and every army and place name fell back to its default slot — a
   legible map degrading into an unreadable one rather than an empty one. The
   style alone is enough for what `onReady` is for, so it now takes whichever
   of `load` and `styledata` comes first. Covered by a test in
   `src/engine/map/MapView.test.tsx`.

## Known and deliberate

- ~~**10.5px meta type** (`--fs-xs`) on eyebrows, credits, chips and gauge
  readouts is the instrument-panel voice of the design, not a defect.~~
  **Settled against, in ADR 0010** (`sand-neh.3`): the audit was right and the
  scale was arithmetic. `--fs-xs` is 11.5px, `--fs-sm` 12.5px, and the
  twenty-odd literal sub-11px sizes in the component CSS now read the token.
  The last two out were the timeline's 9.5px date labels on a phone — which now
  read at the token size, with half as many of them — and the `Esc` key cap on
  the opening sequence's skip control (`sand-pmz.4`). The only `tiny-text` left
  is the labels inside the prologue's authored SVG schematics, which are part of
  a drawing rather than type on a page.
- ~~**Tap targets between 24 and 44px** on chips, entity links and timeline
  markers.~~ **Settled in `sand-pmz.4`**, `docs/accessibility.md`: everything
  the audit reports is at the 24px floor except the two inline cases the WCAG
  target-size rule exempts by name — a person's name in a sentence and a
  footnote reference on one — both of which have a full-size equivalent on the
  same screen. The timeline marker was the interesting one: it was _passing_
  the audit on the width of a 90px invisible label that still took clicks.
- ~~**Chapter chips wrap to three rows on desktop.** Legible, but it is the
  heaviest chrome above the map. An IA question, adjacent to `sand-neh.7`.~~
  **Settled in ADR 0013** (`sand-neh.7`): the chip row is now an index that
  rests closed as one control and opens as one list, the same shape on every
  screen, with every entry named for what it is — a chapter or a zoom-in. The
  phone rail went with it.
- **A band narrower than its own title shows an ellipsis.** Inherent; band
  labels are already hidden below 640px.

## The clean run

68 cells, no page errors, no console errors, and no `page-h-overflow` at
either viewport. Three things still report and all three are the audit reading
a deliberate design as a defect: the timeline band label's ellipsis, the
chapter chips sitting past the viewport inside their own scroll rail (that
rail is gone as of ADR 0013), and the collapsed bottom sheet clipping its
peek. Everything else is `tiny-text` and `small-target`, both listed above.

What is left of that list, plus the gallery's specimens sitting past the edge
inside their own scroll rail, is `scripts/visual-baseline.json`. The gate
starts from the state this pass left the app in, and says so with a sentence
per row.
