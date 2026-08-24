# 1914 — The Schlieffen Plan and the march to the Marne

The first scenario pack: 2 August – 12 September 1914 in the West, extended to
the trench line in November. The lesson spine every beat must serve is
[`docs/lesson-1914.md`](../../../docs/lesson-1914.md); the citation standard is
[`docs/sources.md`](../../../docs/sources.md). Authored under the Phase 1 epic (`sand-1l0`),
starting from the narrative spine (`sand-1l0.17`) and reaching parity with
`poc/schlieffen-plan.html` in `sand-a55.15`.

Status: **seed** (`pack.json#status`). The schema landed in `sand-a55.7` with a
seed pack — two branches (historical and Schlieffen's concept), the sides, the
1914 order of battle at army level, approximate routes for the German 1st,
2nd and 3rd Armies, the BEF and the French 5th and 6th Armies plus concept
tails for the 1st–3rd (`confidence: low`, to be replaced by the daily
positions of `sand-1l0.2`), seven major events, the First Marne as a zoom-in
seed, and ten narrative beats adapted from the PoC (PoC parity: `sand-a55.15`). See `docs/content-model.md` for the file layout.

## Chapters and zoom-ins

Some engagements deserve narrative and a place on the ground but not an
animated sub-timeline. Those are authored as **chapters**: a `Battle` entity
carrying `participants`, `summary`, `outcome`, a region and camera, a handful
of battle-level `events` as static markers, and beats with `focus` — but
**no battle-level `formations` and no `routes`**. With no routes the engine
leaves the campaign tokens on their campaign movement
(`movementSourceFor` in `src/engine/focus.ts`), so a chapter reads as
narrative plus markers rather than as a reconstruction that plays. Their
beats say `(chapter)` in `dateLabel` where a zoom-in says `(zoom-in)`. The
chrome reads the same distinction off the data — no routes means chapter — and
names each one accordingly in the index above the map (ADR 0013), so an author
never labels a level by hand.

Chapters: `1914:origins` (`sand-1l0.3`), `1914:ardennes` (`sand-1l0.6`),
`1914:grand-couronne` (`sand-1l0.9`), `1914:tannenberg-east` (`sand-1l0.13`),
`1914:july-crisis` (`sand-1l0.32`), `1914:meanwhile-epilogue` (`sand-9u2.6`).
The July Crisis is the pack's backstory:
`pack.opening.chain` points at it, so the opening's "How did it start?" takes
the map to Sarajevo, where the chain begins, instead of leaving it on the
western frontier. Like `1914:origins` it carries no events — the crisis ran
28 June to 4 August, outside the campaign clock — and the two days it vacated
in the campaign spine are now the ultimatum beat (`81-ultimatum-to-belgium`).
`1914:origins` narrates the decades before the war rather than days of it, so it
carries no events either. Both of them are `"window": "placed"` (ADR 0015): the
2–4 August window in the file is where they sit on the campaign strip, not when
they happened, and each beat says its real date in `dateLabel`. What the map
contributes for `1914:origins` is the ground the argument is about: the fortress
line from Verdun to Belfort and the Meuse crossings, already drawn from the
shared places registry. `1914:tannenberg-east`
has its own caveat: its region lies outside the western-europe basemap extract,
so it renders on the borders layer alone until a wider extract exists.

`1914:meanwhile-epilogue` is the other kind: `"window": "outside"`, a real
window of 1915–1919 that the campaign does not contain, and the only level in
the pack whose strip is not the campaign's. It is where the six ✦ Meanwhile
cards after 1914 are placed — Moseley, the field equations, Schwarzschild,
Noether, Rutherford, the eclipse — with three beats (`130`–`132`) putting them
in order. Its map is deliberately static: the front as November left it,
because Berlin, Göttingen, Manchester, the Sari Bair ridge and Príncipe are not
on it.

Zoom-ins, which do carry routes and a sub-timeline: `1914:liege`,
`1914:lorraine`, `1914:frontiers-north`, `1914:guise`, `1914:belgium-antwerp`,
`1914:marne`.
