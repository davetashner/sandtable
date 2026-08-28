# 1917 — The Russian Revolution, February to October

The pack covers 22 February – 26 October 1917 (O.S.), which is 7 March –
8 November 1917 (N.S.), with an epilogue chapter in February 1918. Authored
under `sand-ekc.7`, pulled ahead of its Phase 4 gate because the repo owner
asked for it. The citation standard is [`docs/sources.md`](../../../docs/sources.md);
the register of this pack's contested points is
[`docs/historiography-1917.md`](../../../docs/historiography-1917.md).

Status: **seed** (`pack.json#status`), and the word is meant. This is a first
pass with an honest spine, four documents, three historiography cards and a
bibliography that is thin on purpose — see _What has not been read_, below.

## Dual dating: the decision, and why

Russia kept the Julian calendar until February 1918. In 1917 it ran thirteen
days behind the Gregorian calendar the rest of Europe used, which is why the
February Revolution happened in March and the October Revolution in November.
This is the pack's central instrument and getting it wrong would silently shift
every date in it by thirteen days, so the rule is written down here.

**Every instant stored in this pack is Gregorian (New Style).** The engine
stores absolute ISO instants ([`docs/content-model.md`](../../../docs/content-model.md)),
and an absolute instant cannot be ambiguous. The Julian date is a _label_, not
a time, and it is never what goes in a `from`, an `at` or a waypoint.

**Every date a reader sees is written Old Style first, then New Style** —
_23 February (O.S.) / 8 March (N.S.)_ — in `dateLabel`, in event summaries and
in beat prose. The Russian date is the one the people in the story used and the
one the events are named for; the Gregorian date is the one the clock under the
timeline is keeping. Showing only one would either misname the revolutions or
mis-time them.

The correspondences the pack turns on, all confirmed against two independent
sources:

| Event                        | O.S.           | N.S. (stored)     |
| ---------------------------- | -------------- | ----------------- |
| Putilov lockout              | 22 Feb 1917    | 7 March 1917      |
| Women's Day; the strike      | 23 Feb 1917    | 8 March 1917      |
| The garrison changes sides   | 27 Feb 1917    | 12 March 1917     |
| Order No. 1                  | 1 March 1917   | 14 March 1917     |
| The abdication               | 2 March 1917   | 15 March 1917     |
| Lenin at the Finland Station | 3 April 1917   | 16 April 1917     |
| The July Days                | 3–5 July 1917  | 16–18 July 1917   |
| The Kornilov affair opens    | 27 Aug 1917    | 9 September 1917  |
| The insurrection             | 25–26 Oct 1917 | 7–8 November 1917 |

**Times of day are local clock time carried on a `Z` label, not converted to
UTC.** The sources give local clock times; converting them at the minute would
imply a precision the record does not have, and Petrograd's own mean time was
two hours and one minute ahead of Greenwich, which is not a number any account
of 1917 is written against. What the pack is rigorous about is the _date_: no
instant in it falls near enough to midnight for the convention to move a day.
Where only the day is known, the instant is midday and the entity says so.

Two dates in the pack are deliberately not tidied. The act of abdication
carries **15.05** and was signed at about 11.40 that night, back-dated to the
hour of the decision; the pack stores what the document says and marks the
discrepancy on the event and on the document. And the Military Revolutionary
Committee's proclamation carries **10 a.m. on 25 October**, several hours
before the Winter Palace fell.

## What is in it

- **Nine campaign beats** and three chapter beats: the bread queues and the
  Putilov lockout; the garrison; dual power and Order No. 1; the abdication;
  the sealed train and the April Theses; the June offensive and the July Days;
  Kornilov; the Military Revolutionary Committee; the night of 25 October.
- **Two street-scale chapters** (`february-petrograd`, `october-petrograd`)
  and one epilogue chapter (`epilogue-the-thirteen-days`, `window: "outside"`).
  This is the pack's structural point: the campaign map is the Russian Empire
  and half of northern Europe, and the chapters are about six kilometres of one
  city. Both chapters carry **no routes**, so they are chapters rather than
  zoom-ins under [ADR 0013](../../../docs/decisions/0013-chapter-index.md) — nothing
  manoeuvred in either revolution, and drawing routes would be a false claim.
- **Four documents**, each with the Russian text and a translation: Order No. 1,
  the act of abdication, the April Theses, and "To the Citizens of Russia!".
- **Three historiography cards** (ADR 0017): October as revolution or coup;
  who led February; and the German money.
- **Two vignettes**: Nicholas's diary for 2 March, and Lenin's letter of the
  evening of 24 October.
- **Four commander tracks**: the imperial train from Mogilev to Pskov, and
  Lenin's journey home in three legs, because what carried him changed twice
  (rail, sea, rail) and a ferry drawn as a railway is a false claim.
- **One formation**, the 3rd Cavalry Corps, with one route.

## Why there is almost no order of battle

The 1914 and 1915 packs are armies moving. This one is not, and the model
should not be made to pretend otherwise. The bodies that decided 1917 — the
Petrograd garrison, the factory workforces, the Red Guards, the soldiers'
committees — **changed sides rather than moved**, and a `Formation` has one
`side` for its whole life. A token that slid across the map in the colour of a
party would misrepresent every one of them.

