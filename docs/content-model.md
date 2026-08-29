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
npm run warning:budget                # warnings exit 1 too, per kind, against a ceiling
npm run schema                        # regenerate schema/*.schema.json
```

Errors fail; warnings are reported here and **held to a ceiling per kind** by
`npm run warning:budget`, against `scripts/warning-budget.json` — a stored
count with the reason for the number written next to it, and a hard failure for
a warning of any kind the file does not list (ADR 0023).

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
    historiography.json        Historiography[]  (contested points, ADR 0017)
    links.json                 CausalLink[]
    sources.json               Source[]   (pack-local; most sources live in shared/)
    casualties.json            CasualtyRecord[]
    vignettes.json             Vignette[]
    tours.json                 Tour[]
    beats/*.md                 NarrativeBeat — YAML front matter + Markdown
  shared/                      cross-era registries — one file per entity (ADR 0022)
    people/<slug>.json         Person   (person:kluck-alexander-von → kluck-alexander-von.json)
    places/<slug>.json         Place    (place:ypres → ypres.json)
    sources/<slug>.json        Source   (source:tyng-1935 → tyng-1935.json)
    media/**/media.json        Media (one manifest per image; binaries live in S3)
    geo/borders/<year>.geojson world borders per era year (npm run borders; manifest.json has provenance)
  threads/<slug>/thread.json   Thread — a learning path across packs
  receipts/<era-dir>.json      Receipt[] — verification receipts (ADR 0021);
  receipts/backlog.txt           apparatus, never bundled into a pack
```

Only `pack.json` is required. Every other file in a pack is optional and, when
present, is an array of that entity (empty arrays are fine).

The three shared registries are directories rather than files: one JSON object
per entity, in a file named for the entity's id with its kind prefix removed.
Two authors adding two different people therefore write two different files and
never collide, which is the whole of ADR 0022; the validator errors on a file
whose entity disagrees with its name, so the directory listing and the id index
cannot drift apart. `scripts/split-registries.ts --check` asserts the same rule
on its own.

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

**A new pack's `idPrefix` is its directory name** — `1942-midway`,
`1944-peleliu` — so that a year may hold as many packs as it needs to
(ADR 0019). The bare year worked while a year held one pack; 1944 holds four in
the Pacific alone. `Slug` permits hyphens, so this needs nothing from the
schema.

**`1914` and `1915` keep the bare year**, and are not renamed. Ids are a
durable public contract: the URL is citable (ADR 0009) and every `CausalLink`,
`Thread` step and media `used_by` entry is an id pointing at an id, so
renaming a pack silently breaks every deep link ever shared for it. Two
documented exceptions cost less than that.

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
- **A region may cross the antimeridian, and says so by being written
  `west > east`** (`sand-lry.22`). The 1941 Pacific theatre is
  `[99, -12, -155, 52]`: 106° wide, running east from Malaya over the date line
  to Hawaii — not the 254° its corners read as if you take their minimum and
  maximum. Every edge still lies in [-180, 180]; nothing is written as 205. The
  convention is GeoJSON's (RFC 7946 §5.2) and MapLibre's, and it is why the
  battle-region check asks for `west ≠ east` rather than `west < east`. A
  region needs a width, so `west === east` is an error: it is the one reading
  the convention cannot tell apart from a box round the whole world. Anything
  that measures or contains a region goes through `src/engine/geo.ts`
  (`lngSpan`, `boxContains`, `unwrapEast`) rather than comparing the numbers.
- Route waypoints are written the same way — each one in [-180, 180], with no
  `-170` turned into `190` to keep a path monotonic. The engine makes the
  longitudes continuous when it draws (`unwrapLngs`), so a leg that crosses
  180° goes the short way; a path that never crosses comes back unchanged.
- Route waypoints are `[lng, lat, time]` — or `[lng, lat, time, confidence]`
  — strictly increasing in time. A route carries a `confidence`
  (`high | medium | low | contested`) and a `derivation` note, and that
  confidence is what **every waypoint inherits** unless it carries a fourth
  element of its own (`sand-23b.4`). The general statement belongs on the
  path, beside the derivation prose that explains it; the fourth element is
  for the exception that prose already names — the hour that is nominal
  inside a vaguer one, the position two sources contradict each other about.
  A `low` or `contested` position draws on the map as approximate: the token
  opens, wears a dashed halo, and takes an `≈` before its label. It also buys
  more slack in the pace check (`src/packs/validate/pace.ts`), which judges
  each leg at the resolution of its weaker end.
