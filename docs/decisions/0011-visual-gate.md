# 0011 — The visual gate: structure is checked, pixels are evidence

- **Status:** accepted (amended 2026-08-25 `sand-pmz.2.6`; amended 2026-08-28
  `sand-pmz.9`, phase 1 the two tiers and phase 2 the settings change that made
  `visual` required; amended 2026-08-29 `sand-pmz.9.2`, the map assertion —
  which is **not** the check the 2026-08-28 amendment proposed, and that
  section says why. See the four sections at the end)
- **Date:** 2026-08-24
- **Bead:** `sand-pmz.2`

## Context

The design review is already executable. `scripts/visual-review.mjs`
(`sand-1l0.15`) walks the app across every scene the pack can reach — campaign
day 0, 20 and 35, both zoom-in kinds, one of every card, the tour, the gallery
— in two themes at desktop and phone width, screenshots each and audits the
rendered DOM for the defects reading the CSS does not catch. It found eight,
seven of which were fixed in the same pass.

Two things about it were deliberately left open, and this is the bead that
closes them: **Playwright is not a dependency, and none of this runs in CI.**
The bead asks for "screenshot tests for key scenes … compared in CI to catch
map-style and layout regressions", and the honest answer has to start with what
"compared" can mean here.

**What the app draws is not a function of the source alone.** Three
independent sources of variance, all of them real and all of them measured
rather than assumed:

1. **The basemap comes over the network.** It is a WebGL render of a PMTiles
   archive in an S3 bucket behind CloudFront (ADR 0004), read by HTTP range
   request. `vite preview` proxies `/assets/*` to production, and range
   requests through that proxy fail often enough that
   `docs/design-review.md` carries a standing warning not to believe any
   map-rendering finding until it has been confirmed against a deployment.
   A basemap that is sometimes there and sometimes not is not a baseline.
2. **The runner is not the laptop.** Headless Chromium rasterises through
   software GL, and the chrome's type is rasterised with whatever fonts the
   machine has. A screenshot taken on macOS and a screenshot taken on
   `ubuntu-latest` differ on almost every glyph edge, before anyone has
   changed a line.
3. **Even without pixels, timing leaks in.** Building this, the first version
   of the walk saved a third of its runtime by loading each scene once and
   resizing the page to reach the other viewport. It reported between one and
   sixteen `overflows-right` findings on `canvas.maplibregl-canvas` per run —
   a different handful each time. The cause was not the app: MapLibre resizes
   its canvas from a `ResizeObserver`, and on a machine running two of these
   at once that frame lands whenever it lands. A wait on the container's width
   did not help, because the container had already resized and the canvas had
   not. (**Amended 2026-08-25, `sand-pmz.2.6`** — see "The viewport is reached
   by resizing" below. The resize is back, because the wait was wrong rather
   than the idea: wait on the _canvas_, not on the container.)

That third one is the whole argument in miniature. A gate that goes red for
reasons unrelated to the change is worse than no gate: it teaches everyone to
re-run the job, and then it teaches them to ignore it.

## Decision

**Playwright becomes a real devDependency and CI gets a `visual` job. The job
asserts structure and never compares pixels. The screenshots are still taken
and kept as an artifact for a human to look at.**

`scripts/visual-check.mjs` walks the scene list and the DOM audit — both
shared with the review through `scripts/lib/visual-scenes.mjs`, so a scene
added for one is a scene the other walks — and fails on three things:

1. **A scene that will not render at all**, including a navigation timeout.
2. **A console or page error the app raised.**
3. **A structural layout defect** — `page-h-overflow` (the document scrolls
   sideways), `clipped-x` / `clipped-y` (a box hides content it is not
   scrolling), `overflows-right` (an element crosses the right edge) — that
   `scripts/visual-baseline.json` does not already allow.

Three things make that a gate rather than a coin toss:

**The walk is hermetic.** `/assets/*` is answered from inside the browser, not
from the network: images become a 1×1 PNG, borders an empty `FeatureCollection`,
and the basemap a valid, empty PMTiles v3 archive — a 127-byte header, a root
directory of zero entries, `{}` for metadata — served with real `206`
responses to real range requests. A 404 would have been simpler and is the
wrong shape of lie: the pmtiles client throws on it, and a gate that has to
ignore an exception it caused itself cannot also assert "no console errors".
With a well-formed empty archive the map builds its style, reports ready, lays
out its labels and draws no basemap. Nothing on the console is the harness's
own voice. No S3, no CloudFront, no proxy, no flake.

