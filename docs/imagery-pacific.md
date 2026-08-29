# Pacific shot list — the cast, their photographs, and what could not be verified

- **Bead:** `sand-lry.3`
- **Policy:** [ADR 0007](decisions/0007-imagery.md) — open-licence originals only, credited;
  colorized images labelled with the original one click away; no gore.
  [ADR 0012](decisions/0012-photographs.md) — plate or chip, toned at rest, one picture per beat.
  [ADR 0019](decisions/0019-second-world-war-arc.md) — the arc this cast belongs to, and the
  paragraph in its Consequences about what this theatre's photography does to those two records.
- **Researched:** 2026-08-27

This is the Pacific equivalent of [`imagery-phase-1.md`](imagery-phase-1.md) and
[`imagery-kit.md`](imagery-kit.md), and it works to the same rule. It names, for
each of the forty-three people added to `content/shared/people/` in
this pass, the specific archive photograph a colorization should start from:
archive, identifier, date, photographer where the record names one, licence, and
the URL.

It is deliberately shorter on triumph than the 1914 lists. **Thirty-one of the
forty-three have a photograph verified against an archive or institutional
record; twelve do not**, and the twelve are not evenly distributed. Ten of them
are Japanese. That is the finding, not an accident of effort, and it is set out
in "The Japanese side" below.

## The rule this pass worked to

The same one the 1914 passes used, and for the same reason: an entry in this
file asserts that a specific photograph exists in a specific archive under a
specific licence, and a fabricated archive record is worse than a missing image
because it will be believed and credited on a published page. So:

- **Every entry below was read off a record, not off a file name.** Each
  Wikimedia Commons file was fetched through the MediaWiki API and its
  `extmetadata` read — `ObjectName`, `Artist`, `DateTimeOriginal`, `Credit`,
  `LicenseShortName`, `UsageTerms`, `Permission` — and where `extmetadata` was
  empty the page's raw wikitext was fetched instead, which is where the older
  uploads keep their source lines. Several plausible file names came back
  `missing` and went no further.
- **The licence recorded here is the one on the record**, not one deduced from
  the year or from the subject's nationality.
- **Where the record contradicts itself, the entry says so** rather than picking
  the convenient half. There is one flat contradiction in this batch (Chester
  Nez) and it is written up in full, because it is the exact failure mode a
  catalogue label produces.
- **What could not be verified is listed as unresolved**, with the searches that
  came up empty, so the next person can see the shape of the hole.

### What was _not_ verified

Three things, stated plainly.

**The images themselves were not viewed.** Every judgement below about what is
in the frame is made from the catalogue description. That matters more here
than it did in 1914: this is a theatre whose surviving photography includes a
great deal that ADR 0007 excludes, and a caption reading "Iwo Jima, March 1945"
guarantees nothing. Every entry in this file is a **portrait or a posed
figure** for that reason — see "What this list does not contain".

**The Naval History and Heritage Command's own site could not be reached.**
`history.navy.mil` failed TLS verification on every attempt from this pass
(`unable to verify the first certificate`), so the NHHC photo numbers below —
`80-G-…` and `NH …` — are **as recorded by the Commons file that cites them**,
including the NHHC URL each one carries. They are consistent with the NHHC
numbering scheme and several of them appear in more than one independent
record, but none was confirmed against the item page. Confirming them is a
manual step and it is the first thing to do before any of these ships.

**The National Archives catalog could not be read either.**
`catalog.archives.gov` is a JavaScript application that returns an empty
document to a plain fetch, and its API needs a key this pass did not have. The
two NARA identifiers below (`266694893`, `520968`) come from Commons files
uploaded by NARA's own bot, which carries the National Archives Identifier in
the file name and the record; that is good provenance but it is not the catalog
page.

## Japanese names

**Family name first**, unhyphenated, macrons kept: Yamamoto Isoroku, Kuribayashi
Tadamichi, Ōba Sakae. That is the order the men used, the order Japanese
scholarship uses, and the order the modern English-language literature on this
theatre has settled on (Parshall and Tully, and Toll, both use it).

