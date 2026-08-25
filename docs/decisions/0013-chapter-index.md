# 0013 — The chapter index: a table of contents, not a chip row

- **Status:** accepted
- **Date:** 2026-08-23
- **Bead:** `sand-neh.7`

## Context

The engine has one container for a focused beat sequence, the `Battle`, and
the pack uses it for two different things. A **zoom-in** brings routes of its
own and replays the engagement on its own clock. A **chapter** — the
convention PR #63 introduced — brings none, so `movementSourceFor` leaves the
campaign tokens on their campaign movement and it reads as narrative plus
static markers. The 1914 pack now carries eleven of them: six zoom-ins and
five chapters, including the two that are not battles at all (the origins of
the plan, the July Crisis).

The chrome did not know the difference. All eleven sat in one row of chips
above the map under the label **"Zoom in:"**, which called a chapter a
zoom-in every time the reader looked at it. Agents flagged it on `sand-1l0.6`,
on `sand-1l0.9` and again on `sand-1l0.13` — three times, from three different
directions, which is what a papercut looks like from the inside.

The row had a second problem, from the design review (`sand-1l0.15`): on a
desktop those eleven chips wrapped to **three rows**, the heaviest chrome on
the page, sitting between the header and the map at every moment of the story.
On a phone they had already been pushed into a horizontally scrolling rail
whose cut edge the audit reads as a defect and the design calls deliberate —
a sign that the shape was wrong rather than the viewport.

ADR 0006 allows shell chrome — title, branch toggle, focus breadcrumb — in
**a single thin header row** above the three surfaces. Three rows of chips is
not that. Nor is the glance depth the place for them: 0006's thirty-second
inventory is the map, the beat, the scrubber and the branch toggle, and puts
zoom-ins in the deep dive.

## Decision

**The label follows from the entity, and the row becomes an index you open.**

### The label

`isChapter(b) === !b.routes?.length` lives in `src/engine/focus.ts`, the module
that owns what a focus is, and is the same test `movementSourceFor` already
branches on — so the word and the behaviour can never drift apart. Everywhere
a level is named, the name is computed:

| Where                         | Chapter                     | Zoom-in            |
| ----------------------------- | --------------------------- | ------------------ |
| index entry tag               | `CHAPTER`                   | `ZOOM-IN`          |
| index entry accessible name   | "Open the chapter Ardennes" | "Zoom in to Liège" |
| breadcrumb trail, once inside | `CHAPTER`                   | `ZOOM-IN`          |

The closed control names the pack the same way: `11 chapters and zoom-ins`
when it holds both, `5 chapters` or `6 zoom-ins` when it holds one kind. A
pack with no chapters never says the word, and a second pack gets the
distinction without a line of new code.

### The treatment

The index is a **disclosure in the breadcrumb row**, the same shape on every
screen:

- **Closed** (the resting state) — one pill at the end of the focus
  breadcrumb, saying how much the pack holds. The chrome above the map is one
  thin row again, as ADR 0006 asks, and the map gets the two rows back.
- **Open** — one list on a wrapped line of its own: campaign order
  (`sand-neh.12`), columns that fill whatever width there is and collapse to
  one on a phone, each entry a full title with its kind beside it. It reads
  down a page like a table of contents rather than sideways past an edge.
  Escape closes it and hands the keyboard back to the control.

Entering an entry is `setFocus`, unchanged: the `focus` slot in the URL stays
the source of truth and every deep link keeps working (ADR 0009).

Nothing is lost by closing it, because the row was never the only way in: a
beat that touches a battle already offers it as a chip in the dossier, which
enters focus from inside the story where the reader actually is.

## Alternatives considered

- **Two labelled chip rows, "Zoom in:" and "Chapters:".** Fixes the word and
  makes the chrome worse — four rows instead of three, and it breaks the
  single chronological order `sand-neh.12` deliberately established, which is
  the one thing that makes eleven titles comprehensible.
- **The phone's scrolling rail on every screen.** One row, but on a wide
  screen it hides half the pack behind a gesture with no affordance, which is
  worse discovery than wrapping. The rail is what you do when there is no
  room; a desktop has room, it just should not spend it on chrome.
- **An index card in the dossier (`?card=chapters`).** The most orthodox
  reading of 0006 — glyph opens card — but it replaces the beat you are
  reading with navigation, needs a synthetic id in the URL contract that
  names no entity, and has no moment or place to hang a glyph on.
- **◆ battle glyphs on the timeline instead of an index.** Right eventually —
  0006 names the family — but eleven date ranges over a forty-day axis
  collide badly without the density cap 0006 assumes, and a timeline of
  glyphs answers "what happened when", not "what is in this pack". Filed as
  a follow-up rather than done badly here.
- **A fourth panel or a permanent sidebar of chapters.** Banned by ADR 0006,
  and this is exactly the pressure that record exists to resist.