**The viewport is reached by resizing** — amended 2026-08-25, `sand-pmz.2.6`;
it used to get a fresh load. The theme never needed one: `emulateMedia`
recolours the page without moving a box, so both themes are audited off one
load. The viewport does move boxes, and the first version of this gate paid
for a second load rather than lose three green runs in a row to the resize
lottery in point 3 above.

The lottery had a cause, and waiting for it is cheaper than reloading. The
walk now resizes, and `settleResize` says what "the resize has arrived" means:
every `<canvas>` is the width of the element it sits in — polled on animation
frames, which is the clock the `ResizeObserver` is on — and then no finite CSS
animation is still running, because a card re-mounted by the new width fades
in, and a box measured on its way in is a fraction of a pixel short of the box
it settles at. Both waits are bounded; on timeout the walk audits anyway and
reports what it sees rather than hiding it.

**The scene loads at the narrowest viewport and resizes up.** The phone layout
is the one with a component that exists only at phone width — the bottom sheet
— and a sheet reached by resize has had a settled desktop layout to grow out
of, which is not the sheet a reader gets. Measured, not assumed: with the load
at desktop, `card-source__phone` stopped reporting the `clipped-y
section.sheet` that a fresh phone load reports.

The evidence for the whole change is five walks of the same tree — three in
the old shape, two in the new — with the faithful walk (`walkFaithful`: one
load per cell, one page at a time, an eight-second settle) as ground truth.
**No finding present in any old-shape run is absent from every new-shape run.**
Every kind, element and count is identical across all five except the two the
gate has always been least sure of, and both move the same way:

| in 24 cells the faithful walk was run over | old shape  | new shape |
| ------------------------------------------ | ---------- | --------- |
| `small-target a.` (truth: 24 of 24)        | 19, 18, 16 | 22, 24    |
| `clipped-y section.sheet` (truth: 6 of 6)  | 3, 2, 4    | 6, 6      |

Neither shape reports anything the faithful walk does not. The gate was
under-reporting both, because two full-size maps contending for one machine
leave the page less settled at the instant it is asked, and one load per scene
instead of two leaves it more settled. Fewer loads bought accuracy as well as
time.

**The baseline is a text file with reasons in it.** Eleven rows, each naming a
defect kind and an element and saying in a sentence why it is allowed: a
timeline band narrower than its own title, the collapsed bottom sheet clipping
its peek, the gallery's specimens sitting past the edge inside their own scroll
rail. It is committed, reviewed in the pull request like any other file, and
regenerated with `npm run visual:check -- --update` — which carries every
existing reason forward and marks each new row `TODO`, so an unjustified
allowance is visible in the diff. It also names any allowance that no longer
occurs: rebasing this branch onto ADR 0013 retired the chapter-chip scroll
rail, and the run said so on the next line.

**`tiny-text` and `small-target` are reported and never fatal.** ADR 0010 put a
floor under the type scale and the audit's remaining findings are the marks
that are deliberately not type; the tap targets between 24 and 44px belong to
`sand-pmz.4`. A gate red on either would be enforcing a rule nobody agreed to.

### What each option would have caught

| Option                                     | Catches                                        | Misses                                            | Red when nothing changed                  |
| ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------- | ----------------------------------------- |
| Full-page pixel diff                       | everything visual, including map style         | nothing                                           | almost every run — network, fonts, timing |
| Pixel diff, map canvas masked              | colour, spacing, type in the chrome            | the map, which is half the product                | on any font or rasteriser difference      |
| **Structural assertions, no pixels**       | layout regressions, dead scenes, thrown errors | colour, spacing, type, map style, label placement | not in three consecutive runs             |
| Screenshots as an artifact, no gate at all | nothing, until someone looks                   | everything nobody looked at                       | never                                     |

The middle two rows are the honest trade. Six of the design review's eight
findings were structural — a phone that scrolled sideways, ellipsized branch
names, chips wrapping into eleven rows, a 1459px table in a 304px dossier,
clipped band labels, labels piling up on a failed basemap — and this gate
would have caught them. Two were not: portraits cropped by an `object-fit`
framing the wrong box, and tally markers colliding on the map. Nothing short
of a pixel diff catches those, and a pixel diff here does not work. They stay
with the on-demand review and with the reviewer's eye, and the artifact is
what the reviewer looks at.

