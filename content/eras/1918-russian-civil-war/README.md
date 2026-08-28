# 1918–1922 — the Russian Civil War

The pack covers 1 January 1918 to 30 December 1922, from the negotiations at
Brest-Litovsk to the constitution of the Union of Soviet Socialist Republics.
Authored under `sand-ekc.8`, pulled ahead of its Phase 4 gate because the repo
owner asked for it. It is the direct sequel to
[`1917-russian-revolution`](../1917-russian-revolution/README.md); the citation
standard is [`docs/sources.md`](../../../docs/sources.md); the register of this
pack's contested points is
[`docs/historiography-1918.md`](../../../docs/historiography-1918.md).

Status: **seed** (`pack.json#status`). Twelve campaign beats, four chapters,
thirty-eight events, two historiography cards, four documents, three vignettes,
one commander track and — deliberately — only ten routes. What is not here, and
why, is at the bottom.

## Dual dating across the transition

Russia abolished the Julian calendar **inside this pack's window**, which the
1917 pack could only point forward to. The decree was agreed on 24 January
(6 February) 1918 and signed on the 26th; 31 January was followed by 14 February;
the days 1–13 February 1918 did not happen in Russia.

The 1917 pack's rule was: every stored instant Gregorian, every reader-facing
date Old Style first and New Style second. **This pack keeps the first half of
that rule unchanged and retires the second half on 14 February 1918.**

- **Every instant stored here is Gregorian**, exactly as in 1917. An absolute
  instant cannot be ambiguous, and the Julian date was always a label rather
  than a time.
- **Before 14 February 1918**, a reader-facing date is written Russian-first —
  _23 February (O.S.) / 8 March (N.S.)_ — as the 1917 pack writes it. In
  practice this affects almost nothing in the pack: the only dated entities
  before the change are the calendar decree itself and the events of the Brest
  negotiations, and the beat that carries them says the rule out loud.
- **From 14 February 1918, dates are written plainly, with no suffix at all.**
  Carrying an "(N.S.)" past the day on which there ceased to be an alternative
  would assert a distinction that had stopped existing, and would make four
  years of the pack noisier for no information.

The decree itself supplies the precedent, which is the pleasing part. Its tenth
clause orders that until 1 July 1918 every date be written in the new calendar
"with the number by the calendar in force until now in brackets after it" — the
Soviet state doing dual dating for five months and then stopping. This pack
stops on the day the calendar changed rather than five months later, because a
pack is not a ledger of contracts and nothing in it falls in the gap.

The decree is a `Document`
(`1918-russian-civil-war:document-calendar-decree`), with the Russian text from
the 1957 edition of the decrees and a translation made for this pack, which says
so. Clauses 3–9 are summarised rather than translated and are marked as
summarised; they are eight variations on the same piece of arithmetic.

## The structural finding: `Route` is the wrong primitive here, mostly

This was the question the bead asked, and the answer is worth writing down
rather than merely acting on.

**The Western Front's mental model does not apply, and the map primitives are
where that shows.** A `Route` is a formation's position over time. That
primitive assumes a front: an army that occupies a place, moves, and occupies
another place, with the two connected by ground it controlled on the way. In
this war almost nothing satisfies that description.

Four things this pack could not honestly draw as routes, and did not:

- **The Czechoslovak Legion** was not at a place; it was strung out over five
  thousand miles of the Trans-Siberian in six groups, from Penza to Vladivostok.
  It did not advance or retreat. It was already everywhere along the line and
  stopped letting the Soviets past. A token sliding east would deny the one
  property — length — that made it decisive.
- **Makhno's insurgent army** did not manoeuvre; it condensed and dissolved. Men
  rode out of their villages when there was something to fight and went home
  when there was not, which is why nobody could say how large it was and why
  nobody could finish it off. A moving token turns a way of living into a column
  of march.
- **The Allied expeditions** held ports. Arrows for "fourteen foreign armies"
  would be the map telling the Soviet version of the story in a form a footnote
  cannot correct.
- **The German occupation of Ukraine** is a shaded area, and the border layer is
  already doing that work.

What the pack draws instead is **ten routes, every one of them `confidence:
"low"`, every one of them an axis rather than a position**, with a derivation on
each that says so in as many words:

> Every route in this pack is an axis, not a position. The waypoints are the
> towns a source names and the dates it gives them; the straight line between
> two of them is not a claim that anything was ever at any point on it.

Individual waypoints that are interpolations rather than dated facts carry
`"contested"` as their fourth element, which draws them as approximate. At the
moment the AFSR route touches Orel, the same army was also at Kiev, at Tsaritsyn
and in the Caucasus; the route is a statement about reach, not about location.

**The bulk of the pack is carried by events, beats, chapters and causal links**,
which is the honest distribution for a war whose shape is chronological rather
than geographical. Thirty-eight events across six fronts do more work here than
any number of paths would.

Two routes earn their keep as arguments rather than as illustrations. Mamontov's
raid is the pack's demonstration piece — a cavalry corps riding five hundred
miles through the rear of an enemy front, which is only possible where there is
no front — and the Red Southern Front's path lies on top of the AFSR's, five
months later and going the other way, which is the most useful thing this map
does with a line.

