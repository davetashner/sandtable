# Content model (scenario schema v1)

Everything the engine renders is data under `content/`. This document is the
prose version of the schema in `src/packs/schema/` and the rules the validator
in `src/packs/validate/` enforces on top of it. Decisions behind it:
[ADR 0003](decisions/0003-scenario-packs.md) (packs as the kernel) and
[ADR 0005](decisions/0005-counterfactuals.md) (authored branches). Story:
`sand-a55.7`.

## One source of truth

The schema is written once, in **Zod** (`src/packs/schema/*.ts`):

- the **TypeScript types** are inferred from it (`import type { Route } from 'src/packs/schema'`);
- the **JSON Schema** files under `schema/` are generated from it (`npm run schema`;
  a test fails if they are stale) — point your editor at
  `schema/<file>.schema.json` for completion;
- the **validator** parses every file with it at run time, then applies the
  cross-file rules below.

```bash
npm run validate:content              # check-content.sh + the pack validator; errors exit 1
npx tsx scripts/validate-content.ts --warnings   # also list warnings
npx tsx scripts/validate-content.ts --json       # machine-readable report
npm run schema                        # regenerate schema/*.schema.json
```

## Layout

```text
content/
  eras/<yyyy>-<slug>/          one self-contained scenario pack
    pack.json                  Pack — id, clock, region, sides, branches
    formations.json            Formation[]
    routes.json                Route[]
    events.json                Event[]
    battles.json               Battle[]   (each with its own formations/routes/events)
    decisions.json             DecisionPoint[]
    tech.json                  TechCard[]
    science.json               ScienceCard[]
    documents.json             Document[]
    links.json                 CausalLink[]
    sources.json               Source[]   (pack-local; most sources live in shared/)
    casualties.json            CasualtyRecord[]
    vignettes.json             Vignette[]
    tours.json                 Tour[]
    beats/*.md                 NarrativeBeat — YAML front matter + Markdown
  shared/                      cross-era registries
    people/people.json         Person[]
    places/places.json         Place[]
    sources/sources.json       Source[]
    media/**/media.json        Media (one manifest per image; binaries live in S3)
    geo/borders/<year>.geojson world borders per era year (npm run borders; manifest.json has provenance)
  threads/<slug>/thread.json   Thread — a learning path across packs
```

Only `pack.json` is required. Every other file is optional and, when
present, is an array of that entity (empty arrays are fine).

## Identifiers

Every entity has an `id`, lower-case and qualified:

| Scope         | Form                              | Examples                                          |
| ------------- | --------------------------------- | ------------------------------------------------- |
| pack entities | `<idPrefix>:<slug>`               | `1914:army-de-1`, `1914:marne`, `1914:beat-liege` |
| people        | `person:<slug>`                   | `person:joffre-joseph`                            |
| places        | `place:<slug>`                    | `place:liege`                                     |
| sources       | `source:<slug>`                   | `source:herwig-2009`                              |
| media         | `media:<kind>/<slug>/<file-stem>` | `media:person/joffre-joseph/portrait-colorized`   |
| threads       | `thread:<slug>`                   | `thread:road-to-1914`                             |

`pack.json#idPrefix` (e.g. `1914`) must be unique across packs, and every id
defined in that pack — including battle-level sub-entities — must start with
it. Ids are unique across all of `content/`, so a `CausalLink` or a `Thread`
can point at anything anywhere.

## Time and space

- Instants are ISO-8601 date-times with an offset (`1914-08-04T08:00:00Z`).
  Dates (`1914-08-04`) and partial dates (`1914-08`, `1891`) are allowed only
  where the schema says `When` (people's roles, document dates, card
  introductions).
- `timeRange` is `{ start, end }`, start strictly before end. Beats use
  `from`/`to` and are treated as half-open: a beat ending at _t_ and the next
  starting at _t_ do not overlap.
- Everything in a pack must fall inside `pack.timeRange`; everything inside a
  battle must fall inside the battle's `timeRange`.
- Positions are `[lng, lat]` (WGS 84); regions are `[west, south, east, north]`.
- Route waypoints are `[lng, lat, time]`, strictly increasing in time. A route
  carries a `confidence` (`high | medium | low | contested`) and a `derivation`
  note; per-waypoint confidence is a planned extension (`sand-23b.4`).

## Branches (ADR 0005)

`pack.json#branches` lists exactly one `historical` branch and any number of
`counterfactual` ones, each with a `divergesAt` instant, a `summary`, an
optional `historiography` paragraph and, for "success" branches, a
`feasibility` checklist (condition, `met` in history or not, note, sources).

How entities relate to branches:

| Entity        | `branch` absent             | `branch` present                                                                                                                         |
| ------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Route         | the base (historical) route | must be a counterfactual branch; its waypoints start at or after `divergesAt` and are **appended** to the base route's earlier waypoints |
| Event, Beat   | visible in every branch     | visible only in that branch — name the historical branch for post-divergence history                                                     |
| DecisionPoint | —                           | each option may point at the branch that plays out if chosen                                                                             |

So the shared prefix is literal: the base route before the divergence and the
shared beats before it are written once. After the divergence, history says
`branch: 1914:historical` and each counterfactual says its own id. The
validator rejects a counterfactual route that starts before its branch
diverges, two routes for the same formation and branch, and beats that are
visible together in one branch yet overlap in time.

## Entities

Field-level detail is in the schema (`src/packs/schema/entities.ts`) and the
generated JSON Schema; this is the intent of each.

- **Pack** — id, `idPrefix`, title, summary, `timeRange` (the campaign clock),
  `region`, `borderYear` (which shared border file to draw), opening `camera`,
  `sides` (short ids such as `de`, `fr`, `gb`, `be`, with an alliance that
  drives the colour family), `branches`, `defaultBranch`, `status`
  (`seed | draft | review | published`), a general bibliography.
- **Formation** — an army, corps, division, fleet…: name, `short` token
  label, `side`, `kind`, `commander` (a Person), `parent` (the order of battle
  is a tree: corps under armies, divisions under corps), optional `strength`
  (men, guns, corps, divisions, `asOf`) and `concentration` (where it
  assembled, in words plus a representative position and date — the start
  token before its route begins) and `dissolved` (when it ceased to exist —
  its token disappears then), each with its own sources.
- **Route** — a Formation's movement over time (see above); optional `mode`
  (`march | rail | sea | air`): a rail/sea/air leg draws dashed and its token
  shows only while it is under way (a transfer, not a position). Required
  sources.
- **Event** — a point (`at`) or a span (`timeRange`); `kind`, `significance`
  (`major` events become timeline ticks), a Place or a position, summary,
  links, required sources.
- **Battle** — a focus for the zoom-in mechanism (`sand-a55.14`): its own
  `timeRange`, `region`, `camera`, `participants` (campaign formations), and
  optional battle-level `formations`, `routes` and `events` that live only
  inside the zoom-in. Required sources.
- **DecisionPoint** — `at`, actor, question, options (each may name a
  branch), the `historical` option, the reasoning available at the time, the
  verdict. Required sources.
- **TechCard / ScienceCard** — `field`, when it mattered (`introduced` /
  `at`), summary, body, `counter` (tech-tree edge) or `connections`
  (forward links), links, required sources. Surfaced as timeline glyphs and
  dossier cards — never a separate rail (`sand-neh.5`).
- **Document** — the real text: title, date, author, kind, `excerpt` (original
  language), `translation`, archive, links, required sources.
- **CausalLink** — `from` → `to` (any entity, any pack), `relation`, the
  `claim`, `confidence`, historiography, and at least one piece of `evidence`.
- **CastEntry** (`cast.json`) — the pack's dramatis personae: `person` (a
  shared Person), `role` in this period, `side` (a pack side, for grouping and
  colour), a period-focused `bio` (Markdown, footnoted `[^slug]` to its
  `sources`), optional `order`. The shared Person stays era-neutral; what
  someone is known for in _this_ window lives here, so the same person can
  read differently in two packs. Surfaced as the cast strip and person
  profiles in the dossier (`sand-9ts`). Required sources.
- **Timetable** (`clocks.json`) — a plan measured against what happened: a
  day-0 `origin`, the plan's `assumption` (footnoted), and `milestones` each
  with the `plannedDay` the plan expected and the `actualAt` it was really
  reached (absent if never; reality-only marks have only `actualAt`). Rendered
  as the plan-vs-reality gauges under the timeline and a card (`sand-1l0.18`);
  any later era's plan vs. actual fits. Required sources.
- **Tally** (`tallies.json`) — a running strength ledger: a `start` value in
  some `unit`, dated `entries` with a `delta` (negative when strength leaves),
  the formations and place involved and a map position, and optional named
  `comparisons` (a:b pairs drawn as bars). Rendered as a gauge beside the
  clocks, markers on the map as each entry happens, and a ledger card
  (`sand-1l0.19`). Required sources.
- **SupplyLine** (`supply.json`) — rail against feet: an `army` formation and
  a `railhead` formation (kind `other`, its route the railhead creeping
  forward), a `thresholdKm` beyond which horse-drawn supply failed, a
  footnoted `summary`. The gauge reads kilometres marched off the army's
  route and the gap to the railhead at the clock (`sand-1l0.21`). Required
  sources; both formations need historical routes.
