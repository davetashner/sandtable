# 0012 — Photographs in the war room: toned at rest, one picture per beat

- **Status:** accepted
- **Date:** 2026-08-23
- **Bead:** `sand-y0u.4`

## Context

ADR 0007 settled where photographs come from and what may be done to them. It
did not settle how they look on the page, and by now that has been decided
seventeen times in a row by whoever was writing the component: the cast strip
crops a face round and picks a derivative at 160px, the vignette crops a face
round and picks a derivative at 160px, the person card floats a 132px
headshot, the beat hero fills the panel with whatever shape the picture
happens to be, and the map masks the same portraits into a canvas because
there is no CSS on a WebGL surface. All of it works. None of it is a system,
and two problems follow from that.

The first is identity. Full-colour archive photographs — colorized ones
especially — are the loudest thing on a parchment or slate panel. A dossier
column of brass rules, mono eyebrows and muted body text has one photograph in
it, and the photograph wins. The war-room identity asks for pictures that sit
in the room rather than punch a hole through it, without turning the project
into a sepia keepsake, which is exactly what it is trying not to be.

The second is the slideshow. A beat carries a hero image today. It could as
easily carry three: the schema permits one `media` id, but nothing stops an
author writing `![…](…)` into the Markdown, and nothing stops three manifests
naming the same beat as their placement. Every one of those additions would
be individually reasonable. Together they would turn the narrative panel into
a gallery with captions, which is the failure mode the bead names outright.

## Decision

### Two placements, and nothing else

A photograph appears as a **plate** or as a **chip**.

- A **plate** is a figure: the picture, and under it the caption, the credit,
  the colorized label and the way to the original. The beat hero, a person
  card's headshot, a document's photograph. `MediaFigure`, three fits —
  `band` (the hero), `portrait` (a headshot), `contain` (the whole picture).
- A **chip** is a face at name size: the cast strip, a vignette's voice, a
  commander on a card, a formation's commander. `PortraitChip`, round,
  cropped to the manifest's focal point, 26–44px.

A chip carries no caption and no credit, and this is a deliberate reading of
ADR 0007's "every image shows its credit". A chip is not a display of the
photograph — it is a name in the shape of a face, never bigger than the name
it stands for. The credit is one click away on the person's card, where the
picture is finally large enough for a credit to be about something the reader
can see. Anything larger than a chip is a plate and shows its credit.

### Toned at rest, full colour on attention

`--media-tone` is a per-theme filter chain (`src/styles/tokens.ts`): most of
the colour pulled out and what is left pushed towards brass — warm into the
parchment in light, cooler and a stop down in slate for dark. Plates and chips
carry it at rest and drop to full colour on hover or keyboard focus. It is a
filter chain rather than a duotone blend because it composites in one pass,
needs no extra element over the picture, and cannot leak onto the caption.

Three rules keep it from being a trick played on the reader:

1. **The rest state must stand alone.** The tone is mild by construction:
   every subject, uniform and face is fully legible without touching anything.
   Full colour is a reveal, not a rescue. A photograph that is only legible on
   hover is a photograph half the audience never sees.
2. **Where there is no hover, there is no tone.** The treatment lives inside
   `@media (hover: hover) and (pointer: fine)`. A touch reader can never
   hover, so they get the picture in full colour from the first paint rather
   than a state they have no way out of. The identity is a desktop grace note,
   not a toll gate.
3. **The full-size view is never toned.** Opening a picture is the reveal, on
   every device and every input. `prefers-contrast: more` and
   `forced-colors: active` drop the tone too: a reader who has asked the
   system for plain colours is not asking for our interpretation of the
   photograph. Reduced motion is already handled globally — the swap happens,
   it just does not cross-fade.

The map's commander icons stay untreated. They are masked into a canvas
(`src/engine/layers/portrait-icons.ts`), where there is no CSS to apply, and
the map has its own colour language of side colours and brass rings; a toned
face on a coloured disc reads as a rendering fault, not as an identity.