The single exception earns itself: Kornilov's 3rd Cavalry Corps really did move
towards Petrograd on a railway, and it is filed on the **Provisional
Government's** side because that is whose army it was. Whether it was moving
for that government or against it is the question the affair turns on, and the
colour of a token is not the place to answer it. Its route is
`confidence: "low"` and its derivation says why: the pack knows the line the
trains were on and roughly which day they were stopped, and does not know where
any echelon stood at any hour.

## The pace band

`pack.json#pace` declares **`rail` at 30 / 50 km/h**, against the 1914 default
of 15 / 30 ([ADR 0020](../../../docs/decisions/0020-pace-bands.md)). The
reasoning, since a declaration like this is exactly the thing that should be
argued with:

The 1914 band describes **an army entraining** — troop trains averaging 300 km
a day including entraining and detraining. Every rail movement in this pack is
a **scheduled passenger express carrying individuals**: Lenin's carriage from
Zurich to the Finland Station, the imperial train from Mogilev to Pskov,
Kornilov's echelons on a line the railwaymen were dismantling. On Merridale's
stage-by-stage reconstruction the April journey covered 500–800 km between the
stops the record names, which is 15–27 km/h of straight-line displacement
including border halts and a night in Stockholm. 30 is that figure rounded up;
50 leaves headroom for a leg run without a stop. Both are far below
`PACE_CEILING` (60 / 120).

**No other mode is declared.** `sea` keeps the 1914 default and the Baltic
ferry passes under it; `march` is untouched, and if a future pass finds itself
wanting to raise `march` here, ADR 0020 says to re-read the record instead,
which is the right advice.

## Geography

`borderYear: 1914`, and that is a deliberate choice rather than the obvious
one. `1914.geojson` is verified good for the Russian Empire — Warsaw, Riga and
Moscow all resolve correctly — and in 1917 the empire's frontiers were still
its 1914 frontiers minus the occupied west. The later files are **worse, not
better**, for this pack: `1918.geojson` is built from upstream's `world_1920`
and is the post-war settlement with Poland, Finland and the Baltic states
already independent, and `1931.geojson` is recorded in
[`content/shared/geo/borders/README.md`](../../shared/geo/borders/README.md)
as badly wrong for Russia — Civil-War-era polygons with no USSR. See also
[ADR 0002](../../../docs/decisions/0002-geography.md) on what the border layer
is for: context, not operational geography.

The pack `region` runs from Zurich to Haparanda because Lenin's journey home is
in it. That is a very large box for a story that happens in one city, and the
two chapters are how the pack gets back down to street scale.

**Tiles:** the extracts for this region are authored but not yet uploaded
(`sand-lry.17`, a manual step). The map will be missing basemap tiles locally
and will render on the borders layer alone until they are.

## What has not been read

This section exists because the alternative is to let the citations imply a
reading that did not happen.

**Every secondary work in this pack's bibliography is borrow-only from this
project's environment.** Figes, Smith, Fitzpatrick, Rabinowitch, Hasegawa,
Pipes, Wade, Merridale and Katkov are all cited **without page numbers**, for
what each work is about and for the position it holds, and nothing from any of
them is put inside quotation marks. `docs/sources.md` §3 forbids writing a page
nobody read, and this is what obeying it looks like when the library is shut.

**Four things could be read in full, and they are what the pack quotes:**
Trotsky's _History_ (Marxists Internet Archive), Lyandres on the German gold
(open access, with real page numbers), Zeman's document collection (a
third-party scan, cited by document number because the scan's text layer has no
page numbers), and Lenin's _Collected Works_.

**Consequences for the historiography cards.** The German-gold card is written
to the full ADR 0017 bar: every position is quoted from a text that was read.
The February card is half there — Trotsky in his own words, Hasegawa stated
from his work's central argument. The October card has one position quoted and
three stated from their works' central arguments, and says so at length in its
`unread` field. **The Kornilov dispute has no card at all**, deliberately: the
works that hold its sides could not be opened, and ADR 0017 says that a point
can be worth a card and still not be writable. It is a prose historiography
passage in the beat and a register entry in `docs/historiography-1917.md`.

**Not yet reached, and wanted:** Sukhanov's _Zapiski o revoliutsii_ (the great
eyewitness, and the obvious source of vignettes — the Carmichael abridgement is
not readable from here and the Russian original has not been worked through);
Browder and Kerensky's three volumes of Provisional Government documents; the
post-1991 Russian archival literature, most of it untranslated; and any
scholarly English translation of Order No. 1 or of the act of abdication, both
of which this pack translates itself and says so.

## What is not here

No tour, no casualties, no imagery, no audio, no counterfactual branch. The
July Days and the October days both have obvious counterfactuals and neither is
authored, because a labelled hypothetical is a lot of work to do badly. There
are no casualty records: the figures for February and October in Petrograd are
small, contested and scattered, and a `CasualtyRecord` built from a round
number in a survey would be worse than none.