- **CasualtyRecord** (`casualties.json`) — the human cost of a battle, day or
  period: a `timeRange`, optional `battle`/`event`/`place`, and `figures`
  per side and category (`killed | wounded | missing | prisoners |
casualties`), each a point `value` or a `low`–`high` range with its own
  `confidence` and sources; a footnoted `summary` and a `historiography`
  paragraph on why the figures differ. The engine sums completed records per
  side _within_ a category (never across), carries the weakest confidence,
  and labels the result a sum of recorded periods — a quiet line under the
  timeline and a card, nothing scored (`sand-1l0.24`). Required sources.
- **Vignette** (`vignettes.json`) — a first-person moment: `at`, optional
  `branch`/`place`/`lngLat`, `voice` (whose eyes), `kind` (`memoir` —
  told by a participant afterwards; `witness` — a contemporary diary,
  letter or report; `reconstruction` — assembled from secondary accounts),
  a short footnoted `text`, `people`, links. The dossier shows the vignettes
  whose moment falls inside the current beat once the clock has passed it,
  as a voice set apart from the narrative (`sand-1l0.24`). Required sources.
- **Tour** (`tours.json`) — the lean-back path through a pack: ordered
  `steps`, each a complete description of the view — `at` (and `playUntil`,
  `speed` or `hold`), optional `camera`, `focus`, `branch` and `card` — with
  footnoted `narration`. Absent fields mean the default, so a deep link
  (`?tour=…&step=…`) rebuilds the whole view; the engine applies the step, the
  panel narrates it, and any interaction the tour did not initiate stops the
  autoplay (`sand-1l0.14`). Required sources.
- **NarrativeBeat** — a Markdown file; front matter carries `id`, `title`,
  `dateLabel`, `from`/`to`, `branch`, `focus` (a Battle), pull quote, hero
  `media`, links and required `sources`. The body is Markdown; footnote
  references `[^herwig-2009]` must name one of the beat's sources by slug.
- **Person / Place / Source / Media** — shared registries. Places carry
  period and modern names; Sources are books, chapters, articles, official
  histories, archives, maps and web pages; Media manifests are the provisional
  per-image records (`content/shared/media/README.md`) pending `sand-y0u.2`.
- **Thread** — a learning path: ordered steps of (pack, beat or instant,
  branch, connective note).

## Citations

Entities that make claims carry `sources: Citation[]`, a citation being
`{ source, pages?, note? }`. Required (at least one) on routes, events,
battles, decision points, tech and science cards, documents, beats, cast
entries and causal links (`evidence`); optional on formations, people, places, branches and
packs. Every citation must resolve to a Source. The citation standard and the
bibliography for WWI are `sand-23b.1`.

## Validator rules (errors)

Schema violations (with file and JSON path), duplicate ids, ids without the
pack prefix, dangling references of every kind, `defaultBranch` not in
`branches`, not exactly one historical branch, counterfactual without
`divergesAt`, start ≥ end, anything outside its pack/battle range, unordered
waypoints, counterfactual routes starting before the divergence, duplicate
routes per formation and branch, beats visible together overlapping, unknown
footnote labels (beats and cast bios), missing required citations, cast
entries naming a person or side that does not exist or the same person twice,
a formation's `concentration.asOf` or `dissolved` outside the pack range or
`dissolved` not after `concentration.asOf`, timetable milestones without a
planned day or an actual date, duplicated, or dated before the origin,
assumption footnotes that name no source, tally entries out of order, outside
the range or naming formations/places that do not exist, negative comparison
quantities, supply lines whose army or railhead has no historical route, casualty
figures without a value or range (or with low > high), naming a side that is
not a pack side or a battle/event that does not exist, vignettes outside the
pack range or with unknown people/places, footnotes in casualty and vignette
text that name no source, decision `historical` not an
option, campaign routes using battle-level formations, and the imagery policy
on media manifests (flagged BLOCKED/UNVERIFIED/UNKNOWN/HOLD, colorized without
saying so, Bundesarchiv without the credit string, no archive record).

Warnings: formations without a historical route (non-seed packs), a
formation's `concentration.position` outside the pack region, branches
without beats (non-seed packs), media `person`/`used_by` pointing at entities
that do not exist yet, thread steps with neither beat nor instant, unknown
pack files.

## Extending the schema

Add or change a field in `src/packs/schema/entities.ts`, add the rule to
`src/packs/validate/validate.ts` if a schema cannot express it, cover it in
`src/packs/validate/validate.test.ts`, run `npm run schema`, and update this
file. Planned extensions have beads: Media (`sand-y0u.2`), per-waypoint
confidence (`sand-23b.4`), cross-era registries and era-qualified links
(`sand-a55.18`), the authoring guide (`sand-a55.17`).
