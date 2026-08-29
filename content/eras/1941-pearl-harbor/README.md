# 1941 — Pearl Harbor

`content/eras/1941-pearl-harbor/` · `idPrefix: "1941-pearl-harbor"` · `status: "seed"` · bead `sand-lry.5`

The first Pacific pack, and the first pack in this project whose theatre crosses
the antimeridian. Sixteen days, from the striking force leaving the Kurils on
26 November 1941 to the sinking of _Prince of Wales_ and _Repulse_ on
10 December, with an epilogue chapter that runs on to Midway.

## The argument

Two clocks, in the sense the 1914 pack uses the word. One is a negotiation in
Washington — a sequence of documents in which both governments behave as though
the outcome is open. The other is an operation order: a list of positions with
hours against them, which the force it was written for kept to almost exactly.
The second clock was set before the first one finished.

The pack is built so a reader can see the two side by side and do the
arithmetic. Both are `clocks.json` timetables:

- `clock-the-operational-clock` — the sortie, the standby point, the turn
  south, the two launches, the withdrawal, all from the operation order.
- `clock-the-washington-clock` — the American outline of 26 November,
  Roosevelt's message to the Emperor, the hour Tokyo ordered the memorandum
  delivered, the first bomb, and the delivery.

**The arithmetic matters and is easy to get wrong.** In December 1941 Hawaii
kept a standard time **ten and a half hours** behind Greenwich, not ten;
Washington kept five; Tokyo was nine ahead. Every instant in this pack is
stored as UTC and every time a reader is shown is named with the city whose
clock it is. The two archives check each other: the operation order launches
the first wave at 0130 on X Day, Tokyo time, and the American air force history
gives the take-off order at 0600 in Honolulu. Those are the same instant only
at ten and a half hours.

The consequences of that offset are the whole pack:

- 0600 Honolulu = 1630 UTC = 0130 Tokyo — the first wave launches.
- 1300 Washington = 1800 UTC = 0730 Honolulu — the hour Tokyo ordered the
  memorandum delivered. Twenty-five minutes of margin.
- 0755 Honolulu = 1825 UTC = 1325 Washington — the first bomb.
- 1420 Washington = 1920 UTC = 0850 Honolulu — the memorandum handed over,
  eighty minutes late and fifty-five minutes after the first bomb.

And one that is usually got backwards: the force sailed from Hitokappu Bay at
0600 on 26 November, Tokyo time, which is the afternoon of **25** November in
Washington — hours before the American outline was handed over. The note did
not provoke the sortie; it arrived to find one already at sea.
(`link-the-outline-and-the-sortie`.)

## Not only Hawaii

`the-other-openings` is a chapter, not decoration. Malaya, Hong Kong, Guam,
Wake and the Philippines were all attacked inside about a day, and the landings
in Malaya went in before the first bomb fell on Oahu. A pack that shows only
the harbour teaches the American memory of 7 December rather than the day.

Nothing in that chapter moves. No source this project could open gives a track
for any of those forces, so the chapter carries places and hours and no routes.

## Pace bands (ADR 0020)

This is the first pack to exercise `pack.json#pace`, and the way it does so is
deliberate: **both bands are drawn from documents this pack has actually read,
not from an aircraft or ship specification.**

`sea` — sustained 26 km/h, limit 46 km/h. The operation order names exactly two
speeds for this force: 12–14 knots for the passage, and "about 24 knots" for
the run-in and the withdrawal. 14 knots is 25.9 km/h; 24 knots is 44.4, and
because the order says _about_, the limit is set a knot above at 46. This is
not a claim about what a 1941 carrier could do at full power.

`air` — sustained 270 km/h, limit 350 km/h. Derived from the pack's own two
documented flights, because no work giving the performance of a Nakajima B5N or
a Mitsubishi A6M could be opened from here. The first wave covered 230 nautical
miles in 1 h 55 min (222 km/h of straight-line displacement); the second, 200
nautical miles in 1 h 25 min (262 km/h). The limit of 350 sits above everything
that flies in this pack and below the maximum speed of the fastest of them, and
is explicitly not an assertion about what a carrier aircraft of 1941 could
reach.

`march` is **not** declared, per the ADR. Nothing in this pack walks.

**The pack validates with two pace warnings and they are correct.** The legs
from the approaching point to the first launch position, and from there to the
second, come out at about 41 and 44 km/h — above the striking force's sustained
speed and inside its limit. Those are the two legs where the force really did
run at the ordered high speed. Raising `sustained` to silence them would be
fitting the band to the data, which is the failure ADR 0020 exists to prevent.

## Sourcing — what was read, and what was not

Read in full, from this environment, and quoted:

- **`source:peace-and-war-1943`** (Department of State, 1943) — doc. 257, the
  American outline of 26 November, and doc. 265, the memorandum of the
  conversation of 7 December with the Japanese memorandum printed inside it and
  all four clock times of the appointment. Everything the pack quotes from the
  Washington clock is verbatim from these two documents.
