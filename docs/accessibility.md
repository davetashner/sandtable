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
in a browser by `sand-pmz.2`'s harness (ADR 0011), which walks every scene in
`scripts/lib/visual-scenes.mjs` × two themes × desktop and phone.

That harness reported `small-target` and never failed on it, and said why: the
tap targets belonged to this bead, and a gate red on a rule nobody had agreed
to is a gate people learn to ignore. The rule is agreed now — it is the section
below — so **`small-target` is fatal as of this pass**, with the two inline
cases WCAG exempts by name written into `scripts/visual-baseline.json` rather
than left to anyone's memory. It sits in that gate's **blocking** tier, which
is the tier a required check goes red on (ADR 0011's 2026-08-28 amendment);
`tiny-text` sits in the reported one, for the reason ADR 0010 gives.

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
4. **The map** — **what is on the map** (one stop; `Enter` opens the roster),
   then the canvas, then its two zoom buttons and the attribution.
5. **The cast** — one stop per portrait, in pack order.
6. **The dossier** — the beat's picture (opens full size), its credit, the
   names in the prose, the footnote references and their backrefs, then the
   Related chips.
7. **The Meanwhile filter** — one toggle per science field.
8. **The transport** — jump to start · play · step · speed.
9. **The scrubber**, then the timeline's markers — **one stop for the row** —
   then the gauges under it.

89 stops on that scene, of which 21 are cast portraits and **one** is the
timeline's fifty-six event markers: the chrome is 15 and the rest is content.
Two of those numbers used to be much larger, and are the subject of the
sections below. The scrubber sits **before** the markers even though it is
drawn below them, because it is the control the strip exists for.

### The markers row is one stop (`sand-pmz.12`)

Every marker is a button, which is correct and was tedious: fifty-six of them
on the campaign, in front of the gauges. The row is a roving `tabindex` now —
one stop, `←`/`→` to move within it, `Home`/`End` to its ends, `Enter` to seek
and open — and `Tab` lands on **the last event the clock has passed**, so a
reader enters the row at "now" rather than at the outbreak of the war. Once
they have moved, the row remembers where they left it.

The cost of that is the arrows, which the transport owns globally, and the
mechanism for settling it already existed: the row declares `data-owns-keys`
(`src/engine/shortcuts.ts`), which is how the map got its arrows back in
`sand-pmz.4`. Two things had to be added rather than reused. The transport's
_own_ handler runs on the whole strip and had to learn to step around a
declarer inside itself; and it had to do so by `declaresOwnKeys` rather than
`ownsKeys`, because the scrubber is an `<input>` — it owns its keys by that
rule, and it must not, since `←`/`→` on the scrubber are the clock's step and
not the range's.

The hook is `src/engine/roving.ts`, and it is deliberately shared: the map's
roster is the same shape and the same problem.

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
| `←` `→`             | move between events                                                    | in the timeline's markers row            |
| `↑` `↓` `←` `→`     | move between the things on the map                                     | in the map's roster                      |
| `Home` / `End`      | the first and the last of either row                                   | ”                                        |
| `Enter`             | open the roster; open what the keyboard is on                          | ”                                        |

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
- **The map's roster** opens with the keyboard on the first object; `Escape`
  closes it and returns the keyboard to the control that opened it, the way
  the chapter index does. Tabbing off the end closes it too and does _not_
  drag the keyboard back — the reader is already somewhere else, and chasing
  them would be a trap rather than a courtesy.
- **A card** opens in the dossier where the beat was; "← Back to the narrative"
  is its first stop.

### The map has a keyboard now (`sand-pmz.11`)

The army tokens, the commander portraits and the tally markers are deck.gl
geometry on a WebGL canvas. There is nothing there to focus — no element, no
role, no name — so until this pass they answered to a click and to nothing
else, and axe could not see them to say so. Each had an equivalent elsewhere
(a commander's card is on the cast strip, a tally's is a gauge under the
timeline), and an equivalent is not the map.

**What the map's accessible representation is.** One stop in the tab order,
immediately before the canvas, that says how many things the map is showing:
_What is on the map (20)_. `Enter` opens a **roster** of them — the same
objects, the same labels, in the order they are drawn — as a roving list, so
the whole thing costs the tab order one stop however busy the map is. Each
entry reads what it is, what it is called, whose it is and where it is:

> ARMY · **1. Armee** · Germany · 18 km from Mons

`Enter` on an entry does exactly what a click on its token does — it opens
that formation's, that commander's or that ledger's card in the dossier.
`Escape` closes the roster and hands the keyboard back to the control that
opened it. The entry control is off-screen until it has focus, the way a skip
link is, and it draws itself the moment it takes focus, so a reader who never
presses `Tab` never meets it and one who does can see where they are.

It is a **mode of the map**, which is what ADR 0006 allows; it is not a fourth
panel, which is what ADR 0006 forbids. Nothing here survives losing focus, and
the roster states no fact the map does not already draw: it is built from the
same data as the layers — the tokens the movement scene drew, the commanders
`commandersAt` placed, the tally entries the clock has passed — so the two
cannot disagree about what is on the map.
`src/engine/layers/movement-layers.ts` exports `movementTokens` for exactly
that reason.

The one thing the roster adds is _where_, because a lng/lat pair tells a reader
nothing: each entry names the nearest place the pack has already labelled, and
says nothing at all past 120 km, where a distance stops being a location and
becomes a direction.

### What was rejected

- **A visible list beside the map.** A fourth surface, which ADR 0006 exists
  to refuse, and a permanent tax on every reader for a route only some need.
- **Roving focus driven by key events on the canvas, with a live region
  announcing the focused object.** The closest thing to "walking the map", and
  the least honest: focus would be somewhere the accessibility tree cannot
  point at, the announcement would be an `aria-live` string rather than a
  named control, `Enter` would have no element to fire on, and nothing about
  it could be tested except by asserting our own bookkeeping. A named button
  that is really focused is worth more than a simulation of one.
- **An always-present off-screen list, with no mode.** Simpler, and it puts
  twenty to forty items into browse mode permanently, in front of the canvas,
  for every reader on every screen. The mode costs one keystroke and keeps the
  tree the size of the page.
- **Moving the camera to the focused object.** Motion nobody asked for, on the
  surface where this app's motion is already largest.

### The run-through

Walked in Chrome at 1440×900, on the campaign at 22 August 1914:

| Step                         | What happens                                                              |
| ---------------------------- | ------------------------------------------------------------------------- |
| `Tab` past the chapter index | _What is on the map (20)_ draws itself in the map's top-left corner       |
| `Enter`                      | the roster opens; the keyboard is on **1. Armee**, `tabindex="0"`         |
| `↓` or `→`                   | **2. Armee**; the stop moves with the focus, and the clock does not move  |
| `Enter`                      | the formation card opens in the dossier; the keyboard stays in the roster |
| `Escape`                     | the roster closes; the keyboard is back on _What is on the map_           |
| `Tab`                        | the canvas — `←`/`→` pan it, as before                                    |

Because axe reads the DOM and this component stands in for a canvas, what the
roster promises is asserted in `src/ui/MapObjects.test.tsx` rather than by the
gate: one tab stop, a name for every object, the arrows inside it, `Enter`
doing what a click does, and `Escape` returning the keyboard. The gallery
carries a specimen of it open, which is the state axe can audit — the closed
control is a skip link, and 1px.

## Target size

The floor is **24×24 CSS px**, WCAG 2.5.8 (AA). The review harness reports
anything under it as `small-target`, and fails on it.

### The number you write is 26 (`sand-pmz.15`)

24 is the standard's floor and the gate's; **`--target-min` is 26px** and it is
what a component's CSS says. The two are different on purpose.

`button.card__chip` was the case that made the argument. Its height was a line
box, six pixels of padding and two of border, and it came to **24.000px** — not
because anyone chose 24 but because IBM Plex Sans's metrics at `--fs-sm` round
to a 16px line box. Its `min-height: 24px` was therefore doing nothing at all:
the chip had zero slack over a gate that fails below 24, and the gate tripped
`small-target` on one epilogue cell and not on the next two runs. A gate exactly
on its threshold goes red at random, and a floor that is not binding is not a
floor.

26 is not arbitrary. It is the smallest whole pixel above every height these
controls reach on their own — the tallest, `.causal__alt`, is 11.5px × 1.5 plus
8px of padding, 25.25 — so the minimum now binds on all of them rather than
sitting inert on some. It is also two pixels clear of the gate, which is what
buys the slack: a font that has not swapped, a type-scale change, a padding
change, none of them can now walk a control under 24 without something visibly
moving first.

**What it governs, and what it does not.** `--target-min` is the floor under a
size that is _derived_ — from a line box, from type metrics, from padding —
which is where the drift is. It is not a rule that every control must be 26px.
A control drawn at an exact size has no drift to catch: `.timeline__marker` is
a 24px square and `.timeline__scrubber` a 24px band, both measure 24.000 by
construction, and re-deriving the strip's four-row budget (twelve hand-computed
offsets across two breakpoints) to buy them slack they cannot lose would cost
the timeline another 4px of height for nothing. They stay at 24. The two places
where a hard size had to follow the token are the ones where a minimum and a
size disagreed: the breadcrumb's `✕` has to stay a circle, and the footnote
backref pins its own `line-height` to the floor so the glyph stays centred.