It is also **not** the order the archives use. NARA, the Naval History and
Heritage Command and Wikimedia Commons all index these men given-name-first —
"Chuichi Nagumo", "Tadamichi Kuribayashi" — because that is how the wartime
American captions were written. Searching an archive for "Nagumo Chūichi" finds
nothing.

So each Japanese `Person` carries two alternate names: the Japanese script form
(`language: "ja"`, no `kind`, because kanji is not a period or a translation of
anything) and the given-name-first romanisation (`kind: "transliteration"`),
whose `period` field says what it is for — _"given-name-first order, as
English-language catalogues index him"_. That second name is a search key as
much as a display name, and the next person to go looking for one of these
photographs will need it.

Americans keep the project's existing convention: `name` in natural order,
`sortName` surname-first, slug surname-first (`person:nimitz-chester`).

## The verified list

Thirty-one items. Licence column is the record's own claim.

### American command

| #   | Person                  | Photograph                                                   | Archive / identifier                                                                                                                           | Date        | Photographer               | Licence                              |
| --- | ----------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------- | ------------------------------------ |
| 1   | Chester W. Nimitz       | Portrait as Chief of Naval Operations                        | NHHC **80-G-K-9344** (via Commons `File:Chester Nimitz as CNO.jpg`, 3820 × 2990)                                                               | c. 1945–47  | US Navy, uncredited        | Public domain (PD-USGov-Navy)        |
| 2   | Ernest J. King          | Portrait as Fleet Admiral                                    | NHHC **80-G-416886** (`File:FADM Ernest J. King.jpg`, 1022 × 1511)                                                                             | c. 1945     | US Navy, uncredited        | Public domain (PD-USGov-Navy)        |
| 3   | William F. Halsey Jr.   | Official portrait as Fleet Admiral                           | NHHC **80-G-K-15137** (`File:W Halsey.jpg`, 590 × 733)                                                                                         | late 1945   | US Navy, uncredited        | Public domain (PD-USGov-Navy)        |
| 4   | Raymond A. Spruance     | Informal portrait, Commander Central Pacific Force           | NHHC **80-G-225341** (`File:Ray Spruance.jpg`, 4550 × 5765)                                                                                    | 23 Apr 1944 | US Navy, uncredited        | Public domain (PD-USGov-Navy)        |
| 5   | Frank Jack Fletcher     | Portrait, September 1942                                     | NHHC personality file `photos/pers-us/uspers-f/fj-fltr.htm` (`File:Frank Jack Fletcher-g14193.jpg`, 4429 × 5673)                               | Sep 1942    | US Naval Historical Center | Public domain (PD-USGov-Navy)        |
| 6   | Marc A. Mitscher        | Portrait as Vice Admiral                                     | NHHC/NARA **80-G-424169** (file name and Credit agree, 4567 × 5583)                                                                            | 1944–45     | uncredited                 | Public domain (PD-USGov-Navy)        |
| 7   | Douglas MacArthur       | With the corncob pipe, probably Manila — **original colour** | Army Signal Corps **USA C-2413 (Color)**, NARA, via NHHC (`File:MacArthur Manila.jpg`, 2790 × 4744)                                            | 2 Aug 1945  | uncredited                 | Public domain (PD-USGov-Army)        |
| 8   | Alexander A. Vandegrift | Dress uniform, Medal of Honor ribbon, as Commandant          | USMC History Division "Who's Who" hi-res `VandegriftAA.jpg`, archived 2004-06-27; NHHC collections (4531 × 5787)                               | 1947        | MSgt J. G. Daly, USMC      | Public domain (PD-USGov-Marines)     |
| 9   | Holland M. Smith        | Broadcasting a Christmas message from Pearl Harbor           | **USMC Archives**, Quantico (Flickr 8281297118), 2575 × 2128                                                                                   | 25 Dec 1944 | uncredited USMC            | **CC BY 2.0 — attribution required** |
| 10  | Lewis B. Puller         | Guadalcanal, 1942                                            | **Marine Corps Archives and Special Collections**, Lewis B. Puller Collection **COLL/794**, via USMC Archives (Flickr 14310924189), 1241 × 837 | 1942        | Official USMC photograph   | **CC BY 2.0 — attribution required** |
| 11  | Joseph J. Rochefort     | Portrait                                                     | **National Security Agency** photo gallery `photo00058.jpg`, archived 2007-07-13 (`File:Joseph rochefort.jpg`, 480 × 640)                      | undated     | uncredited                 | Public domain (PD-USGov-NSA)         |
| 12  | Evans F. Carlson        | "Col. Evans F. Carlson. S-3208. FF."                         | **NARA** National Archives Identifier **266694893** (OWI Overseas Operations Branch, New York Office, News and Features Bureau), 1145 × 2010   | c. 1942–45  | OWI, uncredited            | Public domain (PD-USGov)             |

