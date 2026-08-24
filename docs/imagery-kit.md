# Uniforms and kit — what was found, what was not, and what was refused

- **Bead:** `sand-y0u.5`
- **Policy:** [ADR 0007](decisions/0007-imagery.md) — open-licence originals only, credited;
  colorized images labelled with the original one click away; no gore.
  [ADR 0014](decisions/0014-plate-sets.md) — a card may hold one plate set of two to
  four pictures on one declared axis.
- **Researched:** 2026-08-24

This note is the companion to [`imagery-phase-1.md`](imagery-phase-1.md) for the
kit pass: seven new manifests, two cards, and an honest account of the two
things the pass could not find.

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

## Coverage — seven items

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

## The two axes, and why they are two cards

[ADR 0014](decisions/0014-plate-sets.md) caps a set at four and says what to do
when four is not enough: a second axis is a second card. Both of this bead's
axes are cross-army rather than per-army — one card comparing four armies on
one thing, not one card per army comparing four things — because the argument
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

That is the ADR's "one hero plate plus a set of four" shape, twice.

### A caution the uniforms card states out loud

Three of the four photographs in the uniforms set are colorized by this
project. On a card whose subject is colour, that has to be said in the card and
not only in the credit block, and it is: the colours in those three are
inferred from documented dress regulations, not read off a negative, and the
only picture on the card where the colour is the artefact's is item 1.

## Gaps — what this pass could not source

- **The field gun of each army.** A third card was planned on the axis "the
  field gun each army took to war" and was dropped for want of two of its four
  plates. The French 75 mm mle 1897 is available as a museum object (National
  WWI Museum, Kansas City, photographed by Daderot, public domain) and the
  British 18-pounder as a period photograph (an Imperial War Museums holding
  whose Commons record carries a Crown-copyright-expired public-domain
  rationale — a British official photograph by Lt R. C. Money at
  Signy-Signets, 8 September 1914, the same rationale on which
  `1914-mons-royal-fusiliers` was admitted; the IWM catalogue number was not
  read off the record and is not recorded here). No admissible **German 7.7 cm FK 96
  n.A.** and no **Belgian field gun** was found: see the exclusions below. Two
  plates out of four is a comparison with half its terms missing, and the card
  was not written.
- **Belgian kit in a museum.** Nothing identified. The Royal Military Museum in
  Brussels has a large Commons category and almost none of it is catalogued to
  the object; the IJzertoren museum photographs are captioned only "ijzertoren
  museum stand", which is not an identification anything can be credited from.
  The Belgian rifle in the set is a Swedish museum's example.
- **Belgian and French headgear as objects.** The Pickelhaube with its cover
  (item 2) has no counterpart: no verified 1914 French képi, British service
  dress cap or Belgian shako was found under an open licence with an archive
  record. The headgear axis — which is [ADR 0014](decisions/0014-plate-sets.md)'s
  own worked example — therefore does not exist yet.
- **The machine gun of each army.** Not attempted in depth. Commons has
  what look like two views of a Hotchkiss heavy machine gun in the same Kansas
  City museum, but those records were not fetched and nothing here asserts what
  is on them; the MG 08, the Vickers and the Belgian Maxim were not run down at
  all. Worth a later pass.

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

## The manifests are ahead of the binaries

Image binaries are git-ignored and live only in the main checkout and the assets
bucket. **This branch adds seven manifests and no images.** Each carries an
`original.file_url` that resolves to the file on Wikimedia Commons, and its
`width`/`height` are the original's dimensions as reported by the record.

This has one visible consequence that the Phase 1 batch did not have.
`PlateSet` resolves its plates against `content/shared/media/index.json` and
**drops any it cannot resolve**, and a set of fewer than two renders as nothing.
So today:

- the **uniforms** card's set renders — all four of its plates are manifests the
  registry already holds, with derivatives already in the index;
- the **rifle** card's set renders **nothing** until the binaries are fetched and
  the index is rebuilt. That is degradation rather than breakage, and it is the
  cost of a content branch that cannot carry binaries.

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
