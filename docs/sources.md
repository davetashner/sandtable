# Sources — citation standard and the bibliographies

How Sandtable cites, what it cites, and the core works for the packs: the
First World War first, and from `sand-lry.14` the Pacific War as well. Story:
`sand-23b.1`; the fact-check workflow that applies it is `sand-23b.2`; the
bibliography UI is `sand-shn.5`.

## The standard

1. **Every factual claim cites a `Source`.** Dates, numbers, positions,
   strengths, quotations, attributions of motive. The validator requires at
   least one citation on routes, events, battles, decision points, tech and
   science cards, documents, beats and causal links (`docs/content-model.md`).
2. **Sources are entities** in `content/shared/sources/sources.json`
   (pack-local `sources.json` only for works used by one pack). Fields: `id`
   (`source:<surname>-<year>`, or a short slug for official histories),
   `kind`, `tier`, `author` ("Surname, Given; Surname, Given"), `title`,
   `year`, `publisher` ("Publisher, City"), `edition`, `url`, `isbn`, and
   `notes` saying what the work is good for and what its bias is. `kind` is
   what the thing physically is; **`tier` is where it stands in the hierarchy
   of evidence below**, and it is the field a reader sees, because the
   bibliography groups by it. File a work by its **form**, not by the use one
   pack makes of it: an edition that prints a document is `primary` even when
   its editor also argues a case, and a monograph is a `study` even when it
   prints a document in an appendix. `notes` carries the rest.
3. **A citation is `{ source, pages?, note? }`.** Give pages for anything
   contestable — a strength, a time of day, a position, a quotation. `note`
   says what the citation supports when an entity cites several works.
   Two rules follow, and both exist because a page number is a promise that
   somebody checked. **Never write a page you did not read** — a plausible
   page is worse than none. And where the work supports the claim only at
   day, part-of-day, chapter or section resolution, the `note` (or the
   `derivation`, where the entity has one) says so in as many words, so that
   the hour on the timeline is visibly nominal rather than falsely precise.
   Page numbers belong to an edition: never carry them between editions of
   the same work — re-point the citation to the edition that was read, or
   leave it without pages (`source:edmonds-1922` and `source:edmonds-1933`
   are the standing example).
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
   Official History appendices). **Every `Document.excerpt` carries a
   verification receipt** — see "Quoting, and the receipt that goes with it"
   below ([ADR 0021](decisions/0021-quotation-receipts.md)).
8. **Wikipedia** (`source:wikipedia-en`) is **reference data only**: a
   person's dates and dates of office in `people.json`, a place's coordinates
   in `places.json`. Never an operational claim — a strength, a position, a
   time of day, a casualty figure, an order — and never a footnote a reader
   sees in the dossier. Remove it from any entity that gains a proper source.
   The validator warns on every citation to it outside the two shared
   registries; the standing exceptions are on beads.
9. **Tertiary and popular works** (Tuchman, Keegan, Hastings) may carry
   narrative colour and well-known episodes; numbers and positions come from
   Herwig, Strachan or the official histories.
10. **Images** cite their archive in the manifest (ADR 0007); captions that
    assert a date, place or unit cite a source in `notes`.

## Hierarchy of evidence (for when sources disagree)

The five rungs, strongest first, and the `tier` value each one is written as.
Two more values sit outside the ranking because rules 7 and 8 above govern
them instead: `primary` above it — the record itself, cited for what it says —
and `reference` below it, which is never evidence for an operational claim.

1. `official-history` — official histories and their document annexes
   (Reichsarchiv, AFGG, Edmonds) for orders, strengths, positions and times —
   read knowing each defends its own army.
2. `study` — archive-based modern operational studies (Herwig, Mombauer,
   Strachan, Stevenson, Holmes, Foley, Zuber) for interpretation and for
   corrections to the official accounts.
3. `unit-history` — regimental, divisional and corps histories for battle
   zoom-ins (hourly detail), read knowing each defends its own formation.
   `source:fuller-1920` is the first in the registry: the Tank Corps' history
   written by its own senior staff officer while he was arguing for an armoured
   army. The regimental works wanted are in "to add as the content lands" below.
4. `memoir` — memoirs (Kluck, Bülow, Joffre, French, Gallieni, Ludendorff,
   Hoffmann) for what commanders believed — cited as such, never as fact.
5. `general` — general histories, surveys and handbooks for context, colour
   and uncontested matters of record.

When two works disagree on a number or a time, cite both and pick the more
specific with a `note`; when they disagree on meaning, write historiography.

## Quoting, and the receipt that goes with it ([ADR 0021](decisions/0021-quotation-receipts.md))

Everything above is a rule a reviewer with the book open can test. A quotation
is not: it is not a claim _about_ a source, it is the source reproduced, and
there is nothing else to hold it against. A fabricated quotation carrying a
well-formed citation passes every gate here, and passes them looking more
checked than the paragraph around it. An agent working on the 1917 pack
invented quotations attributed to a named memoirist and the text of a decree,
and nothing in CI would have caught it.

So the rule that follows from §3's "never write a page you did not read" is:

**Never write a quotation you have not seen, and be able to show that you saw
it.** Not a reconstruction, not a paraphrase in quotation marks, not a line you
are confident is roughly right. If you delegate the reading, verify what comes
back before you write it down — an agent's summary of a source is not a source.

A **receipt** is how showing it works: an entry in `content/receipts/<era>.json`
holding the quoted passage, the url that was fetched or the copy that was
opened, the day, who did it, whether a repeat fetch agreed, and — the part that
matters — the **retrieved text with the quotation sitting inside it**. The
validator checks that containment, so a receipt cannot be a bare assertion, and
`npm run receipts -- --fetch` re-runs it against the live source later.

```bash
npm run receipts -- --capture <url> --find "a phrase from the passage"
```

prints the surrounding text, ready to paste into the receipt's `context`. Use
it, or another retrieval that returns the page's own bytes. **Do not build a
receipt from a tool that summarises a page for you**: what comes back is that
tool's rendering of the text, and a receipt made of it is a paraphrase wearing
the costume of a retrieval.

Two consequences worth stating plainly.

**A retrieval that will not repeat itself buys no page number.** The Pearl
Harbor pack found the extraction layer returning different page markers for the
same sentence on repeated fetches — 196/197 then 195/196 — and wrote no pages
for five transcriptions, giving the chapter and quoting the sentence instead.
That is now the rule: `repeat: "differed"` and `pages` cannot both be true.

**The answer to a source you cannot open is to stop quoting it, not to stop
citing it.** Gallica answers this environment with a security check; three US
military history hosts answer 403; Morison, Prange, Layton, Figes and nearly
every Russian monograph are borrow-only. Those works stay in the registry and
stay cited — without pages, without quotation marks, and with the pack saying
so. That is what the paragraphs above already do for the Reichsarchiv and
Gallica, what the 1917 and 1941 pack READMEs do at length, and it is the
expected outcome for most of this shelf rather than a grudging exception.

Only `Document.excerpt` is _required_ to have a receipt — the one field whose
definition is "the real text". A quotation inside a beat, a card or a
`sources[].note` is governed by this page and by review; you may still write it
a receipt, and the validator will then tell you if the content drifts away from
it (`sand-23b.58`).

## What a reader sees (`sand-shn.5`)

The apparatus is not a document written beside the pack; it is **generated
from the pack's own citations**, so it cannot drift from what the content
actually cites.

- **Every citation resolves.** A footnote under a beat, and a numbered line in
  a card's Sources block, names its work as a link to that work's card —
  `?card=source:<slug>` — which carries the full reference, the rung it sits
  on and what that rung means, the registry's `notes`, how often this pack
  leans on it and how many of those citations give pages, and a link to the
  scan where `url` says there is one. Pages read as `p. 45` or `pp. 105–120`.