### One picture per beat, in one slot

The hero slot is at the top of the beat, under the title, and it is the beat's
only photograph. It is a **3:2 band cropped to the focal point**, not the
whole picture: a portrait used as a hero would otherwise be 425px tall in a
340px column and push every word of the beat below the fold. Every beat
therefore opens the same way, and the whole picture is one click away at full
size.

"One picture" is enforced, not requested. The schema already gives a beat a
single `media` id; the validator now adds the two ways round it:

- a Markdown image in a beat body is an error — a picture belongs in the slot
  that renders its caption and credit;
- two media manifests naming the same beat in `used_by` is an error — a beat
  has one hero image.

### Credit, and the original

One component renders the provenance line wherever a picture is shown
(`MediaCredit`), because "every image shows its credit" is a policy, and a
policy kept in two places is a policy kept in one and a half. It carries the
colorized label, the credit exactly as the archive asks for it, and the way to
the unaltered original: a link out to the archive record, or — where the
project holds a copy of the original beside the manifest (`original.file`) — a
toggle that swaps the picture in place and says which of the two is showing.
No manifest carries an original today; the pipeline and the UI are ready for
the first one that does.

### Loading

Every picture is `loading="lazy"`, `decoding="async"`, and carries its
intrinsic `width`/`height` so nothing reflows when the file lands. A plate
offers the narrowest derivative through a `<picture>` source gated on
`prefers-reduced-data: reduce`, which decides before the fetch — the one thing
CSS cannot do. When a file is missing, from the build or from the bucket, the
frame keeps its place, the caption and credit still show, and a dashed brass
placeholder says the picture is not in this build; a run-time load failure
falls into the same frame rather than a broken-image glyph.

## Alternatives considered

- **Full colour everywhere.** Honest and simple, and what most archive sites
  do. Rejected because the panel then belongs to whichever picture is on
  screen, and the identity ADR 0007 assumes — lamp-lit, instrumented — never
  survives contact with a bright colorization.
- **A true two-colour duotone (grayscale plus `mix-blend-mode` layers).**
  Prettier at the extremes and genuinely period. Rejected: it needs an element
  over the picture and an isolation context, both of which fight the zoom
  button, the name label and the caption, and it degrades badly where blend
  modes are unavailable.
- **Tone on every device, reveal by tap.** Consistent, and it was tempting.
  Rejected because a tap on a chip opens a card, not a colour: the touch
  reader would have had a rest state with no exit, which is the failure mode
  rule 1 exists to prevent.
- **A gallery of images per beat, or a lightbox carousel.** Rejected by the
  bead and by ADR 0006: a second scrolling thing in the dossier is a fourth
  surface wearing a coat.
- **Baking the tone into the derivatives at pipeline time.** Cheaper at run
  time, but it would mean shipping an altered photograph, which ADR 0007
  forbids in spirit and the reveal makes impossible anyway.

## Consequences

- `src/styles/tokens.ts` gains `--media-tone` per theme; `npm run tokens`
  regenerates `tokens.css` and `docs/design.md` documents the treatment.
- `MediaFigure`, `MediaCredit`, `MediaLightbox` and `PortraitChip` are the
  whole imagery surface of the library. `CastStrip` and `VignetteView` render
  chips instead of hand-rolling one each; the next card family that wants a
  face uses `PortraitChip` rather than a fourth round `<img>` rule.
- The validator refuses a second picture on a beat, so `sand-y0u.6` (the
  Phase 1 shot list) is a list of one image per beat by construction.
- `Media.original.file` is a new optional manifest field. Nothing uses it yet;
  the first colorization that ships its original turns every "show original"
  link on that image into an in-place toggle.
- Every component in this record has a specimen in the gallery
  (`gallery.html`, ADR 0010), which is where the treatment is reviewed in both
  themes.
