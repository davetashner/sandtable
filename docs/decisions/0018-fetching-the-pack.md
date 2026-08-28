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
  is a page that says so rather than a page that half-works. The message was the
  loader's `Error`, and giving it a face was follow-up work — done in the
  amendment below.

## Amendment: the failure has a face, and it is not a component (`sand-shn.1.2`)

The consequence above was optimistic. A failed fetch was not "a page that says
so": the loader threw, the module graph never evaluated, and the boot frame in
`index.html` sat there saying **Laying out the campaign…** for as long as the
reader was willing to wait. The record had created a class of failure the app
did not have when the pack was compiled in, and left the first reader on a bad
connection to meet it with no message and no way out.

**The failure state is static markup in `index.html`, revealed by the boot
script, and that follows from the top-level `await` rather than working around
it.** A rejected top-level `await` fails the whole graph: `main.tsx` never
evaluates, React never mounts, and an error boundary — or anything that imports
the pack, or anything that imports _those_ — is exactly the code that is not
running. The only code that can be relied on is code outside the graph. The
boot hook is already outside it and already knows the request went wrong, so it
gets the job (`src/packs/boot-script.ts`); the markup and its styles are inline
beside the boot frame's, for the reason the boot frame's are, and because a
reader whose first request failed is the last reader to spend another one on a
chunk. Nothing in `src/` had to change, which is the test of whether the shape
was right.

Three faces, because there are three ways this goes wrong and they want
different things from the reader:

| what happened                                | what it says                      | the way out               |
| -------------------------------------------- | --------------------------------- | ------------------------- |
| the server answered and said no (4xx)        | that era is not on the table      | **the atlas**, then retry |
| no answer at all, or the server failed (5xx) | the campaign could not be reached | **retry**, then the atlas |
| something arrived the app could not read     | the content arrived damaged       | **retry**, then the atlas |

The third is the schema's, and it is the reason the browser-side Zod parse was
kept above: a bundle that arrives and is refused by `seed.ts` throws at module
scope, which reaches the boot script as an unhandled rejection rather than
through the fetch chain. Both are watched, and both are ignored once React has
committed — the markup is gone by then, so a rejection from the map an hour into
a session cannot put an error page over a working campaign.

**Retry is a reload**, not an in-place refetch, and that is the same decision as
"switching eras is a navigation": one page load is one era, and the top-level
`await` is what makes that true. There is nothing to retry into.

An unknown `?pack=` id is deliberately **not** one of the three. ADR 0009's
amendment settles that case — an id the build never emitted opens the seed era,
so a stale or mistyped link still opens something — and it therefore never
reaches a failure at all. `missing` is what a reader sees when the document the
page actually asked for is not on the server, and the atlas is the way out of
that one.

It costs 6.2 kB of `index.html`, which the `eager` budget counts raw (1.9 kB of
it on the wire, gzipped). That is the price of an error state that needs no
request to render, and it is written here so the next person to look at the
number knows what it bought.

## Amendment: the shared registries are emitted per era (`sand-shn.15`)

"A page load is one era and fetches one era" was true of `content/eras/` and
not true of `content/shared/`. The registries — people, places, sources, and
the generated media and audio indexes — are the union of _every_ era, and the
bundler copied them whole into _every_ bundle. A reader who opened 1914
downloaded the cast, the gazetteer and the bibliography of every other campaign
in the project, and would have gone on doing so as the project grew.

It was found by measurement, not by reading. Adding the Pacific cast to the
people registry (43 entries, `sand-lry.3`) moved the heaviest era from 281.6 to
297.7 kB gzip — and moved the 1915 pack by the same **+16.1 kB**, which
references none of those people. One content pass took the `pack` ceiling's
headroom from 58.4 kB to 42.3 kB, on both packs at once.

That is a different problem from the one the ceiling was sized for, and it does
not have the recorded answer. When `pack` goes red the record above says the
era has become too heavy for one fetch and should be split by chapter
(`sand-shn.1.3`). That cannot help here, because the weight is not that era's:
it belongs to eras the reader did not open. With twenty packs projected
(ADR 0019) the registries alone would exceed the ceiling long before any single
era's own content did, and splitting every era by chapter would not move a byte
of it.

