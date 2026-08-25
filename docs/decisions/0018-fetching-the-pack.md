# 0018 — The pack is fetched, not bundled, and content gets a budget of its own

- **Status:** accepted
- **Date:** 2026-08-25
- **Bead:** `sand-shn.1.1`

## Context

`src/packs/seed.ts` imported the 1914 pack — twenty-two JSON files, seventy-four
Markdown beats, three SVG schematics, the shared people/places/sources
registries and the generated media and audio manifests — straight into the
bundle. Everything downstream read the parsed result at module scope, which is
what made it convenient and what made it expensive.

ADR 0016 measured that bundle, gated it at 470 kB gzip eager, and listed
"lazy-load the pack JSON" among the things it deliberately did **not** do,
because doing it there would have pre-empted this bead. Two content beads then
went 5 kB over a ceiling with 2.7 kB of headroom left, the ceiling was raised to
490, and the reason written into `scripts/bundle-budget.json` said plainly what
had happened: of the 7.7 kB those beads added, **7.4 kB was the prose and
0.3 kB was the component**. Every content pull request had become a performance
pull request, paying a toll it did not cause.

The stay of execution the raise bought lasted one pull request. At `d12fa91`,
the tip this branch is cut from, the eager bundle is **483.5 kB against the
490 kB ceiling — 6.5 kB of headroom, and the content merged in #125 had taken
8.5 kB of it by itself.** The next contested point would have been over.

### The estimate was wrong, and wrong in the useful direction

ADR 0016 put the pack at "~130 kB gzip" of the eager bundle. It got there by
share of source characters: the sourcemap said `content/` was 1,067 kB of a
2,667 kB chunk, so about 40%, so about 40% of 456 kB. Measured rather than
apportioned, the pack is **277.4 kB gzip — 57% of the eager bundle**, because
minified JavaScript gzips better than prose does. Removing it was worth twice
what the record thought.

| gzip, `dist/`                                 | before       | after        |
| --------------------------------------------- | ------------ | ------------ |
| **eager** (index.html + what it names)        | **483.5 kB** | **206.1 kB** |
| code on demand (map surface, worker, gallery) | 598.7 kB     | 599.5 kB     |
| **the content bundle**, fetched               | —            | **279.4 kB** |
| everything                                    | 1,082.2 kB   | 1,085.1 kB   |

The total is unchanged to within three kilobytes, which is the point again: no
content was deleted, 277 kB moved off the path between a reader and the first
frame. The three kilobytes it did grow are the JSON's own punctuation: a
standalone document repeats the keys that a shared gzip window inside one chunk
was able to fold together.

## Decision

**One era's content is one JSON document, emitted to `dist/pack/`, fetched from
the app's own origin, and re-validated with the schema on arrival. The bundle
budget is decomposed so that code and content have separate ceilings.**

### Where it is served from

`/pack/<id>-<hash>.json`, and deliberately **not** `/assets/`. `/assets/*` is
the bucket — tiles, borders, media — and the visual gate answers all of it from
inside the browser (ADR 0011): a transparent pixel, an empty
`FeatureCollection`, an empty PMTiles archive. A pack served from there would
have arrived as `{"type":"FeatureCollection","features":[]}` and every one of
the gate's 96 cells would have failed. The app's own origin is the honest home
for the app's own content, the gate needs no new special case, and the CloudFront
SPA rewrite passes the path through unchanged because it has a file extension.

The name carries a content hash of the bytes, so `scripts/deploy-static.sh`
syncs `pack/` with the same one-year immutable header as `app/`. The build is
deterministic — files read in sorted order, no timestamp in the document — so
an unchanged `content/` keeps its URL and the header is not a lie.

### The loader is an async module, and that is the whole shape

`src/packs/pack-loader.ts` fetches the bundle at **top level `await`**. Sixty-odd
files read the pack at module scope — `App.tsx` computes its clock range, its
cast and its movement source there; `src/gallery/specimens.tsx` builds all 57
specimens from it — and an async module makes every one of those importers async
without a line of change in any of them. **Five import sites, three modules
rewritten, zero call sites touched.** The tests did not change either: 493 of
them pass against the fetched pack exactly as they passed against the bundled
one.

