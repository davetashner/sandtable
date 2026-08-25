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
  "tier": "study",
  "author": "Tyng, Sewell",
  "title": "The Campaign of the Marne 1914",
  "year": 1935,
  "publisher": "Longmans, Green, New York",
  "notes": "Operational narrative from the interwar official histories; good on the Ourcq."
}
```

- `id` is `source:<surname>-<year>` (or a short slug for official histories,
  e.g. `source:afgg-1-1`).
- `tier` is where the work stands in the hierarchy of evidence — `primary`,
  `official-history`, `study`, `unit-history`, `memoir`, `general` or
  `reference` — and it is what the reader-facing bibliography groups by, so
  pick it by the work's **form** and let `notes` carry the nuance
  ([`docs/sources.md`](sources.md)).
- `notes` is not optional in practice: it is the line a reader is shown under
  the work in the bibliography, and it is the whole of "further reading".
- Add the entry **in the PR that first cites it**. A registry entry nothing
  cites appears in no bibliography, and the validator warns about it.
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

Everything you write here is a **card**: `?card=1914:army-de-4` opens the
formation in the dossier — the name and kind, the side, the commander as a
face at name size linked to his own card, the summary, the strength figures at
their date, the concentration area, the formation above it and the ones under
it as chips, and every source cited once. It opens by clicking the army's
token on the map, from the commander's card, from `links.formations` on a beat
or an event, from `[4. Armee](1914:army-de-4)` in prose — and from the legend
where the side put a single army in the field, which is why Britain and
Belgium are controls in the legend and Germany and France are not (there is no
one formation called "France"). An optional `plates` set on the formation is
the "who is who" of what that army wore and carried: two to four pictures on
one declared axis, under [ADR 0014](decisions/0014-plate-sets.md)'s rules.

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
- A single waypoint may take a **fourth element** — the same four words — when
  it is worse (or better) than the path it sits on: `[2.31, 48.86,
"1914-09-04T18:30:00Z", "low"]`. Use it only where the derivation already
  says so in prose: the hour a memoir does not give, the position two orders
  contradict. Do not stamp `medium` on every waypoint of a `medium` route —
  that says nothing the route did not already say. A `low` or `contested`
  waypoint draws as an approximate position on the map (open token, dashed
  halo, `≈` before the label) and is judged more leniently by the pace check.
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

### Link a name to its bio

Name a person in the prose and link them to their card with ordinary Markdown
link syntax, using the entity id as the target:

```markdown
On 17 August [Lanrezac](person:lanrezac-charles) meets
[Sir John French](person:french-john) at Rethel.
```

- The link opens the person's card in the dossier — the clock, branch and
  zoom-in stay where they are. It is a real link, so it can be copied or
  opened in a new tab.
- **Link the first mention in a beat, not every mention.** A name underlined
  five times reads as a warning, not an invitation.
- The same syntax works for anything with a card — `place:`, a document, a
  battle, a tech card — so `[the ultimatum](1914:document-german-ultimatum-to-belgium-1914-08-02)`
  is a link too. The validator rejects a target that does not exist.
- Only mark people the beat is actually about; they should be in the beat's
  `links.people` as well, which is what feeds the chips.
- **Ambiguous surnames must be written out.** The registry holds two Moltkes
  and two Wilhelms: write `[Helmuth von Moltke the Younger](person:moltke-helmuth-von-younger)`
  the first time, never a bare "Moltke". This is why the link is authored
  rather than matched from the text — a surname matcher cannot tell an uncle
  from a nephew.

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

### Chapters, and what their window means

Leave out `routes` and you have written a **chapter** instead: narrative and
static markers, with the campaign tokens left on their campaign movement. The
chrome works that out for itself (ADR 0013) — never label a level by hand.

What the chrome cannot work out is what your `timeRange` _means_, so say it
with `window` (ADR 0015):

- **Nothing** — the ordinary case. It is when the thing happened, and it falls
  inside `pack.timeRange`.
- **`"placed"`** — it is where the chapter sits on the campaign strip, not when
  it happened. `1914:origins` narrates 1871–1914 from a 2–4 August window this
  way. Give every beat its real date in `dateLabel`, and say in the chapter's
  `summary` that the window is a position.
- **`"outside"`** — it is when the thing happened, and the campaign does not
  contain it: a prologue, or an epilogue. It must be a chapter, its window must
  really be outside `pack.timeRange`, and its beats are then checked against
  _its_ window rather than the pack's. It gets a strip of its own — the clock
  swaps over on the way in, at a pace its own length can be read at — and
  anything the timeline places by date, the ✦ Meanwhile cards included, is
  placed on that strip instead of the campaign's.

`1914:meanwhile-epilogue` is the worked example of the third: 1915–1919, three
beats, six science cards the campaign strip could not hold.

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

### Rail, road and feet

A route's `mode` says what carried the formation, and the validator holds
every leg to the pace of that mode: a march that covers 80 km a day is an
error, and the fix is to name what actually moved it (`sand-23b.8`).

Mark a transfer by train with `"mode": "rail"` on its route — it draws with a
long dash and the corps token shows only while the train is under way:

```json
{
  "id": "1914:route-vii-by-rail",
  "formation": "1914:corps-fr-vii",
  "mode": "rail",
  "waypoints": [
    [6.86, 47.64, "1914-08-25T12:00:00Z"],
    [2.3, 49.89, "1914-08-27T12:00:00Z"]
  ],
  "confidence": "medium",
  "sources": [{ "source": "source:afgg-1-1" }]
}
```

Road movement is `"mode": "motor"` — Hentsch's staff car, the Paris taxis,
Joffre's drive to Melun. It draws with a short, close dash and keeps its
token: a column of cars is on the ground the whole way, not aboard something.
A commander's track in `tracks.json` takes the same `mode` field, and an
unmarked track is read as road travel rather than as a march.

When a formation changed how it moved, write one route per leg and let them
meet — each leg starts at the instant and the position the one before it
ended. The French 2nd Army is three: `route-fr-2` in Lorraine to
17 September, `route-fr-2-by-rail` west to Picardy, `route-fr-2-picardy`
after it detrained. The map joins them into one path and draws each stretch
the way that stretch was covered.

A railhead is a formation of kind `other` with a route of its own; a
`supply.json` line pairs it with the army it feeds:

```json
{
  "id": "1914:supply-de-1",
  "title": "1st Army: feet against rail",
  "army": "1914:army-de-1",
  "railhead": "1914:railhead-de-1",
  "thresholdKm": 100,
  "summary": "Footnoted.[^herwig-2009]",
  "sources": [{ "source": "source:herwig-2009" }]
}
```

The gauge under the timeline reads kilometres marched and the railhead gap at
the clock; the card (`?card=<id>`) carries the argument.

### The human scale

Casualties are a `CasualtyRecord` in `casualties.json` — one per battle, day
or period, figures per side and category, each with its own confidence and
(where the numbers differ) a range instead of a point. Write the debate into
`historiography`; never let a contested figure read as a fact:

```json
{
  "id": "1914:casualties-22-august",
  "title": "22 August 1914 — the bloodiest day in French history",
  "timeRange": { "start": "1914-08-22T00:00:00Z", "end": "1914-08-23T00:00:00Z" },
  "event": "1914:event-battle-of-the-frontiers",
  "figures": [
    {
      "side": "fr",
      "category": "killed",
      "value": 27000,
      "confidence": "medium",
      "note": "Dead on the day, from the army's own records; rounded.",
      "sources": [{ "source": "source:steg-2013" }]
    }
  ],
  "summary": "Footnoted.[^steg-2013]",
  "historiography": "Who gives what, and why they differ.[^steg-2013]",
  "sources": [{ "source": "source:steg-2013" }]
}
```

Records that overlap in time double-count when summed — give the month _or_
the battles inside it, not both, unless they are in different categories (the
22 August dead are `killed`; the August total is `casualties`). A beat links a
record with `links.casualties`; the line under the timeline reads the sum of
every record whose period has ended at the clock, per side and category, and
opens the latest.

A vignette is a first-person moment in `vignettes.json`: whose eyes, what kind
of witness, a few footnoted sentences, the instant it happened. It appears
inside the beat that contains it once the clock has passed it, set in a
different voice — write it in the present tense, keep it short, and say in
`sources[].note` how far the witness can be trusted:

```json
{
  "id": "1914:vignette-ludendorff-citadel",
  "title": "A staff officer knocks at the citadel gate",
  "at": "1914-08-07T12:00:00Z",
  "place": "place:liege",
  "voice": "Erich Ludendorff, 14th Brigade",
  "kind": "memoir",
  "text": "He hammers on the gate; it is opened from inside.[^ludendorff-1919]",
  "people": ["person:ludendorff-erich"],
  "sources": [{ "source": "source:ludendorff-1919", "note": "his own account" }]
}
```

A legend goes in as a legend (the Foch message at Saint-Gond is
`reconstruction`, and the text says it appears in no document of the time).

## 8a. Script a guided tour

A tour in `tours.json` is the lean-back path through a pack (`sand-1l0.14`):
the engine follows it, so a first-time viewer does not have to know what to
click. Each step is a **complete description of the view**, never a diff from
the step before — what a step leaves out goes back to the default (the
campaign map, the pack's default branch, no card). That is what makes
`?tour=<id>&step=<step id>` rebuild the whole view.

```json
{
  "id": "1914:tour-the-campaign",
  "title": "The campaign, end to end",
  "summary": "What the tour shows, in a sentence.",
  "sources": [{ "source": "source:herwig-2009" }],
  "steps": [
    {
      "id": "liege",
      "title": "Liège: eleven days the plan did not have",
      "narration": "Two or three sentences, footnoted.[^herwig-2009]",
      "at": "1914-08-05T00:00:00Z",
      "playUntil": "1914-08-10T00:00:00Z",
      "focus": "1914:liege"
    },
    {
      "id": "the-wheel",
      "title": "Decision: wheel inside Paris",
      "narration": "Why this moment matters.[^kluck-1920]",
      "at": "1914-08-30T18:00:00Z",
      "camera": { "center": [2.95, 49.35], "zoom": 7.4 },
      "card": "1914:decision-1914-08-30-kluck-wheel"
    }
  ]
}
```

- `at` is where the clock stands when the step opens; add `playUntil` to let
  it run from there. Playback is **one hour per second** unless a step sets
  its own `speed` (simulated ms per real second) — fast enough that a week is
  not a wait, slow enough to read while the tokens move. Times must fall
  inside the pack's range — or inside the battle's, once a step names a
  `focus`.
- **The tour stops at every break in the narrative** so the reader can catch
  up: the card a step reveals, each beat that begins inside the window, each
  decision point it crosses, and the end of the step. Leaving a break is
  either automatic — after a dwell scaled to how much text is in front of the
  reader — or on a click, whichever the viewer has chosen; either way Space,
  → and the Continue button move it on. Set `hold` (seconds) only to override
  the dwell on a still step; leave it out and the narration's own length
  decides.
- Because every break is a pause, **write each step to be read at a stop**:
  a window that crosses three beats will stop three times, which is a feature
  — but do not write a step whose narration only makes sense in motion.
- `focus` enters a zoom-in, `branch` shows a counterfactual (label it as one
  in the narration), `card` opens a dossier card, `camera` frames something
  closer than the region fit.
- Footnote the narration to the **tour's** sources, as beats do.
- Keep steps in time order: a step that runs backwards is allowed (returning
  from a counterfactual to history) but the validator warns, because it is
  usually a typo.
- The tour never traps anyone: pause, step, and exit are always on screen,
  Escape leaves, and touching anything the tour did not set stops the
  autoplay. Write each step so it still reads if the viewer stops there.

## 8b. Write the opening sequence

`pack.opening` is the premise a first-time viewer reads before the map is
interactive. It is optional; a pack without one simply opens on the map.

```json
"opening": {
  "eyebrow": "The plan and the clock",
  "headline": ["August 1914.", "Germany has forty days."],
  "lede": "The German plan is a bet about time…[^herwig-2009]",
  "camera": { "center": [4.9, 50.6], "zoom": 6.8 },
  "claim": {
    "label": "Where does “forty days” come from?",
    "card": "1914:clock-plan-timetable"
  },
  "chain": {
    "label": "How did it start?",
    "hint": "thirty-seven days, from Sarajevo",
    "focus": "1914:july-crisis",
    "card": "1914:link-sarajevo-to-vienna"
  },
  "sources": [{ "source": "source:herwig-2009" }]
}
```

- **One idea per `headline` line** — each is a beat of the reveal, so a line
  that needs a comma probably wants to be two lines. Four lines is the cap.
- **Never assert a bare number.** The 1914 headline says "forty days"; the
  `claim` link opens the plan-timetable clock, whose `assumption` carries the
  sourcing and the disagreement. If your premise makes a claim and you cannot
  point at the card that shows the working, cut the claim.
- The `lede` footnotes to `opening.sources`, as beats footnote to their own.
- `camera` frames what the premise is _about_ — the map settles there while it
  is read, then hands back to the ordinary region fit.
- Do not write the ways on: the engine offers the tour when the pack has one,
  the causal chain when it has links, and always plain exploration.
- **Name your backstory in `chain`.** Without it the engine guesses at the
  first causal link, which is wherever `links.json` happens to start — in this
  pack that was the wheel to the Marne, the _end_ of the story. `card` names
  the link to open; `focus` names the chapter or zoom-in the backstory lives
  in, so the map goes to where the chain begins rather than staying on the
  campaign front. `label` and `hint` let a pack word the action itself.

## 9. Add an image

Read [ADR 0007](decisions/0007-imagery.md) first. Put the manifest
(`media.json`) beside a local copy of the image under
`content/shared/media/<kind>/<slug>/`; the binary stays out of git (it is
ignored) and goes to the assets bucket by the media pipeline (`sand-y0u.3`,
or by hand — see `infra/README.md`). The validator refuses manifests without
licence, credit, caption and archive record, or flagged
BLOCKED/UNVERIFIED/UNKNOWN/HOLD. Reference the image from an entity by its
`media:` id.

**One picture per beat** ([ADR 0012](decisions/0012-photographs.md)). A beat's
picture is its `media` hero slot — the one place that renders the caption, the
credit and the colorized label. Two manifests naming the same beat in
`used_by`, or a Markdown `![…](…)` in a beat body, are validator errors. The
hero is cropped to a 3:2 band on the manifest's `focal_point`, so set the
focal point on anything wider or taller than that; the whole picture is one
click away at full size.

**`used_by` names things that exist.** It is a note of intent — nothing
renders from it — but every id in it must resolve, or the build fails. If the
entity was renamed, fix the reference; if it never existed, or the picture is
wanted by a pack not yet written, drop the entry and say so in `notes`. The
rule exists because `used_by` is also how a picture claims a beat from
outside: an entry that resolves to nothing can quietly sit on top of a beat id
that someone recreates later, and two pictures then collide on one hero slot.

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
