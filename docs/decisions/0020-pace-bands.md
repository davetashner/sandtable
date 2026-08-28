# 0020 — The pack declares how fast its century moved, and cannot declare its way past physics

- **Status:** accepted
- **Date:** 2026-08-27
- **Bead:** `sand-lry.2`

## Context

`src/packs/validate/pace.ts` exists to catch one mistake: **the transfer
written as a march**. A formation crosses France in three days and the route
says `march`, so the map draws a solid line and the reader is told, silently
and wrongly, that men walked it. The check holds every leg of every route and
commander track to two bars per mode — `sustained`, above which it warns, and
`limit`, above which it errors — and the numbers are these:

```text
march 1.7 / 2.7    motor 45 / 70    rail 15 / 30    sea 15 / 40    air 60 / 150
```

Those are 1914 numbers, and the file has always said so: "a transport convoy
at 8–20 knots", "the aeroplanes of 1914". Nobody minded while every pack was a
land campaign in north-west Europe.

ADR 0019 put the Pacific in front of the engine and the table broke on
contact. A US fast carrier task force ran at 25–33 knots — 46–61 km/h — which
is above the `sea` **limit** of 40, not merely above its sustained bar. An SBD
Dauntless cruised at 250–300 km/h and a B-29 at 550, against an `air` limit
of 150. So every Pacific route would fail as an error, and the error would
tell its author to "name the mode that carried it (motor, rail, sea, air)" — advice
that is not merely unhelpful but impossible, because `sea` was already the
mode and there is no faster one to name.

The check has to become era-aware. The trap is that the obvious ways of doing
that are also ways of turning it off, and a validator that has quietly stopped
checking is worse than no validator, because the build stays green.

## Decision

**A pack declares its own pace bands, per mode, in `pack.json#pace`, with a
note and sources; every mode it does not declare keeps the 1914 default; and a
hard per-mode ceiling in the validator bounds what any declaration can buy.**

Three parts, and each answers a different failure.

### 1. The number moves next to its reasoning

```json
"pace": {
  "sea": {
    "sustained": 46,
    "limit": 61,
    "note": "US fast carrier task force: 25 knots economical, 33 knots flank.",
    "sources": [{ "source": "source:morison-1949", "pages": "iv. 88" }]
  },
  "air": {
    "sustained": 250,
    "limit": 550,
    "note": "SBD Dauntless cruise to B-29 cruise.",
    "sources": [{ "source": "source:toll-2015" }]
  }
}
```

`note` and `sources` are **required**, and that is the point of the whole
design rather than decoration on it. This project's first content rule is that
every date, number and position cites a `Source`. A pace band is a number
about the past. It was exempt from the rule only because it was hiding in a
validator, in a place the citation rule cannot reach and no content reviewer
ever opens. Moving it into `pack.json` puts it back under the rule it should
always have been under, in the file a reviewer reads first, next to the prose
that justifies it.

That is also what makes the honest case cheap. A Pacific pack writes this
block once, for the whole pack, and every carrier route in it validates.

### 2. The default is 1914, per mode, and nothing else moves

The built-in table is untouched, and a mode a pack says nothing about is judged
by it. `1914` and `1915` therefore validate byte-for-byte as they did before —
verified, not assumed: `npm run validate:content` produces identical output on
both sides of this change, warnings included.

Per-mode rather than wholesale matters. A Pacific pack declares `sea` and
`air` and says **nothing about `march`**, because a Marine on Betio walks no
faster than a poilu on the Marne. Infantry is the one mode that barely moved
between Caesar and Okinawa, and it is also the mode the check was written to
police. Making the declaration wholesale — one table replacing another — would
have let a 1942 pack loosen `march` as a side effect of needing faster ships,
which is the precise shape of the failure this record is trying to avoid.

### 3. The ceiling is what stops a declaration being an off switch

A declaration that could say anything is a per-pack override with extra steps.
Write `"march": { "sustained": 40, "limit": 80 }` and the teleporting army
validates, and so does every other march in the pack, forever, silently.

So `PACE_CEILING` in `pace.ts` states what each mode has ever _physically_
done, as against what it did in one decade, and a declared band above it is an
error:

```text
march 4 / 6    motor 60 / 110    rail 60 / 120    sea 55 / 85    air 700 / 1100
```

Six km/h of displacement over a whole leg is a fit man walking with no rest,
no baggage and no column behind him; no formation has ever averaged it. 85 km/h
at sea is 46 knots, past the fastest ship ever built. 1,100 km/h is beyond
every piston fighter and the jets of 1945.

These are deliberately generous — they are a floor under review, not a second
band, and every honest declaration sits far below them. Their job is to make
the difference between "our ships were faster than 1914's" and "please stop
checking" mechanical rather than a matter of somebody noticing. Above the
ceiling the author has stopped describing the mode and is describing something
else, which is the same error as naming the wrong mode.

