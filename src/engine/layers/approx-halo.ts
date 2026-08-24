/**
 * The halo an approximate position wears on the map (`sand-23b.4`).
 *
 * deck.gl draws circles and it draws icons, and it does not draw dashed
 * circles — `ScatterplotLayer` has one stroke and no dash array. So the ring
 * is an icon: a broken circle in an SVG data URL, loaded as a **mask**, which
 * means the layer keeps only its alpha and paints it with `getColor`. The
 * colour therefore still comes from the design tokens at run time, in both
 * themes, and no literal colour lives in the SVG.
 *
 * Broken rather than solid on purpose. The difference between a documented
 * position and a derived one must survive a reader who cannot see the colour
 * difference at all, so the treatment is a shape — a disc closed and certain,
 * or a token inside a ring of dashes that says the point is the middle of a
 * zone — with the colour and the `≈` on the label as the second and third
 * channels.
 */

/** Ring geometry, in the SVG's own 64×64 box. */
const BOX = 64;
const R = 27;
const STROKE = 7;
/** Sixteen dashes and sixteen gaps round the circumference: legible at 20 px. */
const DASH = (2 * Math.PI * R) / 32;

const SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${BOX}" height="${BOX}" viewBox="0 0 ${BOX} ${BOX}">` +
  `<circle cx="${BOX / 2}" cy="${BOX / 2}" r="${R}" fill="none" stroke="#fff" ` +
  `stroke-width="${STROKE}" stroke-linecap="butt" ` +
  `stroke-dasharray="${DASH.toFixed(2)} ${DASH.toFixed(2)}"/></svg>`;

/** The dashed ring, as a mask icon: alpha only, coloured by the layer. */
export const APPROX_HALO_ICON = {
  url: `data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`,
  width: BOX,
  height: BOX,
  id: 'approx-halo',
  mask: true,
} as const;

/**
 * How far outside a token of radius `r` the ring sits, in screen pixels —
 * the icon is sized so the drawn circle (diameter `2R/BOX` of the icon)
 * clears the token by `gap` px.
 */
export function haloSize(r: number, gap = 4): number {
  return ((r + gap) * 2 * BOX) / (2 * R);
}
