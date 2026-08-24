# Fact-check record — the 1914 pack, August 2026

The Phase 1 sourcing pass (`sand-1l0.16`): the reviewer checklist in
[`docs/fact-check.md`](fact-check.md) run over the whole
`content/eras/1914-schlieffen-marne` pack against the standard in
[`docs/sources.md`](sources.md). What was checked, what it found, what was
fixed, and what still needs the printed volumes.

Scope: 11 battles and chapters, 71 beats, 117 events, 173 routes, 141
formations, 14 documents, 8 casualty records, 18 causal links, 11 vignettes,
4 decision points, 5 tech and 3 science cards, 55 people, 86 places, 49
sources — 1,620 citations.

## Result by section of the checklist

| Section              | Result                                                        |
| -------------------- | ------------------------------------------------------------- |
| Claims and citations | Pass, with one standing exception (Liège) and one gap (pages) |
| Contested points     | Pass                                                          |
| Hypotheticals        | Pass                                                          |
| Geodata              | Pass, two modelling defects filed                             |
| Images               | Deferred to `sand-y0u.7`, which owns the image review         |
| People and places    | Pass, after one correction                                    |

### Claims and citations

Every entity the validator requires a citation on has one; there are no
uncited claims, no entity resting only on tertiary works, and no beat
paragraph asserting a number without a footnote. Beat footnotes all resolve to
the beat's own sources — the validator enforces it.

**Wikipedia.** It stood behind operational claims on seven entities, which
§8 forbids. Six were removable and were removed:

- `1914:casualties-marne` and `1914:casualties-august-france` carried it on
  three figures and both records, beside Herwig and Edmonds, who already
  support every number. §8 says to remove it once an entity has a proper
  source; the notes and the historiography paragraphs already told the reader
  which figures are returns and which are estimates in circulation.
- `1914:event-ruffey-relieved` and `1914:vignette-castelnau-nancy` rest on
  Doughty and AFGG. The Castelnau vignette's hidden source note said accounts
  differ on how near he came to giving up Nancy; §6 says that belongs in the
  text, so it is now in the text.
- `1914:east-event-samsonov` used it only for the Julian date. A calendar
  conversion of a date Showalter already carries is not a citation; it is now
  a clause in the prose.
- `1914:grand-couronne-event-nancy-shelled` — the sixty-seven shells and eight
  civilian dead are the French account's round figures. The claim keeps AFGG
  and its provenance moved into the citation note; checking it against the
  annexes is `sand-23b.7`.

Four of those were `[^wikipedia-en]` footnotes rendered to the reader in the
dossier. There are now none.

**The standing exception was Liège**: the twelve forts carried their positions
and their surrender hours on Wikipedia, 28 citations, and no work in the
registry could replace it without the books — Donnell, the Belgian official
account, or Reichsarchiv Bd. 1. `sand-23b.5` closed it on the third of those.
Reichsarchiv Bd. 1, pp. 105–120 ('Die Eroberung der Festung Lüttich'), read
page by page in the digitised 1925 first edition, now carries the fall of
every fort. What the official history gives is the day and the part of the
day — Barchon on the afternoon of 8 August, Évegnée on the evening of the
11th, Hollogne and Flémalle on the morning of the 16th — and not the clock;
each fort's `derivation` says so, and the minute on the timeline is nominal
within the window the citation supports. Two hours that sat outside that
window moved into it. Donnell and Zuber, who work from the fort records, are
on the list of works to add when a copy is in hand and the pages can be given.
**Nothing was invented to close it**: a citation to a volume nobody opened is
worse than an honest tertiary pointer.

**Pages.** §3 asks for pages on anything contestable. At the August 2026 pass
seven of 1,620 citations gave any, six of them on Document entities; that was
the pack's largest citation gap and it was filed as `sand-23b.6`.

It is being closed volume by volume, and the count is the measure of it:

| Pass                                     | Citations | With pages |
| ---------------------------------------- | --------: | ---------: |
| `sand-1l0.16`, August 2026 (this record) |     1,620 |          7 |
| after `sand-23b.5` (Liège forts)         |     1,629 |         35 |
| after `sand-23b.9` (commander tracks)    |     1,694 |         76 |
| after `sand-23b.6`, first tranche        |     1,705 |        117 |
| after `sand-23b.6.1` (`formations.json`) | **1,764** |    **244** |

The first tranche of `sand-23b.6` worked the three files the bead names in
priority order and stopped where the volumes stopped. `casualties.json` goes
0 → 11 of 31: every Edmonds figure in it — Mons's "just over sixteen hundred",
Le Cateau's 7,812 and 38 guns, the Marne's 1,701, First Ypres's 58,155 and
134,315, the old BEF's 86,237 — was read on its printed page and now cites it.
`documents.json` goes 7 → 15 of 45. `battles.json` goes 28 → 50 of 547: the
Liège assault, Brussels, Namur, the BEF from Casteau to the Aisne, the taxis.
Everything still without pages rests on a work that could not be opened from
here — Herwig, Strachan, Tuchman, Doughty, Showalter, Zuber, Steg, Horne &
Kramer, Van Pul, Tyng, and the AFGG volumes behind Gallica's block
(`sand-23b.20`). At the end of that tranche `formations.json` (273
citations), `routes.json` (124) and the two shared registries were untouched
and wanted their own beads.

