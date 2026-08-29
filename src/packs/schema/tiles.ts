/**
 * The basemap archives a pack may name (`sand-lry.18`).
 *
 * A pack names an **archive**, not a URL: `"central-pacific-z10"`, never
 * `"/assets/tiles/central-pacific-z10.pmtiles"`. Where the tiles are served
 * from is a deployment fact — ADR 0004 puts them in the assets bucket, and the
 * path has already changed once — and content that carries a URL carries that
 * decision with it into every pack.json ever written. The engine resolves the
 * name (`src/engine/map/tiles.ts`); content says which map it wants.
 *
 * The list is closed, and a Zod enum rather than a slug, because an archive
 * that is not on this list is a typo rather than a deployment we have not done
 * yet: every archive that exists or is planned was written down in ADR 0002
 * before it was extracted. A closed list also means a mistyped name is caught
 * by the schema — in the validator, in the editor through
 * `schema/pack.schema.json`, and again in the browser when the pack lands —
 * instead of resolving to a URL nobody will ever serve.
 *
 * Whether an archive is *uploaded* is a different question, and deliberately
 * not one the schema answers: the assault-scale extracts are authored and not
 * yet in the bucket (`sand-lry.17`). Naming one is correct and gets a 404, which the
 * map reports as a missing basemap rather than a blank canvas
 * (`src/engine/map/MapView.tsx`). The provenance of each archive — its bbox,
 * its maximum zoom, whether it has been uploaded, and what it serves — lives
 * in `content/shared/geo/tiles/manifest.json`, the way the borders manifest
 * carries the provenance of the border years. `src/engine/map/tiles.test.ts`
 * holds the two in step.
 */
import { z } from 'zod';

/**
 * Every archive a pack may name, in the order ADR 0002 lists them: the
 * European extracts, then theatre scale, then assault scale.
 */
export const TILE_ARCHIVES = [
  'central-europe-z10',
  'world-z6',
  'eastern-europe-z10',
  'east-asia-z10',
  'central-pacific-z10',
  'sw-pacific-z10',
  'philippines-z10',
  'oahu-z13',
  'midway-z13',
  'guadalcanal-z13',
  'betio-z14',
  'peleliu-z14',
  'iwo-jima-z14',
  'okinawa-z13',
  'port-arthur-z14',
] as const;

export const TileArchive = z.enum(TILE_ARCHIVES);
export type TileArchive = z.infer<typeof TileArchive>;

/**
 * What a pack gets when it names no archive: the Central-Europe extract every
 * pack has been served since `sand-pmz.6`. Existing packs therefore do not
 * move when `tiles` arrives, which is the whole reason the field is optional.
 */
export const DEFAULT_TILE_ARCHIVE: TileArchive = 'central-europe-z10';
