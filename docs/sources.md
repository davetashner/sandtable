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
   Official History appendices).
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

| id                                         | Work                                                                          | Use it for                                                                                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source:herwig-2009`                       | Herwig, _The Marne, 1914_ (2009)                                              | the operational narrative, strengths, dates; the backbone                                                                                                                                     |
| `source:strachan-2001`                     | Strachan, _The First World War, I: To Arms_ (2001)                            | plans, mobilization, strategy, the global frame                                                                                                                                               |
| `source:mombauer-2001`                     | Mombauer, _Helmuth von Moltke and the Origins of the First World War_ (2001)  | Moltke, the plan's reality, the reply to Zuber                                                                                                                                                |
| `source:zuber-2002`                        | Zuber, _Inventing the Schlieffen Plan_ (2002)                                 | the revisionist case — cited as one side                                                                                                                                                      |
| `source:tuchman-1962`                      | Tuchman, _The Guns of August_ (1962)                                          | narrative colour; personalities; not numbers                                                                                                                                                  |
| `source:keegan-1998`                       | Keegan, _The First World War_ (1998)                                          | general context                                                                                                                                                                               |
| `source:hastings-2013`                     | Hastings, _Catastrophe_ (2013)                                                | 1914 at human scale; Belgium, Serbia                                                                                                                                                          |
| `source:reichsarchiv-weltkrieg-1`          | Reichsarchiv, _Der Weltkrieg 1914 bis 1918_, Bd. 1 (1925)                     | German orders, positions; the Liège forts fall by fall, pp. 105–120; the deployment areas, pp. 69–70; Anlage 1, the order of battle of 18 August, pp. 664–687                                 |
| `source:reichsarchiv-weltkrieg-3`          | Reichsarchiv, _Der Weltkrieg 1914 bis 1918_, Bd. 3 (1926)                     | Sambre to Marne, 23 Aug – 4 Sep; the German army headquarters day by day                                                                                                                      |
| `source:edmonds-1922`                      | Edmonds, _Military Operations: France and Belgium, 1914_, I (1922)            | first edition; **cite `edmonds-1933` for any page number**                                                                                                                                    |
| `source:edmonds-1933`                      | Edmonds, _Military Operations: France and Belgium, 1914_, I, 3rd edn (1933)   | the edition that is digitised; GHQ's moves and the GHQ orders in the appendices; the German army strengths, p. 45; the Belgian army, p. 19; the orders of battle, Appendices 1–6, pp. 471–495 |
| `source:lanrezac-1920`                     | Lanrezac, _Le plan de campagne français_ (1920)                               | the French Fifth Army's headquarters day by day; self-exculpatory, one side                                                                                                                   |
| `source:afgg-1-1`                          | _Les Armées françaises dans la Grande Guerre_, I/1 (1922)                     | French orders of battle, positions, the orders                                                                                                                                                |
| `source:wikipedia-en`                      | Wikipedia (English)                                                           | uncontested biographical dates only                                                                                                                                                           |
| `source:afgg-1-2-annexes-1`                | AFGG, Tome I, 2e vol., Annexes 1er vol. (1925)                                | the French orders of the retreat; Instruction générale no 2                                                                                                                                   |
| `source:kluck-1920`                        | Kluck, _The March on Paris and the Battle of the Marne, 1914_ (1920)          | OHL directives and wireless as received by First Army; memoir, one side                                                                                                                       |
| `source:gallieni-1920`                     | Gallieni, _Mémoires: Défense de Paris_ (1920)                                 | the Paris orders of 3–9 September; memoir, one side                                                                                                                                           |
| `source:belgian-grey-book-1914`            | Belgian Grey Book (1914; English in _Collected Diplomatic Documents_, 1915)   | the ultimatum and the reply, Nos. 20 and 22                                                                                                                                                   |
| `source:bsb-1000dokumente-schlieffen-1905` | BSB, _Denkschrift 'Krieg gegen Frankreich'_ (transcription, 2010)             | the German text of the 1905 memorandum                                                                                                                                                        |
| `source:ehlert-epkenhans-gross-2006`       | Ehlert, Epkenhans & Groß (eds), _Der Schlieffenplan_ (2006)                   | the edited documents and the post-Zuber essays                                                                                                                                                |
| `source:ritter-1958`                       | Ritter, _The Schlieffen Plan: Critique of a Myth_ (1958)                      | the English memorandum text, pp. 134–148; Ritter's critique                                                                                                                                   |
| `source:clark-2012`                        | Clark, _The Sleepwalkers_ (2012)                                              | the July Crisis; the revisionist case — one side                                                                                                                                              |
| `source:fischer-1967`                      | Fischer, _Germany's Aims in the First World War_ (1967)                       | the case for German responsibility — one side                                                                                                                                                 |
| `source:albertini-1952`                    | Albertini, _The Origins of the War of 1914_ (1952–57)                         | the crisis hour by hour; the standard reconstruction                                                                                                                                          |
| `source:mombauer-2013`                     | Mombauer (ed.), _The Origins of the First World War: Documents_ (2013)        | crisis documents in translation, with commentary                                                                                                                                              |
| `source:hmso-collected-1915`               | _Collected Diplomatic Documents_ (HMSO, 1915)                                 | the colour books in one volume; the notes at pp. 6–8, 32–37, 309–312                                                                                                                          |
| `source:kautsky-1924`                      | Kautsky (ed.), _Outbreak of the World War: German Documents_ (1924)           | the German files; the 'blank cheque' is no. 15                                                                                                                                                |
| `source:byu-wwi-archive`                   | BYU, _The World War I Document Archive_                                       | working transcriptions; cite the printed collection too                                                                                                                                       |
| `source:edmonds-1925`                      | Edmonds, _Military Operations: France and Belgium, 1914_, II (1925)           | Antwerp from 19 Sep, the Yser, First Ypres; the casualty notes, pp. 465–468; the new German reserve corps, pp. 122–123, 168                                                                   |
| `source:van-pul-2006`                      | Van Pul, _In Flanders Flooded Fields_ (2006)                                  | the Yser inundation: the locks, the nights, who opened them                                                                                                                                   |
| `source:unruh-1986`                        | Unruh, _Langemarck: Legende und Wirklichkeit_ (1986)                          | the reality behind the Kindermord legend                                                                                                                                                      |
| `source:1914-1918-online-langemarck`       | Grawe, 'Langemarck Myth', _1914-1918-online_                                  | the OHL communiqué of 11 November 1914 and the myth's construction                                                                                                                            |
| `source:1914-1918-online-ypres`            | Jones, 'Ypres, Battles of', _1914-1918-online_                                | First Ypres: dates, armies, the round casualty totals                                                                                                                                         |
| id                                         | Work                                                                          | Use it for                                                                                                                                                                                    |
| `source:showalter-2004`                    | Showalter, _Tannenberg: Clash of Empires, 1914_ (2004)                        | East Prussia 1914: Gumbinnen, Tannenberg, the corps from the West                                                                                                                             |
| `source:stone-1975`                        | Stone, _The Eastern Front 1914-1917_ (1975)                                   | the Eastern Front's shape; sceptical of the Tannenberg legend                                                                                                                                 |
| `source:doughty-2005`                      | Doughty, _Pyrrhic Victory_ (2005)                                             | French strategy and operations; Plan XVII, the Ardennes, Joffre's purges                                                                                                                      |
| `source:greenhalgh-2014`                   | Greenhalgh, _The French Army and the First World War_ (2014)                  | French doctrine and losses; the Colonial Corps at Rossignol, p. 41                                                                                                                            |
| `source:zuber-2007`                        | Zuber, _The Battle of the Frontiers: Ardennes 1914_ (2007)                    | the Ardennes encounter battles from the German regimental histories                                                                                                                           |
| `source:foley-2003`                        | Foley (ed.), _Alfred von Schlieffen's Military Writings_ (2003)               | what Schlieffen actually wrote; the reply to Zuber                                                                                                                                            |
| `source:holmes-2001`                       | Holmes, "The Reluctant March on Paris", _War in History_ 8:2 (2001)           | the Zuber exchange — cited as the other side                                                                                                                                                  |
| `source:sumpf-2009`                        | Sumpf, 'Les taxis de la Marne', _L'Histoire par l'image_ (2009)               | the low end of the taxi arithmetic: 630 cabs, 3,000-odd men, not decisive                                                                                                                     |
| `source:bruce-2008`                        | Bruce, _Pétain: Verdun to Vichy_ (2008)                                       | Pétain's motor supply at Verdun 1916; the Bar-le-Duc road's organisation                                                                                                                      |
| `source:memorial-verdun-bataille`          | Mémorial de Verdun, 'La bataille de Verdun'                                   | the Voie Sacrée's peak traffic figures — commemorative round numbers                                                                                                                          |
| `source:haber-1986`                        | Haber, L. F., _The Poisonous Cloud_ (1986)                                    | chemical warfare: the standard account, the casualty table, the verdict                                                                                                                       |
| `source:1914-1918-online-gas-warfare`      | Faith, 'Gas Warfare', _1914-1918-online_                                      | the sequence of first uses; the four-nation casualty table and its caveat                                                                                                                     |
| `source:heller-1984`                       | Heller, _Chemical Warfare in World War I_ (Leavenworth Papers 10, 1984)       | 22 April 1915: the release, the two French divisions, the four-mile gap                                                                                                                       |
| `source:fitzgerald-2008`                   | Fitzgerald, 'Chemical Warfare and Medical Response', _AJPH_ 98:4 (2008)       | the high end of the gas casualty range, and the deaths inside it                                                                                                                              |
| `source:1914-1918-online-blockade`         | Kramer, 'Naval Blockade (of Germany)', _1914-1918-online_                     | the nitrogen figures: BASF's output, 90% of explosives nitrogen by 1915                                                                                                                       |
| `source:friedrich-hoffmann-2016`           | Friedrich & Hoffmann, 'Clara Haber, née Immerwahr', _ZAAC_ 642 (2016)         | Clara Immerwahr's doctorate; the historiography of her death                                                                                                                                  |
| `source:erisman-2008`                      | Erisman et al., 'How a century of ammonia synthesis changed the world' (2008) | the 1908 patent; the dependence of the modern world on fixed nitrogen                                                                                                                         |
| `source:nobel-chemistry-1918`              | NobelPrize.org, 'The Nobel Prize in Chemistry 1918'                           | the prize, its wording and its date — reference data only                                                                                                                                     |
| `source:sumner-1995`                       | Sumner, _The French Army 1914–18_ (Osprey MAA 286, 1995)                      | French 1914 dress, the trials from 1911, horizon blue; plates are reconstructions                                                                                                             |
| `source:mollo-1977`                        | Mollo, _Army Uniforms of World War I_ (1977)                                  | feldgrau and the covered helmet, khaki service dress, Belgian blue; the load                                                                                                                  |
| `source:hogg-weeks-1977`                   | Hogg & Weeks, _Military Small Arms of the 20th Century_ (1977)                | calibre, action and magazine of the Lebel, Gewehr 98, SMLE and Mauser m/1889                                                                                                                  |
| `source:jones-2012`                        | Jones, _From Boer War to World War_ (2012)                                    | British musketry reform; fifteen aimed rounds a minute; the fire at Mons                                                                                                                      |
| `source:messimy-1937`                      | Messimy, _Mes souvenirs_ (1937)                                               | the fight over the pantalon rouge, 1911–14; memoir, one side                                                                                                                                  |
| `source:armemuseum-digitaltmuseum`         | Armémuseum, object records on DigitaltMuseum                                  | the identification and licence of the four rifles in the kit plate set                                                                                                                        |

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

## To add as the content lands (not yet in the registry)

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
- The Belgian army in August and early September 1914 — the withdrawal into
  Antwerp of 18–20 August and the sorties of 25–26 August and 9–13 September.
  Several events cite `source:edmonds-1925` for these; that volume's narrative
  begins on **19 September** and does not carry them, so they have no pages.
  The Belgian official narrative (_L'action de l'armée belge pour la défense
  du pays et le respect de sa neutralité_, 1914–1918) is the work to bring in,
  with Van Pul beside it.
- Stevenson, _1914–1918: The History of the First World War_ (2004).
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
