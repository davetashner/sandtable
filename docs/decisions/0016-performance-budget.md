# 0016 — The performance budget: bytes are gated, frames are evidence

- **Status:** accepted
- **Date:** 2026-08-25
- **Bead:** `sand-pmz.3`

## Context

`sand-pmz.3` asks for a budget on four things: bundle size, first map paint,
animation frame rate, and what the PMTiles basemap costs in range requests.
Nothing had been measured. The build printed a chunk-size warning, a child bead
(`sand-pmz.3.1`) recorded that "app boot costs about five seconds per scene
under software GL", and both of those were guesses about where the time went.

So the first half of this record is numbers. `scripts/perf-measure.mjs` takes
them, and it distinguishes two kinds:

- **Hermetic** — `dist/` served by `vite preview` with `/assets/*` answered
  from inside the browser, exactly as the visual gate answers it (ADR 0011).
  No S3, no CloudFront, no proxy, no tiles to decode. Repeatable, and a lower
  bound.
- **Live** — the same build with `/assets/*` reaching the real bucket, which
  is the only way the tile numbers mean anything, and which moves with the
  network.

Every headless number below was rasterised by SwiftShader, which is what a CI
runner has. Where a real GPU changes the answer, the answer is given twice.

### What the bundle was made of

The build emitted a 2,058 kB chunk that `index.html` preloaded, and a 1,121 kB
chunk that `App.tsx` reached by `lazy(() => import('./ui/MapSurface.js'))`. The
lazy boundary was there and it was leaking: **the eager chunk contained all of
deck.gl, luma.gl, math.gl, mjolnir.js and part of loaders.gl** — 165 kB gzip of
WebGL that nothing on screen was using yet.

One import edge caused it:

```text
src/main.tsx → App.tsx → ui/SupplyCardView.tsx → engine/logistics.ts
             → engine/layers/movement.ts → @deck.gl/{core,layers,geo-layers,extensions}
```

`movement.ts` held two unrelated things in one file: the geometry of where a
formation is at an instant (`positionAt`, `composeRoutes`), and the deck.gl
layers that draw it. The supply gauges in the dossier ask the first for a
number. Asking it pulled in the second, and with it the entire WebGL stack —
into the bundle a reader downloads before the map has been asked for at all.

Splitting the file in two (`movement.ts` pure, `movement-layers.ts` for the
layers) is the whole fix. It is a file split, not an architectural change:

| gzip, `dist/`                            | before       | after        |
| ---------------------------------------- | ------------ | ------------ |
| **eager** (index.html + what it names)   | **587.0 kB** | **432.2 kB** |
| on demand (map surface, worker, gallery) | 442.7 kB     | 595.7 kB     |
| everything                               | 1,029.7 kB   | 1,027.9 kB   |

The total is unchanged to within two kilobytes, which is the point: no code was
deleted, 155 kB moved from before first paint to after it. The build's
chunk-size warning is gone with it.