- **`source:japanese-monograph-97`** — the Hawaii operation order in outline.
  Every planned position, speed and hour comes from here.
- **`source:ussbs-interrogations`** — Nav. No. 6, Fuchida interrogated in Tokyo
  on 18 October 1945.
- **`source:combinedfleet`** — Parshall's own restatement of his _Naval War
  College Review_ argument, which is where the quoted sentences about Fuchida's
  1948 and 1963 interviews were read.

Read as transcriptions, quoted, **without page numbers**:

- `source:morton-1962`, `source:morton-1953`, `source:craven-cate-aaf-1`,
  `source:hough-ludwig-shaw-1958`, `source:building-bases-1947`.

The reason for the missing pages is worth stating. These are HyperWar
transcriptions, which mark the printed page numbers — but the extraction layer
this environment reads them through **returned different page markers for the
same sentence on repeated fetches**. Under rule 3 of `docs/sources.md` a page
number is a promise that somebody checked it, and that promise cannot be made
here. So the citations give the chapter and quote the sentence instead, which
is checkable. The Japanese Monograph's markers were stable across repeated
fetches and its pages are given, with the same caveat recorded in the registry
entry.

**Not opened at all**, and cited without pages, with nothing quoted from them:

- `source:prange-1981` and `source:layton-1985` — the two works that hold the
  "great missed opportunity" position on the third wave. Every Internet Archive
  copy is a lending copy.
- `source:zimm-2011` — the operational case against it. Reached through a
  signed review by Charles C. Kolb for the Naval Historical Foundation, which is
  also where the registry entry's bibliographic detail comes from.
- `source:parshall-2010` — the journal PDF returns 403 to this environment; the
  landing page resolves. The argument is taken from the author's own
  restatement of it on his website and the chain is stated on the card.
- `source:agawa-1979` — the Yamamoto life; not readable at page level.

That is a real weakness in `historiography-the-third-wave`: two of its four
positions are described rather than quoted, and one of the two is described
partly by its opponents. The card says so in as many words and the pack would
rather carry the weakness visibly than manufacture the appearance of a reading
it has not done.

## A participant voice, and what it cost to use it honestly (`sand-lry.5.1`)

The gap above is filled. John Charles Tashner Jr. — "Jay" — was a twenty-year-old
sailor at Pearl Harbor on the morning of 7 December 1941, and his grandson gave
the family's account of him to this project. He is in `cast.json`, in
`content/shared/people/`, and in `vignettes.json`, which until now did not
exist here.

He is a real participant voice and not a substitute for one, which is the whole
of why he is admissible where an invented vignette was not. He is also, for a
project whose rule is that every date and number cites a source, the hardest
kind of material there is, because the evidence comes in three grades that must
not be flattened into one:

- **The _Selfridge_ action report** (`source:selfridge-action-report-1942`) —
  the ship's own report to CINCUS of 15 January 1942, `primary`. Fetched from
  the HyperWar transcription at ibiblio.org, twice, with identical text, and
  carried as `document-selfridge-action-report` with three receipts (ADR 0021).
  NHHC's own copy at history.navy.mil fails TLS verification from this
  environment, which is why the transcription is what was read and why the
  registry entry records the two places the two copies differ.
- **Duty entries from his service papers** (`source:tashner-service-record`) —
  `primary` by form, and thin on provenance: supplied as text by the family,
  with no scan and no archive reference. The entry says so at length. Filing
  by form with the doubts in `notes` is `docs/sources.md` rule 2; filing by
  confidence is what that rule forbids.
- **Two family accounts** (`source:tashner-family-2026`,
  `source:tashner-john-2026`) — two of Jay's sons, writing in 2026 about what
  their father told them. **This is what the new `testimony` rung is for**, and
  it was added to the hierarchy of evidence in the same change; the argument
  for it, and the line between it and `memoir`, are in `docs/sources.md`.

**Four disagreements are preserved rather than resolved**, and they are the most
historically interesting thing in the addition:

1. **Barracks or ship.** Both sons put him ashore in a barracks. The
   _Selfridge_'s own report says "Nine officers and ninety-nine percent of the
   crew were on board." Both can be true. The pack asserts neither that he was
   aboard on the day nor that he was not, and notes that nothing it has read
   names him at all.
2. **Destroyers or aviation.** One son remembers carriers and destroyers; the
   other describes a career in naval aviation and electronics. The duty entries
   come down on the aviation side from a documentary direction — PBYs and B-24s
   on Betio, the electronics division of a fleet plane pool at Majuro — without
   making the destroyers wrong. A twenty-one-year career holds both.
3. **Midway is not a fact here.** One account states it; the other, the
   better-informed one, says "I need to check but I think he was at the battle
   of Midway as well". It is recorded as a family recollection the family itself
   flags as unconfirmed, which is the discipline this project exists to model.
