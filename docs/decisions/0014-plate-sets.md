# 0014 — The plate set: four pictures on one axis, and why that is not a gallery

- **Status:** accepted
- **Date:** 2026-08-24
- **Bead:** `sand-neh.16`

## Context

ADR 0012 settled how a photograph lives in the war room. There are two
placements and nothing else: a **plate** (the picture with its caption and
credit) and a **chip** (a face at name size). It also fixed the number: **one
picture per beat**, enforced in the validator rather than requested in a style
guide, because the failure mode it exists to prevent — the narrative panel
slowly turning into a slideshow — arrives one individually reasonable addition
at a time.

It says nothing about a card that legitimately holds four pictures, and one is
now blocked on the answer. `sand-y0u.5` is the uniforms-and-kit story: a "who
is who" card per army showing headgear, rifle, machine gun and field gun side
by side — Pickelhaube and feldgrau, French _pantalon rouge_ and _capote_, BEF
khaki and the SMLE, Belgian kit. The point of that card is not that it has
several pictures. The point is that the pictures are held **against each
other**: a reader who has just watched four armies march across the map wants
to know what those four columns actually looked like, and that question is
answered by four photographs at once or by nothing.

The tension is real and it is not resolved by taste. "Several pictures at
once, browsable" is a gallery, and ADR 0006 exists to refuse galleries — one
map, one dossier, one timeline, and everything else a glyph or a mode. ADR
0012 refused a per-beat gallery again in as many words: "a second scrolling
thing in the dossier is a fourth surface wearing a coat." Meanwhile the schema
has been quietly permissive the whole time: `media: Id[]` sits on `Person`,
`Formation`, `TechCard` and `ScienceCard`, unbounded, with no rule about what
a renderer is supposed to do with the second entry. Nobody has rendered the
second entry yet. Somebody was about to.

So the question this record settles is not "may a card show four pictures". It
is: **what would have to be true of four pictures for them not to be a
gallery**, and can that be enforced rather than requested.

## Decision

### The plate set

A card may carry one **plate set**: a fixed few plates under one declared
axis, laid out in a grid, all of them on screen at once.

```jsonc
"plates": {
  "axis": "German kit, August 1914",
  "fit": "portrait",
  "items": [
    { "media": "media:kit/pickelhaube/…", "label": "Pickelhaube" },
    { "media": "media:kit/gewehr-98/…",   "label": "Gewehr 98" },
    { "media": "media:kit/mg-08/…",       "label": "MG 08" },
    { "media": "media:kit/fk-96/…",       "label": "7.7 cm FK 96" }
  ]
}
```

Five properties make it a comparison rather than a strip of pictures that
happen to share a card, and each of them is a rule rather than a preference:

1. **Bounded.** Two plates at least, **four at most**, in the schema.
2. **One axis, declared.** `axis` is a single line, capped at 80 characters,
   rendered as an eyebrow over the set. If what the set compares cannot be
   said in a line, the set is not comparing anything.
3. **One frame.** `fit` applies to every plate — `band` or `portrait`, the
   two cropped fits from ADR 0012. A shared frame is the control variable;
   `contain` is not offered here, because pictures at their own natural
   shapes are a page of pictures, not a comparison.
4. **Every plate labelled, each label its own.** `label` is that plate's point
   on the axis and it is the visible caption; the manifest's own caption
   remains the alt text. Two plates may not carry the same label, and the same
   picture may not appear twice — either would be a point on the axis that
   compares nothing.
5. **Complete at a glance.** No paging, no carousel, no "more pictures"
   disclosure, no next. Everything the set contains is painted on first render.

**The provenance is gathered, not repeated.** ADR 0007's rule is that every
image shows its credit, and it does here — but under the set rather than under
each plate. A full archive credit is three or four lines in a 340px column, so
a credit block under a 150px photograph is twice the height of the photograph,
and four of them make a set that is mostly licence text with some pictures in
it. Instead the set closes with one block, one line per plate, keyed by the
label above it: the same `MediaCredit` component, every colorized label,
every credit string, every way to the original, all on the same screen as the
pictures they belong to. `MediaFigure` gained one prop for this and nothing
else turns it on. The one thing lost is the in-place "show original" swap,
which needs the credit and the picture in the same figure; in a set it is the
link out to the archive, and the full-size view of any plate still offers the
swap.

