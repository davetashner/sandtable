# Uniforms and kit — what was found, what was not, and what was refused

- **Bead:** `sand-y0u.5`
- **Policy:** [ADR 0007](decisions/0007-imagery.md) — open-licence originals only, credited;
  colorized images labelled with the original one click away; no gore.
  [ADR 0014](decisions/0014-plate-sets.md) — a card may hold one plate set of two to
  four pictures on one declared axis.
- **Researched:** 2026-08-24 (first pass, `sand-y0u.5`); 2026-08-25 (second pass,
  `sand-y0u.5.1`, `sand-y0u.5.2`, `sand-y0u.5.4`)

This note is the companion to [`imagery-phase-1.md`](imagery-phase-1.md) for the
kit pass. The first pass left seven manifests, two cards and an honest account
of what it could not find; the second went back for the three things that were
missing and came home with two of them.

**What the second pass changed, in one paragraph.** The field-gun card can now
be written and is: the German 7.7 cm FK 96 n.A. was found in the Australian War
Memorial and the Belgian 75 mm mle 1905 in the Belgian artillery museum at
Brasschaat, which are the two plates the first pass was short. The machine-gun
card cannot: the MG 08, the Vickers and the Hotchkiss are all in the registry
now, and no admissible Belgian Maxim exists to put beside them. The headgear
card is exactly where it was — one Pickelhaube and nothing to compare it with.
Four new manifests are in a card, three are waiting for one.

## The rule this pass worked to

The same one, and for the same reason: **every entry was verified against the
archive record itself**, fetched through the MediaWiki API and read for
`Artist`, `DateTimeOriginal`, `Credit`, `LicenseShortName`, `UsageTerms`,
`Permission` and `AttributionRequired`. Nothing was inferred from a file name.
The licence recorded in each manifest is the one on the record. What could not
be verified was dropped rather than guessed at.

**The images themselves were not viewed.** Every `content_policy` note is a
judgement made from the catalogue description, and three items carry an
explicit instruction to the image review (`sand-y0u.7`) — the Meaux
infantryman (is it a mannequin, a figure, or garments on a form?), the
laid-out British kit (the itemised caption was written from the record, not
from the frame), and the Belgian Mauser (the one plate in the rifle set that
is not an unaltered photograph).

## Coverage — the first pass's seven items

| #   | Item                                              | Archive                                                 | Licence as recorded                      |
| --- | ------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| 1   | French infantryman of 1914 (uniform, full length) | Musée de la Grande Guerre du pays de Meaux, via Commons | CC BY-SA 4.0 (attribution + share-alike) |
| 2   | Pickelhaube under its field cover, 1914–16        | Braunschweigisches Landesmuseum, via Commons            | Public domain                            |
| 3   | Mauser Gewehr 98                                  | Armémuseum, Stockholm — DigitaltMuseum 011024391425     | CC BY 4.0 (attribution)                  |
| 4   | Lebel mle 1886                                    | Armémuseum, Stockholm — DigitaltMuseum 011024389339     | CC BY-SA 3.0                             |
| 5   | Lee-Enfield SMLE Mk III                           | Armémuseum, Stockholm — AM.032056                       | Public domain (released by the museum)   |
| 6   | Mauser m/1889 (Belgium)                           | Armémuseum, Stockholm — DigitaltMuseum 011024388109     | CC BY-SA 3.0                             |
| 7   | A British soldier's kit laid out, 1915            | Spaarnestad Photo / Nationaal Archief, SFA022801761     | Public domain                            |

Items 3–6 are the point of the pass: **four rifles, four armies, one museum,
one way of photographing them.** A plate set's shared frame is its control
variable, and it is rare to get one from the archive rather than from a crop.

## Coverage — the second pass's seven items

Every one of these was read off the archive record itself on 2026-08-25, through
the same MediaWiki API call and the same fields. Four of them are in the new
field-gun card; three are waiting for a Belgian gun.

