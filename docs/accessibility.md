# Accessibility — the keyboard, the targets and the motion

The systematic pass behind `sand-pmz.4`. The PoC had the basics; this page is
what replaced them: what the app promises a reader who never touches a mouse,
which of those promises a machine checks, and which are checked by hand and
why.

Four things hold it up.

| Instrument                     | Runs                       | Catches                                                                   |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------- |
| `src/a11y.test.tsx` (axe-core) | every push, with the suite | names, roles, list and heading structure, `aria-*` that points at nothing |
| The AA contrast test           | every push                 | every text/ground pair in both themes (`src/styles`, `docs/design.md`)    |
| `scripts/visual-check.mjs`     | every pull request         | target size, clipping, overflow — anything needing layout                 |
| `scripts/visual-review.mjs`    | on demand                  | the same, with the real basemap, screenshot by screenshot                 |

The split is deliberate. axe runs against jsdom, which has no layout, so it is
strong exactly where the DOM is the whole story and blind where pixels are.
Contrast is not sampled from a screenshot but computed from the tokens, which
is stricter. Everything left over — how big a thing is on screen — is measured
in a browser by `sand-pmz.2`'s harness (ADR 0011), which walks twenty-two scenes
× two themes × desktop and phone.

That harness reported `small-target` and never failed on it, and said why: the
tap targets belonged to this bead, and a gate red on a rule nobody had agreed
to is a gate people learn to ignore. The rule is agreed now — it is the section
below — so **`small-target` is fatal as of this pass**, with the two inline
cases WCAG exempts by name written into `scripts/visual-baseline.json` rather
than left to anyone's memory.

## The keyboard run-through

Walked at 1440×900 and at 390×844, in both themes, on the campaign at day 22.
Tab order is DOM order throughout — there is not one positive `tabindex` in the
app.

### The whole of it, in order

1. **Sandtable** — the wordmark, back to the top of the pack.
2. **Header switches** — score · copy link · commanders · play the story ·
   the three branch options (a radio group: arrows move within it).
3. **The chapter index** — one control that says how much the pack holds.
   `Enter` opens the list, `Escape` closes it and puts the keyboard back on the
   control, and choosing an entry moves it to the level you have just entered
   (`sand-pmz.4.2`).
4. **The map** — the canvas is one stop, then its two zoom buttons.
5. **The cast** — one stop per portrait, in pack order.
6. **The dossier** — the beat's picture (opens full size), its credit, the
   names in the prose, the footnote references and their backrefs, then the
   Related chips.
7. **The Meanwhile filter** — one toggle per science field.
8. **The transport** — jump to start · play · step · speed.
9. **The scrubber**, then the timeline's markers, then the gauges under it.

118 stops on that scene, of which 50 are timeline markers and 21 are cast
portraits: the chrome is 15 and the rest is content. The scrubber sits **before**
the markers even though it is drawn below them, because it is the control the
strip exists for and nobody should have to pass fifty events to reach it.

### Keys

| Key                 | Does                                                                   | Where                                    |
| ------------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| `Space` / `k`       | play or pause the clock                                                | anywhere the focus does not own its keys |
| `←` `→`             | step the clock                                                         | ”                                        |
| `Shift`+`←` `→`     | step it further                                                        | ”                                        |
| `Home` / `End`      | jump to the start or the end of the range                              | ”                                        |
| `,` / `.`           | slower / faster                                                        | ”                                        |
| `←` `→` `↑` `↓`     | pan the map                                                            | with the map focused                     |
| `+` / `-`           | zoom the map                                                           | ”                                        |
| `Escape`            | close the chapter index, the full-size view, the premise; leave a tour | in each                                  |
| `Space` / `→` / `←` | let a tour on, forward, back                                           | while a tour is running                  |
| `↑` / `↓`           | raise or lower the dossier sheet                                       | on the sheet's handle, on a phone        |

**"Anywhere the focus does not own its keys"** is `src/engine/shortcuts.ts`, and
it is the fix that made the map reachable at all. The transport and the tour
both listen on `window` and both call `preventDefault`; MapLibre makes its
canvas focusable and gives it the arrows to pan and `+`/`-` to zoom. Before this
pass, tabbing to the map and pressing `→` moved the clock and not the camera —
the map had a keyboard interface that nothing could reach. A surface now
declares that it handles its own keys with `data-owns-keys`; a text field is
assumed to. The map is the only declarer, and its canvas carries a name that
says which keys drive it, because MapLibre gives it `tabindex` and nothing else.

### Where focus goes, and comes back

- **The chapter index** → enter a level and the breadcrumb's new level takes
  focus; `Escape` returns it to the control that opened the list. Entering the
  same level from a timeline glyph or a beat chip leaves the keyboard where the
  reader put it, which is why the trail only catches it when the index was the
  way in.
- **The full-size picture** is a native `<dialog>` opened with `showModal()`, so
  the trap, `Escape`, the inert background and the return to the trigger are the
  platform's rather than ours.