### American, not command

| #   | Person              | Photograph                                                   | Archive / identifier                                                                                             | Date        | Photographer                                 | Licence                                   |
| --- | ------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------- | ----------------------------------------- |
| 13  | John Basilone       | At Marine Headquarters, Washington, after the Medal of Honor | **USMC Archives**, Quantico (Flickr 10931006014), 2344 × 2868                                                    | Sep 1943    | uncredited USMC                              | **CC BY 2.0 — attribution required**      |
| 14  | Doris Miller        | Just after Nimitz pinned the Navy Cross, aboard _Enterprise_ | NHHC **80-G-408456** (`File:Dorie Miller (80-G-408456).tif`, 5118 × 6196)                                        | 27 May 1942 | US Navy, uncredited                          | Public domain (PD-USGov-Navy)             |
| 15  | Frederick C. Branch | His wife pinning on his second lieutenant's bars             | **Department of Defense photo (USMC) 500043**, via the National Park Service (War in the Pacific NHS), 400 × 349 | 10 Nov 1945 | uncredited USMC                              | Public domain (PD-USGov-Marines)          |
| 16  | The five Sullivans  | The brothers aboard _Juneau_                                 | NHHC **NH 52362** (`File:Sullivanbrothers.jpg`, 738 × 583)                                                       | 14 Feb 1942 | uncredited                                   | Public domain (PD-USGov-Navy)             |
| 17  | Ernie Pyle          | Head-and-shoulders portrait, facing right                    | **Library of Congress**, Prints & Photographs, digital ID **cph.3b08817**, 3693 × 4701                           | 1945        | **Milton J. Pike**                           | Public domain (US, copyright not renewed) |
| 18  | Joe Rosenthal       | On top of Suribachi                                          | **USMC-02292**, described on the record as a National Archives photograph, via marines.mil, 800 × 1000           | 1945        | uncredited                                   | Public domain (PD-USGov-Marines)          |
| 19  | Michael Strank      | Official portrait                                            | USMC History Division "Who's Who" hi-res `StrankM.jpg`, archived 2004-10-20, 1600 × 2000                         | c. 1944     | uncredited USMC                              | Public domain (PD-USGov-Marines)          |
| 20  | Harlon Block        | Official portrait                                            | USMC History Division "Who's Who" hi-res `BlockHH.jpg`, archived 2005-11-20, 1600 × 2000                         | c. 1944     | uncredited USMC                              | Public domain (PD-USGov-Marines)          |
| 21  | Ira Hayes           | Official portrait                                            | USMC History Division "Who's Who" hi-res `HayesIH.jpg`, archived 2006-03-14, 400 × 553                           | c. 1944     | uncredited USMC                              | Public domain (PD-USGov-Marines)          |
| 22  | Franklin Sousley    | Official portrait                                            | USMC History Division "Who's Who" hi-res `SousleyFR.jpg`, archived 2005-11-20, 1600 × 2000                       | c. 1944     | uncredited USMC                              | Public domain (PD-USGov-Marines)          |
| 23  | Harold H. Schultz   | Official USMC portrait, printed as fig. 12.10                | **_Investigating Iwo_** (Marine Corps History Division, 2019), p. 212, 2004 × 2796                               | 1943–45     | uncredited USMC                              | Public domain (PD-USGov-Marines)          |
| 24  | Harold P. Keller    | Portrait, c. 1945                                            | **_Investigating Iwo_** (Marine Corps History Division, 2019), 830 × 1110                                        | 1945        | credited **Kay Keller Maurer** on the record | Public domain (PD-USGov-Marines)          |
| 25  | John H. Bradley     | Beside a war-bond poster of the flag raising                 | USMC History Division "Who's Who" hi-res `BradleyJH.jpg`, archived 2005-11-20, 2000 × 1600                       | 1945        | uncredited USMC                              | Public domain (PD-USGov-Marines)          |
| 26  | Rene A. Gagnon      | Official portrait                                            | USMC History Division "Who's Who" hi-res `GagnonRA.jpg`, archived 2007-02-23, 992 × 1396                         | 1945        | uncredited USMC                              | Public domain (PD-USGov)                  |
| 27  | Ruby G. Bradley     | As Colonel, Army Nurse Corps, Brooke Army Medical Center     | US Army, via Commons (450 × 559) — **post-war, not a Pacific photograph**                                        | post-war    | US Army, uncredited                          | Public domain (PD-USGov-Army)             |
| 28  | Merritt A. Edson    | Official portrait as Major General                           | Commons `File:EdsonMikeRed.jpg`, 1600 × 2000 — **PD-USGov-Marines claimed, no archive record**                   | undated     | uncredited                                   | Public domain claimed — see below         |

