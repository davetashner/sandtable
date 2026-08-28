# Sandtable — Roadmap

An interactive history simulation and learning companion. It begins with the
Schlieffen Plan and the 1914 campaign in the West, grows to cover all of the
First World War, follows the causal chain through the interwar years into the
Second World War, and is built from the start so that other eras can be added
as data rather than as new applications.

The backlog of record is **beads** (`bd ready`, `bd show <id>`). This document
is the narrative overview; the issue IDs below point into it.

## Thesis

1. **Content is data, the engine is generic.** A "scenario pack" (JSON +
   Markdown) describes formations, routes, events, battles, branches, tech and
   science cards, narrative and sources. The engine renders any pack on a real
   map with a timeline. This is what lets one app eventually host many periods.
2. **Real geography.** Battle zoom-ins need real terrain and towns, so the
   engine standardises on MapLibre + self-hosted vector tiles with period
   borders overlaid; the PoC's schematic style survives only as an inset.
3. **Honest counterfactuals.** "Where it would have succeeded" is an authored,
   clearly-labelled branch with the historiographical debate attached — not the
   output of a wargame engine (a research spike is parked in Phase 6).
4. **Context, not just combat.** Two parallel strands run alongside the
   campaigns: the technology that shaped them, and the science and ideas that
   were happening at the same time. Both carry "connections" forward to later
   consequences — the geopolitics thread that links 1914 to today.
5. **Sleek is a deliverable.** The visual identity (lamp-lit General Staff war
   room; Fraunces + IBM Plex; brass, oxblood, slate) is a cross-cutting epic,
   not a polish step.

## Phases

| Phase | Epic                                                | Outcome                                                                                              |
| ----- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 0     | `sand-a55` Foundation & platform kernel             | The PoC re-implemented on the real engine, on real geography, deployed.                              |
| 1     | `sand-1l0` Schlieffen Plan & the march to the Marne | The headline experience: all armies, branches, seven battle zoom-ins, guided tour.                   |
| —     | `sand-w9t` Technology & innovation layer            | Tech rail; 1914 cards first, then the rest of WWI, later WWII.                                       |
| —     | `sand-9u2` Science & ideas "Meanwhile" layer        | Physics 1905–1919 and more, with forward connections.                                                |
| 2     | `sand-en0` WWI Eastern Front                        | Tannenberg → Brest-Litovsk, cross-linked to the West.                                                |
| 3     | `sand-g80` WWI Western Front 1915–18                | Trench-line layer; Verdun, Somme, 1917, 1918 zoom-ins.                                               |
| 3     | `sand-aie` Other fronts & the war at sea            | Gallipoli, Italy, Middle East, Jutland, U-boats.                                                     |
| 4     | `sand-ekc` Interwar & the causal chain              | Causal-chain explorer; Versailles → 1939.                                                            |
| 5     | `sand-lry` WWII Pacific                             | Mukden 1931 → Okinawa 1945; authored first, because it is the harder engine test (ADR 0019).         |
| 5     | `sand-kq6` / `sand-c6p` WWII West / East            | Opens with 1940 as the echo of 1914 (route overlay); Easy Company as a thread across the packs.      |
| 6     | `sand-shn` Learning companion & platform            | Multi-era packs, tours, sources, search, authoring tools.                                            |
| pre   | `sand-mny` Franco-Prussian War 1870–71              | The template for 1914: Sedan, Alsace-Lorraine, the fortress line; "Road to 1914" thread.             |
| pre   | `sand-6dh` Russo-Japanese War 1904–05               | Port Arthur, Mukden, Tsushima; why the memorandum was written in Dec 1905; "Korea 1905–1953" thread. |
| —     | `sand-y0u` Imagery & media                          | Real archive photographs, colorized and labelled, never gory; uniforms & kit.                        |
| —     | `sand-neh` Design system                            | Tokens, map style, components, motion.                                                               |
| —     | `sand-23b` Content quality & historical review      | Citation standard, fact-check workflow, historiography.                                              |
| —     | `sand-pmz` Engineering quality                      | CI, visual regression, performance, accessibility.                                                   |

Phase 0 blocks Phase 1; Phase 1 blocks 2, 3, 6 and the other fronts; Phase 3
blocks 4; Phase 4 blocks all three parts of 5. The cross-cutting epics run
alongside from the start.

Phase 5 is sequenced Pacific → West → East, decided in
[ADR 0019](decisions/0019-second-world-war-arc.md). The Pacific goes first
because it is the theatre that breaks the engine's land assumptions — an ocean
rather than a front, a scale that jumps three orders of magnitude between the
crossing and the beach — and those breaks are cheaper to find before ten
European packs have been written against the current shape. The audit ran
before any content did and turned up a real defect: the movement pace bands in
`src/packs/validate/pace.ts` are 1914 numbers that would reject every carrier
and every strike aircraft in the arc (`sand-lry.2`).

The WWII arc also settles how packs are named once a year holds more than one
of them: a new pack's `idPrefix` is its directory name (`1942-midway`), while
`1914` and `1915` keep the bare year rather than break their published
deep links.