- **The premise** (the opening sequence) is a modal over an `inert` app, with a
  hand-rolled trap, `Escape` to leave, and focus starting on Skip.
- **A card** opens in the dossier where the beat was; "← Back to the narrative"
  is its first stop.

### What has no keyboard route of its own

The commander tokens and the tally markers **drawn on the map** are deck.gl
geometry, not DOM, so they answer to a click and to nothing else. Both have a
full keyboard equivalent on the same screen: a commander's card is on the cast
strip, and a tally's is a gauge under the timeline. That is an equivalence, not
a fix — a canvas layer with its own roving focus is a real piece of work and
belongs in its own bead.

## Target size

The floor is **24×24 CSS px**, WCAG 2.5.8 (AA). The review harness reports
anything under it as `small-target`.

Raised in this pass, measured before and after in Chrome at 1440×900 and
390×844:

| Control                           | Was     | Now     |
| --------------------------------- | ------- | ------- |
| `input.timeline__scrubber`        | 1348×20 | 1348×24 |
| `button.timeline__marker`         | 90×25 † | 24×24   |
| `button.timeline__marker` (phone) | 9×9     | 24×24   |
| `button.clocks__gauge--human`     | 1348×22 | 1348×24 |
| `button.meanwhile__field`         | 66×23   | 70×24   |
| `button.card__back`               | 190×23  | 198×24  |
| `button.crumbs__link`             | 317×17  | 317×24  |
| `button.crumbs__exit`             | 11×20   | 24×24   |
| `a`/`button.media__original`      | 104×15  | 104×24  |
| `a.data-footnote-backref`         | 12×16   | 24×24   |
| `button.causal__entity`           | 251×22  | 259×28  |
| `button.causal__alt`              | 235×17  | 235×25  |
| `.causal__debate summary`         | 310×18  | 274×26  |
| `button.opening__claim-link`      | 282×15  | 282×24  |

† The marker is the one that was passing the audit dishonestly. Its box was as
wide as its label, and the label is 90px of `opacity: 0` text that still took
clicks — so two markers a fortnight apart had overlapping targets and the 9px
dot you were aiming at was a tenth of the box. The label is out of flow now and
takes no pointer events: what you can hit is what you can see.

Paying for that cost the timeline strip **8px on a desktop and 14px on a phone**.
A marker's 24px and the scrubber's 24px cannot share a band — whichever is later
in the DOM takes the overlap — so the track's four rows no longer overlap at
all. On a phone the phase band gives up ten of those pixels: it shows no label
below 640px anyway, so it is a stripe rather than a bar.

### The inline exemption, and where it stops

WCAG's own exception is for a target "in a sentence, or whose size is otherwise
constrained by the line-height of non-target text". Two things in the app take
it and keep their type:

- **`a.entity-link`** (≈50×20) — a person's name inside a sentence of the
  narrative, and the title of a work inside a citation (`sand-shn.5`). A 24px
  box around either means 24px of leading in the middle of a paragraph, or a
  control overlapping the line above.
- **`sup a`**, the footnote reference (11×15) — a mark on a sentence, the same
  argument.
- **The basemap's attribution links** (`a` inside `.maplibregl-ctrl-attrib`,
  ≈62×15) — MapLibre writes a line of credit prose and puts the links inside
  it. It is a sentence in the most literal sense the exception has, and it is
  third-party chrome carrying a licence notice; restyling it to 24px would
  thicken the map's corner strip to say nothing new.

The first two have a full-size equivalent on the same screen: every name the
prose links is also a Related chip under the beat, every footnote is an entry
in the numbered Sources list under the card, and every work a citation names is
an entry in the bibliography card, which the "All works cited" control under
every beat and every Sources block reaches at full size. That equivalence is the condition of the
exemption, not an excuse for it — a pack that links a card only from prose has
put it out of reach, and the validator's `links` rules are what keep that from
happening.

The line stops at things that only _look_ inline. The footnote's `↩` backref,
"Show original" in a credit line and "← Back to the narrative" are controls that
happen to sit in a text flow rather than words in a sentence, and all three took
the floor.

## Focus, and being able to see it

`:focus-visible` is a 2px `--brass` outline at 2px offset, set once in
`src/styles/global.css` and AA against every ground in both themes.

Four components had traded it for a hover treatment — `outline: none` with a
border or a ring instead — and in every one of the four the replacement was
already saying something else:

- `.clocks__gauge` — a `--line` border, which is what hover says, while the
  **open** gauge is a brass border.
- `.decision__option` — a brass border, which is exactly what the **picked**
  option wears.
- `.decision__play-btn` — a background tint and nothing more.
- `.portrait-chip__face` — a brass ring, which is what a **selected** chip
  wears.

All four keep the outline now, on top of whatever else they do.

Two more places the ring was there but unseeable: the sheet's handle sits flush
against the top edge of a sheet that clips its overflow (offset `-2px` there),
and the map canvas, which MapLibre draws to the edge of a rounded, clipped
container (`map.css`, offset `-2px`).

## Motion