### Japanese

| #   | Person           | Photograph                                      | Archive / identifier                                                                                                                                  | Date       | Photographer | Licence                                   |
| --- | ---------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------ | ----------------------------------------- |
| 29  | Yamamoto Isoroku | As Commander-in-Chief, Combined Fleet           | **National Diet Library**, "Portraits of Modern Japanese Historical Figures" **no. 344**, from the **Papers of Takagi Kiyohisa, no. 118**, 915 × 1297 | by 1943    | unknown      | Public domain (PD-Japan, old photograph)  |
| 30  | Nagumo Chūichi   | As Vice Admiral, commanding the First Air Fleet | **NHHC NH 63423**; the record notes the print came from **Rear Admiral Samuel Eliot Morison's files**, 4592 × 5784                                    | c. 1941–42 | unknown      | Public domain (PD-Japan + NHHC statement) |
| 31  | Kurita Takeo     | Formal portrait                                 | **NHHC NH 63694** (`File:Kurita.jpg`, 445 × 500 — small; a larger copy exists but has been retouched by a Commons editor)                             | 1944       | unknown      | Public domain (PD-Japan)                  |

Item 29 is the best-provenanced Japanese photograph in this batch by a distance:
a named institution, a catalogue number, and a named archival collection behind
it. Items 30 and 31 are Japanese photographs held by an **American** archive,
which is why they can be cited at all — the Imperial Navy's own photographic
records largely did not survive, and what did survive of its officer portraits
reached the West through captured material and through Morison's research files.

## Colorization

Four notes that decide what may be done to which picture.

**One of the thirty-one must not be colorized, because it already is.** Item 7,
MacArthur at Manila, is an **original Signal Corps colour photograph**. It is
the Pacific counterpart of the 1914 autochromes in
[`imagery-phase-1.md`](imagery-phase-1.md): the only evidence in this batch of
what the theatre actually looked like in colour, as against what the project
infers. Mark it "must not be colorized" and show it beside a project
colorization if the chance arises.

**Three are CC BY 2.0 and require attribution** — items 9, 10 and 13, all from
the USMC Archives' Flickr. Attribution is required but there is no share-alike,
so a colorization may ship under the project's own terms provided the credit
line names the USMC Archives as the record asks. None of the Pacific batch is
CC BY-**SA**, which is the trap the 1914 kit pass kept hitting.

**Every colorization is labelled and keeps the original one click away**, per
ADR 0007 and ADR 0012. Nothing in this pass changes that; it is repeated here
only because a face is the one place a viewer forgets they are looking at an
interpretation.