Grew by 2px in this pass, all through the token: `.card__chip`, `.card__back`,
`.meanwhile__field`, `.crumbs__link`, `.crumbs__exit`, `.media__original`,
`.opening__claim-link`, `.bib__read`, `.bib__door .entity-link`,
`.dossier__side`, `.clocks__gauge`, `.causal__alt`, `.data-footnote-backref`
and `.sheet__handle`. `.causal__debate summary` gained a minimum it never had
(it computed to 25.25px, and the gate audits buttons, anchors, inputs and
selects — not summaries, so nothing would have said so).

The gate keeps testing 24 rather than 26. It is checking the standard; the
design system builds above it. Moving the gate's constant would make it
enforce a rule of ours rather than WCAG's, and would immediately fail the four
controls above that are deliberately drawn at exactly 24.

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

`src/a11y.test.tsx` runs axe-core over four surfaces: the app shell at rest,
the app in the states a click reaches (index open, inside a zoom-in, a card
open), the component gallery — every component in `src/ui`, in both themes,
including the ones the app only shows on a phone — and the pack-failure state,
which is the one screen React never renders.

That last one is read off `index.html` rather than off a component, because
that is where it lives (`sand-shn.1.2`, ADR 0018's amendment): when the content
bundle does not arrive, the module graph never evaluates, so the app is markup
and nothing else. It is a `role="alert"` that takes focus when it is revealed —
`tabindex="-1"` on the container, focus moved by the boot script — so a reader
who is not looking at the screen is told the campaign did not load rather than
left listening to silence. Its two controls are a link to the atlas and a retry
button, both above `--target-min`, both with the standard brass focus ring.
axe checks all three of its cases, one at a time, because only one is ever on
screen.

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

- **The roster is the map's contents, not its geography.** It says what is on
  the map and how far each thing is from the nearest named place; it does not
  say what is next to what, and walking it does not move the camera. A reader
  who cannot see the map still cannot read the shape of the front from it.
- **The cast strip is still one stop per portrait** — twenty-one of them. It is
  the same shape as the markers row and `src/engine/roving.ts` is now sitting
  there; it was left out of this pass because the strip is also a horizontal
  scroller and that is a second question.
- **`.dossier__about summary`** takes no minimum. Like `.causal__debate
summary` it is invisible to the gate, which audits buttons, anchors, inputs
  and selects; unlike it, it was never measured.
- **Landmark density inside a card.** `card__sources`, `card__section`,
  `card__connections`, `decision`, `ratio` and `human-todate` are each a
  `<section aria-label>`, so each is a landmark; a card can put five inside the
  dossier's one. Nothing is wrong, but a screen reader's landmark list is longer
  than the page deserves.
- **A screen-reader run-through.** Everything here was walked with a keyboard
  and an accessibility tree; nothing here was walked with VoiceOver or NVDA.
