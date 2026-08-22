# Sources — citation standard and the WWI bibliography

How Sandtable cites, what it cites, and the core works for the First World
War packs. Story: `sand-23b.1`; the fact-check workflow that applies it is
`sand-23b.2`; the bibliography UI is `sand-shn.5`.

## The standard

1. **Every factual claim cites a `Source`.** Dates, numbers, positions,
   strengths, quotations, attributions of motive. The validator requires at
   least one citation on routes, events, battles, decision points, tech and
   science cards, documents, beats and causal links (`docs/content-model.md`).
2. **Sources are entities** in `content/shared/sources/sources.json`
   (pack-local `sources.json` only for works used by one pack). Fields: `id`
   (`source:<surname>-<year>`, or a short slug for official histories),
   `kind`, `author` ("Surname, Given; Surname, Given"), `title`, `year`,
   `publisher` ("Publisher, City"), `edition`, `url`, `isbn`, and `notes`
   saying what the work is good for and what its bias is.
3. **A citation is `{ source, pages?, note? }`.** Give pages for anything
   contestable — a strength, a time of day, a position, a quotation. `note`
   says what the citation supports when an entity cites several works.
4. **Inline footnotes in beats** are `[^slug]` where `slug` is the part after
   `source:`; the dossier renders them as numbered footnotes with the full
   citation, and lists front-matter sources not cited inline under "Also
   drawing on". A footnote that is not among the beat's `sources` fails
   validation.
5. **Rendered form** (`formatCitation` in `src/engine/beats.ts`):
   `Surname, Given, *Title* (Publisher, City, Year), pp. 112–115.` — URL
   appended for web sources.
6. **Contested points are historiography.** Name the historians and their
   positions ("Zuber argues …; Mombauer replies …"), cite each, and do not
   resolve the debate for the learner. The `contested` confidence value
   exists for exactly this.
7. **Primary sources are quoted, not paraphrased**, as `Document` entities
   with the original language and a translation, each cited to the archive
   or the edition that prints them (AFGG annexes, Reichsarchiv, the British
   Official History appendices).
8. **Wikipedia** (`source:wikipedia-en`) is allowed only for uncontested
   biographical dates until a better reference replaces it; never for
   operational claims. Remove it from any entity that gains a proper source.
9. **Tertiary and popular works** (Tuchman, Keegan, Hastings) may carry
   narrative colour and well-known episodes; numbers and positions come from
   Herwig, Strachan or the official histories.
10. **Images** cite their archive in the manifest (ADR 0007); captions that
    assert a date, place or unit cite a source in `notes`.

## Hierarchy of evidence (for when sources disagree)

1. Official histories and their document annexes (Reichsarchiv, AFGG,
   Edmonds) for orders, strengths, positions and times — read knowing each
   defends its own army.
2. Archive-based modern operational studies (Herwig, Mombauer, Strachan,
   Stevenson, Holmes, Foley, Zuber) for interpretation and for corrections to
   the official accounts.
3. Regimental and divisional histories for battle zoom-ins (hourly detail).
4. Memoirs (Kluck, Bülow, Joffre, French, Gallieni, Ludendorff, Hoffmann) for
   what commanders believed — cited as such, never as fact.
5. General histories and popular narratives for context and colour.

When two works disagree on a number or a time, cite both and pick the more
specific with a `note`; when they disagree on meaning, write historiography.

## Core bibliography — 1914 in the West (in the registry)

| id                                | Work                                                                         | Use it for                                                |
| --------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| `source:herwig-2009`              | Herwig, _The Marne, 1914_ (2009)                                             | the operational narrative, strengths, dates; the backbone |
| `source:strachan-2001`            | Strachan, _The First World War, I: To Arms_ (2001)                           | plans, mobilization, strategy, the global frame           |
| `source:mombauer-2001`            | Mombauer, _Helmuth von Moltke and the Origins of the First World War_ (2001) | Moltke, the plan's reality, the reply to Zuber            |
| `source:zuber-2002`               | Zuber, _Inventing the Schlieffen Plan_ (2002)                                | the revisionist case — cited as one side                  |
| `source:tuchman-1962`             | Tuchman, _The Guns of August_ (1962)                                         | narrative colour; personalities; not numbers              |
| `source:keegan-1998`              | Keegan, _The First World War_ (1998)                                         | general context                                           |
| `source:hastings-2013`            | Hastings, _Catastrophe_ (2013)                                               | 1914 at human scale; Belgium, Serbia                      |
| `source:reichsarchiv-weltkrieg-1` | Reichsarchiv, _Der Weltkrieg 1914 bis 1918_, Bd. 1 (1925)                    | German orders of battle, positions, orders                |
| `source:edmonds-1922`             | Edmonds, _Military Operations: France and Belgium, 1914_, I (1922)           | the BEF day by day                                        |
| `source:afgg-1-1`                 | _Les Armées françaises dans la Grande Guerre_, I/1 (1922)                    | French orders of battle, positions, the orders            |
| `source:wikipedia-en`             | Wikipedia (English)                                                          | uncontested biographical dates only                       |

## To add as the content lands (not yet in the registry)

- Reichsarchiv, _Der Weltkrieg_, Bd. 3 (the Marne) and Bd. 4 (the Aisne and
  the race to the sea) — split the registry entry per volume when cited.
- AFGG Tome I, 2e and 3e volumes and their annex volumes (the orders of
  25 August, 4 and 6 September as documents).
- Stevenson, _1914–1918: The History of the First World War_ (2004).
- Holmes, T. M., "The Reluctant March on Paris" and the Zuber exchange in
  _War in History_ (2001–2014); Foley, _Alfred von Schlieffen's Military
  Writings_ (2003) — the feasibility debate, for the branch panel.
- Doughty, _Pyrrhic Victory: French Strategy and Operations in the Great War_
  (2005) — Joffre and Plan XVII.
- Terraine, _Mons: The Retreat to Victory_ (1960) and the Bavarian and French
  regimental histories — the battle zoom-ins.
- Senior, _Home Before the Leaves Fall_ (2012) — the 1914 campaign narrative.
- Primary: the 1905 memorandum (in Foley); Moltke's directives of 27 August
  and 4 September; Joffre's Instruction générale no 2 and the order of
  6 September; Hentsch's 1917 report; Kluck's and Bülow's post-war accounts.

Each addition is a registry entry with `notes` on use and bias, added in the
PR that first cites it (see `docs/authoring.md` §1).

## Review

Content PRs are checked against this page by the fact-check workflow
([`docs/fact-check.md`](fact-check.md)); the contested points are listed in
[`docs/historiography-1914.md`](historiography-1914.md). The reviewer checks: every claim cited, pages where contestable, contested points
as historiography, documents quoted not paraphrased, Wikipedia only for dates,
images cited in their manifests.