**Colour is documented for uniforms and ribbons and nowhere else.** United
States Navy service dress blue, Marine Corps green, the Navy Cross ribbon and
the Medal of Honor's pale blue are all specified in period regulations and may
be colorized with confidence. Japanese Imperial Navy and Army uniform colours
are equally well documented. Skin, hair and background are inference, and the
caption says so.

## Unresolved — twelve people with no admissible photograph

These are not "not looked for". Each one below records what was searched.

### The Japanese side

Ten of the twelve. The pattern is the same every time, and it is worth stating
once rather than ten times.

Commons holds a portrait of nearly every senior Japanese officer of the war, and
nearly every one of them is tagged `{{PD-Japan-oldphoto}}` — the template for a
photograph published in Japan before 1957, whose term has expired. The tag is
probably correct. The **source line under it is the problem**: what the records
actually cite, in this batch, is a personal `infoseek` fan page, a dead
`7thfighter.com`, a university course page, a Japanese Ground Self-Defense Force
unit's web page, a sermon site belonging to a family named Pell, a newspaper's
online archive, and — in one case — the words "Unknown source". ADR 0007 puts
work "of unknown provenance" out, and it does not carve an exception for work
whose licence is probably fine.

Each `{{PD-Japan-oldphoto}}` record also carries the Hirtle-chart caveat
verbatim: _"If the photograph was also published in the United States within 30
days after publication in Japan, it might be copyrighted."_ For photographs of
Combined Fleet admirals distributed by a wartime press bureau, that is not a
theoretical caveat.

| Person                    | What is on Commons                                              | Why it is not admissible                                                                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Yamaguchi Tamon           | `File:TamonYamaguchi.jpg`, 806 × 1098, PD-Japan                 | Sources given are `combinedfleet.com` (an enthusiast site) and a Shinto shrine's news page. No archive record.                                                                                                                              |
| Ozawa Jisaburō            | `File:Jisaburō Ozawa as vice admiral.jpg`, 848 × 1200, PD-Japan | Source field reads **"Unknown source"**. Author "presumed official IJN photographer".                                                                                                                                                       |
| Saitō Yoshitsugu          | `File:Saito Yoshitsugu.jpg`, 408 × 612, PD-Japan                | Source is a personal `infoseek.co.jp` page. Also **too small** for a person card, and the record dates the sitter "(1884–1944)" against Wikidata's 1890 birth — see "Dates that disagree".                                                  |
| Kuribayashi Tadamichi     | `File:Tadamichi Kuribayashi.jpg`, 718 × 1096, PD-Japan          | Sources are `7thfighter.com` and `sandiego.edu`. Neither is a holding institution.                                                                                                                                                          |
| Ushijima Mitsuru          | `File:Mitsuru Ushijima.jpg`, 1840 × 2492, PD-Japan              | Source is a JGSDF unit web page (`mod.go.jp/gsdf/…`). A government site, but not an archive record, and the page is long dead.                                                                                                              |
| Fuchida Mitsuo            | `File:MitsuoFuchida.jpg`, 652 × 746, PD-Japan                   | Source is `pellfamily.com/sermons/mitsuo2.jpg` — a private evangelical site, from his post-war preaching years. Out on provenance without argument.                                                                                         |
| Sakamaki Kazuo            | `File:POW Kazuo Sakamaki.jpg`, 254 × 360, PD-US-not-renewed     | A US War Department booking photograph — so an **American** work, and the most likely to be resolvable of the ten — but the record's only source is a 2002 Honolulu _Star-Bulletin_ web archive. 254 × 360 is far below the portrait floor. |
| Ōba Sakae                 | `File:Oba Sakae portrait.JPG`, 1816 × 2567, PD-Japan            | Credit reads "Oba Family". A family photograph, not an archive item, dated 1937 — ten years before Saipan.                                                                                                                                  |
| Yokoi Shōichi             | `File:Shouichi yokoi.jpg`, 543 × 700, PD-Japan                  | A scan taken by the uploader from _Asahi Graph_, 11 February 1972, p. 15 — a magazine reproduction of a wartime portrait, at two removes from any original.                                                                                 |
| Kuribayashi, alternatives | —                                                               | The Ogasawara and Iwo Jima material in the American archives is battlefield photography, not portraiture.                                                                                                                                   |

