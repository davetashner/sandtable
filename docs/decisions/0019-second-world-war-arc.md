# 0019 — The Second World War arc: the Pacific first, and a pack name that survives a crowded year

- **Status:** accepted
- **Date:** 2026-08-27
- **Bead:** `sand-lry.16`

## Context

The roadmap has carried the Second World War since the beginning as two epics —
`sand-kq6` Western Front and `sand-c6p` Eastern Front — with five and four
children between them, all of them P3, all of them behind Phase 4. That is a
sketch of a European war, and it has three problems now that the arc is being
built rather than promised.

**There was no Pacific.** Not deprioritised: absent. Ten of the war's defining
operations had nowhere to live in the backlog.

**The naming scheme runs out.** `pack.json#idPrefix` must be unique across
packs and every id in a pack must start with it, so the two packs that exist
today are `1914` and `1915` and every one of their entities is
`1914:army-de-1`, `1915:beat-loos`. That works exactly as long as a year holds
one pack. 1944 holds four in the Pacific alone — Saipan, Peleliu, the
Philippines, and the run-up to Iwo Jima — before Europe adds Normandy, Market
Garden and the Bulge.

**The engine has only ever been asked about land.** Every pack so far is a
continuous front in north-west Europe, drawn at a scale where a corps token is
a legible object and a day is the natural tick. The Pacific is none of those
things, and the question of whether this engine is genuinely era-agnostic or
merely Western-Front-agnostic has never actually been put to it.

## Decision

### 1. The arc opens at Mukden, 18 September 1931

Not September 1939. The thesis of this project is the causal chain, and the
Pacific war carries the cleanest demonstration of one that we will ever get:
two officers of the Kwantung Army blow up a few feet of their own railway,
their army takes a territory the size of France against the orders of its own
government, the League finds against Japan, Japan leaves the League, and
nothing is done. Then it happens again in Abyssinia, in the Rhineland, in
Spain, at Munich.

Starting at 1939 makes the war a thing that began; starting at 1931 makes it a
thing that was allowed. The second is the one worth building an explorer for,
and it is what `sand-ekc.6` was already reaching towards from the European
side.

### 2. The Pacific is authored before Europe

Three reasons, in order of weight.

It is the harder test, and we want the answer early. The Pacific breaks the
engine's land assumptions in ways Europe never will, and every one of those
breaks is cheaper to find now than after ten European packs have been written
against the current shape. The audit is in "Consequences" below; it has already
turned up one hard failure (the pace bands) before a line of content exists.

It is one story. The island road from Guadalcanal to Okinawa is a single spine
with a single argument — that the war was won by making the next airfield
reachable — and a spine is what a first arc in an unfamiliar theatre needs.
Europe in the same period is three simultaneous stories (the Atlantic, the
bomber offensive, the ground campaign) that only converge in 1944.

And the repo owner asked for it, in that order, with the operations named.

Europe is not deferred, only sequenced: `sand-kq6` keeps Dunkirk, North Africa
and Normandy, and gained tonight the Easy Company thread (`sand-kq6.6`) and its
cast (`sand-kq6.7`).

### 3. A new pack's `idPrefix` is its directory name

```text
content/eras/1942-midway/      idPrefix "1942-midway"   →  1942-midway:carrier-us-enterprise
content/eras/1944-peleliu/     idPrefix "1944-peleliu"  →  1944-peleliu:umurbrogol
```

`Slug` already permits hyphens and the `Id` regex already permits a hyphenated
prefix, so this needs no schema change. It is more verbose than `1914:marne`
and that is the price of a scheme that does not have to be revised the second
time a year is interesting.

**`1914` and `1915` are grandfathered on the bare year.** They are not
renamed, now or later. Ids are a durable public contract here in a way they are
not in most codebases: ADR 0009 makes the URL a citable address, `?pack=`
round-trips, and every `CausalLink`, every `Thread` step and every media
`used_by` entry is an id pointing at another id. Renaming two packs to buy
uniformity would break every deep link anyone has ever shared, and would break
them silently. Consistency is worth less than that.

The validator already enforces prefix uniqueness and the prefix-matches-id
rule, so nothing new has to be written to hold this; it only has to be
documented, which is what this record is.

### 4. One pack per operation

Not per year, and not per battle. The unit is the operation a reader would name
if you asked them what they wanted to look at.

