# src/ui

React components for the three surfaces (map chrome, dossier, timeline) and
the controls — built from the design tokens in `src/styles/tokens.css` and the
component library story (`sand-neh.3`). No literal colours or typefaces here.

Photographs are `MediaFigure` (a plate: the picture with its caption and
credit), `PortraitChip` (a face at name size) and `MediaLightbox` (the same
picture at full size); `MediaCredit` is the provenance line all of them
render. They are toned at rest and come to full colour on attention — the
treatment, the placements and the one-picture-per-beat rule are
[ADR 0012](../../docs/decisions/0012-photographs.md). Nothing here should
grow a fourth way to crop a face round.

`CopyLink.tsx` is the ⧉ glyph in the header that copies the address of the
current view; what makes it work is that the URL is always the whole view
(ADR 0009, `src/engine/url-state.ts`).

Every component here has a specimen in the gallery (`gallery.html`,
`src/gallery/`), which shows the library in both themes on real pack content;
`src/gallery/Gallery.test.tsx` fails when a new component has none.
