# History Alive — Roadmap

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

| Phase | Epic | Outcome |
|---|---|---|
| 0 | `history-alive-a55` Foundation & platform kernel | The PoC re-implemented on the real engine, on real geography, deployed. |
| 1 | `history-alive-1l0` Schlieffen Plan & the march to the Marne | The headline experience: all armies, branches, seven battle zoom-ins, guided tour. |
| — | `history-alive-w9t` Technology & innovation layer | Tech rail; 1914 cards first, then the rest of WWI, later WWII. |
| — | `history-alive-9u2` Science & ideas "Meanwhile" layer | Physics 1905–1919 and more, with forward connections. |
| 2 | `history-alive-en0` WWI Eastern Front | Tannenberg → Brest-Litovsk, cross-linked to the West. |
| 3 | `history-alive-g80` WWI Western Front 1915–18 | Trench-line layer; Verdun, Somme, 1917, 1918 zoom-ins. |
| 3 | `history-alive-aie` Other fronts & the war at sea | Gallipoli, Italy, Middle East, Jutland, U-boats. |
| 4 | `history-alive-ekc` Interwar & the causal chain | Causal-chain explorer; Versailles → 1939. |
| 5 | `history-alive-kq6` / `history-alive-c6p` WWII West / East | Opens with 1940 as the echo of 1914 (route overlay). |
| 6 | `history-alive-shn` Learning companion & platform | Multi-era packs, tours, sources, search, authoring tools. |
| — | `history-alive-neh` Design system | Tokens, map style, components, motion. |
| — | `history-alive-23b` Content quality & historical review | Citation standard, fact-check workflow, historiography. |
| — | `history-alive-pmz` Engineering quality | CI, visual regression, performance, accessibility. |

Phase 0 blocks Phase 1; Phase 1 blocks 2, 3, 6 and the other fronts; Phase 3
blocks 4; Phase 4 blocks both halves of 5. The cross-cutting epics run
alongside from the start.

## Phase 0 in detail (where work starts)

Five decisions are open and unblocked — they are the first things to settle:

- `history-alive-a55.1` stack: Vite + TypeScript + React; MapLibre GL + deck.gl
- `history-alive-a55.2` geography: self-hosted PMTiles + historical-basemaps borders
- `history-alive-a55.3` scenario packs as the platform kernel
- `history-alive-a55.4` static hosting (Cloudflare Pages or GitHub Pages) + Actions
- `history-alive-a55.5` counterfactuals as authored branches

Then, in dependency order: scaffold → schema + timeline + map → movement layer,
dossier, branches, focus/zoom-in → **port the PoC** (`history-alive-a55.15`,
the Phase 0 exit gate) → deploy.

## Phase 1 in detail (the headline)

Order of battle and daily routes for every army (the core dataset), a prologue
on the plan's origins, then battle zoom-ins: Liège, Lorraine/Morhange,
Ardennes & Charleroi, Mons & Le Cateau, Guise, Grand Couronné, and the Marne
(hour-resolution). Two counterfactual branches (Schlieffen's concept west of
Paris; the pocket closing), an epilogue to the trench line, the first East–West
causal link (the two corps sent to Tannenberg), a guided-tour mode, a visual
polish pass and a historical review pass.

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
