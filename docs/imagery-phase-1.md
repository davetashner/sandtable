# Phase 1 shot list — coverage, gaps and exclusions

- **Bead:** `sand-y0u.6`
- **Policy:** [ADR 0007](decisions/0007-imagery.md) — open-licence originals only, credited;
  colorized images labelled with the original one click away; no gore.
- **Researched:** 2026-08-24

This note records what the Phase 1 shot list actually covers, what it does not,
and what was rejected and why — so that the next person can see the shape of the
hole rather than rediscovering it.

## The rule this pass worked to

An image manifest asserts, in the repository, that a specific photograph exists
in a specific archive under a specific licence. A fabricated archive record is
worse than a missing image, because it will be believed and credited on a
published page. So:

- **Every entry was verified against the archive record itself** — each Wikimedia
  Commons file record was fetched through the MediaWiki API and its
  `extmetadata` read: title, dimensions, `Artist`, `DateTimeOriginal`, `Credit`,
  `LicenseShortName`, `UsageTerms`, `Permission`. Nothing was inferred from a
  plausible file name; several plausible file names were probed and came back
  `missing`, and those went no further.
- **The licence recorded in each manifest is the one on the record**, not one
  deduced from the year. Where the record's licence claim rests on something
  thin (a book plate, a press agency, a private site), the manifest says so in
  its `notes` instead of smoothing it over.
- **What could not be verified was dropped.** The count below is the honest one.

### What was _not_ verified

The archive records were read; **the images themselves were not viewed**. Every
`content_policy` field in this batch therefore records a judgement made from the
catalogue description, and three items — the two Loncin views and the Liège
defences plate — carry an explicit instruction that the image review
(`sand-y0u.7`) must confirm the frame before publication. Fort Loncin is a war
grave; "ruins" in a 1914 caption is not a guarantee of what is in shot.

## Coverage

**35 verified items**, taking the registry from 41 manifests to 76. Thirteen are
portraits of commanders who had no face in the pack; twenty-two are scenes,
documents and kit.