**Where these are likely to be resolvable.** Three routes, in order of promise:

1. **The National Diet Library's "Portraits of Modern Japanese Historical
   Figures"** (`ndl.go.jp/portrait/`) — the database item 29 came from. It is
   catalogued to the item, names the source collection, and is a real archive.
   It is strongest on politicians and pre-war figures; it should be searched by
   name for each of the ten before anything else is tried.
2. **The Naval History and Heritage Command's `NH` series**, which is where
   Nagumo and Kurita came from. Morison's research files and captured Japanese
   material put a number of Imperial Navy officer portraits into an American
   public-domain collection. This route needs the NHHC site, which this pass
   could not reach.
3. **NARA's captured Japanese records** (Record Group 242) and the Office of War
   Information's own portrait files, which is where the Sakamaki booking
   photograph almost certainly lives.

None of the three is reachable by the method this pass used, and all three are
worth a manual afternoon. Filing that as its own bead is the honest next step
rather than shipping ten manifests on a sermon site's say-so.

### The American side

Two.

- **Ann A. Bernatitus.** No photograph found. She is the "nurse on Bataan" the
  bead asks for and the most exactly right person for the slot — Hospital No. 1
  on Bataan, then the Corregidor tunnel, then out by submarine on 3 May 1942 —
  and Commons has nothing of her but an NHHC **oral-history PDF** (`Interview
with CAPT Ann Bernatitus, NC, USN, (Ret.), World War II nurse`), which does at
  least confirm the person and the rank. Searched: Commons for her name, for
  "Army Nurse Corps Bataan Corregidor", for "nurses evacuated Corregidor 1942",
  and English Wikipedia (no article, hence no dates in her `Person` entry
  either). NHHC holds her portrait and is the place to go.
- **Eugene B. Sledge.** `File:Eugene sledge.jpg` is 236 × 316 — far below the
  portrait floor — and its only source is `pbs.org/thewar/…`, a documentary's
  asset directory. The likeliest holder of a wartime portrait is the **Eugene B.
  Sledge collection at Auburn University**, which was not reachable by this
  method.

Two more are **admitted with a caveat rather than counted as unresolved**, and
should not be treated as finished:

- **Merritt A. Edson** (item 28). The Commons record's `Source` field says
  "en.wikipedia" and its `Author` is a Wikipedia username. The PD-USGov-Marines
  tag is almost certainly right — it is plainly an official USMC portrait — but
  there is no archive record behind it. Replace it from the USMC History
  Division's "Who's Who" set, which is where the other Marine portraits in this
  list come from, if a copy can be found.
- **Ruby G. Bradley** (item 27). Verified and admissible, but it is a **post-war
  photograph of a colonel at Fort Sam Houston**, not of a nurse in the
  Philippines. It is honest to use it and dishonest to caption it as anything
  else.

## Chester Nez — a record that contradicts itself

Worth its own section, because it is the exact case the 1914 passes warned about
and this one caught.

`File:Chester Nez.JPG` on Commons carries:

- `description`: "A posed shot of Chester Nez taken during World War II."
- `author`: **Brian Leddy**
- `date`: **2014-11-18**
- `source`: a 2014 `marines.mil` news article, "Marine Corps Heroes: Pvt Chester Nez"
- licence: `{{PD-USGov-Military-Marines}}`

These cannot all be true. Brian Leddy is a working photojournalist in New
Mexico; a photograph he took on 18 November 2014 is not a posed shot from the
Second World War, and it is also not a US Government work in the public domain.
The most likely reading is that the uploader entered the **article's** byline and
publication date into the fields belonging to the **photograph**, and that the
picture itself is a wartime USMC portrait reproduced in a 2014 Marine Corps news
story — which would make the description and the licence right and the author
and date wrong.

