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

`PlateSet.tsx` is the one exception to one-picture-at-a-time, and it is an
exception with a fence around it: two to four plates on a single declared
axis, one crop for all of them, a label on each, everything visible at once
and no way to page through it ([ADR 0014](../../docs/decisions/0014-plate-sets.md)).
It renders no picture of its own — every plate is a `MediaFigure` — and the
cap lives in the schema, not in anyone's judgement. The one thing a set does
differently is gather the provenance: one `MediaCredit` block under the set,
one line per plate, because four credit blocks under four small pictures are
mostly credit.

`ChapterIndex.tsx` is the pack's table of contents in the breadcrumb row: it
rests closed as one control and names each level for what the engine says it
is — `isChapter` in `src/engine/focus.ts` — rather than calling the whole row
one thing (ADR 0013). Each open entry is dated by what its `window` means
(ADR 0015, `sand-neh.23`): a real window prints as a span, and a `"placed"`
one — a chapter sitting somewhere on the campaign strip rather than at its own
date — says `dates inside`, because a gap in a column of dates reads as a
defect rather than as a silence anybody chose.

`Derivations.tsx` is the footnote under a card that says how the map's
positions were derived (`sand-23b.4`): the pack's own `derivation` sentence
per route leg or commander track, what the confidence word means, and — where
the pack says the position is `low` or `contested` — that this is why the
token on the map is drawn open inside a dashed ring. It renders in
`FormationCardView` and `PersonCardView`, which are the two cards a map token
opens; ADR 0006 is why it is a section of a card rather than a tooltip or a
panel of its own. A formation's counterfactual route legs are left out on
purpose: a branch is labelled as hypothetical wherever it is shown, and its
derivation is a statement about a line nobody marched. There is exactly one
component rendering this footnote, and adding a third caller means giving it
`Derivation[]`, not writing a second one.

`CopyLink.tsx` is the ⧉ glyph in the header that copies the address of the
current view; what makes it work is that the URL is always the whole view
(ADR 0009, `src/engine/url-state.ts`).

Two rules bind everything here and are checked rather than asked for: a
control is at least 24×24px and keeps its `:focus-visible` ring, and a role is
never written down that the element already has — `role="listitem"` on a button
takes the button away. The keyboard run-through, the measurements and the two
inline cases the target rule exempts are `docs/accessibility.md`; the axe gate
that runs on every push is `src/a11y.test.tsx`.

Every component here has a specimen in the gallery (`gallery.html`,
`src/gallery/`), which shows the library in both themes on real pack content;
`src/gallery/Gallery.test.tsx` fails when a new component has none.
