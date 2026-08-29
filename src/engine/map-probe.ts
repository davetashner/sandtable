/**
 * What the map actually drew, published for the visual gate to read
 * (`sand-pmz.9.2`).
 *
 * The gate's blind spot has a shape: everything the map draws lives inside one
 * `<canvas>`, and the DOM audit reads the boxes of DOM elements. So half the
 * product is invisible to it except for the size of the box it sits in. PR
 * #161 drew every antimeridian-crossing route the long way round the planet —
 * about 318° of longitude against a declared 106° — and the gate was green,
 * correctly, on all four of its assertions.
 *
 * This is the handle that closes it. After the layers are built, the numbers
 * below are computed from data already in memory and hung on `window`, where
 * `scripts/lib/visual-scenes.mjs` reads them with one `page.evaluate`. No
 * fonts, no rasteriser, no network, no timing: the same inputs give the same
 * answer on a laptop and on a runner grinding through SwiftShader, which is
 * what ADR 0011 demands of anything it gates on.
 *
 * ## Why a global, and why not a query parameter
 *
 * A debug surface is a product surface, so this one is off unless something
 * the gate does and a reader never does has switched it on.
 *
 * The obvious flag — `?probe=1` — is the wrong one, and the URL contract is
 * why. `parseViewState` collects every parameter it does not know into
 * `extra`, and `formatViewState` re-emits them (ADR 0009 rule 4,
 * `src/engine/url-state.ts`). A probe parameter would therefore be *sticky*:
 * set once, it would follow the reader into every URL the app writes and into
 * every link they copied out of the address bar.
 *
 * `window.__sandtableProbe` has none of that. Playwright sets it with
 * `addInitScript` before the document exists; a reader cannot set it by
 * visiting any URL at all, only by typing it into a console, at which point
 * they have devtools open and are entitled to whatever they can reach. The
 * URL contract is untouched, and nothing is written unless it is asked for.
 *
 * Nothing in the app reads what this publishes. It follows `perf.ts`'s
 * precedent exactly: publish for the harness, guard against the environment,
 * and never let measuring cost an exception.
 */
import { lngSpan, wrapLng, type Box } from './geo';

/**
 * One layer: how many objects it was handed, the widest single path in it, and
 * the arc its placed points occupy. Per layer, because a report that names the
 * layer is actionable and one that names only the scene is a search.
 */
export type LayerCount = {
  readonly id: string;
  readonly count: number;
  /** The widest path in this layer, in degrees of longitude. */
  readonly widestPath: number;
  /** The narrowest arc containing this layer's placed points. */
  readonly arc: number;
};

export type MapProbe = {
  /** Every layer handed to deck, in draw order. */
  readonly layers: readonly LayerCount[];
  /** The widest single path anywhere, and the layer it is in. */
  readonly widestPath: { readonly layer: string; readonly span: number } | null;
  /** The narrowest arc containing every placed point in the scene. */
  readonly arc: number;
  /** How many coordinates were seen at all — zero means nothing was drawn. */
  readonly points: number;
  /** The region the pack declared for this view — a zoom-in's, if focused. */
  readonly declared: { readonly bbox: Box; readonly lngSpan: number };
};

declare global {
  interface Window {
    /**
     * Set by the visual harness with `addInitScript`, before the document
     * exists. When it is absent — which is every real page load — nothing is
     * computed and nothing is published.
     */
    __sandtableProbe?: boolean;
    /** What the map drew, when `__sandtableProbe` asked for it. */
    __sandtableMap?: MapProbe;
  }
}

/**
 * The longitudes of one path, and of one placed object, kept apart — because
 * they are not comparable, which is the whole finding behind this module.
 *
 * `unwrapLngs` makes a *path* continuous by moving its points whole turns, and
 * it leaves the first point where the author put it. So two routes in the same
 * layer can describe the same meridian a full turn apart: the Pacific pack
 * draws one trail ending at 203° and another sitting at −157.99°, which are
 * the same place. Any extent taken across both is meaningless, and measured
 * 361° on a pack that renders perfectly.
 */