- A formation that changed how it moved gets **one route per leg**: the French
  2nd Army marched in Lorraine, entrained on 17 September and marched again in
  Picardy, so it is three routes, each with its own `mode`. Legs must meet —
  each begins at the instant and the position the one before it ended — and
  the engine joins them into a single path that keeps its legs (`sand-23b.8`).
- **How fast a mode could go depends on the century, so the pack says so**
  ([ADR 0020](decisions/0020-pace-bands.md)). The validator's built-in table
  is 1914's; a pack whose technology outran it declares its own bands in
  `pack.json#pace`, one per mode, each with a `note` and required `sources`.
  Every mode a pack leaves out keeps the 1914 default, which is why a Pacific
  pack declares `sea` and `air` and says nothing about `march`. See
  [authoring](authoring.md#rail-road-and-feet).

  A declared band is still bounded: `sustained` may not exceed `limit`, and
  neither may pass the per-mode ceiling in `src/packs/validate/pace.ts` for
  what that mode has ever physically done. The declaration is there to say
  what an era's ships and aircraft did, not to switch the check off.

### Which map the map is drawn on

A pack's `region` says where it happens; `pack.json#tiles` says which basemap
archive that ground comes out of ([ADR 0002](decisions/0002-geography.md),
`sand-lry.18`). It is an **archive name**, never a URL:

```json
{ "tiles": "central-pacific-z10" }
```

Where those archives are served from is a deployment fact that has already
changed once, so content does not carry it — the engine turns the name into
`/assets/tiles/<name>.pmtiles` (`src/engine/map/tiles.ts`). The names are a
closed list, mirrored by the JSON Schema, so a mistyped one is caught in the
editor and by the validator rather than becoming a URL nobody serves; what each
archive covers, and whether it has been uploaded yet, is
`content/shared/geo/tiles/manifest.json`.

Two things follow for an author:

- **Omitting `tiles` is fine and means Central Europe** — the archive every
  pack was drawn on before the field existed. A pack outside that box
  (−1.5,42 → 24,56) must name one, or it draws borders over an empty field.
- **A battle may name its own**, and that is the point of the assault-scale
  extracts: Betio at z14 is not inside `central-pacific-z10`. `battles.json`
  takes the same `tiles` field, it applies only while that zoom-in is open, and
  omitting it keeps the campaign's.

Naming an archive that has not been uploaded yet is a legitimate state, not an
error: most of them are extracted by hand (`sand-lry.17`). The map says so — a
line reading _the basemap for this map is not on the table yet_ — and draws the
borders, places and movement over the empty ground meanwhile.

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
diverges, route legs for one formation and branch that do not meet, and beats
that are visible together in one branch yet overlap in time.

## Entities

Field-level detail is in the schema (`src/packs/schema/entities.ts`) and the
generated JSON Schema; this is the intent of each.

- **Pack** — id, `idPrefix`, title, summary, `timeRange` (the campaign clock),
  `region`, `borderYear` (which shared border file to draw), `tiles` (which
  basemap archive to draw them on — see _Which map the map is drawn on_ under
  **Time and space**), opening `camera`,
  `sides` (short ids such as `de`, `fr`, `gb`, `be`, with an alliance that
  drives the colour family), `branches`, `defaultBranch`, `status`
  (`seed | draft | review | published`), `arc` (which run of campaigns the home
  page files it under — `western-front`, `pacific`; the arcs and their order
  are `src/atlas/arcs.ts`, ADR 0024), a general bibliography, and an
  optional `pace` table saying how fast this era's technology moved where it
  differs from 1914 (ADR 0020).
- **Formation** — an army, corps, division, fleet…: name, `short` token
  label, `side`, `kind`, `commander` (a Person), `parent` (the order of battle
  is a tree: corps under armies, divisions under corps), optional `strength`
  (men, guns, corps, divisions, `asOf`) and `concentration` (where it
  assembled, in words plus a representative position and date — the start
  token before its route begins) and `dissolved` (when it ceased to exist —
  its token disappears then), each with its own sources.
- **Route** — a Formation's movement over time, in one leg or several (see
  above); optional `mode` (`march | motor | rail | sea | air`, default
  `march`). `rail`, `sea` and `air` are transfers: the formation is inside the
  thing carrying it, so the leg draws with a long dash and its token shows
  only while it is under way (a transfer, not a position). `motor` is the road
  — Hentsch's staff car, the Paris taxis — and is not a transfer: it draws
  with a short, close dash of its own and the token stays on the map, because
  a column of cars is on the ground the whole way. Required sources.
