# Authoring guide — adding content to Sandtable

This walks a contributor — human or agent — through adding content end to end:
an event with a citation, a formation and its route, a battle zoom-in, a
technology card, a new scenario pack. It assumes you have read the
[content model](content-model.md) once; this page is the how-to, that one is
the reference. Story: `sand-a55.17`.

## 0. Set-up (two minutes)

```bash
git fetch origin main
git worktree add .claude/worktrees/content/<slug> -b content/<slug> origin/main
cd .claude/worktrees/content/<slug>
npm ci
npm run validate:content     # must already pass before you start
npm run dev                  # http://localhost:5173 — tiles/borders come from production
```

Find or create the bead first (`bd ready`, `bd create …`), claim it, and
reference it in every commit (`[sand-…]`). The PR template asks for one
`Closes sand-…` line per bead.

Editors: point your JSON/YAML tooling at `schema/<file>.schema.json` for
completion (`pack`, `formations`, `routes`, `events`, `battles`, `tech`,
`beat-frontmatter`, `people`, `places`, `sources`, …).

## 1. Add a citation (always first)

Every claim cites a `Source`. If the work you are citing is not yet in
`content/shared/sources/sources.json`, add it:

```json
{
  "id": "source:tyng-1935",
  "kind": "book",
  "author": "Tyng, Sewell",
  "title": "The Campaign of the Marne 1914",
  "year": 1935,
  "publisher": "Longmans, Green, New York",
  "notes": "Operational narrative from the interwar official histories; good on the Ourcq."
}
```

- `id` is `source:<surname>-<year>` (or a short slug for official histories,
  e.g. `source:afgg-1-1`).
- Cite with `{ "source": "source:tyng-1935", "pages": "112–115" }`. `pages`
  is optional but wanted for anything contestable.
- Inline in beats: `[^tyng-1935]` — the slug after the colon. The validator
  rejects a footnote that is not among the beat's `sources`.
- The citation standard and the core bibliography are in [`docs/sources.md`](sources.md).

## 2. Add an event

Events live in `content/eras/<pack>/events.json`. A point event:

```json
{
  "id": "1914:event-fall-of-namur",
  "title": "Namur falls",
  "at": "1914-08-25T12:00:00Z",
  "kind": "siege",
  "significance": "major",
  "place": "place:namur",
  "summary": "The last of Namur's nine forts falls to the German siege train after four days; the Sambre–Meuse angle is open.",
  "links": { "people": ["person:bulow-karl-von"], "formations": ["1914:army-de-2"] },
  "sources": [{ "source": "source:herwig-2009", "pages": "139–141" }]
}
```

Rules the validator enforces: the id starts with the pack's `idPrefix` + `:`;
`at` **or** `timeRange`; the instant lies inside the pack's `timeRange`; the
place, every link and every citation resolves; at least one citation. Use
`"significance": "major"` only for timeline ticks; `"branch"` only for events
that exist in one branch (name the historical branch for post-divergence
history). Run `npm run validate:content` and read the errors — they name the
file, the id and the field.

## 3. Add a place or a person

Shared registries serve every pack:

- `content/shared/places/places.json` — `place:<slug>`, the name used in the
  narrative (period name), alternate names with language/period, `kind`
  (`city`, `town`, `fortress`, `river`, …), `lngLat`, country in the era.
- `content/shared/people/people.json` — `person:<slug>` (surname-first slug),
  name, dates, nationality, roles with dates, a one-paragraph summary, portrait
  media ids, sources.

Coordinates: WGS 84 `[lng, lat]`, three or four decimals. Read them off
OpenStreetMap (right-click → "Show address" shows lat, lon — swap the order),
or from the dev map: open the browser console and run
`document.querySelector('.maplibregl-canvas')` hover tooling once the
waypoint-capture helper lands (`sand-shn.7`); until then, the OSM method.

## 3a. Add someone to the cast

The cast is the pack's dramatis personae — the faces in the strip at the top
of the dossier, each with a profile. Add the Person to the shared registry
first (§3, with a portrait manifest under `content/shared/media/people/<slug>/`
— §9), then an entry in `content/eras/<era>/cast.json`:

```json
{
  "id": "1914:cast-joffre-joseph",
  "person": "person:joffre-joseph",
  "side": "fr",
  "role": "Commander-in-Chief of the French armies",
  "bio": "What they are known for *in this period*, a few paragraphs, footnoted.[^herwig-2009]",
  "sources": [{ "source": "source:herwig-2009" }]
}
```

The `bio` is the period biography — what this person did between the pack's
`timeRange` start and end, not a life story (that is the shared Person's
era-neutral `summary`, shown under "In brief"). Footnote every claim with
`[^slug]` naming one of the entry's `sources`; write contested points as
historiography ("whether X… is still argued"). `side` groups and colours the
face; file order is the order in the strip. The profile shows the colorized
portrait large, so the manifest's `focal_point` matters.

## 4. Add a formation and its route

`formations.json`:

```json
{
  "id": "1914:army-de-4",
  "name": "German 4th Army",
  "short": "4. Armee",
  "side": "de",
  "kind": "army",
  "commander": "person:albrecht-of-wurttemberg",
  "strength": {
    "men": 180000,
    "corps": 5,
    "asOf": "1914-08-17",
    "sources": [{ "source": "source:herwig-2009" }]
  },
  "concentration": {
    "area": "Trier–Bitburg–Luxembourg",
    "position": [6.5, 49.85],
    "asOf": "1914-08-17",
    "sources": [{ "source": "source:reichsarchiv-weltkrieg-1" }]
  },
  "sources": [{ "source": "source:herwig-2009" }]
}
```

`side` must be one of `pack.json#sides[].id`; `commander` must exist in the
people registry (add them first). The order of battle is a tree: give a corps
`"parent": "1914:army-de-4"` and `"kind": "corps"`; only formations with a
route get a moving token, so corps-level entries are reference data until they
get routes of their own. `concentration` is where the formation stood before
it moved — the position is the start token and the first waypoint of its
historical route should agree with it; its token appears from
`concentration.asOf`. A formation that was disbanded or merged away gets
`"dissolved": "1914-08-26"` so its token disappears rather than parking at the
end of its route.

`routes.json` — one default (historical) route per formation:

```json
{
  "id": "1914:route-de-4",
  "formation": "1914:army-de-4",
  "waypoints": [
    [6.4, 49.75, "1914-08-13T06:00:00Z"],
    [5.5, 49.8, "1914-08-21T12:00:00Z"],
    [4.94, 49.7, "1914-08-27T12:00:00Z"]
  ],
  "confidence": "medium",
  "derivation": "Army HQ locations from the Reichsarchiv volume, daily at noon.",
  "sources": [{ "source": "source:reichsarchiv-weltkrieg-1" }]
}
```

- Waypoints are `[lng, lat, ISO time]`, strictly increasing in time, inside
  the pack range. The token sits at the first waypoint before it and at the
  last after it; between, it moves in a straight line — add waypoints where
  the path bends.
- Say how you derived positions (`derivation`) and how sure you are
  (`confidence`: `high` documented · `medium` inferred · `low` approximate ·
  `contested`). Seed data is `low`; do not upgrade it without a source.
- A **counterfactual continuation** is a second route for the same formation
  with `"branch": "1914:schlieffen-concept"` whose waypoints start at or after
  the branch's `divergesAt`; the engine appends them to the base route's
  earlier waypoints. Only one route per formation and branch.

## 5. Add a narrative beat

Beats are Markdown files in `content/eras/<pack>/beats/NN-slug.md`:

```markdown
---
id: 1914:beat-namur
title: Namur, and the angle opens
dateLabel: 21–25 August 1914
from: 1914-08-21T00:00:00Z
to: 1914-08-25T12:00:00Z
branch: 1914:historical
links:
  events: ['1914:event-fall-of-namur']
  places: ['place:namur']
sources:
  - source: source:herwig-2009
    pages: 139–141
---

Namur was supposed to hold for weeks. It held for four days.[^herwig-2009]
```