## The pace bands: none declared, and that is the finding

[ADR 0020](../../../docs/decisions/0020-pace-bands.md) invites a pack whose
century outran 1914 to declare its own bands. The bead expected this pack to
need them, on the reasonable ground that the armoured train and the cavalry raid
are this war's units of movement. **It does not need them, and the arithmetic is
worth recording so that the next author does not re-open the question.**

ADR 0020's bands measure **straight-line displacement per hour over a leg**.
This pack's legs are days and weeks long and hundreds of kilometres wide, and at
that resolution everything in it is slow:

| Movement                                      | Straight line | Elapsed  | km/h | 1914 band         |
| --------------------------------------------- | ------------- | -------- | ---- | ----------------- |
| Mamontov, Novokhopersk to Tambov              | ~180 km       | 8 days   | 0.94 | `march` 1.7 / 2.7 |
| Tukhachevsky, Berezina to the Vistula         | ~630 km       | 41 days  | 0.64 | `march` 1.7 / 2.7 |
| Kolchak's army, Omsk to Irkutsk (the retreat) | ~2,060 km     | 85 days  | 1.01 | `march` 1.7 / 2.7 |
| Red Eastern Front, Omsk to Irkutsk            | ~2,060 km     | 65 days  | 1.32 | `rail` 15 / 30    |
| Trotsky's train, Moscow to Sviyazhsk          | ~690 km       | 62 hours | 11.1 | `rail` 15 / 30    |
| Wrangel, Sevastopol to Constantinople         | ~545 km       | 72 hours | 7.6  | `sea` 15 / 40     |

Nothing comes near even the sustained bar, and `npm run validate:content`
reports no pace warning on any route or track in the pack.

The interesting case is the one the bead named. **An armoured train on a
contested line is slower than a scheduled express, not faster.** The 1917 pack
raised `rail` to 30/50 for through passenger expresses carrying individuals; a
train fighting its way down a line whose bridges are being dropped and whose
water towers are being burnt is squarely inside the 1914 default of 15/30, and
raising the band here would be describing the wrong vehicle. The cavalry raid is
the same story from the other end: a Cossack corps covering five hundred miles
in forty days is making about twenty kilometres a day of straight-line ground,
which is under the 1914 `march` sustained bar.

The honest conclusion is not that the check is well calibrated for this pack —
it is that **the check is slack here**, because it was designed for a campaign
measured in days over three hundred kilometres and this one is measured in
months over five thousand. Declaring bands to acknowledge that would be
declaring the validator's way past a job it is not doing, which is precisely
what ADR 0020 says not to do. A band nothing uses is a warning; a band that
loosens a check nothing was straining against is worse.

## Geography

`borderYear: 1918`, and unlike the 1917 pack's choice this one is the obvious
one — but the reasoning is the mirror image and is worth stating, because the
1917 README argues against this file.

`1918.geojson` is built from upstream's `world_1920`, and the 1917 pack rejected
it for being the post-war settlement with Poland, Finland and the Baltic states
already independent. That is exactly what this pack wants. Its features include
`USSR`, `Ukraine`, `South Russia`, `Far Eastern SSR`, `White Russia`, `Poland`,
`Finland`, `Estonia`, `Latvia`, `Lithuania`, `Georgia`, `Armenia` and
`Azerbaijan` — which is to say, it is a civil-war map.

**It is also a composite, and no year it shows ever existed.** "South Russia"
and "USSR" are on the same sheet, and those two things were never contemporaries:
Denikin's government was gone in April 1920 and the Union was constituted in
December 1922. Read it as the middle of this pack's window, roughly 1920, and
read [ADR 0002](../../../docs/decisions/0002-geography.md) alongside it: the
border layer is context, not operational geography.

The Brest-Litovsk frontier is **not drawn**, and the reason is in the chapter.
Article III of the treaty defines it by reference to a map "submitted as an
essential part of this treaty of peace", and that map is not reproduced with the
text this project read. Inventing a plausible line would be the map asserting
something no footnote could take back.

The pack `region` runs from Warsaw to Vladivostok and from Murmansk to Baku —
113 degrees of longitude, about a sixth of the planet's circumference at that
latitude. The opening camera sits at zoom 2.6, which is a world view. That is
not a failure of framing; it is the subject.

**Tiles:** the extracts for this region are not authored. The map will render on
the borders layer alone until they are (`sand-lry.17`, a manual step).

## What was read, and what was not

This section exists because the alternative is to let the citations imply a
reading that did not happen. It is a better story than the 1917 pack's, because
one large thing turned out to be readable.

### Read in full, at page level

**W. H. Chamberlin, _The Russian Revolution, 1917–1921_, vol. II (Macmillan,
London, 1935)** is the pack's backbone and was read end to end. The Internet
Archive's scan of the **London** edition is out of copyright and downloadable,
and every page number cited in this pack was read in it: the narrative, the
appendix of translated documents (pp. 465–507) and the chronological table
(pp. 525–534), which is where most of the dates in `events.json` come from.

