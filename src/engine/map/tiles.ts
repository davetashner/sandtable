/**
 * Archive name → basemap URL (`sand-lry.18`).
 *
 * The only place that knows where the PMTiles archives are served from. A pack
 * names an archive (`src/packs/schema/tiles.ts`); this turns that name into
 * the URL `scripts/tiles-extract.sh` uploads to and the assets bucket answers
 * on (ADR 0002/0004). Keeping the two apart is what lets the bucket layout
 * change without rewriting content — it has changed once already, and the
 * packs written before it would have carried the old path forever.
 *
 * Deliberately not a registry lookup at run time: resolution is a string
 * substitution, so the map's first request goes out without waiting on a
 * manifest fetch it would only have used to rebuild a name it already had.
 */
import { DEFAULT_TILE_ARCHIVE } from '../../packs/schema/tiles.js';

/** Where the assets bucket serves the archives from, on every deployment. */
export const TILES_BASE = '/assets/tiles';

/**
 * The URL of an archive by name; the Central-Europe default when a pack names
 * none. Not validated here — the schema's enum has already refused anything
 * that is not an archive by the time a name reaches this.
 */
export function tilesUrlFor(archive: string = DEFAULT_TILE_ARCHIVE): string {
  return `${TILES_BASE}/${archive}.pmtiles`;
}
