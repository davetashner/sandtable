# 0011 — The visual gate: structure is checked, pixels are evidence

- **Status:** accepted
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
   not.

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

**The viewport gets a fresh load.** The theme does not — `emulateMedia`
recolours the page without moving a box, so both themes are audited off one
load — but the viewport is reached by opening the scene again in a context of
that size. It costs about ninety seconds of the run and it is the difference
between three green runs in a row and the resize lottery described above.

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
  takes about three to six minutes: build, then seventy-six cells at roughly
  two and a half seconds each. `CONCURRENCY` and `SETTLE` tune it; concurrency
  above two buys little, because software GL saturates first.
- **`visual` is a new check, and it is not a required one.** The `main`
  ruleset requires `lint`, `security` and `web`; adding a fourth is a
  repository-settings change, made deliberately and not by this record.
- Adding a scene is one line in `SCENES` and both the gate and the review walk
  it. Adding a structural defect means fixing it or writing a sentence in
  `scripts/visual-baseline.json` saying why it is allowed.
- **A visible change to colour, type, spacing or map style will not turn this
  red.** That is the deal, and it is written here so nobody later mistakes a
  green `visual` for "the design is unchanged". The screenshots are attached
  to the run; the design review (`docs/design-review.md`) is how they get
  read.