Likely is not verified. **Chester Nez is counted among the thirty-one above only
for his `Person` entry, not for a photograph**: this file must not be used until
someone opens the marines.mil article and establishes which of its images is
which. The right picture for the code talkers, if his own cannot be resolved, is
`File:First 29 Navajo U.S. Marine Corps code-talker recruits being sworn in at
Fort Wingate, NM.` — **NARA National Archives Identifier 295175**, 2951 × 2349,
public domain, verified — which is a group photograph of the original
twenty-nine and therefore a scene rather than a portrait, but it is real.

_(That correction is why the verified count in this document's header is
thirty-one and not thirty-two.)_

## Dates that disagree

Three, recorded here because the `Person` entries had to pick one and a reviewer
should know a choice was made.

- **Yamaguchi Tamon.** The entry says **5 June 1942**. Wikidata says 4 June.
  _Hiryū_ was scuttled around dawn on 5 June Tokyo time, which is 4 June across
  the date line at Midway; Parshall and Tully, and Toll, both use 5 June. The
  Pacific packs will have to settle a house convention for dates that straddle
  the line (`sand-lry.6` is where it will first bite), and when they do, this
  should be revisited with it.
- **Saitō Yoshitsugu.** Born **2 November 1890**, died **6 July 1944**, per
  Wikidata. The Commons file record gives his life as "(1884–1944)", and some
  accounts put his suicide on 7 July, the day of the banzai attack. The entry
  uses Wikidata's dates; the discrepancy is unresolved.
- **Chester Nez.** Wikidata carries **both** 4 and 5 June 2014 as his date of
  death. The entry uses 4 June, which is the date the obituaries carried.

## What this list does not contain, and why

ADR 0019's Consequences section says the no-gore rule "holds; the cost is
carried by the casualty layer and by sourced vignettes". This pass is the first
time that has cost anything, so it is worth recording what was deliberately not
looked for.

**No battlefield photography at all.** Every item above is a portrait or a posed
figure. That is partly the bead's scope — it asked for the people whose
photographs get colorized — but it is also the safe reading of a corpus in which
the most famous images of Tarawa, Peleliu, Iwo Jima and Okinawa are of the dead,
and in which a catalogue line saying "Marines advance" is not a guarantee. When
the packs need scenes, each one has to be looked at by a human before it is
manifested, and the image review (`sand-y0u.7`) is where that happens.

**Not the Rosenthal flag photograph.** It is the most famous photograph of the
war and it is not in this list, on purpose. It is an **Associated Press**
photograph, its United States copyright position is its own argument rather than
an inherited PD-USGov one, and settling it is not something to do in passing on
a cast bead. Item 18 is a photograph **of Rosenthal**, taken by the Marine
Corps, which is a different thing with a different licence. If the Iwo Jima pack
(`sand-lry.12`) wants the picture itself, that is a decision with a record, not
a manifest.

**No Marpi Point, and no cliffs.** The Saipan civilian catastrophe is in
Saitō's and Ōba's entries in words. It stays in words.

## The corrections are the content

The eight men in this list who are connected to Rosenthal's photograph —
Strank, Block, Hayes, Sousley, Schultz, Keller, Bradley and Gagnon — are eight
rather than six because the Marine Corps got the identifications wrong and
corrected them twice, seventy-two years apart. That is not a footnote to be
tidied away in the caption; it is why the group is worth building a cast around,
and each `Person` entry carries its own half of it:

- **1947.** The figure at the base of the pole was published as Sergeant Henry
  Hansen. Ira Hayes, who was there, said it was **Harlon Block**, was told to
  drop it, and in 1946 travelled to the Block farm in Texas to tell Block's
  mother she had been right. The Corps re-examined the picture and corrected the
  record in January 1947.
- **June 2016.** A Marine Corps board concluded, from photogrammetric comparison
  of uniforms, weapons and equipment — work begun by two amateur researchers
  working through the frames around Rosenthal's — that the second figure from
  the left was **Harold Schultz** and not the Navy corpsman **John Bradley**.
  Bradley was on Suribachi that morning and is now understood to be in the
  photographs of the **first** flag.
- **October 2019.** A second board found that the third figure was **Harold
  Keller** and not **Rene Gagnon**.