What is still eager, and why: the 1914 pack's JSON (~130 kB gzip, bundled until
the lazy pack loader lands — `sand-shn.1`), `react-dom`, `zod` (the pack is
re-validated in the browser, 35 ms), `yaml` (beat front matter), and the
`react-markdown` stack (the dossier's prose, which is on screen immediately).

### First map paint

Three marks on the boot path (`src/engine/perf.ts`) make it measurable:
`sandtable:pack-start` / `pack-ready` around the seed pack's parse, and
`sandtable:map-ready` where MapLibre reports its style live. Median of three
runs, hermetic, 1440×900:

| ms from navigation start | FCP | pack parse | map-ready | load event |
| ------------------------ | --- | ---------- | --------- | ---------- |
| SwiftShader, before      | 252 | 35         | 533       | 700        |
| SwiftShader, after       | 256 | 35         | 528       | 638        |
| Apple M1 Pro (Metal)     | 446 | 34         | 706       | 732        |
| live bucket, SwiftShader | 252 | 35         | 522       | 635        |

Two things this says. First, **the split did not move first map paint, and
could not have**: on localhost 155 kB arrives in single-digit milliseconds. The
bytes matter on a real connection — 155 kB gzip is about a second on a slow
one — and the local number is blind to exactly the case the budget is for.
Second, **`sand-pmz.3.1` was measuring the wrong thing.** App boot to a live
map style is half a second, not five. See below.

### Frame rate while the clock plays

Six seconds of `requestAnimationFrame` intervals, idle and then with playback
started from the Play button:

| 6 s of frames            | idle                    | playing                                  |
| ------------------------ | ----------------------- | ---------------------------------------- |
| SwiftShader, hermetic    | 114 fps (median 8.3 ms) | **18.8 fps** (median 50.3 ms)            |
| SwiftShader, live bucket | 92 fps                  | **10.0 fps** (median 100.0 ms)           |
| Apple M1 Pro (Metal)     | 120 fps                 | **116 fps** (median 8.3 ms, worst 15 ms) |

An empty page in the same headless Chromium runs at 119 fps, so the idle row is
the app costing nothing and the playing row is the app costing frames. On the
laptop the campaign plays at the display's refresh rate with a worst frame of
15 ms. On the runner the same build, the same second of playback, is six times
slower — and with real tiles to decode, twelve times.

That is the entire argument about what may be gated. **The frame rate CI can
measure is SwiftShader's, not the app's**, and the gap between them is larger
than any regression worth catching.

### PMTiles range requests

Against the deployment, twelve seconds of the campaign view, plus three
requests fired straight at the archive:

```text
direct at /assets/tiles/central-europe-z10.pmtiles
  header          206   16384 B    97 ms  Hit from cloudfront  age=208
  interior        206   16384 B   190 ms  Miss from cloudfront
  interior again  206   16384 B    86 ms  Hit from cloudfront  age=1
  cache-control: public, max-age=86400

in the browser, 12 s of the campaign view
  8 requests: 8 answered 206 (range), 0 answered 200 (whole object)
  578.3 kB total · median 123 ms · slowest 163 ms · 8 edge hits
```

There is nothing here to tune. The archive is 541 MB (ADR 0002); a reader
looking at the whole campaign pulls 578 kB of it — about one part in a
thousand — in eight requests, every one of them a partial response, every one
of them served from a CloudFront edge, and a range that misses is in the edge
cache for the next reader a second later. The pmtiles client already coalesces
adjacent tiles: 578 kB over 8 requests is 72 kB a request, not one request a
tile. `scripts/tiles-extract.sh` sets a 24-hour TTL on the object, which is the
right shape for a name that has no content hash in it.

The one thing worth writing down is that this is the **live** answer and cannot
be a gate, for the reason ADR 0011 already gave: range requests through the
`vite preview` proxy fail often enough that the visual gate stubs them
entirely. A budget that depends on S3, CloudFront and the runner's egress being
healthy is a budget that fails for reasons unrelated to the change.

### Where the visual gate's time actually goes

`sand-pmz.3.1` recorded five seconds per scene and attributed it to app boot.
Timing each phase of the walk separately (21 loads, concurrency 2, so the
figures are summed across two contending pages):

| phase, per load     | ms   |
| ------------------- | ---- |
| `goto` → load event | 2085 |
| settle              | 1202 |
| **DOM audit × 2**   | 4316 |
| screenshot × 2      | 986  |

The audit is the largest single item, and it is the harness's own code: it
walks `document.querySelectorAll('body *')` calling `getComputedStyle` and
`getBoundingClientRect` on every element, twice per load, once per theme. App
boot to a live map style is 528 ms on a page with nothing else running.

So the bead's premise does not survive contact with a stopwatch. Making the
bundle smaller made the gate faster by about 7% — 236 s before, 216 s and 223 s
after — which is real, and is about what half a second of boot per load buys. The rest belongs to the audit and to
running two software-GL pages at once — worth its own pass, and not this
record's to make.

## Decision

**Bundle size gets a hard ceiling in CI. First map paint, frame rate and tile
cost get a measurement harness and no gate.**

`scripts/bundle-budget.mjs` runs in the `web` job after the build and fails it
when either of two numbers in `scripts/bundle-budget.json` is exceeded:

| budget    | ceiling      | measured  |
| --------- | ------------ | --------- |
| **eager** | 470 kB gzip  | 432.2 kB  |
| **total** | 1100 kB gzip | 1027.9 kB |

**eager** is index.html and everything it names — the bytes between a reader
and first paint, and the number a change can silently ruin by importing the
wrong module from the wrong file, which is precisely what had happened.
**total** is every emitted chunk, because the eager ceiling alone can be met
forever by pushing bytes behind a dynamic import, and a reader who opens the
map pays for those too. Each carries a `why` in the JSON saying what is in it;
raising a ceiling means editing that sentence in the same commit.

Three things make that a gate rather than a coin toss, in the sense ADR 0011
meant:

**It is a function of the source alone.** No network, no GPU, no fonts, no
timing. The same commit produces the same bytes on a laptop and on
`ubuntu-latest`. Gzip is recomputed locally rather than read off a header, so
it can drift a byte or two with the zlib version; the headroom is three orders
of magnitude larger than that drift.

**It has headroom and a reason, not a high-water mark.** 470 kB is about 9%
above where the split left it — room for ordinary growth, and a stop well
before the number doubles by accident. A budget re-baselined on every push is
not a budget, so `--update` rewrites `measuredKb` and never touches the
ceiling.

**It says what to do when it goes red.** The failure prints the chunk list and
points at `npm run perf`, which prints what every chunk over 60 kB is made of,
by npm package, read off the sourcemap. That is how the deck.gl leak was found,
and it is the first thing to run when the ceiling is hit.

The other three are reported by `npm run perf` and read by a human:

- **first map paint** — hermetic and repeatable, but blind on localhost to the
  thing the budget is for (bytes over a slow link), and on a runner it measures
  SwiftShader's WebGL context creation.
- **frame rate** — 18.8 fps on the runner, 116 fps on the laptop, same build,
  same second. A CI threshold either sits below the runner's number, in which
  case it catches nothing, or above it, in which case it is red on every run.
- **PMTiles cost** — depends on S3, CloudFront and the runner's egress. ADR
  0011 stubbed the bucket for exactly this reason.

Each of them still has a written expectation, so a report can be read against
something. These are targets, not gates:

| number                     | expectation                      | measured today       |
| -------------------------- | -------------------------------- | -------------------- |
| first contentful paint     | under 1 s on a warm connection   | 256 ms hermetic      |
| map style live             | under 1.5 s                      | 528 ms hermetic      |
| seed pack parse            | under 100 ms                     | 35 ms                |
| playback, real GPU         | 60 fps, no frame over 32 ms      | 116 fps, worst 15 ms |
| playback, software GL      | no expectation — not the product | 18.8 fps             |
| tiles, whole campaign view | under 1 MB, every response a 206 | 578 kB, 8/8 partial  |

## Alternatives considered

- **Gate the frame rate on the runner.** The obvious reading of the bead. The
  measurement above is the answer: the runner and the laptop differ by 6× on an
  unchanged build, and the run-to-run spread under SwiftShader is wider than
  any regression that would matter. It would be the resize lottery of ADR 0011
  with worse odds.
- **Gate first map paint.** Tempting, because it is the number a reader
  actually feels. Rejected for a subtler reason than flakiness: measured
  hermetically on localhost it is blind to bandwidth, which is the only thing
  the bundle budget is trying to protect, and measured live it depends on the
  bucket. It would be a gate on WebGL context creation wearing the name of
  something else.
- **Gate the PMTiles byte count or request count.** It is a real number and it
  would catch a genuinely bad regression — a style that suddenly asks for z14
  everywhere. But it needs the live bucket, and ADR 0011 already established
  that the bucket is not something a gate may depend on. Revisit if the tile
  fetch is ever exercisable against a fixture.
- **Gate per-chunk sizes rather than eager/total.** Rejected because chunk
  names are rolldown's to choose and a legitimate refactor renames them. Two
  aggregates survive refactoring; a per-chunk table would be red on the day
  someone splits a component.
- **Lower `chunkSizeWarningLimit` and call the build warning the budget.** It
  is a warning, not a failure, and it counts minified bytes rather than
  transferred ones and cannot tell eager from lazy — it was 1800 kB and stayed
  green through the whole deck.gl leak. It stays, silencing a generic message
  about a map chunk that is large by nature; the number that is held is in
  `bundle-budget.json`.
- **Lazy-load the pack JSON in this change.** ~130 kB gzip of the eager bundle
  is the 1914 pack, bundled by `src/packs/seed.ts` as an explicit stop-gap
  until the lazy pack loader lands (`sand-shn.1`). Doing it here would
  pre-empt that bead's design and would not shrink what a reader on the
  campaign page needs anyway. Left where it is, and named in the budget's
  `why` so the next person reads it there.

## Consequences

- `npm run bundle:budget` is a required step of the `web` job, which is a
  required check. **A pull request that puts a heavy import in the shell's
  reach now fails**, with the chunk list and the reason printed.
- It reads `dist/` and **refuses when `dist/` is older than `src/`, `content/`
  or the build config** (`sand-pmz.31`). In CI `build` runs immediately before
  it and the reading is always fresh, which is exactly why the trap was
  invisible: it only springs for a human running it by hand, which is the case
  where the answer is being used to decide something. Refusing rather than
  rebuilding is deliberate — a thirty-second build nobody asked for is its own
  confusion. The check is skipped when `CI` is set, where it has nothing to
  catch and a checkout's uniform mtimes could only make it wrong.
- `npm run perf` is the harness: `--live` for the real bucket, `--headed` for a
  real GPU, `--runs N`, `--json` for a machine-readable dump. It needs a build
  and Chromium (`npx playwright install chromium`), the same browser the visual
  gate uses.
- Three `performance.mark` calls live in the app on purpose
  (`src/engine/perf.ts`). They are guarded, nothing reads them at runtime, and
  removing them makes the boot path unmeasurable.
- `engine/layers/movement.ts` may not import deck.gl again. The comment at the
  top of both halves says so and says why; nothing enforces it but the budget,
  which is the point — the ceiling is what notices.
- **The budget does not say the app is fast on a phone.** Nothing here was
  measured on one, and `npm run perf` has no throttling. It says the bytes
  before first paint have a ceiling, and it gives a harness for the rest;
  measuring a cold load on a phone over a slow link is follow-up work.
- `prefers-reduced-motion` is untouched: the reduced-motion path makes the
  camera jump rather than fly (`docs/accessibility.md`), and the frame
  measurement deliberately samples the animated case, which is the expensive
  one.