`prefers-reduced-motion: reduce` zeroes every animation and transition duration
in one reset in `src/styles/global.css`. **Do not add a second one** — add the
one-off `@media` block only where an effect is not a duration.

CSS cannot reach a WebGL camera, and a 1400ms map flight is the largest piece of
motion in the app. `MapView`'s handle now checks the preference itself and jumps
instead of flying — on a zoom-in, on the way back out, and on every camera a
tour asks for. The check reads the query at call time rather than at mount, so
changing the system setting takes effect on the next move.

Elsewhere: the opening sequence shows the whole premise at once rather than
staging it, the tour's and the vignette's effects live inside
`@media (prefers-reduced-motion: no-preference)` so they are opt-in, and the
dossier's fade is a CSS animation the global reset already zeroes.

## Type

Nothing renders below `--fs-xs` (11.5px) — ADR 0010. The last exception in the
app's own CSS was the timeline's date labels, which shrank to 9.5px on a phone;
they read at the token size now and the strip shows half as many of them, since
twelve labels at 11.5px collide on a 330px rail and three do not. The counter
above the strip carries the exact date either way, so the axis is orientation
rather than information.

The other was the `Esc` key cap on the opening sequence's skip control, at
9.5px. A key cap is read — it says "Esc", not a mark — so it reads at the floor
and takes its smallness from its padding instead.

One thing still reports as `tiny-text` across the whole walk, and it is
deliberate: the labels inside the prologue's authored SVG schematics, which are
part of a drawing that `DiagramFigure` presents as one `role="img"` with its own
alt text. (The branch toggle's `aria-hidden` `?` — ADR 0010's stated exception —
is a single character, and the audit only counts text of more than one.)

## What axe covers, and what it deliberately does not

`src/a11y.test.tsx` runs axe-core over three surfaces: the app shell at rest,
the app in the states a click reaches (index open, inside a zoom-in, a card
open), and the component gallery — every component in `src/ui`, in both themes,
including the ones the app only shows on a phone.

Rules switched off, each for a stated reason:

- **`color-contrast`**, everywhere — it needs rendered pixels, and jsdom has
  none. The token contrast test is exact where this would be a guess.
- **`region`** and **`landmark-unique`**, in the gallery only — the gallery
  renders the whole library twice on one document, once per theme, which
  duplicates every landmark the components carry and leaves the panes outside
  any landmark. Both are properties of the specimen sheet, not of the components
  on it. They stay on for the app.

What it found, and what was fixed:

- **Four gauge strips were a `div` with `role="list"` holding buttons with
  `role="listitem"`.** An explicit role replaces the element's own, so every
  gauge had stopped being a button in the accessibility tree — a screen reader
  had no way to know the row could be opened at all. They are `<ul>`/`<li>` with
  real buttons inside.
- **The hypothetical badge was a `<summary role="note">`** — which took away the
  role that makes a summary the thing you press, so the disclosure could not be
  announced as one.
- **The decision card's options were a `<ul role="group">`**, which replaced the
  list's role and orphaned every `<li>` inside it.
- **The gallery's token sheet opened with an `h3` under the page `h1`.**

And one the audit could not have found, because the test environment runs with
CSS off: **the wordmark had no accessible name in dark mode.** The name lived in
the `alt` of the light lockup, and dark mode hides that image — taking the name
of the first tab stop, and of the document's only `h1`, out of the tree with it.
The name is on the link now and both images are decoration.

## Nothing on the map is said by colour alone

Axe cannot see a WebGL canvas, so the rule the map has to keep is a rule of
review rather than of test. Every distinction the map draws carries a second,
non-colour channel:

- **Side** — the colour, and always a label in `--ink` beside the token.
- **Mode** — a dash pattern, not a hue: solid for a march, a fine dash for the
  road, a long dash for rail, sea and air.
- **Confidence** (`sand-23b.4`) — an approximate position opens its token,
  wears a dashed halo, and takes an `≈` in front of its label. Three channels,
  one of them literal text, because the disc and the ring differ in lightness
  as well as shape and neither difference is safe on its own.

A new treatment that is only a colour is not finished. The dossier legend
carries the key for anything the map draws this way.

## Still open

- **A canvas layer with a keyboard.** Commander tokens and tally markers on the
  map are reachable by pointer only; the equivalence above is real but it is not
  the same as being able to walk the map.
- **Fifty tab stops on the timeline strip.** Every marker is a button, which is
  correct and tedious. A roving `tabindex` over the markers row would make it one
  stop and the arrows within it, at the cost of the arrows the transport already
  owns — an argument worth having in its own bead rather than settling here.
- **Landmark density inside a card.** `card__sources`, `card__section`,
  `card__connections`, `decision`, `ratio` and `human-todate` are each a
  `<section aria-label>`, so each is a landmark; a card can put five inside the
  dossier's one. Nothing is wrong, but a screen reader's landmark list is longer
  than the page deserves.
- **A screen-reader run-through.** Everything here was walked with a keyboard
  and an accessibility tree; nothing here was walked with VoiceOver or NVDA.