There is **at most one set per card** — the field is singular, so a second one
is not a policy anybody has to remember — and **never one on a beat**. ADR
0012 stands untouched: a beat has one picture, in the hero slot, and the
`plates` field does not exist on `BeatFrontMatter`.

That last line is the whole argument in miniature. A beat is what the reader
is **given**: it arrives because the clock reached it, and the reader's only
choice was to keep watching. A card is what the reader **asked for**: they
clicked a glyph or a chip to open it, and it replaces the beat until they go
back. That difference is what pays for four pictures. Weight the reader did
not choose has to be rationed; weight they went and fetched does not.

### Why four

The cap is four, and a cap that is a matter of taste is not a cap, so:

- **The column holds it.** The dossier is 340–380px, about 300px inside a
  card. At the ADR 0010 type floor a two-column grid gives plates of roughly
  145px, which is the narrowest a photograph can be and still be a plate — go
  below about 110px and it is chip-sized, and a chip carries no credit. Four
  is a complete 2×2 in that column. Six is a third row: something like 600px
  of pictures in a 700px pane, which is the slideshow ADR 0012 refused,
  rotated ninety degrees.
- **The editorial need asks for four, twice.** The kit list is headgear,
  rifle, machine gun, field gun. The army list on the Western Front in 1914 is
  Germany, France, Britain, Belgium. Both of `sand-y0u.5`'s axes land on four
  without being trimmed to fit.
- **Provenance accumulates faster than pictures.** Four archive credits in
  the dossier column measure about 440px — more than the four photographs
  above them, even gathered into one block at the type floor. Six would be a
  bibliography with illustrations, and the card would be about its own
  licensing.
- **Four is about where comparing stops and scanning starts.** Past four the
  eye stops holding the members against each other and starts reading down a
  list, at which point the shared axis is doing no work and the set has become
  the gallery by another route.

When four is not enough, the answer is never a fifth cell:

- The card's own picture slot is separate, so a kit card is one plate of the
  soldier entire **plus** a set of four items — which is exactly the six-item
  wish `sand-y0u.5` was written with, arranged so that it reads.
- A second axis is a second card, linked. "German kit" and "German artillery"
  are two comparisons, and pretending they are one is what produces an
  eight-picture card.
- A fifth army is a fifth card. The 1914 pack has five sides; the Western
  Front in August has four armies on it, and the eastern pack will have its
  own cards when it exists.

### Where it lives

`PlateSet` is a reusable schema piece, carried today by `TechCard` (the
variants side by side: the field guns of 1914) and `Formation` (the who-is-who
per army, which is where `sand-y0u.5`'s cards hang — the bead already opens
them from the legend and from formation tokens). Adding it to a third card
family is one optional field; the validator rule is generic and picks it up.

`src/ui/PlateSet.tsx` renders it, and renders no pictures of its own: every
plate is a `MediaFigure`, so the tone at rest, the credit line, the
missing-file frame, the loading rules and the full-size view all arrive from
ADR 0012 unchanged, and `src/ui/README.md`'s standing warning — that nothing
in there should grow a fourth way to crop a face round — is honoured by the
set having no crop of its own at all. The zoom control on each plate takes the
label as its accessible name ("See Pickelhaube at full size") so four buttons
are not called the same thing.

### What the validator enforces

The count is the schema's, in one place, with the reason in the message. The
validator adds what a schema cannot say: every plate resolves to a real
manifest; no picture appears twice in a set; no two plates claim the same
point on the axis (compared case- and whitespace-insensitively, because
"Belgium" and "belgium " are one point). A set that fails any of these still
renders — it just compares nothing, which is why it is an error and not a
warning.

`used_by` needs no new rule. It is the escape hatch ADR 0012 had to close for
beats, because a beat has exactly one slot and a manifest could claim it from
outside. A card renders `plates.items` and nothing else, so a manifest naming
a card in `used_by` is what it has always been: an author's note of intent,
reported as a dangling reference if the card does not exist.

## Alternatives considered