- **The bibliography is a card**, `?card=bibliography`, reached from under any
  beat and from any card's Sources block. Not a panel and not a page: ADR 0006
  allows three surfaces and says in as many words that sources render "as
  footnotes under the beat and as a bibliography card". The address is a
  reserved value of the card slot (ADR 0009) and cannot collide with an entity
  id, because entity ids are qualified with a colon and this one is not.
- **Only works the pack cites are listed.** A bibliography is the list of
  works a piece of writing used; padding it with works the project has merely
  heard of would claim they were read. An entry in the registry that nothing
  cites is therefore invisible to a reader, which is why the validator warns
  about it rather than leaving it to rot.
- **There is no separate "further reading" list, and that is a decision.**
  Each entry already carries the registry's note on what the work is good for
  and where it is partisan, and that note is the recommendation — the only one
  this pack is entitled to make, because it is the only one it has read. The
  list below is an **authoring backlog**, not reader-facing: printing "works
  we wish we had" in a bibliography would look exactly like a bibliography and
  mean the opposite, and several of its entries exist precisely because a
  claim in the pack is _not_ yet supported the way it should be.

## Core bibliography — 1914 in the West (in the registry)

| id                                         | Work                                                                              | Use it for                                                                                                                                                                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source:herwig-2009`                       | Herwig, _The Marne, 1914_ (2009)                                                  | the operational narrative, strengths, dates; the backbone                                                                                                                                                                                         |
| `source:strachan-2001`                     | Strachan, _The First World War, I: To Arms_ (2001)                                | plans, mobilization, strategy, the global frame                                                                                                                                                                                                   |
| `source:mombauer-2001`                     | Mombauer, _Helmuth von Moltke and the Origins of the First World War_ (2001)      | Moltke, the plan's reality, the reply to Zuber                                                                                                                                                                                                    |
| `source:zuber-2002`                        | Zuber, _Inventing the Schlieffen Plan_ (2002)                                     | the revisionist case — cited as one side                                                                                                                                                                                                          |
| `source:tuchman-1962`                      | Tuchman, _The Guns of August_ (1962)                                              | narrative colour; personalities; not numbers                                                                                                                                                                                                      |
| `source:keegan-1998`                       | Keegan, _The First World War_ (1998)                                              | general context                                                                                                                                                                                                                                   |
| `source:hastings-2013`                     | Hastings, _Catastrophe_ (2013)                                                    | 1914 at human scale; Belgium, Serbia                                                                                                                                                                                                              |
| `source:reichsarchiv-weltkrieg-1`          | Reichsarchiv, _Der Weltkrieg 1914 bis 1918_, Bd. 1 (1925)                         | German orders, positions; the Liège forts fall by fall, pp. 105–120; the deployment areas, pp. 69–70; Anlage 1, the order of battle of 18 August, pp. 664–687; the dated situation sketches, pp. 195, 347, 506, 538. **Narrative ends 27 August** |
| `source:reichsarchiv-weltkrieg-3`          | Reichsarchiv, _Der Weltkrieg 1914 bis 1918_, Bd. 3 (1926)                         | Sambre to Marne, 23 Aug – 4 Sep; the German army headquarters day by day; the battle of St. Quentin corps by corps, pp. 145–179                                                                                                                   |
| `source:edmonds-1922`                      | Edmonds, _Military Operations: France and Belgium, 1914_, I (1922)                | first edition; **cite `edmonds-1933` for any page number**                                                                                                                                                                                        |
| `source:edmonds-1933`                      | Edmonds, _Military Operations: France and Belgium, 1914_, I, 3rd edn (1933)       | the edition that is digitised; GHQ's moves and the GHQ operation orders with their march tables, pp. 508–529, 551; the German army strengths, p. 45; the Belgian army, p. 19; the orders of battle, Appendices 1–6, pp. 471–495                   |
| `source:lanrezac-1920`                     | Lanrezac, _Le plan de campagne français_ (1920)                                   | the French Fifth Army's headquarters day by day; his own removal at Sézanne, ch. IX, pp. 276–284; self-exculpatory, one side                                                                                                                      |
| `source:afgg-1-1`                          | _Les Armées françaises dans la Grande Guerre_, I/1 (1922)                         | French orders of battle, positions, the orders                                                                                                                                                                                                    |
| `source:wikipedia-en`                      | Wikipedia (English)                                                               | uncontested biographical dates only                                                                                                                                                                                                               |
| `source:afgg-1-2-annexes-1`                | AFGG, Tome I, 2e vol., Annexes 1er vol. (1925)                                    | the French orders of the retreat; Instruction générale no 2                                                                                                                                                                                       |
| `source:kluck-1920`                        | Kluck, _The March on Paris and the Battle of the Marne, 1914_ (1920)              | OHL directives and wireless as received by First Army; memoir, one side                                                                                                                                                                           |
| `source:gallieni-1920`                     | Gallieni, _Mémoires: Défense de Paris_ (1920)                                     | the Paris orders of 3–9 September; his 4 September hour by hour, pp. 113–133; memoir, one side                                                                                                                                                    |
| `source:belgian-grey-book-1914`            | Belgian Grey Book (1914; English in _Collected Diplomatic Documents_, 1915)       | the ultimatum and the reply, Nos. 20 and 22                                                                                                                                                                                                       |
| `source:bsb-1000dokumente-schlieffen-1905` | BSB, _Denkschrift 'Krieg gegen Frankreich'_ (transcription, 2010)                 | the German text of the 1905 memorandum                                                                                                                                                                                                            |
| `source:ehlert-epkenhans-gross-2006`       | Ehlert, Epkenhans & Groß (eds), _Der Schlieffenplan_ (2006)                       | the edited documents and the post-Zuber essays                                                                                                                                                                                                    |
| `source:ritter-1958`                       | Ritter, _The Schlieffen Plan: Critique of a Myth_ (1958)                          | the English memorandum text, pp. 134–148; Ritter's critique                                                                                                                                                                                       |
| `source:clark-2012`                        | Clark, _The Sleepwalkers_ (2012)                                                  | the July Crisis; the revisionist case — one side                                                                                                                                                                                                  |
| `source:fischer-1967`                      | Fischer, _Germany's Aims in the First World War_ (1967)                           | the case for German responsibility — one side                                                                                                                                                                                                     |
| `source:albertini-1952`                    | Albertini, _The Origins of the War of 1914_ (1952–57)                             | the crisis hour by hour; the standard reconstruction                                                                                                                                                                                              |
| `source:mombauer-2013`                     | Mombauer (ed.), _The Origins of the First World War: Documents_ (2013)            | crisis documents in translation, with commentary                                                                                                                                                                                                  |
| `source:hmso-collected-1915`               | _Collected Diplomatic Documents_ (HMSO, 1915)                                     | the colour books in one volume; the notes at pp. 6–8, 32–37, 309–312                                                                                                                                                                              |
| `source:kautsky-1924`                      | Kautsky (ed.), _Outbreak of the World War: German Documents_ (1924)               | the German files; the 'blank cheque' is no. 15                                                                                                                                                                                                    |
| `source:byu-wwi-archive`                   | BYU, _The World War I Document Archive_                                           | working transcriptions; cite the printed collection too                                                                                                                                                                                           |
| `source:edmonds-1925`                      | Edmonds, _Military Operations: France and Belgium, 1914_, II (1925)               | Antwerp from 19 Sep, the Yser, First Ypres; the casualty notes, pp. 465–468; the new German reserve corps, pp. 122–123, 168; the Allied dispositions of 15 Oct, p. 103. **Narrative begins 19 Sep**                                               |
| `source:van-pul-2006`                      | Van Pul, _In Flanders Flooded Fields_ (2006)                                      | the Yser inundation: the locks, the nights, who opened them                                                                                                                                                                                       |
| `source:unruh-1986`                        | Unruh, _Langemarck: Legende und Wirklichkeit_ (1986)                              | the reality behind the Kindermord legend                                                                                                                                                                                                          |
| `source:1914-1918-online-langemarck`       | Grawe, 'Langemarck Myth', _1914-1918-online_                                      | the OHL communiqué of 11 November 1914 and the myth's construction                                                                                                                                                                                |
| `source:1914-1918-online-ypres`            | Jones, 'Ypres, Battles of', _1914-1918-online_                                    | First Ypres: dates, armies, the round casualty totals                                                                                                                                                                                             |
| id                                         | Work                                                                              | Use it for                                                                                                                                                                                                                                        |
| `source:showalter-2004`                    | Showalter, _Tannenberg: Clash of Empires, 1914_ (2004)                            | East Prussia 1914: Gumbinnen, Tannenberg, the corps from the West                                                                                                                                                                                 |
| `source:stone-1975`                        | Stone, _The Eastern Front 1914-1917_ (1975)                                       | the Eastern Front's shape; sceptical of the Tannenberg legend                                                                                                                                                                                     |
| `source:doughty-2005`                      | Doughty, _Pyrrhic Victory_ (2005)                                                 | French strategy and operations; Plan XVII, the Ardennes, Joffre's purges                                                                                                                                                                          |
| `source:greenhalgh-2014`                   | Greenhalgh, _The French Army and the First World War_ (2014)                      | French doctrine and losses; the Colonial Corps at Rossignol, p. 41                                                                                                                                                                                |
| `source:zuber-2007`                        | Zuber, _The Battle of the Frontiers: Ardennes 1914_ (2007)                        | the Ardennes encounter battles from the German regimental histories                                                                                                                                                                               |
| `source:foley-2003`                        | Foley (ed.), _Alfred von Schlieffen's Military Writings_ (2003)                   | what Schlieffen actually wrote; the reply to Zuber                                                                                                                                                                                                |
| `source:holmes-2001`                       | Holmes, "The Reluctant March on Paris", _War in History_ 8:2 (2001)               | the Zuber exchange — cited as the other side                                                                                                                                                                                                      |
| `source:sumpf-2009`                        | Sumpf, 'Les taxis de la Marne', _L'Histoire par l'image_ (2009)                   | the low end of the taxi arithmetic: 630 cabs, 3,000-odd men, not decisive                                                                                                                                                                         |
| `source:bruce-2008`                        | Bruce, _Pétain: Verdun to Vichy_ (2008)                                           | Pétain's motor supply at Verdun 1916; the Bar-le-Duc road's organisation                                                                                                                                                                          |
| `source:memorial-verdun-bataille`          | Mémorial de Verdun, 'La bataille de Verdun'                                       | the Voie Sacrée's peak traffic figures — commemorative round numbers                                                                                                                                                                              |
| `source:haber-1986`                        | Haber, L. F., _The Poisonous Cloud_ (1986)                                        | chemical warfare: the standard account, the casualty table, the verdict                                                                                                                                                                           |
| `source:1914-1918-online-gas-warfare`      | Faith, 'Gas Warfare', _1914-1918-online_                                          | the sequence of first uses; the four-nation casualty table and its caveat                                                                                                                                                                         |
| `source:heller-1984`                       | Heller, _Chemical Warfare in World War I_ (Leavenworth Papers 10, 1984)           | 22 April 1915: the release, the two French divisions, the four-mile gap                                                                                                                                                                           |
| `source:fitzgerald-2008`                   | Fitzgerald, 'Chemical Warfare and Medical Response', _AJPH_ 98:4 (2008)           | the high end of the gas casualty range, and the deaths inside it                                                                                                                                                                                  |
| `source:1914-1918-online-blockade`         | Kramer, 'Naval Blockade (of Germany)', _1914-1918-online_                         | the nitrogen figures: BASF's output, 90% of explosives nitrogen by 1915                                                                                                                                                                           |
| `source:friedrich-hoffmann-2016`           | Friedrich & Hoffmann, 'Clara Haber, née Immerwahr', _ZAAC_ 642 (2016)             | Clara Immerwahr's doctorate; the historiography of her death                                                                                                                                                                                      |
| `source:erisman-2008`                      | Erisman et al., 'How a century of ammonia synthesis changed the world' (2008)     | the 1908 patent; the dependence of the modern world on fixed nitrogen                                                                                                                                                                             |
| `source:nobel-chemistry-1918`              | NobelPrize.org, 'The Nobel Prize in Chemistry 1918'                               | the prize, its wording and its date — reference data only                                                                                                                                                                                         |
| `source:sumner-1995`                       | Sumner, _The French Army 1914–18_ (Osprey MAA 286, 1995)                          | French 1914 dress, the trials from 1911, horizon blue; plates are reconstructions                                                                                                                                                                 |
| `source:mollo-1977`                        | Mollo, _Army Uniforms of World War I_ (1977)                                      | feldgrau and the covered helmet, khaki service dress, Belgian blue; the load                                                                                                                                                                      |
| `source:hogg-weeks-1977`                   | Hogg & Weeks, _Military Small Arms of the 20th Century_ (1977)                    | calibre, action and magazine of the Lebel, Gewehr 98, SMLE and Mauser m/1889                                                                                                                                                                      |
| `source:jones-2012`                        | Jones, _From Boer War to World War_ (2012)                                        | British musketry reform; fifteen aimed rounds a minute; the fire at Mons                                                                                                                                                                          |
| `source:messimy-1937`                      | Messimy, _Mes souvenirs_ (1937)                                                   | the fight over the pantalon rouge, 1911–14; memoir, one side                                                                                                                                                                                      |
| `source:armemuseum-digitaltmuseum`         | Armémuseum, object records on DigitaltMuseum                                      | the identification and licence of the four rifles in the kit plate set                                                                                                                                                                            |
| `source:hogg-1998-allied-artillery`        | Hogg, _Allied Artillery of World War One_ (1998)                                  | the 75 mle 1897 and its recoil carriage, the QF 18-pounder, the Belgian 75 mm mle 1905                                                                                                                                                            |
| `source:jaeger-2001-german-artillery`      | Jäger, _German Artillery of World War One_ (2001)                                 | the 7.7 cm FK 96 and the _neuer Art_ rebuild; technical catalogue, not operational history                                                                                                                                                        |
| `source:field-gun-museum-records-1914`     | Object records behind the four field-gun photographs                              | the identification of each gun in the plate set; the IWM label figures for its 18-pounder                                                                                                                                                         |
| `source:fuller-1920`                       | Fuller, _Tanks in the Great War, 1914–1918_ (1920)                                | the Tank Corps' founding papers and its own machine counts — partisan, cite beside another account                                                                                                                                                |
| `source:haig-despatches-1919`              | Haig, _Sir Douglas Haig's Despatches_ (ed. Boraston, 1919)                        | times, frontages and formations for the Somme, Cambrai and Amiens; the final despatch on mechanical weapons — advocacy throughout                                                                                                                 |
| `source:1914-1918-online-tanks`            | Kennedy, 'Tanks and Tank Warfare', _1914-1918-online_                             | the second count for 15 September 1916: 49 deployed to France, 31 across the German lines                                                                                                                                                         |
| `source:1914-1918-online-hundred-days`     | Lloyd, 'Hundred Days Offensive', _1914-1918-online_                               | Amiens 'up to eight miles'; the tank fourth of five causes of the 1918 victories                                                                                                                                                                  |
| `source:lupfer-1981`                       | Lupfer, _The Dynamics of Doctrine_ (Leavenworth Papers 4, 1981)                   | the German side of Cambrai: the counter-attack of 30 November and anti-tank defence as doctrine                                                                                                                                                   |
| `source:faulde-1925`                       | Faulde, _Historische Untersuchungen zur Marneschlacht 1914_ (Breslau diss., 1925) | the Hentsch mission as its own subject: the versions of Moltke's verbal order and how they converged, the 1917 inquiry, Kuhl and Müller-Loebnitz quoted by page                                                                                   |
| `source:joffre-1932`                       | Joffre, _Mémoires du maréchal Joffre (1910–1917)_ (1932)                          | the other side of the Lanrezac removal and of the 4 September directive; memoir, one side. On Gallica, which this environment cannot open — no pages yet                                                                                          |
| `source:belgian-army-report-1915`          | Belgian army command, _L'action de l'armée belge_ (1915; English 1915)            | the Belgian field army in 1914 where Edmonds II does not reach: into Antwerp 18–20 Aug, the sorties of 25–26 Aug and 9–13 Sep, the siege, the Yser. **Days, not hours**                                                                           |

## History of science, 1905–1919 — the "Meanwhile" layer (in the registry)

The rule for this layer is the one in §1 with a sharper edge: **cite the paper
for what the paper says**, and a secondary work for anything about the person,
the laboratory or the reception. The papers below are the ones the physics
cards rest on (`sand-9u2.2`); the 1919 eclipse result is a contested point and
is written as the argument it still is.

| id                                     | Work                                                                      | Use it for                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `source:einstein-1905-elektrodynamik`  | Einstein, 'Zur Elektrodynamik bewegter Körper', _Ann. Phys._ 17 (1905)    | special relativity as published; the dates of receipt and publication           |
| `source:einstein-1905-traegheit`       | Einstein, 'Ist die Trägheit …', _Ann. Phys._ 18 (1905)                    | the mass–energy relation as Einstein first stated it                            |
| `source:bohr-1913`                     | Bohr, 'On the Constitution of Atoms and Molecules' I–III, _Phil. Mag._ 26 | the quantum atom, the stationary states, the hydrogen spectrum                  |
| `source:moseley-1913`                  | Moseley, 'The High-Frequency Spectra of the Elements' I–II (1913–14)      | the atomic number, Moseley's law and the four missing elements                  |
| `source:einstein-1915-perihel`         | Einstein, 'Erklärung der Perihelbewegung des Merkur' (18 Nov 1915)        | Mercury's perihelion and the doubled deflection                                 |
| `source:einstein-1915-feldgleichungen` | Einstein, 'Die Feldgleichungen der Gravitation' (25 Nov 1915)             | the field equations, and the date they were read                                |
| `source:corry-renn-stachel-1997`       | Corry, Renn & Stachel, _Science_ 278 (1997)                               | the Hilbert priority argument — one side, contested since                       |
| `source:schwarzschild-1916`            | Schwarzschild, 'Über das Gravitationsfeld eines Massenpunktes' (1916)     | the first exact solution; the presentation date in the header                   |
| `source:cpae-8`                        | _Collected Papers of Albert Einstein_, vol. 8 (1998)                      | the wartime correspondence; Schwarzschild's letter of 22 Dec 1915 (doc. 169)    |
| `source:schwarzschild-werke-1992`      | Schwarzschild, _Gesammelte Werke_, ed. Voigt, vol. 1 (1992)               | the biographical essay: the fronts, the pemphigus, the death on 11 May 1916     |
| `source:noether-1918`                  | Noether, 'Invariante Variationsprobleme', _Nachr. Göttingen_ (1918)       | the two theorems, and Klein's presentation of 26 July 1918                      |
| `source:kosmann-schwarzbach-2011`      | Kosmann-Schwarzbach, _The Noether Theorems_ (2011)                        | the theorems in context; the energy problem in general relativity               |
| `source:dick-1981`                     | Dick, _Emmy Noether 1882–1935_ (1981)                                     | the refused habilitation, the courses under Hilbert's name, 1919 and 1923       |
| `source:rutherford-1919`               | Rutherford, 'Collision of α Particles with Light Atoms' I–IV (1919)       | what Rutherford observed and concluded in 1919                                  |
| `source:blackett-1925`                 | Blackett, _Proc. R. Soc. A_ 107 (1925)                                    | the cloud-chamber photographs; the reaction as now written                      |
| `source:eve-1939`                      | Eve, _Rutherford_ (1939)                                                  | the anecdotes, cited as anecdotes — Eve rarely dates or stages them             |
| `source:wilson-1983`                   | Wilson, _Rutherford: Simple Genius_ (1983)                                | the Board of Invention and Research; the move to the Cavendish in 1919          |
| `source:pais-1991`                     | Pais, _Niels Bohr's Times_ (1991)                                         | Bohr's Manchester year and the reception of the 1913 trilogy                    |
| `source:dyson-eddington-davidson-1920` | Dyson, Eddington & Davidson, _Phil. Trans. A_ 220 (1920)                  | the eclipse report: three plate sets, the numbers, the stated rejection         |
| `source:earman-glymour-1980`           | Earman & Glymour, _HSPS_ 11:1 (1980)                                      | the case that the 1919 announcement outran its data — one side                  |
| `source:kennefick-2019`                | Kennefick, _No Shadow of a Doubt_ (2019)                                  | the reply: Dyson's instrumental grounds — the other side                        |
| `source:gilmore-tausch-pebody-2022`    | Gilmore & Tausch-Pebody, _Notes and Records_ 76:1 (2022)                  | the most recent re-examination of the reductions and their critics              |
| `source:mhs-oxford-moseley`            | Museum of the History of Science, Oxford, "'Dear Harry…'"                 | Moseley's death: the brigade, Chunuk Bair, the Helles Memorial, the nominations |

## Core bibliography — the Western Front 1915–1918 (in the registry)

Added with the front-line evolution layer (`sand-g80.1`), which is the first
content to reach past November 1914. Every one of them is cited **without page
numbers**: they were used for what happened and where the line ran, at the
resolution each work gives, and `docs/sources.md` §3 forbids writing a page
nobody read.

| id                         | Work                                                   | Use it for                                                         |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| `source:stevenson-2004`    | Stevenson, _1914–1918_ (2004)                          | the war as a whole; the shape of the front year by year; 1918      |
| `source:foley-2005`        | Foley, _German Strategy and the Path to Verdun_ (2005) | Verdun 1916 and Falkenhayn; the corrective to "bleed France white" |
| `source:prior-wilson-2005` | Prior & Wilson, _The Somme_ (2005)                     | the Somme attack by attack — severe on Haig, and one side          |
| `source:prior-wilson-1996` | Prior & Wilson, _Passchendaele_ (1996)                 | Messines and Third Ypres — one side                                |
| `source:harris-1995`       | Harris, _Men, Ideas and Tanks_ (1995)                  | the tank: Flers-Courcelette, Cambrai, what the machines could do   |
| `source:hammond-2008`      | Hammond, _Cambrai 1917_ (2008)                         | Cambrai from the war diaries; the counter-attack of 30 November    |
| `source:zabecki-2006`      | Zabecki, _The German 1918 Offensives_ (2006)           | Michael, Georgette and Blücher as operations                       |
| `source:sheffield-2001`    | Sheffield, _Forgotten Victory_ (2001)                  | the Hundred Days and the "learning curve" case — one side          |

### The British Official History, 1916–1918 (`sand-23b.36`)

The ten volumes of _Military Operations: France and Belgium_ that carry the
years after 1915, added together so that the front-line layer and the tech
rail can stand on rung 1 instead of on the studies above and on two
participants — `source:fuller-1920`, written by the Tank Corps' own senior
staff officer while he argued for an armoured army, and
`source:haig-despatches-1919`, a commander's despatches. The 1914 volumes have
been in the registry since Phase 1 (`source:edmonds-1922`, `edmonds-1925`,
`edmonds-1933`); these are the rest of the series for the same front.

Two things to know before citing any of them. **Nothing in the packs cites them
yet** — they are in the registry ahead of the content that will use them, which
is why the validator warns about each, and no page may be written from one
until it has been read (§3). And **every one is a different physical book with
its own pagination**, including the separately published appendix volumes for
1916 and 1917, which are not in this registry; ids are `surname-year` as
elsewhere, with Volume V of 1918 carrying both compilers because Volume IV of
the same year is Edmonds alone.

| id                                   | Volume                                        | Covers                                                           |
| ------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------- |
| `source:edmonds-1932`                | 1916, I (Edmonds, Macmillan 1932)             | Haig's command from 19 Dec 1915; the plan; 1 July 1916           |
| `source:miles-1938`                  | 1916, II (Miles, Macmillan 1938)              | 2 July – 18 Nov 1916; **Flers-Courcelette, 15 September**        |
| `source:falls-1940`                  | 1917, I (Falls, Macmillan 1940)               | the retreat to the Hindenburg Line; Arras and Vimy               |
| `source:edmonds-1948`                | 1917, II (Edmonds, HMSO 1948)                 | Messines and Third Ypres — **no open scan found; no url**        |
| `source:miles-1948`                  | 1917, III (Miles, HMSO 1948)                  | Cambrai, 20 Nov – 7 Dec 1917, and the counter-attack of the 30th |
| `source:edmonds-1935`                | 1918, I (Edmonds, Macmillan 1935)             | the winter, the front taken over from the French, Michael        |
| `source:edmonds-1937`                | 1918, II (Edmonds, Macmillan 1937)            | March–April 1918: the end of Michael, and Georgette              |
| `source:edmonds-1939`                | 1918, III (Edmonds, Macmillan 1939)           | May–July 1918: Blücher, the Matz, the Marne, 18 July             |
| `source:edmonds-1947`                | 1918, IV (Edmonds, HMSO 1947)                 | **Amiens, 8 August** to 26 September                             |
| `source:edmonds-maxwell-hyslop-1947` | 1918, V (Edmonds & Maxwell-Hyslop, HMSO 1947) | 26 September – 11 November: the Hindenburg Line to the armistice |

## Core bibliography — the Pacific War, 1931–1945 (in the registry)

Forty-seven works added by `sand-lry.14`, before any Pacific pack cites
anything, exactly as the 1914 bibliography landed before the 1914 pack. The
arc they serve is [ADR 0019](decisions/0019-second-world-war-arc.md): ten packs
from Mukden on 18 September 1931 to Okinawa in 1945, authored before Europe.

Two things shaped the list, and both are worth stating before the tables.

**Nothing in any pack cites any of them yet.** The validator warns once per
uncited source, so this addition raises the warning count by forty-seven and
that is the expected state of a registry that lands ahead of its content —
`sand-23b.36` did the same thing with ten volumes of the British official
history. No page number may be written from any of these works until somebody
has read the page (§3). Where a page is quoted below it was read in the scan
named in the entry; where none is quoted, none has been.

**A Pacific arc sourced only from Morison and Toll is an American arc.** That
is the substantive risk in this bead and it is why a quarter of the list is
Japanese-side material, why the Green Books' Papua volume is here beside
Guadalcanal, and why the Marine Corps histories are here beside the Army's for
the same islands. Where the only access to a Japanese source is an
English-language author quoting it, the rule is the one already in §7 for
documents: **cite the chain, not the original**. `source:parshall-tully-2005`
is the case where the chain is worth following, because they worked from the
Japanese records and say which.

### What could not be verified, and what follows from it

Rule 3 says a page number is a promise that somebody checked. The same applies
to a link, a year and an ISBN, so this is what was and was not checked.

- **Twenty-three of the forty-seven carry a url, and every one was opened and
  returned the work it claims to.** The other twenty-four carry none: the nine
  Morison volumes for the reason below, and fifteen modern monographs still in
  copyright, for which no honest link exists.
- **Twenty-nine of the forty-seven were checked against the work itself** — a
  title page, a copyright page, or the printed text — and the other eighteen
  against catalogue or publisher records only, which each entry says. That
  precaution is not theoretical: `source:morison-vol-5` is dated 1948 here
  because its copyright page says "Published September 1948" while every
  catalogue consulted says 1949, and the conflict is written into the entry
  rather than resolved by picking the tidier answer.
- **`history.army.mil`, `usmcu.edu` and `marines.mil` refuse this repository's requests**
  with HTTP 403, the way Gallica does for `source:afgg-1-2-annexes-1`. The
  Green Books and the Marine Corps volumes are therefore linked to the HyperWar
  hypertext at ibiblio.org, which is a **transcription and not a page scan**:
  it marks the printed page numbers, and a page taken from it is checked
  against the book before it is written.
- **Morison is in copyright and in print**, and the Internet Archive's own
  scans of the series are lending copies. Open user uploads of the Little,
  Brown printings exist and were read to verify these nine entries; they are
  not linked, because their standing is not clear. Reading a copy to check a
  date is not the same act as putting it in a reader-facing bibliography.
- **No ISBN is recorded for any of the modern monographs.** Publisher pages
  refuse this environment and the numbers in the aggregators could not be
  checked against an item, so under the bead's rule the field is omitted and
  the entry says so. The 1914 entries that carry ISBNs keep them.
- **One year is not from the item**: `source:crowl-1960`, where the facsimile's
  "First Printed" line is illegible in the scan. It is taken from the Library of
  Congress card number printed beside it and from the CMH catalogue, and the
  entry says which.

### Morison — the American naval record, and how much weight it takes

Nine of the fifteen volumes of _History of United States Naval Operations in
World War II_ are Pacific; volumes I–II and IX–XI are the Atlantic, the
Mediterranean and north-west Europe and are not in this registry, and volume XV
is the index. Morison wrote as a serving officer with a commission from
Roosevelt and access no outside historian had, was at sea for much of what he
describes, and produced coverage nothing since has matched.

The same closeness is the limit. He wrote about men he knew, often while they
were alive, and his judgements have aged less well than his narrative: later
work corrects him on Savo Island, where his distribution of the blame is now a
minority position, and takes apart his Midway, which rests on
`source:fuchida-okumiya-1955` for everything happening aboard the Japanese
carriers. Cite him for what American ships did and when; put a later work
beside him for why. Each entry below carries that caveat; the full note is on
volume III.

| id                      | Volume                                                         | Covers                                                             |
| ----------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `source:morison-vol-3`  | III, _The Rising Sun in the Pacific, 1931 – April 1942_ (1948) | Mukden to Java Sea; Pearl Harbor; the series note lives here       |
| `source:morison-vol-4`  | IV, _Coral Sea, Midway and Submarine Actions_ (1949)           | Coral Sea, Midway — the volume Shattered Sword was written against |
| `source:morison-vol-5`  | V, _The Struggle for Guadalcanal_ (**1948**, see the entry)    | the seven naval actions; Savo Island, argued with since            |
| `source:morison-vol-6`  | VI, _Breaking the Bismarcks Barrier_ (1950)                    | central Solomons, New Guinea coast, Rabaul bypassed                |
| `source:morison-vol-7`  | VII, _Aleutians, Gilberts and Marshalls_ (1951)                | Attu and Kiska; Tarawa and Makin; Kwajalein and Eniwetok           |
| `source:morison-vol-8`  | VIII, _New Guinea and the Marianas_ (1953)                     | Hollandia, the Marianas, the Philippine Sea; Spruance, contested   |
| `source:morison-vol-12` | XII, _Leyte, June 1944 – January 1945_ (1958)                  | Leyte Gulf, all four engagements; Halsey's run north, contested    |
| `source:morison-vol-13` | XIII, _The Liberation of the Philippines_ (1959)               | Lingayen and after; the first sustained kamikaze attacks           |
| `source:morison-vol-14` | XIV, _Victory in the Pacific, 1945_ (1960)                     | Iwo Jima, Okinawa, the radar pickets, the surrender                |

### The Green Books — the US Army's _War in the Pacific_

Eleven volumes of _United States Army in World War II_. They are US government
works, in the public domain, and — unlike Morison — freely readable in full.

| id                       | Volume                                                | Covers                                                       |
| ------------------------ | ----------------------------------------------------- | ------------------------------------------------------------ |
| `source:morton-1962`     | Morton, _Strategy and Command: The First Two Years_   | ORANGE and RAINBOW 5; Japanese policy from 1931; the theatre |
| `source:morton-1953`     | Morton, _The Fall of the Philippines_                 | Clark Field to Corregidor; unusually frank on failure        |
| `source:miller-1949`     | Miller, _Guadalcanal: The First Offensive_            | the Army's Guadalcanal, beside the Marine Corps' own         |
| `source:milner-1957`     | Milner, _Victory in Papua_                            | Milne Bay, Buna, Gona — the other first offensive            |
| `source:miller-1959`     | Miller, _CARTWHEEL: The Reduction of Rabaul_          | New Georgia to Cape Gloucester; the airfield argument        |
| `source:crowl-love-1955` | Crowl & Love, _Seizure of the Gilberts and Marshalls_ | Makin, Tarawa, Kwajalein, Eniwetok; the amphibious lessons   |
| `source:crowl-1960`      | Crowl, _Campaign in the Marianas_                     | Saipan, Tinian, Guam; the Smith-versus-Smith quarrel         |
| `source:smith-1953`      | Smith, _The Approach to the Philippines_              | Hollandia, Biak, Morotai — the leaps along New Guinea        |
| `source:cannon-1954`     | Cannon, _Leyte: The Return to the Philippines_        | the ground campaign, which outlasted the naval battle        |
| `source:smith-1963`      | Smith, _Triumph in the Philippines_                   | Luzon; the destruction of Manila, February 1945              |
| `source:appleman-1948`   | Appleman, Burns, Gugeler & Stevens, _Okinawa_         | ICEBERG entire; unusually full on the Thirty-Second Army     |

### The Marine Corps' five volumes

_History of U.S. Marine Corps Operations in World War II_, from the Historical
Branch, G-3 Division, HQ USMC. Registered beside the Green Books rather than
instead of them: each service wrote the campaign it fought, and on Guadalcanal,
Tarawa and Okinawa the two accounts are cited together.

| id                                 | Volume                                  | Covers                                                            |
| ---------------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| `source:hough-ludwig-shaw-1958`    | I, _Pearl Harbor to Guadalcanal_ (1958) | interwar amphibious doctrine and landing craft; Wake; Guadalcanal |
| `source:shaw-kane-1963`            | II, _Isolation of Rabaul_ (1963)        | New Georgia, Bougainville, New Britain                            |
| `source:shaw-nalty-turnbladh-1966` | III, _Central Pacific Drive_ (1966)     | Betio hour by hour; the Marshalls; Saipan, Tinian, Guam           |
| `source:garand-strobridge-1971`    | IV, _Western Pacific Operations_ (1971) | Peleliu and the Umurbrogol; Iwo Jima                              |
| `source:frank-shaw-1968`           | V, _Victory and Occupation_ (1968)      | Okinawa from the Marine side; the occupation                      |

### The Japanese side, and what is not reachable

This section is the Pacific's equivalent of what this page already says about
the Reichsarchiv, and the situation is worse. Japan's official history, the
_Senshi Sōsho_, runs to 102 volumes and is **essentially unavailable in
English**: three volumes have been translated, none of them covering Midway,
Guadalcanal as a campaign, the Marianas, Leyte, Iwo Jima or Okinawa.
Digitisation at NIDS is partial and the images are Japanese only. The series
was compiled by the War History Office from the records of an army and navy
that burned their classified files before the surrender, it does not discuss
the use of chemical and biological weapons in China, and its casualty figures
differ from those of Japan's own Ministry of Health and Welfare.

What _is_ reachable is a second-best that should be named as such: two
American-directed compilations written after the surrender by the Japanese
officers who had fought the campaigns, working largely from memory because the
records were gone. Both say so themselves, and both statements are quoted in
their entries — the Japanese Monographs' introduction admits that orders and
plans "have been reconstructed from memory and therefore are not textually
identical with the originals", and the Department of the Army, publishing the
_Reports of General MacArthur_, "must therefore disclaim any responsibility for
their accuracy". Cite them the way a memoir is cited: for what a commander said
he intended, never for the wording of an order.

| id                             | Work                                                                       | Use it for                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `source:senshi-sosho`          | _Senshi Sōsho_, 102 vols (1966–1980)                                       | the honest statement of what stands behind a Japanese claim — and the chain rule |
| `source:bullard-2007`          | Bullard (tr.), _Japanese Army Operations in the South Pacific Area_ (2007) | Papua, Kokoda, Milne Bay, New Britain from the Japanese side                     |
| `source:remmelink-2021`        | Remmelink (ed.), _The Invasion of the South_ (2021)                        | the only openly readable volume of the Senshi Sōsho in English                   |
| `source:japanese-monographs`   | _Japanese Monographs_, c. 187 studies (1946–1960)                          | operations records in English; Mono 93 Midway, Mono 135 Okinawa                  |
| `source:macarthur-reports-2-1` | _Reports of General MacArthur_, II/1 (1950; facsimile 1994)                | Japanese operations in the SWPA; read with its own disclaimer                    |
| `source:macarthur-reports-2-2` | _Reports of General MacArthur_, II/2 (1950; facsimile 1994)                | the later campaigns; the Japanese navy order of battle and losses                |
| `source:lytton-report-1932`    | League of Nations, _Report of the Commission of Enquiry_ (1932)            | Mukden as the League found it — quoted as a Document, not paraphrased            |

### Studies, memoirs and surveys

| id                            | Work                                                | Use it for                                                            |
| ----------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| `source:parshall-tully-2005`  | Parshall & Tully, _Shattered Sword_ (2005)          | Midway from the Japanese records; the model for citing the chain      |
| `source:frank-1990`           | Frank, _Guadalcanal_ (1990)                         | the campaign as one problem; the corrective on Savo Island            |
| `source:toll-2011`            | Toll, _Pacific Crucible_ (2011)                     | Pearl Harbor to Midway; the connective narrative, not the numbers     |
| `source:toll-2015`            | Toll, _The Conquering Tide_ (2015)                  | Guadalcanal to the Philippine Sea — the middle six packs              |
| `source:toll-2020`            | Toll, _Twilight of the Gods_ (2020)                 | Leyte to the surrender; the 1945 decisions as historiography          |
| `source:spector-1985`         | Spector, _Eagle Against the Sun_ (1985)             | the scholarly one-volume frame: strategy, intelligence, logistics     |
| `source:dower-1986`           | Dower, _War Without Mercy_ (1986)                   | the race question, on both sides; why prisoners were rarely taken     |
| `source:ienaga-1978`          | Ienaga, _The Pacific War_ (1978)                    | a Japanese historian's argument, and the 1931 periodisation           |
| `source:evans-peattie-1997`   | Evans & Peattie, _Kaigun_ (1997)                    | IJN doctrine, night fighting, the long lance — why, not what          |
| `source:peattie-2001`         | Peattie, _Sunburst_ (2001)                          | Japanese naval air power, and the aircrew that were never replaced    |
| `source:drea-2009`            | Drea, _Japan's Imperial Army_ (2009)                | an army that could act against its own government — Mukden            |
| `source:hotta-2013`           | Hotta, _Japan 1941_ (2013)                          | the decision for war, from the liaison conferences                    |
| `source:cook-cook-1992`       | Cook & Cook, _Japan at War: An Oral History_ (1992) | Japanese voices for sourced vignettes — testimony, not fact           |
| `source:fuchida-okumiya-1955` | Fuchida & Okumiya, _Midway_ (1955)                  | the received account and where it came from — cited against, not from |
| `source:hastings-2008`        | Hastings, _Retribution_ (2008; UK _Nemesis_, 2007)  | 1944–45 at human scale; colour, not numbers (rule 9)                  |

## Core bibliography — Russia 1917 (in the registry)

Added with the first Russian pack (`sand-ekc.7`), and the honest summary is
this: **of the eleven secondary works below, none could be opened at page level
from this project's environment.** Every copy on the Internet Archive is
borrow-only. They are therefore cited without pages, for what each work is
about and for the position it holds, and nothing in the pack is put inside
quotation marks from any of them. §3's rule — never write a page you did not
read — is why the citations look thinner here than in the 1914 pack, and the
thinness is the truthful thing rather than a defect to be papered over.

The four sources that **can** be read in full are marked. They are what the
pack quotes: the two open-access or open-transcription scholarly items, and the
document editions.

| id                                     | Work                                                                  | Use it for                                                       |
| -------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `source:figes-1996`                    | Figes, _A People's Tragedy_ (1996)                                    | the narrative backbone, 1891–1924; the revolution from below     |
| `source:smith-2017`                    | Smith, _Russia in Revolution_ (2017)                                  | the empire-wide social and economic frame, 1890–1928             |
| `source:fitzpatrick-2017`              | Fitzpatrick, _The Russian Revolution_ (4th ed. 2017)                  | the long-frame revisionist reading — 1917 as an opening          |
| `source:rabinowitch-1976`              | Rabinowitch, _The Bolsheviks Come to Power_ (1976)                    | Petrograd July–October; the party as it actually was             |
| `source:hasegawa-1981`                 | Hasegawa, _The February Revolution_ (1981)                            | the nine days of February; the insurrection from below           |
| `source:pipes-1990`                    | Pipes, _The Russian Revolution_ (1990)                                | the coup thesis — cited as a position, not as a neutral account  |
| `source:wade-2017`                     | Wade, _The Russian Revolution, 1917_ (3rd ed. 2017)                   | the sequence of political events; uncontested matters of record  |
| `source:merridale-2016`                | Merridale, _Lenin on the Train_ (2016)                                | the April journey stage by stage; this pack's rail pace band     |
| `source:katkov-1980`                   | Katkov, _Russia 1917: The Kornilov Affair_ (1980)                     | one reading of late August — partisan, and cited as such         |
| `source:trotsky-1932`                  | Trotsky, _History of the Russian Revolution_ — **full text**          | a participant's argument about February and October              |
| `source:stone-1975`                    | Stone, _The Eastern Front 1914–1917_ (already in the registry)        | the war economy: distribution and inflation, not shortage        |
| `source:lyandres-1995`                 | Lyandres, _The Bolsheviks' "German Gold" Revisited_ — **open access** | the July 1917 accusations, document by document                  |
| `source:zeman-1958`                    | Zeman (ed.), _Germany and the Revolution in Russia_ — **scan**        | what Berlin said it was doing, in its own files                  |
| `source:lenin-cw`                      | Lenin, _Collected Works_ (Progress) — **full text**                   | the April Theses; the MRC proclamation; the letter of 24 October |
| `source:bsb-1000dokumente-russia-1917` | BSB, _100(0) Schlüsseldokumente_ — **full text, with archive refs**   | the Russian texts of the abdication act and the proclamation     |
| `source:wikisource-ru`                 | Russian Wikisource — a volunteer transcription library                | Russian text only where a second transcription confirms it       |
| `source:nicholas-diary-1917`           | Nicholas II, diary for 1917 (militera.lib.ru transcription)           | what the Emperor wrote on 2 March (O.S.)                         |

Two conventions specific to this pack, both recorded in
[`content/eras/1917-russian-revolution/README.md`](../content/eras/1917-russian-revolution/README.md).
Where no scholarly English translation of a Russian document could be found,
the pack translates it itself and **says so in the document**. And where a
transcription site is the only witness to a Russian text, the wording was
confirmed against a second, independent transcription before being quoted, or
it was not quoted.

## Core bibliography — the Russian Civil War, 1918–1922 (in the registry)

Added with the second Russian pack (`sand-ekc.8`). The constraint is the 1917
pack's, with one large exception and four small ones, and the shape of the
bibliography follows directly from that.

**The exception is Chamberlin.** _The Russian Revolution, 1917–1921_, volume II
(Macmillan, **London**, 1935) is out of copyright, downloadable from the
Internet Archive, and was read end to end — narrative, appendix of translated
documents (pp. 465–507) and chronological table (pp. 525–534). It is the only
full account of this war the project has been able to read at page level, and
almost every date in the pack comes from it. Two warnings travel with it. It is
a **pre-archival** work: a Moscow correspondent writing in 1935 from the Soviet
published record of the 1920s, from émigré memoirs and from his own reporting,
so where it gives a number for the terror it is repeating a published claim
rather than counting. And **its pagination is not the New York edition's** — the
Seventeen Moments transcription of the Red Terror resolution cites Chamberlin
vol. II, pp. 475–476, and those pages hold something else in the London copy,
which is why the pack's document for that decree carries no page at all (§3).

The four small exceptions are open-access short-form scholarship, all post-1991
and archive-informed, all read in full and quoted in their authors' own words:
Holquist, Werth, Sumpf and Mawdsley. They are why the historiography cards for
this pack can quote three or four positions each where the 1917 cards could
quote one.

**Every modern monograph on this war is still borrow-only from here** —
Mawdsley's own book, Kenez, Smele, Leggett, Ryan, Buldakov, the Black Book,
Pipes's second volume — and the cost of that is stated on the cards and in
[`historiography-1918.md`](historiography-1918.md) rather than hidden.

| id                                                            | Work                                                                               | Use it for                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `source:chamberlin-1935-2`                                    | Chamberlin, _The Russian Revolution 1917–1921_, II (London, 1935) — **full text**  | the narrative backbone; the chronological table; the appendix of documents |
| `source:holquist-2003`                                        | Holquist, "Violent Russia, Deadly Marxism?", _Kritika_ 4:3 — **open access**       | the two schools on revolutionary violence, and his own third answer        |
| `source:werth-2008`                                           | Werth, "Crimes and Mass Violence of the Russian Civil Wars" — **open access**      | the periodised figures that can be given; the pogroms; the Tambov camps    |
| `source:sumpf-2014`                                           | Sumpf, "Russian Civil War", 1914-1918-online — **open access**                     | a compact post-archival statement of what the Whites lacked                |
| `source:mawdsley-2014`                                        | Mawdsley, "International Responses to the Russian Civil War" — **open access**     | the scale and limits of the intervention, by its standard historian        |
| `source:fisher-1927`                                          | Fisher, _The Famine in Soviet Russia, 1919–1923_ (1927) — **full text**            | the relief operation and its figures; the ARA's own institutional history  |
| `source:whitewood-2015`                                       | Whitewood, "Subversion in the Red Army and the Military Purge" — **abstract only** | the 1937 purge's inheritance — cited from the abstract and nowhere else    |
| `source:glantz-2001`                                          | Glantz, _The Soviet-German War 1941–1945_ (Clemson, 2001) — **full text**          | 22 June 1941, so the causal chain ends somewhere real                      |
| `source:trotsky-military-1`                                   | Trotsky, _How the Revolution Armed_, I — **full text**                             | the building of the Red Army in his own orders and speeches                |
| `source:trotsky-1930`                                         | Trotsky, _My Life_ — **full text**                                                 | ch. 34, "The Train": the only first-person account of the object           |
| `source:avalon-brest-litovsk-1918`                            | The Brest-Litovsk treaty (FRUS 1918, via Avalon) — **full text**                   | the treaty's own articles; the US State Department's English               |
| `source:soviethistory-msu`                                    | von Geldern & Siegelbaum, _Seventeen Moments in Soviet History_                    | the Red Terror resolution in Chamberlin's translation                      |
| `source:avrich-1973`                                          | Avrich (ed.), _The Anarchists in the Russian Revolution_ (1973)                    | the Petropavlovsk resolution — read in the MIA reproduction, no pages      |
| `source:dekrety-1`                                            | _Декреты Советской власти_, I (1957), via MSU — **full text, paginated**           | the calendar decree of 24 January (6 February) 1918                        |
| `source:figes-1996`, `source:smith-2017`, `source:pipes-1990` | already in the registry from 1917                                                  | cited without pages, for what each work argues                             |

Three conventions specific to this pack, all recorded in
[`content/eras/1918-russian-civil-war/README.md`](../content/eras/1918-russian-civil-war/README.md).
**Dual dating stops on 14 February 1918**, the day Russia's calendars merged;
before it, dates are Old Style then New Style as in 1917, and after it they are
written plainly. **Where a total exists only in works that could not be opened —
the terror, the famine death toll — the pack prints nothing and says why.** And
**every route is `confidence: "low"` and is an axis rather than a position**,
because this war has no front for a route to be measured against.

One trap worth recording for the next author, because it is exactly the kind of
thing a catalogue record produces: **Denikin's _The Russian Turmoil_
(Hutchinson, 1922) is public domain, fully readable, and covers nothing in this
pack.** It is a slightly abridged translation of volume 1 of _Ocherki russkoi
smuty_ and its narrative ends with his arrest in August 1917. It is not in the
registry.

## To add as the content lands (not yet in the registry)

An authoring backlog. It is deliberately not shown to readers — see "What a
reader sees" above.

- Reichsarchiv, _Der Weltkrieg_, Bd. 4 — the battle of the Marne itself and
  the retreat, 5–14 September. Bd. 1 and Bd. 3 are in the registry and
  digitised; **Bd. 4 is not**, and its absence is why Moltke's tour of the
  front on 11 September is not on the map as a journey and why the German
  army headquarters tracks thin out after 4 September (`sand-23b.9`).
- AFGG Tome I, 2e and 3e volumes and their annex volumes (the orders of
  25 August, 4 and 6 September as documents). The annex volume already in the
  registry is on Gallica, and **Gallica cannot be read from CI or from an
  agent's network** — it answers with a security check. The French army
  headquarters day by day (Dubail, Castelnau, Ruffey/Sarrail, Langle,
  Maunoury, Foch) are waiting on a copy that can actually be opened; until
  then they are not on the map (`sand-23b.9`).
- The Belgian official narrative is no longer on this list — it is in the
  registry as `source:belgian-army-report-1915` (`sand-23b.22`). What is still
  outstanding is the re-citation it was wanted for: several events and
  twenty-one route citations still point at `source:edmonds-1925` for the
  withdrawal into Antwerp of 18–20 August and the sorties of 25–26 August and
  9–13 September, and that volume's narrative begins on **19 September**, so
  they keep no pages (`sand-23b.6.2`). Re-pointing them, page by page, is its
  own pass; read the report with Van Pul beside it.
- The two 1915 volumes of _Military Operations: France and Belgium_ — the one
  gap left in the British official history of this front now that 1914 and
  1916–18 are all in the registry. Both are digitised (archive.org,
  `in.ernet.dli.2015.210675` and `in.ernet.dli.2015.210676`); they were left
  out only because `sand-23b.36` named 1916, 1917 and 1918, and the front-line
  layer takes 1915 from `source:stevenson-2004` meanwhile.
- The later rounds of the Zuber exchange in _War in History_ (2002–2014),
  beyond Holmes's opening reply, which is now in the registry.
- Terraine, _Mons: The Retreat to Victory_ (1960) and the Bavarian and French
  regimental histories — the battle zoom-ins.
- Senior, _Home Before the Leaves Fall_ (2012) — the 1914 campaign narrative.
- Donnell, _The Forts of the Meuse in World War I_ (Osprey Fortress 60, 2007)
  and Zuber, _Ten Days in August: The Siege of Liège 1914_ (2014) — the
  fort-by-fort record of the Liège siege, worked from the Belgian fort
  archives and the German regimental histories. Wanted for the clock times of
  the twelve surrenders, which Reichsarchiv Bd. 1 gives only to the part of
  the day; add them when a copy is in hand and the pages can be given.
- Jones, _World War I Gas Warfare Tactics and Equipment_ (Osprey Elite 150, 2007) and Palazzo, _Seeking Victory on the Western Front_ (1999) — the
  equipment and the British chemical-warfare organisation, wanted for the
  respirator sequence and the Livens projector when copies are in hand. The
  gas card uses Heller (1984) for both, which covers them but from the
  American side.
- Mitchell & Smith, _Medical Services: Casualties and Medical Statistics of
  the Great War_ (HMSO, 1931) — the British official medical history, and the
  only way to replace the secondary gas casualty figures with returns.
- AFGG Tome I, 4e volume and Reichsarchiv Bd. 5–6 — the French and German
  official accounts of the race to the sea, the Yser and First Ypres, to
  replace the British official history as the backbone of the epilogue
  (`sand-1l0.12` cites Edmonds II for all three fronts).
- Primary still to add: Hentsch's 1917 report (Reichsarchiv Bd. 4;
  Müller-Loebnitz, _Die Sendung des Oberstleutnants Hentsch_, 1922); Bülow's
  _Mein Bericht zur Marneschlacht_ (1919); the German texts of the OHL
  directives of 27 August and 4 September (Reichsarchiv Bd. 3–4, to replace
  the English of Kluck's translation in the Document cards).

For the Pacific arc (`sand-lry`), the same list, kept apart because the packs
that would cite it do not exist yet:

- **The rest of the _Senshi Sōsho_ in English, which is to say almost all of
  it.** The two Corts Foundation volumes not in the registry —
  _The Invasion of the Dutch East Indies_ (2015) and _The Operations of the
  Navy in the Dutch East Indies and the Bay of Bengal_ (2018) — are the only
  further translations that exist, and both are peripheral to these ten packs.
  For Midway, Guadalcanal, the Marianas, Leyte, Iwo Jima and Okinawa there is
  nothing to add: the gap is not a backlog item, it is the state of the field,
  and the packs will have to say so where it bites.
- _Reports of General MacArthur_, Volume I (_The Campaigns of MacArthur in the
  Pacific_) and its supplement — the Allied side of the same set, overlapping
  the Green Books. Volume II, the Japanese side, is what `sand-lry.14` needed.
- Prange, _At Dawn We Slept_ (1981) and _Miracle at Midway_ (1982); Willmott,
  _Empires in the Balance_ (1982) and _The Barrier and the Javelin_ (1983) —
  the previous generation of operational studies, wanted where a pack needs a
  position `source:toll-2011` gives only in outline.
- Goldstein & Dillon (eds), _The Pearl Harbor Papers_ (1993) — Japanese
  planning documents in translation, and the nearest thing to a primary Document
  set for the pack that opens with the attack.
- The United States Strategic Bombing Survey's Pacific reports (1946) — the
  blockade, the bombing and the Japanese economy, for the last pack's argument
  about why the war ended when it did. Contemporary, official, and written by
  an organisation with a case to make about air power.
- Sledge, _With the Old Breed_ (1981) — Peleliu and Okinawa from inside a
  rifle company, and the obvious counterpart on the American side to
  `source:cook-cook-1992`. A memoir, cited as one.
- The China-Burma-India Green Books (Stilwell's three volumes) and Bix,
  _Hirohito and the Making of Modern Japan_ (2000) — outside the ten packs as
  ADR 0019 scopes them, and here so that the omission is deliberate.

Each addition is a registry entry with `notes` on use and bias, added in the
PR that first cites it (see `docs/authoring.md` §1).

## Review

Content PRs are checked against this page by the fact-check workflow
([`docs/fact-check.md`](fact-check.md)); the contested points are listed in
[`docs/historiography-1914.md`](historiography-1914.md); the Phase 1 review
that applied it to the whole 1914 pack is
[`docs/fact-check-1914.md`](fact-check-1914.md). The reviewer checks: every claim cited, pages where contestable, contested points
as historiography, documents quoted not paraphrased, Wikipedia only for dates,
images cited in their manifests.
