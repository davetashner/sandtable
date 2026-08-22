# 0003 — Data-driven scenario packs as the platform kernel

- **Status:** accepted
- **Date:** 2026-08-22
- **Bead:** `sand-a55.3`

## Context

Sandtable begins with one campaign but is meant to hold all of the First
World War, the interwar chain, the Second World War, the prequels (1870,
1904–05) and eventually other periods altogether. If each scenario were
written as application code, every new era would be a new app and the
cross-era ideas the project exists for — causal chains, recurring people,
threads like "Sedan → Schlieffen → Sichelschnitt" — would have nowhere to
live. The engine must be generic and the content must be data.

## Decision

**Content is data; the engine is generic.** A _scenario pack_ is a directory
of JSON (validated by JSON Schema generated from TypeScript types) plus
Markdown narrative. The engine renders any valid pack.

### Layout

```text
content/
  eras/<yyyy>-<slug>/       one self-contained pack per campaign or period
    pack.json               id, title, date range, region, border year, default camera
    formations/ routes/ events/ battles/ beats/*.md decisions/ sources.json media.json
  shared/                   cross-era registries packs reference by ID
    people/ places/ sources/ geo/borders/<year>.geojson links/ media/
  threads/<slug>/           curated learning paths sequencing packs and beats across eras
```

### Entities

Scenario/Pack · Branch · Formation · Route (waypoints `[lng, lat, ISO time]`)
· Place · Person · Event · Battle (a focus with its own region, zoom, time
range and sub-entities) · DecisionPoint · TechCard · ScienceCard · Document ·
Media · NarrativeBeat (time range × branch × focus → Markdown with citations)
· Source/Citation · CausalLink · Thread.

### Rules

- **IDs are era-qualified** (`1870:sedan`, `1914:marne`,
  `person:moltke-helmuth-von-younger`), so a `CausalLink` or a `Thread` can
  point across packs.
- **A pack is valid alone.** `shared/` is its only cross-pack dependency;
  threads are optional. The validator resolves every reference and fails on
  dangling ones.
- **Time is absolute** ISO-8601; the engine derives day counters and
  sub-day battle clocks.
- **Branches share a prefix** and diverge at a timestamp (see 0005).
- **Every factual claim cites a Source** (content-quality epic `sand-23b`);
  the validator enforces required citations on beats, routes and battles.
- **No by-war hierarchy** (`content/ww1/…`): events belong to several
  stories at once; the flat era list plus threads handles that.

## Alternatives considered

- **Scenarios in TSX / code.** Fastest for the first scenario; a dead end for
  the tenth and unusable for non-programmer authoring.
- **A CMS or database back end.** Unnecessary for a static site; adds
  operations and cost; Markdown + JSON in git gives review, history and
  agent-friendliness for free.
- **One giant world timeline instead of packs.** Simpler in theory, but
  loading, authoring and validating a single monolith gets worse with every
  era; packs load lazily and validate independently.
- **MDX (React in Markdown) for beats.** Tempting for rich beats, but it
  couples content to the React runtime and breaks the "engine-agnostic data"
  rule. Beats stay plain Markdown with a small set of directives.

## Consequences

- Phase 0 ships the schema, validator CLI and authoring guide before content
  work begins (`sand-a55.7`, `sand-a55.17`, `sand-a55.18`).
- CI validates every pack on every PR (`sand-pmz.1`).
- The shared `people/` registry means one Moltke the Elder serves 1870 and
  1914; one Churchill serves 1914, Gallipoli and 1940.
- Media binaries referenced by `media.json` live outside git (see 0004).
- Adding an era is adding a directory, a regional tile extract and a border
  year — no engine change.