- **PersonTrack** (`tracks.json`) — where a **commander** was, as against where
  his army was (`sand-1l0.27`). `person`, `kind`, waypoints, optional `mode`
  (the same `MovementMode` a Route takes; an unmarked track is read as road
  travel, never as a march), and a required `derivation` that must say at what
  resolution the sources support the track — towns and days, or the hour.
  Two kinds, and the difference is the point. An `hq` track is the
  headquarters an army was run from, and must name the `post`; a commander has
  at most one, because he cannot run two headquarters at once, and a pin on
  Koblenz is not a claim that Moltke stood there at that hour. A `journey`
  track is the man himself at the hours a source gives, and a commander may
  have as many as the record documents. **A commander's documented movement is
  a PersonTrack and never a Route on a formation invented to carry him**
  (`sand-23b.9`): a staff officer in a car is a man, not a unit, and the
  pseudo-formation dodge costs the portrait token, puts the man inside one
  battle's zoom-in when his drive crossed four armies, and makes the order of
  battle lie. Where the sources are silent for a day, leave the day out — a
  track with gaps the derivation explains is honest; a track with interpolated
  positions is not. Required sources.
- **Event** — a point (`at`) or a span (`timeRange`); `kind`, `significance`
  (`major` events become timeline ticks), a Place or a position, summary,
  links, required sources.