function geometryOf(data: unknown): { paths: number[][]; points: [number, number][] } {
  const paths: number[][] = [];
  const points: [number, number][] = [];
  if (!Array.isArray(data)) return { paths, points };
  const isPoint = (p: unknown): p is [number, number] =>
    Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number';
  for (const row of data) {
    if (row === null || typeof row !== 'object') continue;
    const r = row as { path?: unknown; position?: unknown };
    if (Array.isArray(r.path)) {
      const lngs: number[] = [];
      for (const p of r.path) if (isPoint(p)) lngs.push(p[0]);
      if (lngs.length) paths.push(lngs);
    } else if (isPoint(r.position)) {
      points.push(r.position);
    }
  }
  return { paths, points };
}

/**
 * The width of one path in degrees of longitude, on the coordinates the
 * renderer was actually handed.
 *
 * This is the number that catches PR #161, and the reason it works is that
 * `unwrapLngs` guarantees no step between neighbours exceeds 180°. A theatre
 * route that has been unwrapped is therefore narrow — Hitokappu Bay to Oahu is
 * 54° — while the same route left wrapped is the rest of the planet, because
 * the renderer draws the segment −158 → 147.7 westward across Asia. A global
 * bounding box cannot tell those apart, since unwrapping moves points by whole
 * turns and leaves the set's extent unchanged; the span of a single path can.
 */
export function pathSpan(lngs: readonly number[]): number {
  if (lngs.length === 0) return 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (const lng of lngs) {
    if (lng < lo) lo = lng;
    if (lng > hi) hi = lng;
  }
  return hi - lo;
}

/**
 * The narrowest arc of longitude containing every point — the honest width of
 * a scatter of places, whichever side of 180° each was written on. Sort, find
 * the widest gap between neighbours, and the answer is what is left of the
 * circle. Unlike `pathSpan` this is turn-convention-proof, which is what a set
 * of independent points needs and a path must not have.
 */
export function enclosingArc(lngs: readonly number[]): number {
  if (lngs.length === 0) return 0;
  const sorted = [...lngs].map(wrapLng).sort((a, b) => a - b);
  if (sorted.length === 1) return 0;
  let widestGap = sorted[0]! + 360 - sorted[sorted.length - 1]!;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i]! - sorted[i - 1]!;
    if (gap > widestGap) widestGap = gap;
  }
  return 360 - widestGap;
}

/**
 * The snapshot, as a pure function of the layers and the declared region, so
 * that it can be tested without a browser. The assertion is only worth what
 * this function is worth, and a probe with no test of its own is an assertion
 * checking a mirror.
 */
export function mapProbe(input: {
  readonly layers: readonly { readonly id: string; readonly props?: { data?: unknown } }[];
  readonly region: Box;
  readonly focusRegion?: Box | undefined;
}): MapProbe {
  const layers: LayerCount[] = [];
  const allPointLngs: number[] = [];
  let widest: { layer: string; span: number } | null = null;
  let seen = 0;

  for (const layer of input.layers) {
    const data = layer.props?.data;
    const { paths, points } = geometryOf(data);
    let widestHere = 0;
    for (const lngs of paths) {
      seen += lngs.length;
      const span = pathSpan(lngs);
      if (span > widestHere) widestHere = span;
    }
    const pointLngs = points.map((p) => p[0]);
    seen += pointLngs.length;
    allPointLngs.push(...pointLngs);
    layers.push({
      id: layer.id,
      count: Array.isArray(data) ? data.length : 0,
      widestPath: widestHere,
      arc: enclosingArc(pointLngs),
    });
    if (widest === null || widestHere > widest.span) widest = { layer: layer.id, span: widestHere };
  }

  // A zoom-in declares its own region, and it is the one the reader is looking
  // at, so it is the one to judge against.
  const declared = input.focusRegion ?? input.region;
  return {
    layers,
    widestPath: widest && widest.span > 0 ? widest : null,
    arc: enclosingArc(allPointLngs),
    points: seen,
    declared: { bbox: declared, lngSpan: lngSpan(declared) },
  };
}

/**
 * Publish, if asked. Guarded twice: once on the flag, once on anything the
 * computation might throw, because a measurement is never worth an exception.
 */
export function publishMapProbe(input: Parameters<typeof mapProbe>[0]): void {
  try {
    if (typeof window === 'undefined' || window.__sandtableProbe !== true) return;
    window.__sandtableMap = mapProbe(input);
  } catch {
    /* measuring is never worth an exception */
  }
}
