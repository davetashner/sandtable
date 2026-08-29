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
`content/shared/sources/`, add it — **one work per file**, named for its id
without the `source:` prefix, so `source:tyng-1935` goes in
`content/shared/sources/tyng-1935.json` (ADR 0022):

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
  e.g. `source:afgg-1-1`), and it is also the file name: `afgg-1-1.json`. The
  validator errors if the two disagree.
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

Shared registries serve every pack. Each is a directory of one file per entity,
named for the id without its prefix — write a new file, never append to an
existing one (ADR 0022):

- `content/shared/places/<slug>.json` — one `Place`, id `place:<slug>`: the name
  used in the narrative (period name), alternate names with language/period,
  `kind` (`city`, `town`, `fortress`, `river`, …), `lngLat`, country in the era.
  `place:ypres` → `content/shared/places/ypres.json`.
- `content/shared/people/<slug>.json` — one `Person`, id `person:<slug>`
  (surname-first slug): name, dates, nationality, roles with dates, a
  one-paragraph summary, portrait media ids, sources.
  `person:joffre-joseph` → `content/shared/people/joffre-joseph.json`.

Because each entity has a file of its own, adding one is a new file and two
authors working in parallel never touch the same bytes. Copy a neighbour when
you want the house style: `npx prettier --write` the file when you are done, and
`npx tsx scripts/split-registries.ts --check` will tell you if a file and its
entity have got out of step.

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
  archive, sources. An excerpt **must** carry a verification receipt
  ([ADR 0021](decisions/0021-quotation-receipts.md)); see "The receipt for a
  quotation" below. If you
  cannot open the work, do not write an excerpt — cite the work without pages
  and without quotation marks, which is what most of this shelf gets.
- **DecisionPoint** (`decisions.json`): `at`, `actor`, `question`, `options`
  (each may name a branch), `historical` option, `reasoning` available at the
  time, `verdict`, sources.
- **Historiography** (`historiography.json`): a contested point, carried as an
  argument (ADR 0017) — `question`, **two or more** `positions` (each a
  `label`, the `who` that holds it, and a footnoted `summary`), `settled`,
  `unread`, sources. Point at it from every entity the dispute touches with
  `links.historiography`, and reduce the matching note in
  `docs/historiography-1914.md` to its register entry in the same PR: the card
  carries the positions and the pages, the doc says where they are. A card
  asserts _who holds a position_, so the bar for one is higher than for any
  other family: every position cites a work that was read, with pages where the
  volume gives them, and a holder quoted through somebody else is labelled as
  such on the card. A point can be worth a card and still not be writable —
  when the historians who hold the sides cannot be opened from here, leave the
  note in the doc, mark it in the table there and say why. A card built on
  second-hand attribution misrepresents a named historian, which is the one
  failure this family exists to prevent.
- **CausalLink** (`links.json`): `from` → `to` any entity id in any pack,
  `relation`, the `claim`, `confidence`, `historiography`, ≥1 `evidence`
  citation. Cross-pack links (`1870:sedan` → `1914:…`) are how the eras
  connect; the validator resolves them across all of `content/`.

### The receipt for a quotation

A quotation is the one claim the validator cannot check by resolving anything,
so it comes with evidence: a **receipt** in `content/receipts/<era-dir>.json`
holding the retrieved text with the quotation inside it. Required for every
`Document.excerpt`; allowed, and useful, anywhere else you quote.

Get the context from the source itself:

```bash
npm run receipts -- --capture https://www.ibiblio.org/pha/myths/jm-097.html \
  --find "depart with utmost secrecy from Hitokappu Bay"
```

That fetches the page's own bytes, extracts the text and prints the passage
around your phrase. **Do not use a tool that summarises the page for you** —
what comes back is the tool's rendering, not the source, and a receipt built
from one is exactly the thing receipts exist to stop. If the phrase is not
found, that is a finding: it is on another page of the transcription, or it is
not in the source. Do not write it down until it is.

Then paste it:

```json
{
  "id": "receipt:1941-operation-order-hitokappu-secrecy",
  "quote": "… depart with utmost secrecy from Hitokappu Bay on 26 November …",
  "source": "source:japanese-monograph-97",
  "pages": "21",
  "usedIn": ["1941-pearl-harbor:document-operation-order"],
  "how": "fetch",
  "url": "https://www.ibiblio.org/pha/myths/jm-097.html",
  "checkedAt": "2026-08-28",
  "checkedBy": "Your Name",
  "context": "… the retrieved text, verbatim, with the quotation inside it …",
  "repeat": "agreed"
}
```

- `quote` is the passage **exactly as your content carries it**. Write elisions
  as `…` or `[…]`; each surviving fragment is checked against `context` in
  order, so an ellipsis costs you nothing.
- One receipt per passage. A document quoting four passages pages apart gets
  four receipts — that is cheaper than pasting a whole transcription, and it
  lets each one carry its own page.