The period this project covers ends in 1945. A jet-age or high-speed-rail pack
raises a number here, in a code change with a reason written next to it and a
reviewer on it — which is exactly the visibility that makes this a ceiling
rather than a formality.

### And two smaller things

A band declared for a mode no route or track in the pack uses is a **warning**,
not an error — the same shape as the existing warning for a `Source` nothing
cites. Nothing is broken, but somebody wrote a sourced number that judges
nothing, and in practice that means a mode left off the routes it was written
for.

The failure message now says which band it broke and offers the way out ADR
0019 found missing. Under the default: "…or — if this era's `sea` outran
1914's — declare `pack.json#pace.sea` with the sources for the number." Under
the pack's own table that advice would be circular, so it points at the
declared number instead.

## Alternatives considered

This is the part worth reading, because the rejected shapes are all more
convenient than the chosen one and each fails in a way that is invisible from
inside the build.

**Bands keyed on `pack.timeRange`.** The validator carries a table per era and
picks one from the pack's start year. Zero author effort, no schema change, and
no existing pack moves — genuinely the cheapest thing that could work.

Rejected on three counts. First, it leaves the numbers in the validator, which
is the actual defect: the numbers stay where the citation rule cannot reach
them and where nobody reviewing content will ever see them, and the file grows
a bestiary of eras maintained by whoever last hit a failure. Second, it makes
the engine era-_aware in code_ when ADR 0003's whole claim is that it is
era-agnostic and data-driven; every new campaign would become a code change,
and the boundaries between eras would be arbitrary and permanently arguable
(is 1939 the 1930s band or the 1940s one?). Third and worst, it widens
silently. `sand-lry` spans 1931 to 1945 — the Kwantung Army walking into
Manchuria and a B-29 over Honshu are in the same arc — so a band wide enough
for the late war is far too wide for the early war, and every 1931 route would
be checked against 1945's ceiling without anyone writing anything down. The
check would still be green and would have stopped working.

**A per-route override with a required justification.** The shape the bead
called tempting and probably wrong, and it is wrong for a reason worth stating
precisely: it gets the incentives exactly backwards.

The honest case — a Pacific pack where _every_ route is a ship or an aircraft —
would need an override and a justification on every one of hundreds of routes.
The dishonest case — one march leg that teleports because the dates are wrong —
needs exactly one, and it is the single cheapest thing in the system to write.
A design that taxes the honest author per route and charges the careless one
once will be routed around by the honest author and used by the careless one.

It also scatters the claim. There would be no object anywhere in the pack that
says what this pack thinks a ship was; there would be four hundred small ones,
which is not reviewable at all. And a per-route number is a number attached to
one route, so it can be tuned until that route passes — which is fitting the
band to the data rather than the data to the band, and is the failure mode the
check exists to prevent.

**A pack-declared table with no ceiling.** What we chose, minus part 3, resting
on review to catch an abusive declaration. Rejected because it is the same
off switch as the per-route override, just written once instead of many times,
and because "a human will notice" is not a check. The ceiling costs one
constant table and one rule, and it converts the guarantee from _somebody
should have noticed_ into _the build will not accept it_.

**Widening the defaults so everything fits.** Raise `sea` to 61 and `air` to
550 for every pack and the problem goes away today. It also stops the check
catching a 1914 troop convoy crossing the Channel at 30 knots, which it should
catch — the entire value of the table is that its numbers are wrong for other
eras. A check calibrated to the fastest thing in any era checks nothing in
most of them.

**Dropping the pace check for sea and air.** Briefly attractive: the modes
that break are also the modes where the reader is least able to tell. That is
an argument for keeping the check, not for dropping it.

## Consequences

- `Pack` gains an optional `pace` (`PaceTable` → `PaceBand` per mode) in
  `src/packs/schema/entities.ts`; `MovementMode` moves up in that file into a
  shared movement section, since `Pack` and `Route` now both draw on it.
  `schema/pack.schema.json` is regenerated.
- `paceFindings` takes the table as a fourth argument and each finding records
  whether it was judged at a declared band or the default, which is what lets
  `paceMessage` give the right advice. `paceFor(mode, table)` is the one place
  the fallback to 1914 happens.
- `checkPaceTable` in `validate.ts` enforces the citations, `sustained ≤ limit`,
  the ceiling, and the unused-band warning.
- The first Pacific pack (`sand-lry.5`, Pearl Harbor) declares `sea` and `air`
  and is the first real exercise of this. If it also finds itself wanting to
  declare `march`, that is a signal to re-read this record rather than to write
  the number.
- `docs/content-model.md` and `docs/authoring.md` carry the rule where an
  author looks for it.
- Nothing in the app reads `pace`; it is a validator input only. If a future
  UI wants to show "how fast could this actually go", the note and the sources
  are already there — which is a second argument for having put them in the
  pack rather than in a constant.