The second tranche worked `formations.json`, the biggest single file left and,
after casualties, the file with the most contestable numbers in it: strengths
and orders of battle. It goes **0 → 127 of 332** citations with pages. What
made that possible is that four of the five volumes the file leans on print an
order of battle as an appendix, and all four are digitised: Reichsarchiv Bd. 1
Anlage 1, "Das deutsche Westheer am 18. August 1914" (pp. 664–687), which
gives every German army and corps with its divisions and its commander;
Edmonds Vol. I Appendix 1 for the BEF (pp. 471–484), Appendix 3 for the French
armies (pp. 488–489) and Appendix 5 for the Belgian army (p. 492). Bd. 1
pp. 69–70 gives the deployment area of each German army as the
Aufmarschanweisungen laid it down, and Edmonds p. 45 prints the seven German
army strengths for 17 August — 320,000, 260,000, 180,000, 180,000, 200,000,
220,000, 125,000 — which are exactly the figures this pack had been carrying
on a secondary work that cannot be opened from here. **Fifty-nine citations
were added** to entities that had none that could be read, and **eight moved
from `source:edmonds-1922` to `source:edmonds-1933`**. The 104 Herwig
citations, the 54 AFGG citations and the Strachan, Hastings, Unruh, Showalter,
Tuchman, Tyng, Van Pul and Stone citations keep no pages, because none of
those works can be opened from here.

Six places where the volume said something other than the card are recorded in
the citation `note` beside the claim and, where they are contested rather than
simply wrong, in `docs/historiography-1914.md` (notes 12 and 13). Nothing was
quietly corrected.

**Never a page that was not read.** Every number above was pulled from
archive.org's hOCR search-text and page-index files for the digitisation
named in the registry entry, resolved to the printed page and read. Where a
volume supports a claim only at day or part-of-day resolution the citation
says so in its `note` — the technique and the wording are `sand-23b.5`'s and
`sand-23b.9`'s. Where a page number belongs to an edition the pack does not
cite, the citation was re-pointed rather than the page carried across:
**sixteen citations moved from `source:edmonds-1922` to `source:edmonds-1933`**,
because the 1922 first edition is not the volume that is digitised and its
pagination is not the 1933 third edition's.

**Spot-checks.** The Belgian documents were checked verbatim against a
digitised Grey Book: the German note of 2 August (No. 20) and the Belgian
reply of 3 August (No. 22) match the printed text in substance and in their
decisive phrases — _aucun intérêt stratégique ne justifie la violation du
droit_, _sacrifierait l'honneur de la nation_, and the ultimatum's threat to
treat the kingdom as an enemy if the Meuse forts resisted. Both are quoted in
the original language, both are marked as excerpted, and both name the
translation used.

Six documents are quoted in English where the original is German — the OHL
directives, the Bülow–Kluck wireless, the Hentsch minute — because the pack
has them through Kluck's 1920 translation. §7 wants the original beside the
translation. `docs/sources.md` already lists the German texts as a registry
addition to make; that remains the fix.

### Contested points

All six points in [`docs/historiography-1914.md`](historiography-1914.md) are
carried in the content as debates with the historians named and cited: Zuber,
Mombauer, Ritter, Foley and Holmes across the nine origins beats; Clark,
Fischer and Albertini in the July Crisis; Horne & Kramer on Belgium in six
beats; Unruh on Langemarck; Stone on the East. The Hentsch verdict names the
1917 inquiry, Herwig, the older German account and Tuchman, and does not
settle the question.

Verdict words: one use of "brilliant" in the whole pack, attributed to Ritter
by name — which is what the checklist asks for. No "miracle", no "blunder",
no "genius" in the pack's own voice.

### Hypotheticals

All six counterfactual beats carry their branch, say **Hypothetical** in
`dateLabel`, and say so again in their opening lines.

### Geodata

All 173 routes carry a confidence and a derivation. Every leg was measured
against its own elapsed time; twenty exceed a sustained marching rate, and all
but one are explained by their own derivation — forced marches at 45–63 km a
day, Hentsch's staff car, the Paris taxis. Two defects, both filed as
`sand-23b.8`:

- The French Second Army moves 322 km from Nancy to Picardy in four days as a
  march leg. That is Castelnau's army going west by train for the Race to the
  Sea — the redeployment `sand-1l0.21` built the rail layer for — and it should
  draw as a rail transfer.
- `Route.mode` has no value for road movement, so Hentsch's car and the taxis
  of the Marne are marching formations by default. Both routes say what they
  really were in their notes, so the content is honest and only the model is
  short.

### People and places

`AT` was the nationality on Franz Ferdinand, Sophie Chotek, Berchtold and
Gavrilo Princip. `AT` is the Republic of Austria; the 1914 state was
Austria-Hungary, and the code mattered most on Princip — a Bosnian Serb and an
Austro-Hungarian subject, labelled with his victim's country. Corrected to
`AT-HU`, with the reason written into the schema so it is not lost.

Two Liège forts were named `Fort de Évegnée` and `Fort de Embourg`; French
elides before a vowel. Fixed.

## What now holds the line

`docs/sources.md` §8 said "uncontested biographical dates"; the pack also uses
Wikipedia for place coordinates, which is the same kind of use and is fine.
The rule now says what it means — reference data in `people.json` and
`places.json`, never an operational claim, never a footnote the reader sees —
and `validateContent` warns on every citation to it outside those two
registries. The warning count is the Liège backlog, and it is 28.