- `how: "fetch"` needs `url` and can be re-run. `how: "read"` needs `copy`,
  naming the copy closely enough that somebody else could find it, and nothing
  can ever re-run it — it is your word, and `checkedBy` is why your name is on
  it.
- `repeat` says whether asking twice agreed. If it did not, say what differed
  in `note` and **write no page**: `repeat: "differed"` with `pages` is an
  error, because a locator from a retrieval that will not repeat itself is not
  a locator.
- `pages` only if you saw the printed page marker. Rule 3 of
  [`docs/sources.md`](sources.md) applies here exactly as everywhere else.

Check your work, and everyone's:

```bash
npm run receipts              # coverage, offline
npm run receipts -- --fetch   # re-fetch every receipt and report drift
```

The twenty documents in `content/receipts/backlog.txt` predate this and are
allowed to go without one until `sand-23b.57.1` closes. Adding a receipt for
one of them means deleting its line — the validator will not let you keep both.

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

Where the plan named an hour rather than a day, write `plannedAt` — an
instant, in place of `plannedDay`, never both — or a fractional `plannedDay`:

```json
{
  "id": "one-oclock",
  "label": "The hour Tokyo ordered: 1 p.m. in Washington",
  "plannedAt": "1941-12-07T18:00:00Z",
  "actualAt": "1941-12-07T19:20:00Z"
}
```