| #   | Item                                 | Archive                                                         | Licence as recorded                      | In a card? |
| --- | ------------------------------------ | --------------------------------------------------------------- | ---------------------------------------- | ---------- |
| 8   | 7.7 cm Feldkanone 96 n.A.            | Australian War Memorial, Canberra, via Commons                  | CC BY 2.5 (attribution)                  | field guns |
| 9   | Canon de 75 mm mle 1897              | National World War I Museum, Kansas City, via Commons           | Public domain (photographer's release)   | field guns |
| 10  | Ordnance QF 18-pounder Mk II         | Imperial War Museum, London, via Commons                        | CC BY-SA 4.0 (attribution + share-alike) | field guns |
| 11  | Canon de 75 mm mle 1905 TR (Belgium) | Gunfire Artilleriemuseum, Brasschaat, via Commons               | CC BY-SA 4.0 (attribution + share-alike) | field guns |
| 12  | Maschinengewehr 08 on its sled mount | Braunschweigisches Landesmuseum, via Commons                    | Public domain                            | none yet   |
| 13  | .303-inch Vickers, YORCM : CA78.a-c  | York Castle Museum / York Museums Trust (GLAMwiki), via Commons | CC BY-SA 4.0 (attribution + share-alike) | none yet   |
| 14  | Hotchkiss mle 1914                   | Mémorial de Verdun, via Commons                                 | CC BY-SA 3.0 (attribution + share-alike) | none yet   |

Two things about items 8–11 that the rifle set did not have to say. They are
**four museums and four photographers**, not one museum photographing four
objects the same way: the shared frame in that plate set is the card's crop
rather than the archive's, and the card says so in its last paragraph. And item
10 is the smallest picture in the pack at 800 × 600 — a larger photograph of the
Royal Artillery Museum's 18-pounder exists on Commons, but its record does not
name the museum (only a Commons category added by a third party does), and a
picture whose institution has to be inferred from a category is not provenance.
The manifest records the trade and names the alternative.

**Item 10 is not an Imperial War Museum image.** It is a Commons contributor's
own photograph, taken in an IWM gallery and licensed CC BY-SA by her, with a
confirmed VRTS permission on the file. IWM's Non-Commercial Licence covers the
museum's own collection images and is not an open licence under
[ADR 0007](decisions/0007-imagery.md); nothing in this pass comes from an
IWM-supplied file. The distinction matters enough that the manifest states it in
the licence field rather than in a note.

## The three axes, and why they are three cards

[ADR 0014](decisions/0014-plate-sets.md) caps a set at four and says what to do
when four is not enough: a second axis is a second card. Every one of this
bead's axes is cross-army rather than per-army — one card comparing four armies
on one thing, not one card per army comparing four things — because the argument
only exists across armies. A card holding a Pickelhaube next to a rifle next to
a field gun is a list; a card holding four armies' infantry against each other
is the question a reader actually asks after watching four columns cross the
map. So:

- `1914:tech-uniforms-1914` — axis **"Each army's infantry in the field, 1914"**,
  four photographs already in the registry (the Marne line, the 1913 manoeuvres,
  the Royal Fusiliers at Mons, the Herstal firing line). Its own picture slot
  carries item 1, which is where the madder-red trousers are actually visible.
- `1914:tech-infantry-kit-1914` — axis **"The infantry rifle of each army, 1914"**,
  items 3–6. Its own picture slot carries item 7, the load.
- `1914:tech-field-guns-1914` — axis **"The field gun each army took to war, 1914"**,
  items 8–11, added by the second pass. Its own picture slot carries a
  photograph the registry already held: the French field artillery leaving Paris
  on 9 August 1914, whose manifest was written for the firepower card and now
  names both.

That is the ADR's "one hero plate plus a set of four" shape, three times.

### What the field-gun card argues

Worth stating here because it decided which photographs were worth chasing. The
four guns are not the interesting part: all four are quick-firers of nearly the
same calibre, and all four are answers to the French 75's recoil carriage of 1897. The thing that was not equal in 1914 is the gun that stood behind the
field gun — the German field howitzer, which France had almost nothing to match
and Belgium had nothing at all. So the plate set exists to make four guns look
alike, which is the opposite of what a comparison usually does, and the card
then says where the difference actually was.

### A caution the uniforms card states out loud

Three of the four photographs in the uniforms set are colorized by this
project. On a card whose subject is colour, that has to be said in the card and
not only in the credit block, and it is: the colours in those three are
inferred from documented dress regulations, not read off a negative, and the
only picture on the card where the colour is the artefact's is item 1.

## Closed — the field gun of each army (`sand-y0u.5.1`)

The first pass had the French 75 and the British 18-pounder and was two plates
short. Both of the missing ones turned up in museums on the second pass:

- **Germany.** A 7.7 cm Feldkanone 96 _neuer Art_ in the **Australian War
  Memorial**, Canberra, photographed by the Commons regular Bukvoed in 2007
  (CC BY 2.5). The record names the institution and, crucially, the sub-pattern —
  _neuer Art_, the recoil-carriage rebuild, not the 1896 original. It is a
  captured gun, which is why an Australian museum has one.
- **Belgium.** A Canon de 75 mm mle 1905 à tir rapide — Krupp's design built
  under licence — in the **Gunfire Artilleriemuseum at Brasschaat**, the Belgian
  artillery museum, photographed by Paul Hermans in 2021 (CC BY-SA 4.0). This is
  also the first Belgian object in the registry that comes from a Belgian
  museum.

The British plate changed too: the first pass proposed a period photograph
(18-pounders at Signy-Signets, 8 September 1914) and the card now uses a museum
object instead, so that all four plates are guns rather than three guns and a
battlefield. The Signy-Signets photograph remains admissible on the
Crown-copyright-expired rationale and is a good candidate for a beat.

## Gaps — what is still missing

- **The machine gun of each army (`sand-y0u.5.4`).** Three of four found and
  verified, and **the card was not written.** The MG 08 is in the
  Braunschweigisches Landesmuseum (public domain, and by the same photographer
  on the same day as the Pickelhaube already in the registry); the Vickers is a
  catalogued object of the York Castle Museum released by York Museums Trust
  under a GLAMwiki partnership, accession YORCM : CA78.a-c; the Hotchkiss mle
  1914 is in the collection of the Mémorial de Verdun. **No admissible Belgian
  Maxim exists.** Belgium is one of the four armies this pack puts on the map,
  and a card headed "the machine gun of each army" with Belgium missing is not
  a comparison — it is three guns and a hole where the small army goes. The
  three manifests are in the tree with no `used_by`, and the card can be written
  the day the fourth turns up. What was looked at and refused is below.
- **Belgian and French headgear as objects (`sand-y0u.5.2`).** Unchanged, and
  looked for again. The Pickelhaube with its cover (item 2) still has no
  counterpart: no verified 1914 **French képi**, **British service dress cap**
  or **Belgian shako** was found as a museum object under an open licence with
  an archive record. The headgear axis — which is
  [ADR 0014](decisions/0014-plate-sets.md)'s own worked example — still does not
  exist. The searches that came up empty are worth recording so nobody repeats
  them: the Kansas City museum's uniform collection (which has four German
  spiked helmets and no Allied headgear of 1914), the Braunschweig museum's
  headgear category (two Pickelhauben and a pith helmet), the Commons category
  trees for kepis, shakos and British peaked caps by country, the York Museums
  Trust military collection, the Meaux museum category, and the Musée de
  l'Armée's object photographs. The likeliest remaining route is a French or
  Belgian regional museum doing a GLAM release, or the Musée de l'Armée
  cataloguing its Commons donations to the object.