- **Battle** — a focus for the zoom-in mechanism (`sand-a55.14`): its own
  `timeRange`, `region`, `camera`, optional `tiles` (an assault-scale basemap
  archive, when the campaign's does not reach this scale),
  `participants` (campaign formations), and
  optional battle-level `formations`, `routes` and `events` that live only
  inside the zoom-in. Required sources. A Battle with **no routes** is a
  **chapter** — narrative and static markers, campaign tokens left on their
  campaign movement — and the chrome reads that off the data, never off a
  second string (ADR 0013). `window` says what `timeRange` means when it is
  not the obvious thing (ADR 0015): absent, it is when the thing happened and
  it sits inside `pack.timeRange`; `"placed"`, it is where a chapter sits on
  the campaign strip and the beats carry the real dates in `dateLabel`;
  `"outside"`, it is when the thing happened and the campaign does not contain
  it — a prologue or an epilogue, which must be a chapter, keeps its own clock,
  and holds its beats to its own window rather than the pack's.
- **DecisionPoint** — `at`, actor, question, options (each may name a
  branch), the `historical` option, the reasoning available at the time, the
  verdict. Required sources.
- **TechCard / ScienceCard** — `field`, when it mattered (`introduced` /
  `at`), summary, body, `counter` (tech-tree edge) or `connections`
  (forward links), links, required sources. Surfaced as timeline glyphs and
  dossier cards — never a separate rail (`sand-neh.5`).
- **PlateSet** (`plates`, on Formation and TechCard) — a bounded comparison of
  photographs on one card (ADR 0014): an `axis` in a single line, one `fit`
  (`band` or `portrait`) for every plate in the set, and two to four `items`,
  each a `media` id and the `label` that is its point on the axis. All of them
  render at once, in a grid, with no paging — four armies' kit, one army's
  four weapons. Never on a beat: a beat has one picture (ADR 0012).
- **Document** — the real text: title, date, author, kind, `excerpt` (original
  language), `translation`, archive, links, required sources. The `excerpt` is
  the one field in this model whose definition is a quotation, so it is the one
  field that must carry a **verification receipt** — retrieved text with the
  passage inside it, in `content/receipts/<era>.json`, checked by the validator
  ([ADR 0021](decisions/0021-quotation-receipts.md)).
- **Historiography** (`historiography.json`) — a contested point carried as
  the argument it is (ADR 0017): the `question`, **at least two `positions`**
  each with a `label`, the `who` that holds it and a footnoted summary, what
  is not in dispute (`settled`), and what would settle it and has not been
  read (`unread`). The floor of two is in the schema, with the reason in its
  error message: rule 6 of `docs/sources.md` says a contested point is not
  settled for the learner, and a card carrying one position is a verdict in
  costume. The validator adds that two positions may not share a label or a
  holder. It has no timeline glyph — a dispute has no moment — and is reached
  from the entities it is about, each of which names it in
  `links.historiography`. Where a note in `docs/historiography-1914.md` has a
  card, the card is the source of truth and the note is the register.
  Required sources.
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
- **Opening** (`pack.opening`, optional) — the first thirty seconds
  (`sand-1l0.26`): a `headline` read one line at a time, a footnoted `lede`,
  an optional `eyebrow`, an optional `camera` the map settles on while the
  premise is read, and the ways on — the guided tour, free exploration, and
  the pack's causal chain. A premise that asserts a number must show its
  working: `claim` points at the card the number rests on (typically a clock),
  and `sources` carries the citations the lede footnotes. It plays on a cold
  arrival only — never in front of a deep link — and is skippable at any
  moment, by pointer, by Escape or by keyboard, with the choice remembered for
  the session.
- **Tour** (`tours.json`) — the lean-back path through a pack: ordered
  `steps`, each a complete description of the view — `at` (and `playUntil`,
  `speed` or `hold`), optional `camera`, `focus`, `branch` and `card` — with
  footnoted `narration`. Absent fields mean the default, so a deep link
  (`?tour=…&step=…`) rebuilds the whole view; the engine applies the step, the
  panel narrates it, and any interaction the tour did not initiate stops the
  autoplay (`sand-1l0.14`). Playback runs at one hour per second and **stops
  at every break in the narrative** — the card a step reveals, each beat
  beginning inside its window, each decision crossed, and the step's own end —
  leaving each on a dwell scaled to the text or on the viewer's click, from
  the pointer or the keyboard (`sand-1l0.28`). Required sources.
- **NarrativeBeat** — a Markdown file; front matter carries `id`, `title`,
  `dateLabel`, `from`/`to`, `branch`, `focus` (a Battle), pull quote, hero
  `media`, links and required `sources`. The body is Markdown; footnote
  references `[^herwig-2009]` must name one of the beat's sources by slug.
- **Person / Place / Source / Media** — shared registries. Places carry
  period and modern names; Sources are books, chapters, articles, official
  histories, archives, maps and web pages, and each declares a `tier` —
  where it stands in the hierarchy of evidence (`primary`, `official-history`,
  `study`, `unit-history`, `memoir`, `general`, `reference`), which is what the
  bibliography groups by and what tells a reader whether the figure they are
  reading came from an official history or from a memoir (`docs/sources.md`); Media manifests are the provisional
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

The reader-facing bibliography is **generated from these citations** and not
written beside them (`sand-shn.5`): the works listed are the works the pack
actually cites, grouped by `Source.tier`. A registry entry nothing cites
therefore appears nowhere, and the validator warns about it.

## Validator rules (errors)

Schema violations (with file and JSON path), duplicate ids, ids without the
pack prefix, dangling references of every kind, `defaultBranch` not in
`branches`, not exactly one historical branch, counterfactual without
`divergesAt`, start ≥ end, anything outside its pack/battle range, unordered
waypoints, counterfactual routes starting before the divergence, route legs
for one formation and branch that do not meet, a route or track leg faster
than its `mode` could go (at the pack's declared pace for that mode, or at
1914's), a declared pace band without a citation, with `sustained` above its
own `limit`, or above the physical ceiling for its mode,
beats visible together overlapping, unknown
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
option, campaign routes using battle-level formations, plate sets outside two
to four pictures or with the same picture or the same label twice, and the
imagery policy on media manifests (flagged BLOCKED/UNVERIFIED/UNKNOWN/HOLD,
colorized without saying so, Bundesarchiv without the credit string, no
archive record), and a media `used_by` entry naming an id that does not exist.

That last one was a warning until the registry was swept clean of the
placements that predated it (`sand-y0u.24`). Nothing renders from `used_by` —
it is an author's note of intent ([ADR 0014](decisions/0014-plate-sets.md)) —
but it is also the one way a picture can claim a beat from outside, which is
what the one-picture-per-beat rule polices, and that rule only bites on ids
that really are beats. A stale entry therefore hides a genuine double claim
until the day someone recreates the id. Fix the reference, or drop it and put
the intention in `notes`: a picture wanted by a pack that does not exist yet
belongs to that pack when it is written, and prose cannot rot into a false
claim. Cue `used_by` is still a warning — no audio invariant rests on it yet.

Warnings: formations without a historical route (non-seed packs), a
formation's `concentration.position` outside the pack region, a leg faster
than its `mode` sustained but not beyond it (a forced march is a warning, a
teleport is an error), a declared pace band for a mode nothing in the pack
moves by, branches without beats (non-seed packs), media `person`
and cue `used_by` pointing at entities that do not exist yet, thread steps
with neither beat nor instant, unknown pack files, and a `Source` in the
registry that nothing cites — which is not a spare entry on a list but a work
no reader will ever see, since the bibliography is generated from the
citations (`sand-shn.5`).

## Extending the schema

Add or change a field in `src/packs/schema/entities.ts`, add the rule to
`src/packs/validate/validate.ts` if a schema cannot express it, cover it in
`src/packs/validate/validate.test.ts`, run `npm run schema`, and update this
file. Planned extensions have beads: Media (`sand-y0u.2`), cross-era
registries and era-qualified links (`sand-a55.18`), the authoring guide
(`sand-a55.17`).