Nothing about the fetched document is trusted. `seed.ts` still parses every
field with the Zod schema, which is why zod stays in the eager bundle and is
where it earns its place: 34 ms to validate what the network handed us, rather
than assume it.

### First paint does not wait for it

An async module suspends everything that imports it, so the app cannot render
until the pack lands. Two things keep that off the critical path:

- **The fetch starts before the JavaScript does.** The Vite plugin puts four
  lines of inline script in `<head>` that call `fetch` and park the promise on
  `window.__sandtablePack`; the loader awaits that promise rather than issuing
  its own. By the time the module graph has downloaded, the answer is usually
  already there. A `<link rel="preload" as="fetch">` would be the idiomatic way
  to say this, and it is the wrong tool: it has to match the eventual request's
  CORS and credentials mode to be reused, and a mismatch downloads the pack
  twice. The gate confirms the count — one request, not two.
- **The shell paints from the markup.** `index.html` carries a boot frame —
  the wordmark and one line — that React replaces on its first commit. First
  contentful paint therefore no longer depends on JavaScript at all.

Median of five runs, hermetic, SwiftShader, 1440×900:

| ms from navigation start | FCP     | pack parse | map-ready | requests |
| ------------------------ | ------- | ---------- | --------- | -------- |
| cold open, before        | 300     | 38         | 538       | 32       |
| cold open, after         | **140** | 34         | 567       | 36       |
| campaign day 20, before  | 248     | 35         | 525       | 33       |
| campaign day 20, after   | **124** | 35         | 560       | 37       |
| battle zoom, before      | 236     | 35         | 514       | 32       |
| battle zoom, after       | **128** | 34         | 545       | 36       |

First paint is about half what it was and barely moves between scenes, because
it is the same markup in every scene. Frame rate is unchanged — 113 fps idle,
19 fps playing under SwiftShader, both sides — which is what it should be: this
record does not touch a single frame of the campaign.

**Map style live is 20 to 40 ms slower**, and that is the honest cost of the
change: on a loopback connection an extra round trip buys nothing, because the
277 kB it saves cost nothing to send. ADR 0016 already said this measurement is
blind to the case the budget exists for — 277 kB gzip is well over a second on
a slow link, and one round trip is not. The tempting fix is to prefetch the map
chunk at boot so it flies alongside the pack; that is rejected here for the same
reason the dynamic-import bootstrap is, one paragraph down: it would move 400 kB
onto the cold-load wire without moving it onto any ceiling.

### Three budgets, because content and code grow for different reasons

`scripts/bundle-budget.json` had `eager` and `total`. It now has three:

| budget    | ceiling | measured | what moves it                    |
| --------- | ------- | -------- | -------------------------------- |
| **eager** | 230 kB  | 206.1 kB | shell code before first paint    |
| **code**  | 890 kB  | 805.6 kB | every emitted chunk under `app/` |
| **pack**  | 340 kB  | 279.4 kB | the fetched content bundle       |

The decomposition was checked against the thing it is for. Rebasing this branch
onto `d12fa91` — one content pull request, two more contested points —
moved `pack` by **+8.2 kB and `eager` and `code` by 0.0 kB each**. On `main` the
same content moved `eager` by +8.5 kB against 6.5 kB of headroom.

`total` is renamed `code` and no longer counts the pack, because a ceiling a
content pull request can turn red is precisely the toll this record removes.
The content is still gated — it is still downloaded on every cold load — but on
a line of its own, with headroom sized to how content actually grows rather than
to how code does. `npm run perf` still prints the sum.

**`eager` comes down from 490 to 230.** A budget with slack nobody intends to
use is not a budget, and the 277 kB of slack this change created is not slack:
it is content that moved to a different line.

When `pack` goes red the answer is not a bigger number. It is that one era has
become too heavy for one fetch, and the document should be split — by chapter,
or by era, which is what `sand-shn.1`'s atlas landing page will want anyway.

## Alternatives considered