## Alternatives considered

- **Full-page pixel diff with committed baselines.** The thing the bead's
  title suggests. Rejected on all three sources of variance above; a baseline
  regenerated often enough to stay green stops being a baseline.
- **Pixel diff with the map canvas masked out.** Genuinely tempting — the
  chrome is deterministic given the same rasteriser. But the same rasteriser
  is the catch: baselines would have to be produced inside the runner's
  container, so updating one after a deliberate design change means pulling an
  artifact down from a CI run rather than looking at your own screen. On a
  design system that is still moving weekly (`sand-neh`), that tax is paid on
  most pull requests, and it buys coverage of the half of the screen that is
  not the map.
- **Assert on the map's rendered style instead of its pixels** — query the
  MapLibre style object and diff that. Deterministic, and it does catch a
  style regression. It is also a test of `protomaps-themes-base`'s output
  rather than of what a reader sees, and the style object is large and
  uninteresting to diff. Worth revisiting if the pack ever hand-authors layers.
- **Screenshots as an artifact with no gate at all.** Where this would have
  landed if the structural assertions had turned out flaky too. They did not —
  three consecutive clean runs, and the one flaky construction was found and
  removed rather than tolerated.
- **Keeping the review on-demand and adding no dependency.** The status quo.
  It caught eight defects once, because someone ran it once. Nothing about it
  prevents the ninth from shipping.

## Consequences

- `playwright` is a devDependency, pinned. CI downloads Chromium once per
  lockfile and caches it under `~/.cache/ms-playwright`.
- The `visual` job runs in parallel with `lint`, `security` and `web`, and
  takes about two to four minutes: build, then four cells — two themes × two
  viewports — off **one load per scene**, which is the whole of what
  `sand-pmz.2.6` bought. The number of scenes is `SCENES.length` in
  `scripts/lib/visual-scenes.mjs` and is deliberately not quoted here; it had
  been quoted in three places that disagreed (`sand-23b.55`). `CONCURRENCY`
  and `SETTLE` tune it; concurrency above two buys little, because software GL
  saturates first.
- **The walk costs what the app's first map render costs, and nothing else is
  close** (`sand-pmz.2.6`, measured with `npm run visual:check -- --timings`,
  which prints the phase table). Per load: `goto`→load ~300 ms, the settle
  1,200 ms, and then a **single main-thread task of about five seconds** —
  software-GL shader compilation, once per WebGL context, once per load. The
  DOM audit's own work inside the page is **2.6 ms**. Whatever the harness
  asks the page for after the settle waits on that one task and is billed for
  it on the harness's stopwatch, which is how PR #119 came to read five
  seconds of the app's boot off the audit's clock and file a bead to optimise
  a function that costs three milliseconds. The phase table now prints both
  numbers — the wall time around `page.evaluate(AUDIT)` and the audit's own —
  so the next person does not have to make the same mistake to find out.
  The remaining lever is loads, and the walk now spends one per scene rather
  than one per scene per viewport.
- **`visual` is a new check, and it is not a required one.** The `main`
  ruleset requires `lint`, `security` and `web`; adding a fourth is a
  repository-settings change, made deliberately and not by this record.
  _(Superseded 2026-08-28 — it is required now; see the phase 2 amendment at
  the end of this record.)_
- Adding a scene is one line in `SCENES` and both the gate and the review walk
  it. Adding a structural defect means fixing it or writing a sentence in
  `scripts/visual-baseline.json` saying why it is allowed.
- **A visible change to colour, type, spacing or map style will not turn this
  red.** That is the deal, and it is written here so nobody later mistakes a
  green `visual` for "the design is unchanged". The screenshots are attached
  to the run; the design review (`docs/design-review.md`) is how they get
  read.

## Amendment — 2026-08-28: two tiers, and the limits written down (`sand-pmz.9`)

`sand-pmz.9` asked whether `visual` should join `lint`, `security` and `web` as
a required check on `main`. The answer is **yes, after narrowing it**. The
narrowing is this amendment. Adding the check is a repository-settings change,
made separately and on purpose — which is what the record above insisted on,
and it still does.