- `from`/`to` are half-open; beats visible together in one branch (shared
  beats + that branch's beats, same `focus`) must not overlap — the validator
  says which pair collides.
- Omit `branch` for beats shown in every branch (before the divergence); name
  the historical branch for history after it; name a counterfactual branch for
  its own beats and say **Hypothetical** in `dateLabel` and in the prose.
- `focus: 1914:marne` makes a beat belong to a zoom-in.
- Write contested points as historiography: "Zuber argues …; Mombauer
  replies …", each with a footnote.

## 6. Add a battle (zoom-in)

`battles.json`:

```json
{
  "id": "1914:le-cateau",
  "title": "Le Cateau",
  "timeRange": { "start": "1914-08-26T04:00:00Z", "end": "1914-08-26T20:00:00Z" },
  "region": [3.2, 49.95, 3.9, 50.25],
  "camera": { "center": [3.54, 50.1], "zoom": 10 },
  "place": "place:le-cateau",
  "summary": "Smith-Dorrien's II Corps stands and fights a one-day delaying action.",
  "participants": ["1914:bef", "1914:army-de-1"],
  "formations": [
    {
      "id": "1914:le-cateau-ii-corps",
      "name": "II Corps",
      "side": "gb",
      "kind": "corps",
      "parent": "1914:bef"
    }
  ],
  "routes": [
    {
      "id": "1914:le-cateau-route-ii-corps",
      "formation": "1914:le-cateau-ii-corps",
      "waypoints": [
        [3.55, 50.1, "1914-08-26T06:00:00Z"],
        [3.4, 50.02, "1914-08-26T18:00:00Z"]
      ],
      "confidence": "medium",
      "sources": [{ "source": "source:edmonds-1922" }]
    }
  ],
  "sources": [{ "source": "source:edmonds-1922" }]
}
```

Battle-level formations, routes and events live inside the battle and only
show in the zoom-in; their times must fall inside the battle's range; their ids
still carry the pack prefix. A beat with `focus: 1914:le-cateau` narrates it.
The zoom-in chip appears automatically.

## 7. Add a technology or science card

`tech.json` (surfaced as a ⚙ glyph that opens a dossier card — ADR 0006):

```json
{
  "id": "1914:tech-42cm-howitzer",
  "title": "Krupp 42 cm howitzer — 'Big Bertha'",
  "field": "artillery",
  "introduced": { "at": "1914-08-12", "label": "First fired at Liège, 12 August 1914" },
  "summary": "A 42 cm siege howitzer throwing an 800 kg shell…",
  "links": { "events": ["1914:event-siege-of-liege"], "places": ["place:liege"] },
  "sources": [{ "source": "source:strachan-2001" }]
}
```

`science.json` is the same shape with `field` in `physics | chemistry |
biology-medicine | earth-science | mathematics | ideas-culture`, an `at`, and
optional forward `connections`.

## 8. Add a document, a decision point, a causal link

- **Document** (`documents.json`): the real text — `excerpt` in the original
  language, `translation`, `date`, `author` (a person id or text), `kind`,
  archive, sources.
- **DecisionPoint** (`decisions.json`): `at`, `actor`, `question`, `options`
  (each may name a branch), `historical` option, `reasoning` available at the
  time, `verdict`, sources.
- **CausalLink** (`links.json`): `from` → `to` any entity id in any pack,
  `relation`, the `claim`, `confidence`, `historiography`, ≥1 `evidence`
  citation. Cross-pack links (`1870:sedan` → `1914:…`) are how the eras
  connect; the validator resolves them across all of `content/`.

### Decision points

`decisions.json` — the campaign pauses here and asks the viewer to choose as the
commander, then reveals what was decided:

```json
{
  "id": "1914:decision-1914-08-25-two-corps-east",
  "at": "1914-08-25T12:00:00Z",
  "title": "Two corps for East Prussia?",
  "actor": "person:moltke-helmuth-von-younger",
  "question": "Markdown — the situation as the actor saw it, ending in the choice.",
  "options": [
    { "id": "send", "label": "Send two corps east now", "summary": "Markdown." },
    {
      "id": "keep",
      "label": "Keep every corps",
      "summary": "Markdown.",
      "branch": "1914:schlieffen-success"
    }
  ],
  "historical": "send",
  "reasoning": "What was known at the time — Markdown, footnoted.",
  "verdict": "What happened and the historians' assessment — Markdown, footnoted.",
  "links": { "people": ["person:moltke-helmuth-von-younger"] },
  "sources": [{ "source": "source:herwig-2009" }]
}
```

`historical` names the option actually taken; an option's `branch` is the
counterfactual that plays on the map if it is chosen. The card shows the
question and options first and the reasoning, verdict, chips and sources only
after a choice; playback pauses at `at` the first time it crosses it on the
historical branch. Deep link: `?card=<id>&pick=<option>`.

### Plan-vs-reality clocks

`clocks.json` — a timetable the pack measures the campaign against (the
Schlieffen M-day schedule, the Russian-mobilization assumption):

```json
{
  "id": "1914:clock-plan-timetable",
  "title": "The plan's timetable",
  "origin": "1914-08-02T00:00:00Z",
  "dayLabel": "M+",
  "assumption": "What the plan expected — Markdown, footnoted.[^tuchman-1962]",
  "milestones": [
    {
      "id": "liege",
      "label": "Liège taken",
      "plannedDay": 12,
      "actualAt": "1914-08-16T18:00:00Z",
      "place": "place:liege",
      "note": "…"
    },
    { "id": "decision", "label": "Decisive battle", "plannedDay": 39, "note": "Never reached." },
    {
      "id": "marne-retreat",
      "label": "The retreat from the Marne",
      "actualAt": "1914-09-09T12:00:00Z"
    }
  ],
  "sources": [{ "source": "source:tuchman-1962" }]
}
```

A milestone with both `plannedDay` and `actualAt` shows its slip; one with
only `plannedDay` reads "never"; one with only `actualAt` is a reality-only
mark. The gauges under the timeline read the slip on the milestone furthest
along; clicking one opens the card (`?card=<id>`).

### Strength ledgers

`tallies.json` — a running count that changes as dated entries bite (the
right wing's corps leaving the wheel), with optional a:b comparisons:

```json
{
  "id": "1914:tally-right-wing",
  "title": "The right wing bleeds",
  "unit": "corps",
  "start": {
    "value": 16,
    "asOf": "1914-08-17T12:00:00Z",
    "sources": [{ "source": "source:reichsarchiv-weltkrieg-1" }]
  },
  "entries": [
    {
      "id": "antwerp",
      "at": "1914-08-20T12:00:00Z",
      "delta": -1,
      "label": "III Reserve Corps left before Antwerp",
      "formations": ["1914:corps-de-iii-res"],
      "lngLat": [4.45, 51.05],
      "note": "…"
    }
  ],
  "comparisons": [
    {
      "id": "schlieffen-1905",
      "label": "The 1905 memorandum",
      "a": 59,
      "b": 9,
      "unit": "divisions"
    }
  ],
  "summary": "Footnoted Markdown.[^herwig-2009]",
  "sources": [{ "source": "source:herwig-2009" }]
}
```

Entries must be in time order and inside the pack range; a positioned entry
becomes a ring on the map once the clock passes it; the gauge under the
timeline shows the running value and the card the full ledger (`?card=<id>`).

## 9. Add an image

Read [ADR 0007](decisions/0007-imagery.md) first. Put the manifest
(`media.json`) beside a local copy of the image under
`content/shared/media/<kind>/<slug>/`; the binary stays out of git (it is
ignored) and goes to the assets bucket by the media pipeline (`sand-y0u.3`,
or by hand — see `infra/README.md`). The validator refuses manifests without
licence, credit, caption and archive record, or flagged
BLOCKED/UNVERIFIED/UNKNOWN/HOLD. Reference the image from an entity by its
`media:` id.

## 10. Add a new scenario pack

```text
content/eras/<yyyy>-<slug>/
  pack.json    id "<era>:<slug>", idPrefix "<era>" (unique across packs),
               timeRange, region, borderYear (one of content/shared/geo/borders),
               camera, sides, branches (exactly one historical), defaultBranch,
               status "seed"
  README.md    what the pack covers and its sourcing status
```

Then formations → routes → events → beats, in that order, validating as you
go. A pack is valid alone; the shared registries are its only dependency. If
the era needs a new tile extract or border year, see `scripts/tiles-extract.sh`
and `npm run borders`. The atlas/loader story (`sand-shn.1`) will pick up new
packs automatically; until then the shell bundles the 1914 seed.

## 11. Before you open the PR

```bash
npm run validate:content        # errors must be zero
npm test -- --run               # content tests run in the suite too
npm run lint && npm run typecheck
```

Then the PR checklist: every date, number and position cites a Source;
contested points are historiography; hypothetical branches are labelled;
images follow ADR 0007. Content PRs are fact-checked (`sand-23b.2`) as well as
reviewed for form.
