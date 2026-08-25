/**
 * Three marks on the boot path, so the performance budget (ADR 0016,
 * `sand-pmz.3`) is measured rather than guessed.
 *
 *   sandtable:pack-start / sandtable:pack-ready  the seed pack being read and
 *                                                validated (src/packs/seed.ts)
 *   sandtable:map-ready                          MapLibre's style is live and
 *                                                the deck overlay can project
 *                                                (src/engine/map/MapView.tsx)
 *
 * `scripts/perf-measure.mjs` reads them out of the page together with the
 * browser's own `first-contentful-paint`. They are `performance.mark` calls
 * and nothing else: no timers, no listeners, no reporting. Nothing in the app
 * reads them, and removing them would only make the boot path unmeasurable.
 *
 * Guarded because the mark buffer is not universal — jsdom has it, a very old
 * browser may not — and a missing stopwatch must never be a missing app.
 */
export function mark(name: string): void {
  try {
    performance.mark?.(name);
  } catch {
    /* measuring is never worth an exception */
  }
}