- **Belgian kit in a museum.** Partly closed. The Belgian field gun above is the
  first, and it is a gun rather than kit; the Royal Military Museum in Brussels
  still has a large Commons category almost none of which is catalogued to the
  object. The Belgian rifle in the rifle set is still a Swedish museum's
  example.

## The formation card exists now, and still carries no plates

`sand-y0u.29` built `FormationCardView` and routed `?card=<formation id>`, so
the "who is who" set finally has somewhere to hang: `Formation.plates` renders
through the same `PlateSet` the tech cards use, opened from an army's token on
the map, from its commander's card, and from the legend where a side put one
army in the field.

**No `plates` were authored on the four armies, and the reason is the table
above rather than a shortage of time.** ADR 0014's floor is two plates on a
declared axis, and a per-army set needs the axis to be _that army's kit_ —
headgear, rifle, machine gun, field gun. What this pass found is four rifles
and one Pickelhaube. Germany could reach two plates (helmet and Gewehr 98) and
no other army could reach the floor at all, so a per-army pass would ship one
army with a set of two, three armies with nothing, and a card family that
looks broken on three of the four sides it exists for. The cross-army cards
are where those pictures already do their work, and they do it better: the
comparison is between armies, which is the question the map raises.

What has to be true before an army's own set is worth writing has changed, but
not enough. After the second pass Germany can reach four — Pickelhaube, Gewehr
98, MG 08, FK 96 n.A. — and that is the ADR's worked example, complete. France
and Britain can reach three (rifle, machine gun, field gun) and Belgium two
(rifle, field gun), and none of the four has its headgear except Germany. A
per-army pass would still ship one army with a full set, two with three and one
with two, and the axis "that army's kit" would mean something different on each
card. The remaining blocker is the same as it was: a verified 1914 **French
képi**, **British service dress cap** and **Belgian shako** as museum objects
(`sand-y0u.5.2`), plus a **Belgian Maxim** (`sand-y0u.5.4`). Until then the
field stays absent, which the renderer treats as "no set" rather than as an
empty one.