That milestone is read on the clock: the slip picks its unit from its own
size — minutes under two hours, hours under two days, days beyond — so the
eighty minutes between the hour Tokyo ordered and the hour the memorandum was
handed over is drawn as `80 min behind` rather than rounded to nothing
(`sand-lry.24`). Both the plan and the actual then carry the hour (UTC, marked
`Z`) in the card. A whole-day `plannedDay` reads in days exactly as before, so
mixing the two in one timetable is fine.

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
error, and the fix is to name what actually moved it (`sand-23b.8`). How fast
each mode could go is 1914's by default and is declared by the pack when its
century was faster — see [below](#when-your-century-is-faster-than-1914).

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

### When your century is faster than 1914

The speeds the pace check uses are 1914's: `march` 1.7/2.7 km/h, `motor`
45/70, `rail` 15/30, `sea` 15/40, `air` 60/150 — the sustained bar, then the
limit nothing beat. They are the default for every pack, and for most modes in
most eras they are still about right.

They are not right for a fast carrier task force (25–33 knots, so 46–61 km/h,
which is above the 1914 `sea` **limit**) or for anything with a radial engine.
When your pack's technology outran 1914's, say so once in `pack.json`, per
mode ([ADR 0020](decisions/0020-pace-bands.md)):

```json
"pace": {
  "sea": {
    "sustained": 46,
    "limit": 61,
    "note": "US fast carrier task force: 25 knots economical, 33 knots flank.",
    "sources": [{ "source": "source:morison-1949", "pages": "iv. 88" }]
  }
}
```

`note` and `sources` are required, because a pace band is a number about the
past and every number about the past cites a source. Write it once for the
whole pack; there is no per-route override, on purpose.

Three things to know:

- **Declare only the modes that changed.** Anything you leave out keeps the
  1914 default, and that is usually what you want: a Marine on Betio walks no
  faster than a poilu on the Marne, so a Pacific pack declares `sea` and `air`
  and leaves `march` alone. If you find yourself wanting to raise `march`, the
  problem is almost always a date or a mode on a route, not the band.
- **There is a ceiling.** `sustained` may not exceed `limit`, and neither may
  pass what the mode has ever physically done (`PACE_CEILING` in
  `src/packs/validate/pace.ts`). A band above it is an error: at that point
  you have stopped describing the mode.
- **A band nothing uses is a warning.** If you declare `sea` and no route or
  track in the pack has `"mode": "sea"`, the band judges nothing — usually a
  mode missing from the routes it was written for.

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

Don't assemble the skeleton by hand — `npm run new-pack` writes it, and more
usefully refuses the half-dozen ways it can be written wrongly:

```bash
npm run new-pack -- --dir 1942-midway --title "1942: Midway" \
  --start 1942-06-03 --end 1942-06-07 --region 170,20,-160,35 \
  --border-year 1941 --tiles central-pacific-z10 \
  --side 'us=United States|USA|The Allies' \
  --side 'jp=Empire of Japan|Japan|The Axis'
```

```text
content/eras/<yyyy>-<slug>/
  pack.json    id "<era>:pack", idPrefix "<yyyy>-<slug>" — the directory name
               (ADR 0019; `1914` and `1915` are grandfathered counter-examples),
               timeRange, region, borderYear (one of content/shared/geo/borders),
               tiles (one of content/shared/geo/tiles/manifest.json — omit only
               if the pack is inside central Europe), camera, sides,
               branches (exactly one historical), defaultBranch, status "seed"
  README.md    what the pack covers and its sourcing status
```

Everything a flag has not answered is prompted for when you are at a terminal;
with `--no-input`, or from an agent's shell, a missing answer is an error naming
the flag rather than a process hanging on a prompt nobody will see. `--dry-run`
prints without writing. `--help` lists the rest.

`idPrefix` and `status` have no flags at all, because they have no choices: the
first **is** the directory name and the second is `seed` on a first pass. What
the tool does with the others is the point of it —

- **`--border-year`** prints that year's caveat from the manifest, in full, and
  puts it in the README. Several are traps: 1931 is badly wrong for Russia,
  1941 has no Manchukuo and no Republic of China, 1945 is the post-surrender
  map. Better to read it now than to discover it in fact-check.
- **`--tiles`** is checked against the closed enum and reported with the
  manifest's `status`, so you know whether the archive is uploaded yet. Leave it
  out with a region outside the `central-europe-z10` box and the tool refuses,
  naming the archives whose bbox does contain your region.
- **`--pace`** needs `--pace-note` and `--pace-source` with it, the source must
  resolve, the band must sit under `PACE_CEILING`, and `march` is refused
  outright (ADR 0020). Most packs need no bands at all and should pass none.

The output validates as it stands and is Prettier-clean, so it is committable
as generated. It is not _finished_: the closing report lists every placeholder,
and the README is a set of questions, above all about what you read in full and
what you only saw a catalogue record for.

### Say which map you are on

`borderYear` picks the political geography; **`tiles` picks the ground**. Omit
it and you get `central-europe-z10` — the box −1.5,42 → 24,56, which was every
pack there was until there were Pacific ones. A pack outside that box that says
nothing draws its borders and its armies over an empty field, which is not a
map with a mistake in it, it is a mistake that looks like a map.

```json
{ "borderYear": 1941, "tiles": "central-pacific-z10" }
```

An **archive name**, not a URL: the engine resolves it to the assets bucket, and
the list is closed, so your editor and the validator will both refuse a typo.
`content/shared/geo/tiles/manifest.json` says what each archive covers and
whether it is uploaded yet — every theatre-scale one is, and the assault-scale
ones are run when their pack is authored (`sand-lry.17`). Naming one that has
not been run yet is still the right thing to write. You will see the map say _the basemap
for this map is not on the table yet_ over the borders and the movement until
the extract is run; that is the honest state, and the pack is finished the day
it is.

A **zoom-in may need a different archive from its campaign**, because a theatre
extract stops at z10 and an assault is measured in hundreds of metres: Betio at
z14 is not inside `central-pacific-z10`. Put `tiles` on the battle in
`battles.json` and it applies while that zoom-in is open, and only then.

Then formations → routes → events → beats, in that order, validating as you
go. A pack is valid alone; the shared registries are its only dependency. If
the era needs a new tile extract or border year, see `scripts/tiles-extract.sh`
(and add the archive to `content/shared/geo/tiles/README.md`'s four steps)
and `npm run borders`. The atlas/loader story (`sand-shn.1`) will pick up new
packs automatically; until then the shell boots into the 1914 seed, which it
**fetches** rather than bundles: `npm run build` assembles `content/` into one
`dist/pack/<id>-<hash>.json` and the app asks for it (ADR 0018). Two things
follow for an author. Writing a beat no longer changes a byte of the JavaScript
bundle, so a content pull request is no longer also a performance pull request.
And content has a ceiling of its own — `pack` in `scripts/bundle-budget.json`,
checked by `npm run bundle:budget` — which is the one number a content change
can still move. **Build before you read it**: it measures `dist/`, so without a
build it answers about the previous one, and a stale answer here is a whole
content pull request out of date. It refuses rather than let you read one
(`sand-pmz.31`), so `npm run build && npm run bundle:budget` is the whole
instruction.

## 11. Before you open the PR

```bash
npm run verify                  # the whole gate list CI runs (ADR 0023)
npm run receipts -- --fetch     # if you added or edited a quotation
```

`verify` includes `validate:content` — errors must be zero — and
`warning:budget`, which holds each **kind** of warning to a ceiling in
`scripts/warning-budget.json` (ADR 0023). Two of those kinds bear on authoring.
A source added ahead of the pack that will cite it warns, and there is headroom
for that; a wave of works added and never cited runs the ceiling out, and the
answer is to cite them or drop them rather than to raise the number. A warning
of a **kind not listed at all** fails outright, and means either a validator
rule you have just tripped for the first time or a message that was reworded —
both want a sentence in that file saying what the right count is.

Then the PR checklist: every date, number and position cites a Source;
contested points are historiography; hypothetical branches are labelled;
images follow ADR 0007. Content PRs are fact-checked (`sand-23b.2`) as well as
reviewed for form.