A check that can block a merge should be red only for things everybody has
already agreed are reasons. This gate reported four kinds of finding at one
severity, and they are not equally serious. They are now sorted into **two
outcomes over three severities**, and the table lives in
`scripts/visual-check.mjs` as `SEVERITY`:

| Severity       | What it is                                                                                                          | Costs                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **breakage**   | a scene that did not render at all, including a navigation timeout; a console or page error the app raised          | blocks                            |
| **structural** | `page-h-overflow`, `clipped-x`, `clipped-y`, `overflows-right`, `small-target` — off `scripts/visual-baseline.json` | blocks                            |
| **reported**   | `tiny-text`                                                                                                         | printed on every run, never fatal |

The tiers are legible in the report — three labelled sections, each saying
"none" out loud when it is empty rather than being absent — and in the exit
code:

```text
0  nothing blocking. Reported findings may still have been printed.
1  BLOCKING · breakage    a dead scene, or an error the app raised
2  BLOCKING · structural  a layout defect off the baseline
3  the gate could not run, or is not configured
```

CI needs none of that resolution; any non-zero fails the job, so phase 2 is a
settings change and nothing more. The resolution is for the human reading the
log, who can tell "the app is broken" from "the layout drifted" without
parsing prose, and for anyone who later wraps this.

One thing for whoever flips the switch, which was not true when
`sand-pmz.9` was filed: a merge queue is coming (`sand-pmz.35`, groundwork
landed in PR #164), and a required check runs again for every queue entry. So
requiring `visual` moves its four minutes from once per push to once per merge
as well. That is the right trade for a check that only goes red on breakage and
structural defects — it is the reason for narrowing it first — but it is a cost
to enable with open eyes rather than discover.

**A defect kind with no severity stops the run** (exit 3), rather than
defaulting to either column. This is ADR 0023's argument about a warning kind
with no ceiling, and it holds for the same reason: defaulting to blocking
enforces a rule nobody wrote, and defaulting to reported lets a new class of
defect land silently on the day it is invented. Classifying one is a line in
`SEVERITY` and a sentence saying why.

Three things deliberately did **not** move.

- **`small-target` stays blocking.** It became fatal under `sand-pmz.4`, and
  only because that bead wrote the rule down first — 24×24px, with the two
  inline cases WCAG 2.5.8 names by name carried on the baseline in writing
  (`docs/accessibility.md`). A rule with a written record is a rule a gate may
  hold. It was correctly advisory until it had one.
- **`tiny-text` stays reported.** ADR 0010 put the floor there and the audit
  cannot see the floor's own exemptions: one of the marks still under it is a
  label inside an authored SVG rather than type on a page. It is now printed
  per element rather than as a bare count, because the reported tier is only
  worth having if someone can read it.
- **The baseline did not change.** `scripts/visual-baseline.json` is
  byte-identical across this amendment; no re-baseline was needed and none was
  taken. It now holds the blocking tier only, which is what it always held —
  `--update` has always filtered to the gated kinds — and its `$comment` now
  says so.

## What a green run does not prove

The record above says the gate does not diff pixels, and therefore cannot see
colour, spacing, type or map style. That is true and it is not the whole
truth. A required check is trusted further than an unrequired one, so the rest
of it belongs here, before the requirement lands rather than after.

**Everything the map draws lives inside one `<canvas>`, and this audit reads
the boxes of DOM elements.** The map is half the product; the gate can see the
size of the box it sits in and nothing whatever inside it.

The worked example is PR #161, merged the same night this was written.
`region` is `[west, south, east, north]`, and deck.gl reads a path as a list of
numbers, so the Kidō Butai leaving the Kurils at 147.672°E for a standby point
at 170°W was a step of 317° **westward**: every route crossing the antimeridian
was drawn the long way round the planet, off both edges of the map and back
across Asia. It is not a subtle defect. You can see it from across the room.

The gate was green, on every count, and each of them was working as designed:

1. **Every scene rendered.** A wrongly-drawn path is a path.
2. **Nothing on the console.** deck.gl draws a 317° step without complaint. The
   geometry is valid; it is just not the geometry anybody meant.
3. **No structural defect.** The path is pixels inside the canvas, and the
   canvas's box was exactly the size it should have been.
4. **No pixel comparison** — by design, for reasons that have not changed.

And a fifth, which is worse than the other four because it is cheap to fix:
**the gate never walks that pack.** Every scene in `SCENES` is the seed era or
a chrome page (`gallery.html`, `atlas.html`). Since ADR 0018 a page load is one
era and there are five of them; four have never been walked by this gate at
all, in either theme, at either width. The screenshot artifact a reviewer opens
does not contain the Pacific.

So, plainly, what a green `visual` does **not** prove:

- that colour, type, spacing or map style are unchanged (the original deal);
- that anything drawn on the map is in the right place, the right shape, or
  there at all;
- that any era but the seed one renders;
- that the camera framed the theatre the pack asked for;
- that a human looked at a single screenshot.

### The cheap check that would have caught it

Three candidates, in increasing cost.

**Walk more than one era.** One line per scene: `?pack=1941-pearl-harbor` is a
URL like any other, and the scene list is nothing but URLs. It would not have
gone red on #161 — the track renders "successfully" — but it would have put the
track in the artifact, where the defect is visible at a glance. The gate's cost
is loads, at roughly five seconds of software-GL shader compilation each, so a
representative scene per era is about twenty seconds on the job's four minutes.
Filed as `sand-pmz.9.1`. **Done** — the list now carries `era-1915`,
`era-1917`, `era-1918`, `era-1941` and the `battle-oahu` zoom-in, so every era
is walked in both themes at both widths and the Pacific is in the artifact.

**Assert the drawn extent against the declared region.** The one that would
actually have gone red. After the settle, ask the page for the bounding box of
the geometry the engine handed to the map, and compare its longitude span with
the span of the pack's own `region`. #161 drew about 318° against a declared
106° — off by a factor of three, with no pixel's worth of ambiguity in it. It
has the property this record demands of anything it gates on: it is one number
computed from data already in memory, with no dependence on fonts, rasteriser,
network or timing. Two neighbours come free once it exists — a **token count**
per scene, because a layer that silently draws nothing is the other whole
family of bugs that renders successfully, and a **camera bound**, because
`map.getBounds()` containing the declared region is the framing half of #161.

The price is real and it is not the code. The engine has to publish a handle
for the harness to read, and a debug global is a product surface: it wants to
be conditional on something the gate passes and a reader never does, and it
wants a test of its own, or the assertion is checking a mirror. That is the
argument to have on `sand-pmz.9.2`, where this is filed, and it is why this
amendment describes the check rather than shipping it.

**A pixel diff of the canvas.** Still no, for every reason in the record above.

The honest ranking, though, is that **the cheapest check that would have caught
PR #161 is not in this gate at all.** It is a unit test over the projection
arithmetic, and that is where it now lives: `src/engine/geo.test.ts`, fifteen
cases over `unwrapLngs` and its neighbours, written with the fix. A pure
function turning a list of longitudes into a continuous one is testable in
milliseconds without a browser, and a browser gate that re-checks it pays five
seconds of shader compilation for a weaker answer.

What belongs in the gate is the broader, weaker invariant no unit test can
state: **what the map actually drew is inside what the pack said it would
draw.** That one assertion covers a family — a route the long way round, a
token at a wrapped longitude, a camera framing the complement of its theatre, a
layer that drew nothing — whose members share the only property that matters
here: they all render successfully.

Which is the general rule this amendment would like to leave behind, now that
the check is about to become required. **This gate answers "did it render?"
It does not answer "is it right?"** For "is it right" the instruments are the
unit tests over the engine's arithmetic, the validator over the content, and a
person looking at the screenshots. Making `visual` required makes the first
question non-negotiable, which is worth doing. It does not begin to answer the
second, and the day it is mistaken for doing so is the day it starts doing
harm.

## Amendment — 2026-08-28: phase 2, the switch is flipped (`sand-pmz.9`)

`visual` is now a **required check** on the `main` ruleset. The required
contexts are `lint`, `security`, `web`, `analyze (javascript-typescript)` and
`visual`, and `strict_required_status_checks_policy` stays `true`.

That is the whole of phase 2. The amendment above did the work that made it
safe — two blocking tiers, `tiny-text` demoted to reported, an exit code for a
defect kind nobody classified — and this record exists so that the settings
change is written down somewhere other than the repository's settings page,
which has no history a reader can follow.

### One correction to the amendment above

That amendment told whoever flipped the switch to expect a merge queue, and to
count `visual`'s four minutes twice: once per push, once per queue entry. **The
merge queue is not coming.** GitHub does not offer merge queues for a public
repository owned by a personal account, which is what this repository is
(`sand-pmz.35`; the `merge_group` groundwork in PR #164 is harmless and stays,
since it costs nothing and would be needed if the repository ever moves to an
organisation).

So the cost of requiring `visual` is the simpler one after all — four minutes
per push, not per merge. But the problem the queue was going to solve is still
here, and is now unsolved: required checks are strict, so **every merge
invalidates every other open PR**, and each one has to rebase and re-run the
full set before it can land. With one PR in flight that is free. With three it
is most of the wall-clock cost of shipping, which is what motivated
`sand-pmz.35` in the first place.

The mitigation is procedural rather than mechanical: **keep one PR in flight at
a time.** That is a real constraint on parallel work, and it is worth stating
plainly here, because the obvious way to go faster — several agents opening
several PRs at once — makes the total slower rather than quicker under a strict
ruleset with no queue.

## Amendment — 2026-08-29: the map assertion, and why it is not the one proposed (`sand-pmz.9.2`)

The check proposed above is shipped, and building it found that **as specified
it does not work**. The specification was: take the bounding box of the
geometry handed to the map and compare its longitude span with the pack's
`region`. Measured against the real packs, that comparison is wrong twice.

**It fires on healthy content.** A pack's `region` frames the camera; it does
not clip anything. Every 1914 scene draws 19.9° of longitude against a declared
9°, and correctly so — the pack has a Tannenberg battle and the places registry
reaches 22.2°E. A gate on "drawn inside declared" would have been red on the
seed era from the day it was written.

**And it fires on a correct antimeridian render.** `unwrapLngs` makes a _path_
continuous by moving its points whole turns, and it deliberately leaves each
path's first point where the author put it. So two routes in one layer can
describe the same meridian a full turn apart: the Pacific pack draws one trail
ending at 203° and another sitting at −157.99°. A bounding box over both
measures **361°** against a declared 106° — on a pack that renders perfectly.
Had this been built as specified, its first act would have been to fail the
1941 era for a defect that is not there.

Worse, the proposed measure cannot detect the defect it was designed for.
Unwrapping moves points by whole turns, which leaves the extent of a _set_
unchanged; #161's vertices and the fixed vertices are the same set. A bounding
box cannot separate them even in principle.

### What is asserted instead

**The span of a single path**, on the coordinates the renderer was handed.
This is the invariant `unwrapLngs` exists to establish — no step between
neighbours exceeds 180° — so an unwrapped theatre route is narrow and the same
route left wrapped is most of the planet. It is the same one-number, no-fonts,
no-network, no-timing property the record demands, and unlike a bounding box it
distinguishes the two cases by construction.

The limit is **180°**, and it is a bright line rather than a tuned one: at or
above half the planet, the unwrap did not happen. Measured across every scene
on a healthy tree the widest single path is **55.6°** (`movement-ghost`, the
1918 pack), so the limit sits more than three times clear of the worst honest
case, while #161 measures **317.7°** — which is the 318° this record already
quoted, arrived at independently.

The two neighbours came free as predicted, but only one of them is worth
gating:

- **A scene that drew nothing** is `map-drew-nothing`, and it is **reported,
  not blocking**. `era-1915` is a two-beat pack with no collections and
  legitimately has no geometry today; a gate red on that enforces a rule nobody
  wrote.
- **The point scatter** (`arc`, the narrowest arc containing every placed
  point) is published and not gated at all. Its honest maximum is 182.4° for
  the Pacific, which is indistinguishable from a defect by size alone.

### The product surface

The handle is `window.__sandtableProbe`, set by Playwright with
`addInitScript` before the document exists, and read by
`src/engine/map-probe.ts`. Nothing is computed or published unless it is set.

The obvious flag — `?probe=1` — was rejected, and the URL contract is why:
`parseViewState` collects unknown parameters into `extra` and `formatViewState`
re-emits them (ADR 0009 rule 4), so a probe parameter would be **sticky**,
following a reader into every URL the app writes and every link they copied. A
global has none of that, and a reader cannot set one by visiting a URL at all.

`src/engine/map-probe.test.ts` is the test the record asked for, so the
assertion is not checking a mirror; it carries both the #161 case and the 361°
false positive as data. The gate reports the probe's own liveness on every run
and **exits 3 if no cell published one**, because an assertion that has
silently stopped checking looks exactly like an assertion that passes.