Guadalcanal is **one** pack containing seven naval actions as `Battle`
zoom-ins, because the campaign's argument — that a fixed perimeter, a contested
sea lane and a nightly convoy are one problem — is invisible if Savo Island is
its own pack. Leyte Gulf is **one** `Battle` inside the Philippines pack, even
though it is four engagements across 800 km, for the same reason: the decoy at
Cape Engaño is only interesting next to what it drew away from Samar.

The ten Pacific packs are `sand-lry.4` through `sand-lry.13`.

## Alternatives considered

**One WWII pack.** Fails on ADR 0018 before it fails on anything else: a page
load is one era and one fetch, and a pack spanning 1931–1945 across four
theatres would be a single unloadable JSON file with a `pack` budget nothing
could satisfy. The one-era-per-load rule is what makes the arc buildable at
all.

**Europe first.** The familiar order, and the one the roadmap already implied.
Rejected because it front-loads the easy theatre: ten more packs against a
continuous land front would teach us nothing new about the engine and would
leave the ocean problem to be discovered in year two with far more content
already committed to the current shape.

**Renumber `1914` and `1915` to `1914-schlieffen-marne` and `1915-attrition`.**
Tidier, and briefly tempting. Rejected on the deep-link contract above. A
scheme that is consistent going forward and grandfathers two exceptions is
better than one that is uniform and breaks published URLs; the exceptions are
documented here and in `docs/content-model.md`, which is where an author looks.

**An opaque short code (`p07:marne`).** Stable under renames and immune to the
crowded-year problem, but it makes every id unreadable in the one place ids are
read constantly — content review. The whole citation and fact-check workflow
depends on a human being able to see what `1914:army-de-1` is.

## Consequences

**The engine audit, run against the Pacific before authoring.** Four findings:

- **The pace bands are era-locked and will reject every Pacific route.**
  `src/packs/validate/pace.ts` hardcodes one table in km/h — `sea` sustained 15
  and limit 40, `air` sustained 60 and limit 150 — and its own comment says
  those are "a transport convoy at 8–20 knots" and "the aeroplanes of 1914". A
  fast carrier task force ran at 25–33 knots (46–61 km/h), above the `sea`
  _limit_. A Dauntless cruised at 250–300 km/h and a B-29 at 550, against an
  `air` limit of 150. Every Pacific route fails, and the failure message tells
  the author to name a mode that does not exist. This is a real defect and it is
  `sand-lry.2`, a decision bead: the 1914 table stays the default so no existing
  pack moves.
- **Naval formations and sea/air movement already exist.** `Formation.kind`
  has `fleet`, `squadron` and `flotilla`; `MovementMode` has `sea` and `air`,
  and draws transfers dashed. The schema anticipated this correctly and needs
  no change.
- **The scale jump is new.** A pack that contains both a 2,100 km ocean
  crossing and a 3.2 km island is asking the camera and the tile extracts for
  three orders of magnitude, which no European pack has needed. It is handled
  in the tile plan (`sand-lry.1`) rather than the schema, because `Battle`
  already carries its own region and zoom.
- **`frontLine` is optional, and the Pacific will not set it.** Good: the
  front-line layer turns out to be a feature of the Western Front packs rather
  than an assumption of the engine.

**Downstream of this record:**

- `sand-lry` is the new epic; `sand-lry.1` (geography) and `sand-lry.2` (pace
  bands) block all ten packs, and `sand-lry.14` (bibliography) lands before any
  pack cites anything, exactly as 1914's did.
- `docs/sources.md` gains a Pacific section, with an honest note about
  Japanese-language sources the way it already carries one about the
  Reichsarchiv. A Pacific arc sourced only from Morison and Toll is an American
  arc.
- `docs/content-model.md` gains the `idPrefix` rule and the two grandfathered
  exceptions.
- The atlas (`/atlas.html`) currently lists two packs and will list twenty. Its
  flat list needs grouping by arc before that lands; filed as `sand-shn.14`.
- ADR 0007 and ADR 0012 come under real pressure in this arc. Much of the
  surviving photography of Tarawa, Iwo Jima and Okinawa is of the dead, and the
  newsreel footage of Tarawa was consequential _because_ it was unbearable. The
  no-gore rule holds; the cost is carried by the casualty layer and by sourced
  vignettes, which is what those instruments are for.