The source for all of it is `source:robertson-2019` — _Investigating Iwo: The
Flag Raisings in Myth, Memory, and Esprit de Corps_, Marine Corps History
Division, 2019 — which is the Corps' own publication of the analysis and the
findings, and which prints the official portraits used as items 19–26 above. It
is filed as `official-history` in the registry because that is what it is: the
institution correcting its own record in public, with the workings shown.

## Sources added by this pass

Ten, and this is **not** the Pacific bibliography — `sand-lry.14` still owes
that, and this is only the subset the forty-three bios needed in order to cite
anything at all:

`source:toll-2011`, `source:toll-2015`, `source:toll-2020` (the Pacific War
trilogy); `source:morison-usnowii` (the semi-official American naval history,
with a note about its verdicts on Fletcher and Halsey); `source:parshall-tully-2005`
(_Shattered Sword_, and the reason Fuchida is cited against rather than from);
`source:frank-1990` (Guadalcanal); `source:robertson-2019` (_Investigating Iwo_);
`source:kakehashi-2007` (Kuribayashi's letters); `source:sledge-1981`
(_With the Old Breed_); `source:agawa-1979` (Agawa on Yamamoto, in translation).

Nine of the ten are American or American-published. That is the same imbalance
`docs/sources.md` is meant to gain a note about under ADR 0019 — "a Pacific arc
sourced only from Morison and Toll is an American arc" — and the one Japanese
work in the list reaches this project through a 1979 English translation. The
Senshi Sōsho, the Japanese official history, is not in the registry and should
be the first thing `sand-lry.14` puts there.

## What forty-three people cost, and who pays it

Worth recording here because it was measured rather than guessed, and because it
is a problem for the arc rather than for this pass.

At the time of this pass, `scripts/lib/pack-bundle.ts` read the shared people
registry — then a single `content/shared/people/people.json` — **whole** into
every era bundle. Adding this cast took the heaviest era's pack from
281.6 kB to **297.7 kB** gzip — and the same 16.1 kB landed on the 1915 pack,
which references none of these people. Headroom against the 340 kB `pack`
ceiling fell from 58.4 kB to 42.3 kB in a single content pass.

ADR 0018's argument is that a page load is one era and fetches one era. The
shared registries are the exception to it: they are the union of every era,
fetched by every era. Ten Pacific packs each want a cast of about this size,
and [ADR 0019](decisions/0019-second-world-war-arc.md) projects twenty packs in
all. Filed as `sand-shn.15`, with the likely fix — emit only the shared entities
an era actually references, which the validator's own reference index already
knows — and it is much cheaper to make that change before the ten packs are
written than after.

**Since (2026-08-29, `sand-shn.24`):** both halves of that paragraph have moved
on, so read it as a record of what was measured and not as a description of the
build. `sand-shn.15` landed the fix (ADR 0018's second amendment): the bundler
emits only the shared entities an era reaches, and the 1915 pack fell from
58.6 kB to 3.0 kB. [ADR 0022](decisions/0022-per-entity-registries.md) then
split the three registries into one file per entity, so there is no
`people.json` to read whole.

## No manifests, no binaries

**This pass adds no `media.json` manifests and no image files.** That is
deliberate and it is a narrower scope than the 1914 imagery passes took.

Image binaries are git-ignored and live only in the assets bucket (see
`content/shared/media/README.md` and ADR 0004), so a content branch could not
carry them in any case. Manifests could have been written — the 1914 passes
wrote thirty-five and fourteen — and were not, for two reasons. A manifest is an
assertion in the repository that a photograph exists under a licence, and eight
of the thirty-one entries above rest on an archive record this pass could not
open (the NHHC numbers) or on a dead URL recovered from the Wayback Machine (the
USMC "Who's Who" set); those should be confirmed by hand first. And every
manifest needs a `content_policy` judgement, which ADR 0007 asks to be made from
the image and which this pass could only have made from the catalogue line.

So the order of work is: confirm the NHHC and NARA identifiers against the item
pages, fetch the files, look at them, then write the manifests. That is a
separate bead and it should be one.
