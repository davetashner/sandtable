# 0015 — A chapter may keep its own window, and has to say which kind it is

- **Status:** accepted
- **Date:** 2026-08-24
- **Bead:** `sand-9u2.6`

## Context

`pack.timeRange` is the campaign, and until now everything in a pack had to
fit inside it: the validator refused a `Battle` whose window fell outside it
and a beat whose `from`/`to` did. That rule is right for a campaign and wrong
for the two things a pack has that are not the campaign.

**It was already being worked around.** `1914:origins` narrates 1871–1914 and
`1914:july-crisis` runs 28 June – 4 August; both are written with a window of
**2–4 August 1914**, which is not when either of them happened. It is where
they sit on the campaign strip. The pack README says so, each beat repeats its
real date in `dateLabel`, and ADR 0013 could not print dates in the chapter
index for anybody — "the data cannot tell the component which windows are
real". Three files carry the knowledge and the data carries none of it.

**And it blocked the thing that prompted this.** The ✦ Meanwhile layer
(`sand-9u2`) reaches from 1905 to 1919. Six of its cards are after the
campaign, and PR #96 could only hang all six off `76-the-line`, the pack's
last beat, which gained a closing paragraph reciting the whole decade. Six
chips on one beat is more than that beat wants, and `sand-9u2.3` and
`sand-9u2.4` will add more. What the cards want is a strip that can place
them, and the only strip in the app that is not the campaign's is a focus
level's — which the engine already swaps the clock over to on the way in.

## Decision

**`Battle.window` says what `timeRange` means.** Three states, one of them the
absence of the field:

| `window`    | `timeRange` is                                      | Must sit                     |
| ----------- | --------------------------------------------------- | ---------------------------- |
| _(absent)_  | when it happened                                    | inside `pack.timeRange`      |
| `"placed"`  | where the chapter sits on the campaign strip        | inside `pack.timeRange`      |
| `"outside"` | when it happened, and the campaign does not hold it | **outside** `pack.timeRange` |

The validator enforces all three, and an `outside` level must be a chapter —
a zoom-in there would replay its own routes against campaign tokens that are
not on the map at that date. A beat whose `focus` names an `outside` chapter
is checked against **that chapter's** window instead of the pack's, because
that is the strip it will be drawn on.

`1914:origins` and `1914:july-crisis` are marked `placed`, which is the first
time the pack has said out loud what it has been doing since PR #63.

The pack's first `outside` level is **`1914:meanwhile-epilogue`** —
"Meanwhile, 1915–1919" — a routeless chapter with a real window of 1 January
1915 to 31 December 1919, three beats, and the six post-1914 science cards on
its strip where they belong.

### What followed in the engine

Four things the epilogue found, none of them invented for it:

- **The ✦ layer follows the strip, not the campaign.** `onTheStrip` takes the
  range it is asked about rather than reading the module-level campaign one,
  and the science markers are no longer suppressed inside a focus. "Meanwhile"
  means _at the same time as what you are looking at_; the field chips are
  derived the same way, so mathematics — one card, Noether's — finally has a
  chip, in the one place it can toggle something.
- **A level may be a different length of thing.** The clock kept whatever pace
  was running, which is right when every level is forty days or seven; at an
  hour a second a five-year chapter takes a working day to play. `enterSpeed`
  takes the running pace when the new range's ladder offers it and the range's
  own default when it does not, and `FocusMemory` carries the campaign pace
  back out. `exitNow` now ignores an instant the campaign cannot hold — a
  chapter set outside it is always "later", and taking that would park every
  reader who opened the epilogue on the last day of the pack.
- **Two ordering bugs on deep links into a focus**, both latent before there
  was a level whose window differed from the campaign's by more than a few
  days. `ClockProvider` re-applied its `range` prop in a mount effect, and
  React runs child effects first — so `?focus=1914:marne` had its battle range
  overwritten by the campaign's a moment after it was set. And `?t=` is
  applied by the URL binding while the clock still has the campaign's range,
  so an instant inside the epilogue was clamped away before the focus existed;
  `enterNow` takes the URL's instant as a second chance, so a link copied from
  inside the chapter reopens where it was copied (ADR 0009).
- **A timeline tick label centred on the edge of the strip.** Hidden by the
  first of those bugs: with the range fixed, the two `placed` chapters got
  their real two-day window, whose last tick lands exactly on the end, and half
  a date hung off the right of a 390px page. The first and last labels align
  inwards now instead of centring, which the visual gate had been unable to see.

## Alternatives considered

- **Clamp the epilogue too, at the end of the strip.** A third silently-lying
  window, and it does not solve the problem: six cards clamped to 25 November
  1914 pile on the last pixel exactly as they did on the beat.
- **Widen `pack.timeRange` to 1905–1919.** The campaign strip becomes fifteen
  years long and the forty-day argument the pack is about disappears into it.
- **Let any battle's window sit anywhere, silently.** The rule that catches a
  mistyped year is worth more than the ceremony of one field.
- **A fourth surface, or a rail, for the science layer.** Banned by ADR 0006,
  and `sand-neh.5` settled it: cards are glyphs on the one timeline.
- **A second string on the entity — `kind: "chapter" | "zoom-in"`.** ADR 0013
  deliberately computes that from `routes`; `window` says something the data
  cannot otherwise be asked, which is why it is a field and that is not.

## Consequences

- The chapter index can print dates for the levels whose windows are real, and
  none for the `placed` ones. Not done here — ADR 0013's index landed
  yesterday and this is a design change to it, so it is a follow-up rather
  than something smuggled in here. The data is now able to answer, which was
  the blocker it named. **Done in `sand-neh.23`**, as an amendment to ADR
  0013: a real window is printed as a span, and a `placed` one says
  `dates inside` rather than leaving a gap that reads as a defect.
- A pack that wants a prologue gets one for free: `window: "outside"` with a
  window before `pack.timeRange` reads the same way.
- One new scene, `chapter-epilogue`, joins the visual gate; the scene list is
  twenty (ADR 0011).
- `76-the-line` keeps its ending and loses the recital: it names the chapter
  and hands over, instead of carrying a decade in a paragraph.
- The 1905 and 1913 cards stay where they are, on the memorandum beat and the
  Plan XVII beat. They are one chip each on beats built around them, and a
  prologue chapter for two cards would be ceremony.