- **Just render `media: Id[]`, stacked.** The zero-work option: the array is
  already in the schema on four entities, so let a card show all of them one
  after another. Rejected because it is unbounded by construction, has no
  shared axis, no labels, and no claim — it is a scrolling strip of pictures
  inside a panel, which is the fourth surface in a coat that ADR 0006 and ADR
  0012 have each refused once already. The array stays what it is: the
  pictures an entity has, of which a renderer shows one.
- **A thumbnail row that opens a paged lightbox.** The conventional archive-site
  answer, and the most obviously "complete" one. Rejected outright by ADR
  0006: it is a browsable second surface, and it puts the comparison behind a
  "next" — which is precisely the thing a comparison cannot survive. Four
  pictures the reader must page between are four pictures they never see at
  the same time.
- **A credit block under every plate.** The literal reading of ADR 0012, and
  what the first cut of this component did. Measured in the gallery: a 101px
  photograph with a 217px credit under it, four times over. Each cell became a
  paragraph of grey with a stamp on top, and the pictures stopped lining up
  with each other because the credits wrap to different depths — which is the
  one thing a comparison cannot afford. Gathering the credits keeps every one
  of them on screen and gives the pictures the row back.
- **The credits behind a disclosure.** Would fix the height in one line.
  Rejected because ADR 0007 says every image _shows_ its credit, and a credit
  a reader has to open is not shown. The height is a cost of the pattern, and
  it is one of the reasons the pattern is capped.
- **One picture, and the rest behind a "more pictures" disclosure.** Keeps the
  card short, keeps ADR 0012 numerically intact, and looks like restraint.
  Rejected because a comparison whose members are not simultaneously visible
  is not a comparison, and a disclosure full of pictures is a gallery with a
  lid on it. It also fails the ADR 0006 glance/deep-dive rule in the awkward
  direction: the card was already the deep dive.
- **Composite the set into one image at pipeline time.** Genuinely tempting:
  one file, one plate, one credit, no new component, and this record would not
  need to exist. Rejected on four counts. It ships an altered photograph,
  which ADR 0007 forbids in spirit. It collapses four archives' credit lines
  into one, which the licences do not allow. It cannot be zoomed to a single
  member, cannot be re-cropped per breakpoint, and cannot take the tone
  treatment per picture. And the labels become baked pixels — unreachable by a
  screen reader, untranslatable, and unfixable without regenerating the file.
- **A cap of six, or no cap with a note about taste.** Six survives the
  editorial need and dies in the column: a third row of plates is most of the
  dossier's height. And "with taste" is what the schema said before ADR 0012,
  when a beat could carry as many pictures as somebody felt like. The lesson
  of that record is that the enforcement is the decision.

## Consequences

- `PlateSet` and `PLATE_SET_MAX` join `src/packs/schema/entities.ts`;
  `TechCard` and `Formation` gain an optional `plates`. `npm run schema`
  regenerates `schema/tech.schema.json` and `schema/formations.schema.json`
  with the cap and the two fits in them, so an author's editor refuses the
  fifth picture before the validator does.
- `checkPlateSet` in `src/packs/validate/validate.ts` runs for both, with
  tests in `validate.test.ts`; `docs/content-model.md` lists the rules.
- `src/ui/PlateSet.tsx` and `plate-set.css` render the set from tokens in both
  themes, and two specimens in the gallery (`plate-set`, `plate-set-portrait`)
  are where the treatment is reviewed — the cap and the floor, the two fits.
  `TechCardView` takes a `resolveMedia` prop and renders a set when the card
  carries one.
- `MediaFigure` gains `credit` (default on): a plate set is the only caller
  that turns it off, and it renders the same `MediaCredit` itself. If a second
  caller ever wants it, that is the moment to ask what it thinks it is doing.
- `sand-y0u.5` is unblocked: it authors kit manifests, hangs a `plates` set on
  each army's formation, and builds the formation card view that shows it. It
  does not get to decide how many pictures a card holds, which is the point.
- ADR 0012 is not superseded. One picture per beat still holds, the two
  placements still hold, and a plate in a set is the same plate it was.
- Any card family that wants pictures held against each other adds the
  optional field. Any proposal for a browsable set of pictures — paged,
  disclosed, or scrolling — must supersede this record and ADR 0006 together.