4. **Why he refused a commission.** Two sons, different reasons. Both are given.

Three smaller things handled the same way. His son's "a single shot M-1 rifle"
is recorded as told and not corrected in the bio; the remark that the M1 Garand
was semi-automatic, and that a rifle handed out in that confusion was as likely
a bolt-action M1903, sits in a citation note as an observation about how oral
history behaves rather than as a red pen through a man's recollection. The same
account gives the hour as seven where the first wave was over Oahu at 0755, and
the vignette is placed at the attack with the difference noted rather than
argued. And the service entry reads "at Majuro, G.I.", transcribed as "Majuro,
Gilbert Islands" — Majuro is in the Marshalls — which is quoted as given, with
the geography noted and no explanation asserted.

**Betio, and a thread left for `sand-lry.8`.** The duty entries put him on Betio
— the island of Tarawa — from October 1943, in charge of a maintenance crew
detachment servicing aircraft. That is airfield work, and on Betio the airfield
was the objective; the period given is a range, not a date. **Nothing here says
he landed with the assault.** The Tarawa pack, when it is written, has a named
man to pick up and a range to narrow.

ADR 0007 is under pressure in the vignette and is not evaded. Both accounts say
he spent 7 December and several days after it recovering the dead from the oily
water, and that is central to what the morning did to a twenty-year-old, so it
is in. It is written in the register the sources use and no further — no
photographs, and no detail the testimony does not give.

## What is deliberately absent

- **No casualty records.** `casualties.json` is not here. The day's figures —
  2,403 killed and 1,178 wounded — are in the events and the battle outcome,
  quoted from Morton, but a `CasualtyRecord` wants figures per side and
  category each with its own confidence and sources, and this pack holds one
  aggregate from one work. Filed as follow-up.
- ~~**No vignettes.**~~ The pack shipped with none, for a reason worth keeping
  on the page: the obvious first-person voice for 7 December is Fuchida's, and
  it is exactly the voice this pack has decided to treat as a subject rather
  than an authority. Nothing else could be opened, and a vignette invented to
  fill the slot would have been the worst thing in the pack. **There is now
  one**, and it is not invented — see "A participant voice, and what it cost to
  use it honestly" below.
- **No fuel figure.** The four and a half or six million barrels that make the
  third-wave counterfactual sound decisive could not be verified for December 1941. The Navy's own construction history lists two above-ground tank farms
  and gives no capacity, and the six-million-barrel figure it does give belongs
  to the **underground** project, begun in December 1940 and not usable until
  September 1942. The historiography card says this under _settled_.
- **No positions for the three American carriers.** They are in the order of
  battle with no concentration and no route, because nothing openable from here
  says where they were.
- **No tech or science cards, no tour, no imagery.** Seed scope.

## Known engine limits this pack ran into

1. ~~**The map cannot frame a theatre that crosses the antimeridian.**~~
   Fixed in `sand-lry.22`. A region written `west > east` now means "the short
   way across 180°", so this pack's region is the theatre it is actually about
   — `[99, -12, -155, 52]`, Malaya east over the date line to Hawaii, 106° wide
   — rather than the full longitude band (`[-180, -12, 180, 52]`) it was
   written as while `fitBounds` read those corners as a minimum and a maximum
   and framed the other 254° of the world. The Kidō Butai's route is unchanged:
   its waypoints were always true coordinates, and the engine now makes them
   continuous when it draws, so the track goes east across the Pacific instead
   of back over Asia. The pace check uses haversine and never had the problem.
2. **A `Timetable` counts whole days**, so the eighty-minute slip on the
   Washington clock — the point of that card — is carried in the milestone
   notes rather than in the gauge.
3. **`tiles` is not yet a pack field** (`sand-lry.18`), so this pack resolves
   to the central-Europe archive and renders on borders alone. The Pacific
   extracts are authored but not uploaded (`sand-lry.17`). Both known, neither
   this pack's to fix.
4. **`borderYear: 1941`** is derived from `world_1938` and, per the borders
   manifest, has **no Manchukuo and no Republic of China**, and no polygons at
   all for Wake, Midway, Truk, Palau or Kwajalein. It is right about the
   colonial frame the Pacific war was fought over, which is what this pack
   needs it for, and wrong about East Asia in ways a later pack in this arc
   will have to fix.

## Contested points

One historiography card: `historiography-the-third-wave`, with four positions,
what is settled, and what has not been read. The counterfactual branch
`1941-pearl-harbor:third-wave` is labelled hypothetical per ADR 0005, carries a
four-item feasibility checklist, and has a beat of its own that argues both
ways before it invites you to play it.

Fuchida Mitsuo is cited throughout as a **subject and never as an authority**.
That is a decision with a reason: _Shattered Sword_ dismantled his account of
Midway from the Japanese operational records, and Parshall's 2010 article shows
his Pearl Harbor third-strike story moving between 1948 and 1963. Where the
pack reports what he said, it says when he said it.