## Phase 0 in detail (where work starts)

Five decisions are open and unblocked — they are the first things to settle:

- `sand-a55.1` stack: Vite + TypeScript + React; MapLibre GL + deck.gl
- `sand-a55.2` geography: self-hosted PMTiles + historical-basemaps borders
- `sand-a55.3` scenario packs as the platform kernel
- `sand-a55.4` static hosting (Cloudflare Pages or GitHub Pages) + Actions
- `sand-a55.5` counterfactuals as authored branches

Then, in dependency order: scaffold → schema + timeline + map → movement layer,
dossier, branches, focus/zoom-in → **port the PoC** (`sand-a55.15`,
the Phase 0 exit gate) → deploy.

## Phase 1 in detail (the headline)

The lesson has an argument — **"a timetable the world fell behind"** — written
first as a narrative spine with learning objectives (`sand-1l0.17`,
P0) that every beat must serve. The experience opens with the July Crisis as a
causal chain (`1l0.23`, the first showcase of the causal explorer, pulled
forward from Phase 4) and a thirty-second opening sequence (`1l0.26`).

Three persistent instruments carry the argument while the armies move:
the **two clocks** (plan timetable vs. reality; Russian mobilization,
`1l0.18`), **the right wing bleeds** (detached-corps tally and the
Schlieffen-vs-Moltke force ratio, `1l0.19`), and **rail vs. feet** (railheads,
supply gap, march distance, and Joffre's redeployment west by train, `1l0.21`).

Order of battle and daily routes for every army are the core dataset. Battle
zoom-ins are tiered: full sub-timelines for **Liège**, **Lorraine/Morhange**,
**the Frontiers in the north & the Great Retreat** (Charleroi–Mons–Le Cateau),
**Guise**, and **the Marne** (hour resolution); the Ardennes and the Grand
Couronné are narrative chapters without sub-timelines. Belgium beyond Liège
(Antwerp, Namur, Maubeuge) feeds the tally.

Four **decision points** (`1l0.22`) pause the campaign — 25 Aug, 30 Aug,
4 Sep, 8–9 Sep — and ask the viewer to choose before revealing what happened
and what historians think. The "success" branch is framed as _what it would
have required_, with a visible feasibility checklist. Human scale comes from a
restrained casualty layer and sourced vignettes; authenticity from a `Document`
entity with the actual orders. Then an epilogue to the trench line, the
East–West cross-reference, a guided tour, a polish pass and a historical review.

**Information architecture** (`sand-neh.5`, a P0 design decision):
one map, one dossier, one timeline. Technology, science, documents, decisions
and causal chains are glyphs on the timeline that open cards in the dossier —
never additional rails. Responsive from day one.

## Multi-era layout (decided in `sand-a55.3`, built in `a55.6`/`a55.18`)

```text
content/
  eras/<yyyy>-<slug>/      one self-contained scenario pack per campaign or period
                           1870-franco-prussian, 1904-russo-japanese, 1914-july-crisis,
                           1914-schlieffen-marne, 1914-tannenberg, 1940-fall-of-france, 1950-korea …
  shared/                  cross-era registries packs reference by ID
    people/  places/  sources/  geo/borders/<year>.geojson  links/  media/
  threads/<slug>/          curated learning paths across packs
                           road-to-1914, the-german-way-of-war-1870-1940, korea-1905-1953 …
```

Entity IDs are era-qualified (`1870:sedan`, `1914:marne`) so a `CausalLink`
can point across packs; a pack is valid alone, `shared/` is its only
cross-pack dependency, threads are optional. Tiles are a low-zoom world
extract plus per-era regional extracts declared by each pack (Manchuria for
1904–05 is the first non-European one). Prequel eras are P3 — after Phase 1
proves the engine — but the layout exists from the scaffold so nothing has to
be restructured to add them.

## Imagery (`sand-y0u`)

Real period photographs from open archives (Wikimedia Commons/Bundesarchiv,
Library of Congress, NARA, Gallica, IWM where the licence allows), colorized
only when a faithful colorization exists or we produce one from the public-
domain original — always labelled "colorized" with the original one click
away, always credited, never gory. A `Media` entity in the schema, a
reproducible pipeline, one strong image per dossier beat, and a "uniforms &
kit" feature (Pickelhaube and feldgrau vs. pantalon rouge and capote vs. BEF
khaki).

## What exists today

- `poc/schlieffen-plan.html` — the single-file proof of concept (SVG schematic
  map, three army groups, concept-vs-execution toggle, day scrubber, dossier).
  It is the reference for engine parity in Phase 0 and the source of the visual
  identity.

## Working conventions

- Find work with `bd ready`; claim with `bd update <id> --claim`; close with
  `bd close <id> --reason "..."`.
- Decisions are `decision`-type beads; when settled, write
  `docs/decisions/NNNN-*.md` and close the bead.
- Content changes cite sources (see the content-quality epic) and pass the pack
  validator in CI.