- **Leaving it.** Three rows of navigation above the map, and a chapter still
  called a zoom-in.

## Consequences

- `src/ui/ChapterIndex.tsx` + `chapter-index.css` own the index; `Breadcrumb`
  keeps the trail and hosts it. The phone rail in `breadcrumb.css` goes, and
  with it the masked cut edge the design audit kept reporting.
- The gallery gains a `Chapter index — open` specimen, so the list is
  reviewable in both themes without clicking through the app.
- Any pack with more than one focus level gets the same index; the words come
  from what its battles carry, not from the pack.
- A pack that grows past twenty-odd levels will want grouping or a filter.
  That belongs to the dossier's search mode (`sand-shn.6`), not to a longer
  list in the chrome.
- `docs/design-review.md`'s open item — "chapter chips wrap to three rows on
  desktop" — is settled here.

## Amendment — 2026-08-25: the index prints dates (`sand-neh.23`)

This record shipped an index with no dates in it, and PR #98 wrote down why:
`1914:origins` and `1914:july-crisis` sit in a clamped 2–4 August window that
is not when they happened, "and the data cannot tell the component which
windows are real. Their beats carry the true dates in `dateLabel`; the index
stays silent rather than lying." That was a statement about the data, not
about tables of contents, and [ADR 0015](0015-chapter-windows.md) changed the
data: `Battle.window` now says what `timeRange` means. **The index speaks.**

Each entry carries an eyebrow under its title — the kind it already had, and
now the span beside it:

| `window`    | The entry shows              | In the 1914 pack             |
| ----------- | ---------------------------- | ---------------------------- |
| _(absent)_  | the window, as a date span   | nine levels, `5–12 Sep 1914` |
| `"outside"` | the same, from its own clock | the epilogue, `1915–1919`    |
| `"placed"`  | **`dates inside`**           | the origins, the July Crisis |

The interesting half is the third row. A `placed` window must not be printed —
that is the lie 0013 refused — but a blank in a column where ten of twelve
entries carry a date does not read as a silence anybody chose; it reads as
data that failed to load. So the slot says why it is empty and where the
answer is: inside the chapter, on beats that each carry their real date. The
words are the same for every pack, because `placed` is the only thing the
engine knows.

`labelSpan` in `src/engine/ticks.ts` writes the span the way a person would —
dropping the month when both ends share it, the year when both ends share
that, and writing a run of whole calendar years as years, so the epilogue is
`1915–1919` and not `1 Jan 1915 – 31 Dec 1919`.

### Rejected, in order of how nearly they worked

- **The real span, derived from the chapter's beats' `dateLabel`.** The
  obvious answer, and it does not survive contact with the field. The nine
  beats of `1914:origins` carry `1871–1894`, `1891–1905`, `The French frontier
after 1871`, `December 1905`, **`The argument since 1956`**, `1906–1914`,
  `1911–1914`, `1839–1914` and `The plan as a machine`. Two of those are not
  dates, and one is a date in the 1950s about historiography. A min/max over
  them prints `1839–1956`, which is worse than silence: a false span, stated
  with confidence. `dateLabel` is authored prose for a reader — the content
  model says so — and parsing prose to fill a data slot is how a pack starts
  lying by accident.
- **Nothing at all, as before.** The status quo, and the thing this amendment
  exists to overturn: it was right while the data could not tell the two kinds
  apart, and once the data can, an unexplained gap is the only remaining
  ambiguity in the column.
- **A word like "Prologue".** True of both of the 1914 pack's `placed`
  chapters and false in general. `placed` means "somewhere on the campaign
  strip", not "before it" — an interlude placed mid-campaign is as legal — and
  deriving the word from where the window sits relative to `pack.timeRange`
  would be inference dressed as data, which is exactly what 0015 removed.
- **A new field, `Battle.dateLabel`, carrying the real span in the author's
  own words.** The fully informative answer, and the right one eventually: it
  is the only way `1914:july-crisis` gets to say `28 June – 4 August 1914` in
  the index. It is also a content-model change — schema, JSON Schema,
  validator, every pack — two days after 0015 settled the field that says what
  a window means, and 0015 explicitly rejected a second string beside it.
  Filed as a follow-up rather than smuggled in behind a chrome bead.
- **Dates on the breadcrumb trail as well, once you are inside a level.**
  The trail says where you are, and the timeline under it is already showing
  that level's window at full width. A date there is a second answer to a
  question nothing asked.

### What it costs

- An index entry is two lines rather than one: the title, then
  `CHAPTER · 21–24 Aug 1914`. Beside the title the longest span the pack has —
  `18 Aug – 14 Sep 1914` — takes half a 280px column and shreds the long
  titles into four lines. Under it, both are whole, and the title has gained
  the width the kind tag used to occupy.
- The closed control is untouched: one pill, one count, no dates. ADR 0006's
  single thin header row is what the resting state still is.