## Excluded, and why

**On provenance — ADR 0007 puts work "of unknown provenance" out:**

- `File:7.7cm Feldkanone 96 n.A. with crew.jpg` (Flickr, `drakegoodman`, CC BY 2.0)
  — the best German field-gun photograph found, and rejected. It is a private
  collector's scan of an unposted postcard; the record says "unidentified Field
  Artillery Regiment… probably in front of barracks during training", and there
  is no holding institution behind any of it. This is the same rule that put the
  "Anonymes 14" Flickr set out in the Phase 1 pass, applied to a picture this
  pass would have liked to keep.
- `File:British WW1 Rifleman (7528013990).jpg` and the rest of the reenactment
  photographs in the British uniform categories — modern re-creations, correctly
  licensed and correctly labelled on Commons as "Recreation WW1 mock battle". A
  reenactor in a comparison of what four armies looked like would be read as
  evidence, and is not.
- `File:Ijzertoren museum stand 14/15/16.jpg` — Belgian WWI museum displays,
  CC BY-SA 4.0, and captioned only "ijzertoren museum stand". Nothing in the
  record says what object is in the frame, so nothing can be captioned.

**Because the record contradicted what the file name suggested:**

- `File:73 Fusilier Regiment WWI uniform.jpg` — a German infantry uniform, and
  the record dates it "Late WWI": the M1915 simplified tunic, not the M1910 the
  army marched into Belgium in. Kept out of a card about August 1914.
- `File:France artilleryman's uniform, 1916` and `File:UK Royal Army Medical
Corps uniform, 1915` (both National WWI Museum, public domain) — the obvious
  French and British counterparts to item 2's German uniform, and both are the
  wrong year and, in the British case, the wrong arm.

**On alteration:**

- The Commons "noBG" versions of the Gewehr 98, the Lebel and the Lee-Enfield —
  the same museum photographs with the background and the museum's accession
  label removed and a drop shadow added. Using all four would have made a
  visually perfect set of four altered photographs; the unaltered originals were
  taken instead. **Item 6 is the exception**, and the manifest says so: no
  unaltered photograph of a Belgian Mauser m/1889 as a museum object exists on
  Commons, and the alternatives were a three-plate set without Belgium or a
  private collector's scan. It will not sit flush beside the other three, whose
  grey museum ground it does not share. Replace it if an unaltered photograph
  turns up — the DigitaltMuseum record has one.

## Excluded on the second pass, and why

**Because the record says the object is the wrong thing:**

- `File:TRA M1905 01.jpg` and `02.jpg` (Royal Museum of the Armed Forces and
  Military History, Brussels; CC BY-SA 3.0; 8000 × 6000) — by far the best
  photograph of a Belgian 75 found anywhere, in the right museum, at four times
  the resolution of the one that was used, and refused. The record calls it a
  **TRA**: the articulated split-trail carriage Belgium rebuilt these guns onto
  _between the wars_. The gun of August 1914 is the pole-trail TR, which is what
  the Brasschaat photograph shows. This is the same rule that kept the M1915
  tunic off a 1914 card, applied to a picture this pass badly wanted.

**Because the record does not say what is in the frame:**

- `File:Machine gun (23070689116).jpg`, `File:Blue WWI uniform (23869455262).jpg`
  and `File:A soldier's kit (22364582494).jpg` (Thomas Quine, In Flanders Fields
  Museum, Ieper; CC BY 2.0; up to 5472 × 3648) — a Belgian machine gun, a Belgian
  uniform and a Belgian kit layout, all in a Belgian museum, all beautifully
  photographed, and every one of their descriptions reads in full: "Belgium
  2014". The object identifications on Commons are categories added later by
  editors, not anything the record asserts. A card cannot be captioned from a
  category, and this is the same rule that put the IJzertoren displays out.
- `File:Mons Memorial Museum 07 12.jpg` (CC BY-SA 4.0, 3648 × 5472) — filed on
  Commons under "Kepis of Belgium" and described only as "Mons Memorial
  Museum". Same problem, and a particular loss, because Mons is on this pack's
  map.