**A bundle carries the shared entities its era reaches, and nothing else.** The
narrowing is `scripts/lib/shared-refs.ts`, and it is the only step in
`pack-bundle.ts` that is not a straight copy of a file.

### The set is found from the bytes, not from the schema

The obvious implementation walks the schema: for each entity kind, visit the
fields that hold shared ids. It is rejected, because the failure modes are not
symmetric. Emitting an entity nothing needs costs bytes. _Not_ emitting one
something needs is an entity that resolves in the validator, passes CI, and is
missing in the browser — a worse bug than the one being fixed, and one the
gates would not see. A hand-written walker is exactly the thing that goes stale
when the schema grows a reference field, and it would be the second answer in
the tree to "what does this era reference".

So the set is found syntactically: every id-shaped token in the era's own bytes
— its pack, its collections, its beats, its schematics — matched exactly
against the registries, then closed under reference until nothing new appears.
Every reference in `content/` is the entity's literal id; nothing in the app or
the content builds one out of parts. The scan is therefore a **superset** of
what any schema walker would find, it costs bytes rather than correctness when
it over-approximates, and it cannot drift when a new field starts holding ids.

One reference is not a literal id and is stated explicitly: `portraitFor` in
`src/packs/media-index.ts` finds a picture by looking up its _sitter_, so a
media entry whose subject is kept is kept too, even though its own id appears
nowhere in the era.

### The guard is worth more than the bytes

Three properties are held by `scripts/pack-bundle.test.ts`, on the real tree:

- **Nothing dangles.** Every id in a finished bundle that names a shared entity
  is in that bundle. Re-read off the emitted bytes rather than off the
  emitter's own walk, so it asks the question the browser will ask.
- **The two answers agree.** `validateContent` now records which shared
  entities each pack resolved (`Report.sharedRefs`), and every one of them must
  be in that pack's bundle. Two resolvers that disagree is how a dangling
  reference reaches production without CI noticing; here they are held against
  each other. (Intersected with what the registries actually hold: the
  validator reads the `media.json` manifests while the bundle carries the
  generated `media/index.json`, and the index lags the manifests —
  `sand-shn.16`.)
- **Portraits survive.** Every person a bundle carries brings their portrait
  with them.

Nothing about validation changed: `npm run validate:content --warnings` is
byte-identical over the current tree.

### Measured

| what                             | before   | after    |
| -------------------------------- | -------- | -------- |
| `1914-schlieffen-marne`          | 307.2 kB | 303.1 kB |
| `1915-attrition`                 | 58.6 kB  | 3.0 kB   |
| `pack` budget (heaviest + index) | 308.1 kB | 304.0 kB |
| every era together (the deploy)  | 366.7 kB | 307.0 kB |

1914 barely moves, and that is the point rather than a disappointment: it is
the era the registries were written for, so it genuinely reaches almost all of
them. The cost was always somebody else's, which is why it was invisible until
there was a second pack. 1915 falls by 94%.

The case the record exists for, measured on the two Pacific content branches
that were finished and held while this landed — the Pacific cast of #146 (43
people) and the Pacific bibliography of #149 (47 sources), neither of which
1914 or 1915 mentions:

| with #146 and #149 applied | 1914     | 1915    | headroom |
| -------------------------- | -------- | ------- | -------- |
| before                     | 334.7 kB | 86.1 kB | 4.4 kB   |
| after                      | 302.5 kB | 3.0 kB  | 36.6 kB  |

Ninety entries about a different ocean took the 1914 reader's download **up by
27.5 kB and the ceiling's headroom down to 4.4 kB** — two content passes from
red, for bytes no 1914 reader has any use for. Emitted per era they take it
_down_ by 0.6 kB, because the only part of those branches 1914 touches is the
handful of existing entries they tidied on the way past. That is the property
worth having, and unlike a raised ceiling it does not decay as the atlas fills
up.

One visible consequence, recorded because it is a change to what is on screen
and not only to what is on the wire: `MapSurface` draws the places it is given,
so the 1914 map now draws the 81 places 1914 refers to rather than all 86 in
the registry. Luxembourg, Sedan, Saint-Dié, Zeebrugge and Allenstein are named
by no 1914 beat, event, route or waypoint, and are no longer labelled. If any
of them belongs on the map it belongs there because some beat says so, which is
the rule everything else on the map already follows.
