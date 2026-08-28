# 0006 — Information architecture: one map, one dossier, one timeline

- **Status:** accepted; **amended 2026-08-27** (`sand-neh.26`) — see
  "Amendment: what the map may host"
- **Date:** 2026-08-22
- **Bead:** `sand-neh.5`

## Context

The proof of concept works because it has exactly three surfaces: the map,
the dossier on the right, the timeline along the bottom. Everything the
roadmap adds — technology, science, documents, decision points, causal
chains, battles, branches, threads, sources — is a pressure to add a fourth
panel, a rail, a drawer. Each one would be reasonable alone; together they
would turn a war room into a dashboard. Phase 0 has now shipped the three
surfaces on the real engine (map `sand-a55.9`, dossier `sand-a55.12`,
timeline `sand-a55.8`), the branch toggle (`sand-a55.13`) and the zoom-in
(`sand-a55.14`); this record fixes the rule before the content stories build
on it.

## Decision

**Three surfaces, and only three.** Everything else is a **glyph** (on the
timeline or the map) that opens a **card** inside the dossier, or a **mode**
of one of the three surfaces.

| Surface                                               | Owns                                                                                                                                                                | Never hosts                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Map**                                               | geography, borders, places, the armies and their routes, battle regions, markers that open cards; the key to the sides; the tour's lower third (amended, below)     | a fourth surface; prose the reader must scroll to read |
| **Dossier** (right on desktop, bottom sheet on phone) | the narrative beat for now × branch × focus; every card (person, formation, battle, document, tech, science, decision point, causal link, source); the branch panel | a second scrolling panel; navigation between eras      |
| **Timeline** (bottom)                                 | the clock and its controls, phase bands, event and card glyphs, the branch's divergence mark, the focus sub-range                                                   | prose; lists                                           |

Shell chrome — title, branch toggle, focus breadcrumb — sits in a single thin
header row above the three surfaces. That is the whole inventory.

### Glyphs

Anything with a moment has a glyph on the timeline; anything with a place has
a marker on the map. A glyph is small, monochrome in `--brass`/`--muted`,
hover-labelled, and opens one card. Families (all render with the same
mechanism, `src/ui/Timeline.tsx` markers → dossier card):

- event ▲ (major events are ticks today) · battle ◆ (opens the zoom-in chip
  and the battle card) · decision point ◇ (`sand-1l0.22`) · technology ⚙
  (`sand-w9t.1`) · science ✦ "Meanwhile" (`sand-9u2.1`) · document ▢
  (`sand-1l0.25`) · causal link ⟶ from any card (`sand-ekc.1`).

Glyph density is capped per zoom level of the timeline; overflow collapses
into a count that opens a list card in the dossier. Filters (by family, by
field) are a dossier control, not a new bar.

### Cards and modes

- A **card** is a dossier view with a back link to the beat that was showing.
  Cards stack one deep: card → back to beat. Deep links carry the card in the
  URL (`?card=<id>`, a slot beside `t`, `branch`, `focus`).
- The **causal explorer** is a dossier _mode_ (a chain view that replaces the
  beat until closed), not a panel. The **about-this-branch** panel is already
  a dossier mode; **tours** (`sand-1l0.14`) are a timeline mode that drives
  the clock and camera and narrates **on the map** (amended, below).
- **Sources** render as footnotes under the beat and as a bibliography card.
  **Search** (`sand-shn.6`) is a dossier mode. The **atlas of eras**
  (`sand-shn.1`) is the only other screen in the app, and it is a landing
  page, not a fourth surface.

### Three depths

| Depth                      | Time to value                      | Visible                                                                                                                                                             |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Glance** (30 s)          | opens playing or one click from it | map with borders, armies and the day counter; the beat title + date and the first paragraph; the scrubber with phase bands; the branch toggle                       |
| **Tour** (10 min)          | one click                          | the guided tour: camera moves, narration beats, pauses at decision points; glyphs light up as the tour passes them; the hypothetical branch is shown once, labelled |
| **Deep dive** (open-ended) | scrub, click, zoom                 | zoom-ins with their own clock, every card family, the causal explorer, documents in the original language, the bibliography, deep links to any moment               |

Nothing needed at the glance depth may be hidden behind the deeper ones;
nothing needed only at the deep dive may clutter the glance.

### Responsive rule

The three surfaces survive on every screen:

- **≥ 1100 px** — map and dossier side by side (dossier 340–380 px), timeline
  full width below.
- **700–1100 px** — map full width, dossier beneath it as a collapsible panel
  with the beat title always visible, timeline below.
- **< 700 px (phone)** — map full-bleed; the timeline is a compact strip
  pinned above the bottom sheet (counter, play, scrubber); the **dossier is a
  bottom sheet** with three detents (title only / half / full). Touch
  scrubbing and pinch-zoom must not fight: the scrubber owns horizontal drags
  inside its strip, the map owns everything else (`sand-shn.11`).

### Wireframes