- `File:Hotchkiss M 1914, MDLA.jpg` and the rest of Rama's Musée de l'Armée
  series — the institution is in every record and the object is in none of them:
  the description field says "This image was taken at the Musée de l'Armée,
  Paris" and nothing else, so the identification lives only in the file title.
  Never infer from a file name. The Verdun Hotchkiss was taken instead, whose
  record names both.
- `File:French army kepi dsc06829.jpg` (CC BY-SA 3.0) and
  `File:French military headgear of an officer from the First World War…jpg`
  (CC BY-SA 4.0, 20787 × 9117) — two French officers' képis with no holding
  institution in the record and no date on the object. Correctly licensed,
  photographed by named people, and unattributable to a collection.

**Because the licence is not an open licence:**

- `File:The Battle of Frontiers, August-september 1914 Q70232.jpg` (IWM Q 70232)
  — Belgian Carabiniers with their dog-drawn machine-gun carts, 20 August 1914,
  which is exactly the picture a Belgian machine-gun plate wants. The Commons
  page carries the **IWM Non-Commercial Licence**, which
  [ADR 0007](decisions/0007-imagery.md) excludes, under a public-domain
  rationale that Crown copyright has expired. That rationale is the one on which
  `1914-mons-royal-fusiliers` was admitted — but it covers _British_ Crown
  works, and this record's `Artist` field says **"Belgian official
  photographer"**. The rationale does not transfer, so the file does not come
  in on it. `File:The Western Front, 1914 Q53452.jpg` (IWM Q 53452, the same
  subject in December 1914) is refused for the same reason with an
  unattributed author.

**Because a field photograph cannot carry a plate that names a gun:**

- `File:Belgian troops with machine guns, WWI (33208345452).jpg` (Library of
  Congress via the National Museum of the U.S. Navy, Lot-3664-4, public domain)
  and `File:Een Belgische mitrailleursstelling…(29713448445).jpg` (Liberaal
  Archief, Collectie Jean Pecher, Flickr Commons "no known copyright
  restrictions", dated 1 September 1914). Both have real archives, real
  catalogue references and admissible licences. Neither record says what gun is
  in the frame — "Belgian troops with machine guns", "an improvised machine gun
  position" — and a plate labelled "Belgium — Maxim" would be this project
  asserting a weapon type off a photograph nobody has looked at. Either would be
  a good beat picture; neither can be the fourth term of a comparison of guns.

## The manifests are ahead of the binaries

Image binaries are git-ignored and live only in the main checkout and the assets
bucket. **The first pass added seven manifests and no images; the second added
another seven and no images.** Each carries an `original.file_url` that resolves
to the file on Wikimedia Commons — every one of the fourteen was checked with a
HEAD request when it was written — and its `width`/`height` are the original's
dimensions as reported by the record.

This has one visible consequence that the Phase 1 batch did not have.
`PlateSet` resolves its plates against `content/shared/media/index.json` and
**drops any it cannot resolve**, and a set of fewer than two renders as nothing.
So today:

- the **uniforms** card's set renders — all four of its plates are manifests the
  registry already holds, with derivatives already in the index;
- the **rifle** and **field-gun** cards' sets render **nothing** until the
  binaries are fetched and the index is rebuilt. That is degradation rather than
  breakage, and it is the cost of a content branch that cannot carry binaries.

`content/shared/media/index.json` was deliberately **not** regenerated here, for
the reason Phase 1 gives: rebuilding it from a checkout with no binaries strips
the existing entries of their derivatives.

To catch the binaries up, in the **main checkout** (not a worktree):

```bash
cd ~/Development/sandtable
for m in $(git ls-files 'content/shared/media/kit/**/media.json'); do
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

Note that four of the seven are **CC BY / CC BY-SA**, not public domain. Their
credit strings name the museum because attribution is required; two of them
(items 4 and 6, CC BY-SA 3.0, and item 1, CC BY-SA 4.0) carry share-alike, which
is why all three are marked "must not be colorized". There is nothing to
colorize in any case: five of the seven are modern colour photographs of the
objects themselves, which is the whole reason a kit comparison prefers museum
objects to field photographs.

The second pass's seven are more of the same and slightly worse: **five of the
seven are CC BY or CC BY-SA**, and four of those five carry share-alike (items
10, 11, 13 and 14), so all four are marked "must not be colorized". All seven
are modern colour photographs of objects, so there is again nothing to
colorize. The credit strings name the museum in every case and the photographer
wherever the record names one — item 13 is credited to York Museums Trust rather
than to a person because the record names no individual, which is also why
Commons flags it as having no machine-readable author.