- **Serve it from `/assets/`.** It is where content lives on the bucket, and it
  is exactly wrong: the visual gate stubs `/assets/*` inside the browser, so the
  pack would arrive as an empty `FeatureCollection` and all 96 cells would fail.
  Teaching the stub about the pack was the alternative — it would mean the gate
  carries a copy of the content, or reads `content/` from disk and reaches
  through the hermetic boundary ADR 0011 drew. Serving the app's content from
  the app's own origin needs neither.
- **A React `Suspense` boundary around the app.** The idiomatic shape, and the
  most expensive one here: `App.tsx` and `specimens.tsx` derive from the pack at
  module scope, so it would mean threading the pack through context or props and
  giving every derivation a "not yet" path — a large diff across the app and the
  gallery, in exchange for a frame with no map, no timeline and no dossier in it.
  The static boot frame is the same promise to the reader for twenty lines of
  HTML, and it paints sooner than any component could.
- **An async bootstrap in `main.tsx` that dynamically imports `App`.** Small,
  and it quietly breaks the gate it is meant to serve: `bundleReport` counts what
  `index.html` names, so moving `App` behind a dynamic `import()` would drop the
  whole app out of the eager number without a byte leaving the critical path. A
  budget that can be met by hiding from it is worse than no budget.
- **Keep the JSON imports and split the chunk.** Rollup will put the pack in a
  chunk of its own if asked, but `index.html` still modulepreloads it, because
  the module graph still needs it before evaluation. It moves the bytes in the
  report and not on the wire.
- **Fetch each content file separately.** Twenty-two JSON files plus
  seventy-four beats is ninety-nine requests, which is ninety-eight more round
  trips for a page that needs all of them. One document, one hash, one immutable
  cache entry.
- **Drop the browser-side Zod validation now that the pack is a fetched
  document.** Tempting — it is 34 ms and it is most of what zod costs in the
  eager bundle. Rejected in the other direction: a document fetched over a
  network is _more_ in need of validation than one compiled in, and the parse is
  what turns a 404 answered with an HTML error page into a legible failure
  rather than sixty `undefined is not an object`s.
- **A `<link rel="preload" as="fetch">` instead of the inline script.** See
  above: preload reuse depends on matching the request's CORS and credentials
  mode, and a mismatch fetches the pack twice. Four lines of script have no such
  rule.

## Consequences

- **`src/packs/pack-loader.ts` is the only module that knows where the pack
  comes from.** `seed.ts`, `media-index.ts` and `audio-index.ts` read the
  fetched document; nothing else changed.
- **Top-level `await` is now load-bearing.** The build target is ES2022 and
  Rollup emits it, but a module that imports the pack is an async module, and
  the boot path depends on that. It is written down here because it is the sort
  of thing a later refactor removes without noticing what it was for.
- **`content/` is read by a build step, not by the module graph.**
  `scripts/lib/pack-bundle.ts` assembles the document; `scripts/lib/vite-plugin-pack.ts`
  emits it in a build, serves it from a middleware in `vite dev`, and — under
  Vitest, where there is no server for the page to fetch from — inlines it into
  the same virtual module the loader imports. The fetch path itself is covered
  by `src/packs/pack-loader.test.ts` rather than by the harness.
- **Editing a beat no longer restarts the dev server**, and no longer changes a
  single byte of the JavaScript bundle.
- **The deploy has a third sync pass.** `dist/pack/` goes up with the immutable
  header, like `dist/app/`; `--delete` still removes stale bundles, and the
  hash in the name means an old one is never read after the HTML that names it
  is replaced.
- **The reader now sees a boot frame on a cold load.** It is markup in
  `index.html`, styled inline, and it is the first thing that has ever been on
  screen before the bundle evaluated. `gallery.html` has none: it is a review
  surface, and a blank moment there costs nobody anything.
- **Nothing here makes the app work offline or without JavaScript.** The pack is
  a network dependency now, where before it was part of the code; a failed fetch
  is a page that says so rather than a page that half-works. The message is the
  loader's `Error`, and giving it a face is follow-up work.