| #   | Item                                                       | Archive                                   | Licence as recorded   |
| --- | ---------------------------------------------------------- | ----------------------------------------- | --------------------- |
| 1   | Hindenburg, portrait (post-war)                            | Bundesarchiv, Bild 183-C06886             | CC BY-SA 3.0 DE       |
| 2   | Wilhelm, German Crown Prince, c. 1912                      | Commons (Huis Doorn collection cited)     | Public domain         |
| 3   | Smith-Dorrien, c. 1913–17                                  | Library of Congress (Harris & Ewing)      | Public domain (PD-US) |
| 4   | Sarrail                                                    | Library of Congress (Bain News Service)   | Public domain (PD-US) |
| 5   | Dubail                                                     | Library of Congress, ggbain.17063         | Public domain         |
| 6   | Paul Pau, autochrome, 1920                                 | Musée Albert-Kahn, Archives de la Planète | Public domain         |
| 7   | Berchtold, 1922                                            | Bundesarchiv, Bild 183-2004-1110-500      | CC BY-SA 3.0 DE       |
| 8   | Rennenkampf, c. 1910                                       | Commons (Gallica cited as source)         | Public domain         |
| 9   | Prittwitz, 1915 (Nicola Perscheid)                         | Commons                                   | Public domain         |
| 10  | Max Hoffmann, 1913                                         | Commons (1938 book plate cited)           | Public domain         |
| 11  | Albrecht of Württemberg, c. 1910                           | Commons ("Daheim", 16 Jan 1915)           | Public domain         |
| 12  | Josias von Heeringen, 1914 (Perscheid)                     | Commons                                   | Public domain         |
| 13  | Maud'huy, 1916                                             | Library of Congress (Bain)                | Public domain         |
| 14  | Paris, crowd reading the mobilization posters, 2 Aug 1914  | BnF, Agence Rol 41638                     | Public domain         |
| 15  | Gare de l'Est, the first departure, 2 Aug 1914             | BnF, Agence Rol 41629                     | Public domain         |
| 16  | Gare de l'Est, the crowd, 3 Aug 1914                       | BnF, Agence Rol 41647                     | Public domain         |
| 17  | Requisition of horses, Paris, 2 Aug 1914                   | BnF, Agence Rol 41640                     | Public domain         |
| 18  | Requisition of motor cars, Invalides, 5 Aug 1914           | BnF, Agence Rol (via Gallica)             | Public domain         |
| 19  | Requisition of lorries, Invalides, 5 Aug 1914              | BnF, Agence Rol (via Gallica)             | Public domain         |
| 20  | Departure of the artillery, Paris, 9 Aug 1914              | BnF, Agence Rol 41721                     | Public domain         |
| 21  | Mobilization order, military government of Paris, Aug 1914 | BnF, Agence Rol 41830                     | Public domain         |
| 22  | Taxi de la Marne and its drivers, Invalides, 21 Dec 1922   | BnF, Agence Rol (btv1b53095000q)          | Public domain         |
| 23  | Reconnaissance report brought to Langle de Cary, Oct 1914  | BnF, Agence Rol 42920                     | Public domain         |
| 24  | Brindejonc des Moulinais before a flight, Oct 1914         | BnF, Agence Rol 42922                     | Public domain         |
| 25  | Chasseur d'Afrique on the Marne, 1914 — **autochrome**     | BnF / Gallica (Gervais-Courtellemont)     | Public domain         |
| 26  | German column in a Belgian town, 1914                      | Nationaal Archief, 22005 026              | CC0                   |
| 27  | German troops crossing the Scheldt at Antwerp              | Nationaal Archief, 158-1355               | CC0                   |
| 28  | Fort Lier cupola holed by a 42 cm shell, 30 Sep 1914       | Nationaal Archief, 158-0536               | CC0                   |
| 29  | Austro-Hungarian siege gun in Belgium, 1914                | Library of Congress, LCCN 2014698051      | Public domain         |
| 30  | Fort Loncin destroyed, 1914                                | Commons ("Der Völkerkrieg", 1914)         | Public domain         |
| 31  | Fort de Loncin, panoramic, Nov 1918                        | Library of Congress, item 2007663088      | Public domain         |
| 32  | Destroyed defences at Liège, 1914                          | Commons ("Der Krieg 1914-19", 1919)       | Public domain         |
| 33  | German troops at a meal after the fall of Liège            | Commons (Robert Sennecke; 1919 plate)     | Public domain         |
| 34  | Belgian troops blocking a road at Liège, 1914              | Commons (1919 plate)                      | Public domain         |
| 35  | Joffre's order of the day cut into his statue's plinth     | Commons (contributor's own work)          | CC0                   |

Two of the thirty-five are **original colour photographs** — the Pau and
Chasseur d'Afrique autochromes. They are marked "must not be colorized" and are
worth showing beside a project colorization: they are the pack's only evidence
of what 1914 actually looked like in colour, as against what the project infers.

### Placement, under the one-picture-per-beat rule

[ADR 0012](decisions/0012-photographs.md) allows a beat exactly one picture, and
the validator enforces it across the whole registry. So `used_by` in this batch
is not a wish list: **each of the 35 claims at most one free beat**, and where two
candidates wanted the same beat the better picture took it and the other was
placed on the battle or the tech card instead. Seven Paris photographs, for
instance, could all have claimed `1914:beat-mobilization`; the crowd reading the
posters has it, and the other six sit on the railways, motor-transport and
firepower cards, where a card may carry several. Nothing in this batch collides
with a placement the registry already held — the Mons, Herstal, Sarajevo, Marne
and Liège turret manifests keep the beats they had.

That also means the beat placements here are a _proposal_: the hero a beat
actually renders is its own `media` field, and an author moving one of these to a
different beat must free the old one first or the build fails.

### Bundesarchiv

Items 1 and 7 are CC BY-SA 3.0 DE. The credit strings in those manifests are the
mandatory form (`Bundesarchiv, Bild <number> / CC-BY-SA 3.0`) and
`scripts/check-content.sh` enforces their presence. Share-alike propagates: a
colorization of either would itself have to ship as CC BY-SA 3.0 DE, not under
the project licence, which is why both are marked "leave as it is".

## Gaps — what Phase 1 still lacks

- **The Royal Flying Corps in 1914.** Nothing admissible was found. The Commons
  RFC category is overwhelmingly 1917–18 Canadian and Texan training material,
  and the 1914 squadron photographs that exist are IWM catalogue items under
  IWM's Non-Commercial Licence, which ADR 0007 excludes. The aerial-
  reconnaissance card is carried by two French photographs instead.
- **The taxis on the night of 6/7 September 1914.** No photograph of the run
  itself was found in any archive record. Item 22 is the 1922 commemoration and
  says so. This gap may be permanent; the beat should plan on the map and the
  text carrying it.
- **Archive facsimiles of the diplomatic documents.** The July Crisis notes, the
  German ultimatum to Belgium, the Belgian reply, Joffre's _Instruction générale
  no 2_, the OHL wireless messages — fourteen `Document` entities and not one
  verified scan among them. Searches returned Internet Archive book scans of
  printed transcriptions, which are a different thing and were not taken. The
  most likely sources are the Belgian State Archives, the Archives diplomatiques
  at La Courneuve and the Bundesarchiv-Militärarchiv, none of which was reachable
  through this pass's method.
- **French infantry in the red trousers, in the field.** The registry still has
  only the pre-war manoeuvres photograph. Item 15 (Gare de l'Est) and item 20
  (the artillery leaving Paris) are the nearest this pass could get, and both are
  Paris streets, not a battlefield.
- **Belgian fort interiors.** Items 28, 30 and 31 all show forts from outside or
  from on top. No verified interior — a casemate, a magazine, a turret hoist —
  was found. The Brialmont fort diagrams in the Commons Liège category are
  drawings and were left for the diagram pipeline rather than the photo one.
- **Second-tier commanders still without a face:** Beseler, Zwehl, Fournier,
  d'Urbal, Ronarc'h, Cogge, Geeraert, Princip, Raffenel, Balfourier, Michel,
  Grandmaison, Samsonov, Ruffey, Langle de Cary (as a portrait; he appears in
  item 23), Hindenburg _in 1914_ as against after the war.

## Excluded, and why

**On content policy (ADR 0007, no gore):**

- `File:GermandeadPeronne.jpg` (Commons, Battle of the Marne category) — dead
  soldiers. Out, and not replaced by anything similar: the human cost is the
  casualty layer's job, not a photograph's.
- The Commons Battle of the Marne category's grave and cemetery photographs
  (`Tombes des glorieux combattants`, `Pèlerinage sur les tombes…`,
  `Sepultures 32°`, the _nécropole_ views) were passed over. Graves are
  admissible under ADR 0007, but a 1914 campaign told through 1915 pilgrimage
  photographs is a different argument from the one this pack is making.
- Loncin, Lier and the Liège defences were kept, but each carries an explicit
  instruction to the image review to confirm the frame — see "What was not
  verified" above.

**On licence:**

- Every Imperial War Museums catalogue item whose only rights statement is IWM's
  Non-Commercial Licence. That licence is not an open licence and ADR 0007
  excludes it.
- `File:Ruins of Fort Loucin in the Fortress of Liege 1914.jpg` — the Commons
  record marks it public domain but credits **Imperial War Museums Q 45995**.
  Rejected: the public-domain rationale is Commons', the holding archive applies
  its own terms to its digital copy, the file is only 800 px wide, and item 30
  covers the same subject from a source with no such tangle. (Note that
  `1914-mons-royal-fusiliers`, already in the registry, is a comparable case that
  was resolved the other way, on a PD-UKGov rationale for a British government
  photograph. The Loncin plate is a German photograph, so that rationale does not
  reach it.)

**On provenance — ADR 0007 puts work "of unknown provenance" out:**

- The **"Anonymes 14" Flickr set** (`vasse nicolas,antoine`, CC BY 2.0) — a dozen
  otherwise excellent Marne photographs: the 75 firing at Étrepilly, British
  infantry in a brickworks near Meaux, the Saint-Gond battery. The scans are
  openly licensed, but the identifications — unit, day, place — are a private
  collector's captions with no archive record behind them, and this pack cites
  its dates. Left out deliberately; worth revisiting if the underlying prints can
  be traced to a holding institution.
- `File:Gavrilo Princip, cell, headshot, bw (cropped).jpg` — the familiar 1914
  police photograph, but the Commons record's source is an AP-numbered copy
  hosted on `media.npr.org`, not an archive. Out until a record at the Sarajevo
  or Vienna holdings can be cited.
- `File:Pierre RUffey.jpg` (source: a personal `e-monsite.com` page, 150 px),
  `File:Zwehl.jpg` (source: a `comcast.net` page, 185 px), and
  `File:Henri Geeraert éclusier.jpg` ("old postcard", 278 px) — no archive record
  and unusably small.
- `File:LPDF 16 8 de Langle de Cary.jpg` — a 252 px uploader scan of a 1915
  magazine page. Too small for a person card.
- `File:Alexander V. Samsonov.jpeg` — 360 px. Below the floor this pass used
  (about 440 px on the short side for a portrait). Samsonov remains a gap.
- `File:Big bertha1.jpg` / `File:Big bertha2.jpg` — scans from a 1925 Serbian war
  album, 559–670 px. The registry already has `1914-big-bertha-42cm`; these add
  nothing but a weaker record.

**Because the record contradicted the file name — the reason this pass fetched
every record instead of trusting titles:**

- `File:Bundesarchiv Bild 102-00277A, Frankreich, Schlacht an der Marne.jpg` —
  titled for the Marne, dated **July 1917** by the Bundesarchiv, and showing a
  17 cm gun. It is not a 1914 Marne photograph. Rejected.
- `File:Taxis de la Marne en 1914.png` — a 2024 contributor upload (CC BY-SA 4.0),
  not a 1914 photograph.
- `File:Taxis de la marne.jpg` — a taxi at the 2008 Paris motor show.
- `File:Liege, 1914. Charge de Lanciers…` (Nationaal Archief, CC0) — the record
  says "/ Drawing." It is an illustration, not a photograph.
- `File:Affiche de mobilisation … rue Royale` and
  `File:Affiche de l'ordre de mobilisation générale du 2 août 1914` — both are
  photographs _of_ the 1914 poster, taken in **1918** and **1928** respectively
  according to their records. Item 21 was used instead because its exposure is
  August 1914.
- `File:Bataille de la Marne, bivouac, septembre 1914.jpg` — a watercolour by
  Gilbert de Guingand, held by La Contemporaine. Genuine, period, and not a
  photograph; left for a future illustration pass.

## The manifests are ahead of the binaries

Image binaries are git-ignored and live only in the main checkout and the assets
bucket (see `content/shared/media/README.md` and ADR 0004). **This branch adds 35
manifests and no images.** Each manifest carries an `original.file_url` — a
`Special:FilePath` link that resolves to the file on Wikimedia Commons — and its
`width`/`height` are the original's dimensions as reported by the archive, so the
pipeline will correct them if a crop or a colorization changes them later.

`npm run validate:content` **does not check for a local binary** — neither
`scripts/check-content.sh` nor `src/packs/validate` looks at the filesystem for
images, and `npm run media` records a missing file as `present: false` rather
than failing. So manifests may legitimately land ahead of their images, which is
what this branch does. `content/shared/media/index.json` was deliberately **not**
regenerated here: rebuilding it from a checkout with no binaries would strip the
existing 41 entries of their derivatives.

To catch the binaries up, in the **main checkout** (not a worktree):

```bash
cd ~/Development/sandtable
# fetch each master to the directory beside its manifest, using the
# original.file_url in each media.json:
for m in $(git ls-files 'content/shared/media/**/media.json'); do
  d=$(dirname "$m")
  f=$(jq -r '.file' "$m")
  u=$(jq -r '.original.file_url // empty' "$m")
  [ -n "$u" ] && [ ! -f "$d/$f" ] && curl -L --fail -A 'sandtable/1.0 (media pipeline)' -o "$d/$f" "$u"
done

npm run media               # WebP derivatives + rebuild index.json
npm run media -- --upload   # sync originals and derivatives to the assets bucket
npm run validate:content
```

Then commit the regenerated `content/shared/media/index.json` — it is tracked,
the binaries are not.

Colorization is a separate, manual step. Each manifest's `colorization.status`
carries a recommendation and a reason; when one is acted on, set `colorized` to
`true`, add the label to the caption (the validator enforces this), and keep the
original one click away as ADR 0007 requires.
