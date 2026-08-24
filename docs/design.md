# Design system — tokens and identity

Sandtable's identity is a **lamp-lit General Staff war room**: parchment and
slate grounds, brass instruments, an oxblood family for one alliance and a
slate blue for the other; Fraunces for display, IBM Plex Sans for reading,
IBM Plex Mono for the instrument panel (dates, counters, eyebrows). The
design-system epic is `sand-neh`; this page is the token reference
(`sand-neh.1`). The information architecture is ADR 0006 (`sand-neh.5`); the
map style is `sand-neh.2`; components are `sand-neh.3`; motion is `sand-neh.4`.

## Where tokens live

- **Source of truth:** `src/styles/tokens.ts` — values for both themes, the
  shared type/spacing scale, and the WCAG contrast helpers.
- **Generated:** `src/styles/tokens.css` (`npm run tokens`); a test fails when
  it drifts, and another test fails when any text/ground pair drops below
  **AA 4.5:1** in either theme.
- **Consumers:** components use the CSS variables only — no literal colours or
  typefaces. The engine reads them at run time for deck.gl
  (`src/engine/layers/colors.ts`); the MapLibre style carries its own palette
  approximation until `sand-neh.2` drives it from the same source.

Theme model: bare `:root` is light; dark via `prefers-color-scheme` unless
`[data-theme="light"]` is stamped on `<html>`; `[data-theme="dark"]` forces
dark. The two `[data-theme]` blocks are not anchored to `:root`, so any
element can open a themed subtree — which is how the gallery below shows both
themes on one page.

## Reviewing components

`gallery.html` is the component gallery (`sand-neh.3`): every component in
`src/ui/`, in both themes, with the states worth arguing about. It is a second
Vite entry, so none of it ships in the app bundle.

- `npm run dev` → <http://localhost:5173/gallery.html>
- built and deployed with the site, so every PR preview has
  `https://pr-<n>.sandtable.davetashner.com/gallery.html`

A test (`src/gallery/Gallery.test.tsx`) fails when a component in `src/ui/` has
no specimen, so the gallery cannot quietly fall behind the library.

## Colour

| Token             | Role                                  | Light                         | Dark                          |
| ----------------- | ------------------------------------- | ----------------------------- | ----------------------------- |
| `--bg`            | page ground                           | `#e6dfcb`                     | `#10161a`                     |
| `--panel`         | dossier, timeline, controls           | `#efe9d8`                     | `#1a2228`                     |
| `--panel-2`       | chips, inputs, bands                  | `#e0d9c4`                     | `#202a31`                     |
| `--ink`           | body text                             | `#241f16`                     | `#e9e1cb`                     |
| `--muted`         | secondary text (AA on every ground)   | `#5f5849`                     | `#93998f`                     |
| `--brass`         | accent and instrument text (AA)       | `#745519`                     | `#c9a24b`                     |
| `--brass-dim`     | brass for rules and borders, not text | `#b7a97c`                     | `#6e6142`                     |
| `--line`          | hairlines                             | `#c9bfa4`                     | `#384049`                     |
| `--accent-red`    | readable warning/red text (✗, errors) | `#9a2e22`                     | `#e0765e`                     |
| `--army-1/2/3`    | oxblood family — Central Powers sides | `#9a2e22` `#832820` `#6e241e` | `#d45b3f` `#b94734` `#97392a` |
| `--french`        | slate blue — first Entente side       | `#24566e`                     | `#6fa6c4`                     |
| `--sea`, `--land` | map grounds                           | `#d6ccae` `#e6dfcb`           | `#0b1013` `#1d262c`           |

Contrast (AA ≥ 4.5 for text; the test enforces every cell):

| Text on ground     | light bg / panel / panel-2 | dark bg / panel / panel-2 |
| ------------------ | -------------------------- | ------------------------- |
| `--ink`            | 12.3 / 13.5 / 11.6         | 14.0 / 12.4 / 11.2        |
| `--muted`          | 5.3 / 5.8 / 5.0            | 6.3 / 5.5 / 5.0           |
| `--brass`          | 5.2 / 5.7 / 4.9            | 7.6 / 6.7 / 6.1           |
| `--accent-red`     | 5.7 / 6.2 / 5.3            | 6.0 / 5.3 / 4.8           |
| `--french`         | 6.0 / 6.6 / 5.7            | 6.9 / 6.1 / 5.5           |
| `--panel` on brass | 5.2                        | 6.7                       |

The army fills (`--army-2`, `--army-3`, dark `--army-1`) are **not** text
tokens: they colour tokens, trails and swatches, which always carry a label in
`--ink` or a panel-coloured outline. Use `--accent-red` when red must be read.

Sides map to the families in pack order (`src/engine/layers/colors.ts`):
Central Powers → `--army-1`, `--army-2`, `--army-3`; Entente → `--french`,
`--brass`, `--muted`; anything else → `--brass`, `--muted`, `--ink`.

## Type

| Token                     | Value                                               | Use                                                                                                                         |
| ------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `--font-display`          | Fraunces, Georgia, serif                            | titles, beat headings, the day counter; first-person vignettes at reading size, so a voice reads as a voice (`sand-1l0.24`) |
| `--font-body`             | IBM Plex Sans, system-ui                            | running text, controls                                                                                                      |
| `--font-mono`             | IBM Plex Mono, ui-monospace                         | dates, eyebrows, ticks, legends                                                                                             |
| `--fs-xs` … `--fs-3xl`    | 11.5 / 12.5 / 14.5 / 17 / 21 / 26 / clamp(24–34) px | ≈1.2 upward from a 14.5px body; compressed below it, where the 11px floor governs (ADR 0010)                                |
| `--lh-tight`, `--lh-body` | 1.2, 1.55                                           | headings, prose                                                                                                             |
| `--track-eyebrow`         | 0.12em                                              | uppercase mono eyebrows                                                                                                     |