Two cautions travel with it, and both are in the registry entry. It is a
**pre-archival** work — a Moscow correspondent writing in 1935 from the Soviet
published record of the 1920s, from émigré memoirs and from his own reporting —
so where it gives a number for the terror it is repeating a published claim, not
counting. And **its pagination is not the New York edition's**: Seventeen
Moments cites the Red Terror resolution to Chamberlin vol. II, pp. 475–476, and
those pages hold something else entirely in the London edition, which is why
this pack carries no page for that document. `docs/sources.md` rule 3 exists for
exactly this and it caught something real.

Also read in full: **Holquist's _Kritika_ article** (open access, quoted with
page numbers); **Werth's Sciences Po encyclopedia entry** (no pagination, cited
by section); **Sumpf's and Mawdsley's 1914-1918-online articles** (open access,
peer reviewed, quoted); **Fisher's _Famine in Soviet Russia_** (1927, out of
copyright, quoted with pages); **Trotsky's _My Life_ ch. 34 and _How the
Revolution Armed_ vol. I** (Marxists Internet Archive, cited by chapter and by
piece because the texts carry no pagination); **the Brest-Litovsk treaty**
(Avalon/FRUS); **the Red Terror resolution** (Seventeen Moments, Chamberlin's
translation); **the Petropavlovsk resolution** (Avrich's translation, via the
Marxists Internet Archive); and **the calendar decree** (the 1957 edition, via
Moscow State University's electronic library, with its printed pagination).

### Read only in part, and marked

**Peter Whitewood on the military purge of 1937–38.** The accepted manuscript is
open access, and its embedded subset fonts defeat text extraction, so **only the
author's abstract could be read**. Whitewood is quoted on the forward causal link
from that abstract and from nothing else, and the link says so and is filed at
`confidence: "contested"` for that reason.

### Not read at all, and what it costs

**Every modern monograph on this war is borrow-only from this environment.**
Mawdsley's _The Russian Civil War_ (1987), Kenez's two volumes on south Russia,
Smele's _The 'Russian' Civil Wars, 1916–1926_ (2015), Leggett's _The Cheka_,
Ryan's _Lenin's Terror_, Buldakov's _Krasnaia smuta_, the Black Book of
Communism, Pipes's second volume, Figes and Smith at page level. What that costs
is stated on the cards rather than glossed:

- The [Whites card](../../../docs/historiography-1918.md) quotes three of its
  four positions and states the fourth (Figes) from the work rather than from a
  page. **Smele's plural-wars position — that the singular in "the Russian Civil
  War" is itself the mistake — is named nowhere on the card**, because no text of
  his could be opened, and that is a real gap rather than a judgement.
- The [terror card](../../../docs/historiography-1918.md) **prints no total**,
  on purpose. The literature that does the counting is exactly the literature
  that could not be opened, and its published figures differ by more than an
  order of magnitude — partly because they are counting different things. Two of
  its four positions are reached through Holquist, who quotes them, and both are
  labelled as second-hand on the card in the terms ADR 0017 requires.
- **The famine of 1921–22 has no death toll in this pack.** The figure usually
  given is five million and no work this project could open establishes it. A
  number that large carrying a citation that does not support it is worse than
  no number, because the citation makes it look checked.

One trap avoided and worth recording, because it is the kind of thing catalogue
records do: **Denikin's _The Russian Turmoil_ (Hutchinson, 1922) is public
domain and fully readable, and is useless here.** It is a slightly abridged
translation of volume 1 of _Ocherki russkoi smuty_ and its narrative ends with
his arrest in August 1917 — before this pack begins. It is not in the registry.

## What is not here

No tour, no imagery, no audio, no casualty records, no decision points, no
counterfactual branch, no technology or science cards.

The absences that are decisions rather than backlog:

- **No `CasualtyRecord`.** The figures for this war are contested by more than
  an order of magnitude and the disputes are political; a record built from a
  round number in a survey would be worse than none. The one figure the pack
  states — Werth's approximately 150,000 Jewish deaths in the pogroms of
  1918–22 — lives in prose and on the terror card, and the qualification travels
  with it: Sumpf's apparently matching 150,000 is a count of _victims_ including
  extortion and assault, over three years rather than five, which is a reason to
  hold the number loosely rather than a corroboration of it.
- **No counterfactual branch**, although this war has the best ones in the
  project (the Whites concede the land; Kolchak and Denikin join hands on the
  Volga; the Vistula goes the other way and the Red Army is in Germany in 1920).
  Each of those needs feasibility conditions with sources, and the sources are
  the ones that could not be opened.
- **No fourth forward link.** The links to collectivisation, to Stalin and to
  the purge of the officer corps are authored, and the purge-to-1941 link is
  authored at `confidence: "low"` with the reasons on it. What is _not_ here is
  a link into a 1941 pack, because there is no 1941 pack; the epilogue chapter
  holds a Barbarossa event so that the chain terminates somewhere real, and the
  link should be re-pointed when the Eastern Front arc exists.