Desktop (≥ 1100 px):

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ SANDTABLE  The Schlieffen Plan…           [What happened | ? Schlieffen's…]  │  header
│ Campaign › First Battle of the Marne ✕                      Zoom in: [Marne] │  crumbs
├───────────────────────────────────────────────────┬──────────────────────────┤
│                                                   │ PACK · BRANCH            │
│   ┌ hypothetical frame when on a branch ┐         │ ▸ Hypothetical — about… │
│   │  borders · places · armies/trails   │         │ 4–9 AUGUST 1914          │
│   │  ◆ battle region · ▢ document pin   │         │ Mobilization, and the…  │
│   │                                     │         │ body … [^1] … [^2]       │
│   └──────────────────────────── [+][−] ─┘         │ ─ Sources ─ 1. Herwig…   │
│                                                   │ ● Germany ● France ● BEF │
├───────────────────────────────────────────────────┴──────────────────────────┤
│ Day 22  Mon, 24 Aug 1914 12:00   [Battle of the Frontiers]   ⏮ ▶ ⏭ [1 day/s] │
│ ▓▓phase▓▓░░phase░░▒▒hypothetical (hatched)▒▒   ▲  ◆   ⚙   ✦   ▢    ◇         │
│ ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤       │
│ 2 Aug   9      16      23      30     6 Sep    13      20      27            │
└──────────────────────────────────────────────────────────────────────────────┘
```

Phone (< 700 px):

```text
┌──────────────────────┐
│ SANDTABLE   [Hist|?] │  header (toggle collapses to two pills)
│                      │
│      map             │  full-bleed; camera controls only
│   ◆      ●───●       │
│          ▢           │
│                      │
├──────────────────────┤
│ Day 22 · 24 Aug  ▶   │  compact timeline strip (counter, play, scrubber)
│ ▓▓▓▓▓░░░░▒▒▒▒▒▒ ▲ ◆  │
├──────────────────────┤
│ ══ Mobilization… ▲   │  dossier bottom sheet — detent 1: title
│ 4–9 AUGUST 1914      │  drag up → half → full (body, cards, sources)
└──────────────────────┘
```

## Alternatives considered

- **A fourth surface for technology/science ("rails").** Tempting and in the
  original backlog wording; rejected because every later family would claim
  the same right, and because a rail steals height from the timeline and
  width from the dossier on every screen.
- **Tabs in the dossier (Narrative / Tech / Documents…).** Hides the story
  behind a choice; glyphs on the timeline keep the story linear and let each
  family announce itself at its moment.
- **Modals for cards.** Break the map/time context; cards in the dossier keep
  the clock and the map visible.
- **A separate page per battle.** Loses the campaign clock; the zoom-in keeps
  time and returns you to where you were.

## Amendment: what the map may host (2026-08-27, `sand-neh.26`)

Two sentences in the table above were wrong, and the measurements say so.

The dossier's grid is `auto … auto` around a `1fr` reading pane, so the two
rows that never change — the cast strip and the legend — were satisfied before
the prose got anything. Measured on the shipped app: the beat computed to
494 px against 1766 px of content on desktop, **58 px with a tour running**,
and **exactly 0 px on a phone**, where the legend took 67 of the 71 available
pixels and `overflow: hidden` meant the reader could not even scroll to the
narrative. The tour's own narration showed 178 px of 506 px behind a scrollbar
macOS does not draw at rest. The panel the whole app is for was the panel with
nothing in it.

The original rule was **"no fourth surface"**, and that rule stands. What it
does not require is that everything which is not geography must be stacked in
the reading rail. So:

- **The map may host the key to the sides.** It is a key to the map's own
  colours, it has not changed since the page loaded, and in the rail it was a
  fixed row above the prose. It is a closed disclosure on the map, top-left.
- **The map may host the tour's lower third.** A sand table has a narrator
  standing at the table pointing at it, not a second document on the shelf.
  Sized to its own content, it also ends the tour's own clipping. On a phone,
  whose map is too short to give a corner away, the tour stays stacked above
  the beat in the sheet.

Both are laid **over** the map, owned by it, and pointer-transparent except
where there is something to press. Neither is a new surface: the inventory is
still map, dossier, timeline, and the reading pane now carries a
`minmax(280px, 1fr)` floor so it can never be starved to nothing again.

What is still forbidden, and is the part of the original rule that was doing
the real work: **a fourth panel**, and **prose on the map that the reader must
scroll to read**. The lower third narrates the step the reader is on; it is
not a second dossier.

## Consequences

- The card families (`sand-w9t.1`, `sand-9u2.1`, `sand-1l0.25`,
  `sand-1l0.22`, `sand-ekc.1`, `sand-shn.5`) implement **glyph → dossier
  card** with a shared card frame from the component library (`sand-neh.3`),
  and add `?card=` to the URL state (`src/engine/url-state.ts`).
- The responsive layout story (`sand-shn.11`) implements the bottom sheet and
  the compact timeline strip; the motion story (`sand-neh.4`) defines the
  sheet and card transitions.
- Tours (`sand-1l0.14`) are a timeline mode; search (`sand-shn.6`) and the
  causal explorer (`sand-ekc.1`) are dossier modes.
- Any proposal for a new panel must supersede this record.