Fonts load from Google Fonts in `index.html` (Fraunces 500–700 incl. italic,
Plex Sans 400–600, Plex Mono 400–600) with system fallbacks.

## Space, shape, motion

- Spacing on a 4px base: `--space-1` 4 · `--space-2` 8 · `--space-3` 12 ·
  `--space-4` 16 · `--space-5` 24 · `--space-6` 32.
- Radii: `--radius` 10px (surfaces), `--radius-sm` 8px (controls),
  `--radius-pill` (chips, toggles). Shadow: `--shadow` per theme.
- Motion: `--dur-fast` 120ms (hover), `--dur-base` 260ms (panel transitions),
  `--dur-camera` 1400ms (map flights); `--ease-out`. Everything animated must
  honour `prefers-reduced-motion` (the global reset zeroes durations).

## Photographs

The imagery policy is [ADR 0007](decisions/0007-imagery.md); how a photograph
looks on the page is [ADR 0012](decisions/0012-photographs.md). In short:

- **Two placements.** A **plate** is a figure with its caption and credit
  (`MediaFigure`, fits `band` / `portrait` / `contain`); a **chip** is a face
  at name size (`PortraitChip`, round, 26–44px, cropped to the manifest's
  focal point). A chip carries no credit — it is a name in the shape of a
  face, and the credit is one click away on the card behind it.
- **Toned at rest.** `--media-tone` is a per-theme filter chain: most of the
  colour out, the rest pushed towards brass. Plates and chips carry it at
  rest and come to full colour on hover or keyboard focus.
- **Where there is no hover, there is no tone.** The treatment lives inside
  `@media (hover: hover) and (pointer: fine)`, so a touch reader gets the
  picture in colour from the first paint. `prefers-contrast: more` and
  `forced-colors: active` drop it too, and the full-size view is never toned.
- **One picture per beat**, in the hero slot at the top, cropped to a 3:2
  band on the focal point so every beat opens the same way. The validator
  refuses a second one, whether it arrives as Markdown in the body or as a
  second manifest claiming the beat.
- **A card may hold a plate set** — two to four plates on one declared axis,
  one crop for the set, a label on each, all of them visible at once and no
  way to page through them, with the credits gathered into one block under the
  set rather than repeated under each picture (`PlateSet`,
  [ADR 0014](decisions/0014-plate-sets.md)). Never on a beat: a beat is what
  the reader is given, a card is what they asked for.
- **Credit travels with the picture.** `MediaCredit` renders the colorized
  label, the credit as the archive asks for it, and the way to the unaltered
  original — a link to the archive record, or a toggle in place where the
  project holds the original too.
- **Loading.** `loading="lazy"`, `decoding="async"`, intrinsic `width`/
  `height` so nothing reflows, and a `<picture>` source gated on
  `prefers-reduced-data: reduce` that offers the narrowest derivative. A
  missing file keeps its frame and its credit rather than showing a broken
  image.

## Map style

The basemap is Protomaps v4 (our own PMTiles archive) themed with the muted
palette in `src/engine/map/style.ts` and refined into a **staff map**
(`refineLayers`, `sand-neh.2`): rivers and their names are first-class from
campaign zoom (the Meuse, Sambre, Oise, Aisne, Marne, Ourcq, Morins, Seine are
the terrain of 1914), railways show from the start as a dashed brass-dim line,
modern boundaries, country/region names and points of interest are removed so
the historical-borders layer owns the political picture, motorways and trunk
roads recede until you zoom in, buildings wait for z13. Fortresses get a brass
ring in the places layer. Hillshade where the ground decided events (the Grand
Couronné, the Argonne, the Meuse heights) needs a terrain source — a follow-up.
Both themes come from the same palette table.

## Brand

The mark is a sand table seen from above — a tray of contoured sand with three
side-coloured tokens and one marching route — with SANDTABLE set in the display
serif, small caps, tracked out. Assets live in `public/brand/` (copied to the
site root on deploy): `wordmark-light.png` / `wordmark-dark.png` (the header
lockups, switched by theme), `sandtable-mark.png` (the tray mark on charcoal,
also the social image), `icon-16/32/192/512.png` and `apple-touch-icon.png`
(the square icon on charcoal, which reads on both light and dark browser
chrome). The wordmark is the `h1`; its light image carries the accessible name.
Era-agnostic by design: no period iconography in the mark.

## Rules of use

1. Variables only. A literal colour or typeface in a component is a bug.
2. Text goes on `--bg`, `--panel` or `--panel-2` in `--ink`, `--muted`,
   `--brass`, `--accent-red` or `--french` — nothing else is guaranteed AA.
3. Hypothetical = brass + dashed: dashed frames/strokes, the `?` mark, hatched
   timeline bands. Never red (red is a side colour).
4. The three surfaces — map, dossier, timeline — are the only panels (ADR 0006).
5. Change a value in `tokens.ts`, run `npm run tokens`, and let the contrast
   test tell you whether it still reads.
6. **Nothing is smaller than `--fs-xs`** (ADR 0010). A literal `font-size` under
   11px is a bug; the phone does not get smaller type than the desktop. The one
   exception is a standalone `aria-hidden` glyph sized to its own frame — a
   mark, not type.
7. **A photograph is a plate or a chip** (ADR 0012), toned at rest only where a
   pointer can hover, and never toned at full size. A fourth round `<img>` rule
   or a second picture in a beat is a bug.
