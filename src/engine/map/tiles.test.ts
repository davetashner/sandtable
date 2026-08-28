import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TILE_ARCHIVE, TILE_ARCHIVES, TileArchive } from '../../packs/schema/tiles.js';
import { DEFAULT_TILES_URL } from './style.js';
import { TILES_BASE, tilesUrlFor } from './tiles.js';

interface ManifestEntry {
  name: string;
  bbox: [number, number, number, number];
  maxzoom: number;
  status: 'uploaded' | 'planned' | 'retired';
  serves: string;
}

const manifest = JSON.parse(readFileSync('content/shared/geo/tiles/manifest.json', 'utf8')) as {
  entries: ManifestEntry[];
};

describe('tile archives', () => {
  it('resolves an archive name to the assets-bucket URL', () => {
    expect(tilesUrlFor('betio-z14')).toBe('/assets/tiles/betio-z14.pmtiles');
    expect(tilesUrlFor('betio-z14').startsWith(TILES_BASE)).toBe(true);
  });

  it('falls back to the archive every pack has been drawn on', () => {
    // The whole backwards-compatibility promise of `pack.tiles` in one line:
    // a pack that names nothing gets exactly the URL it got before the field
    // existed, so 1914 and 1915 do not move.
    expect(tilesUrlFor()).toBe(DEFAULT_TILES_URL);
    expect(tilesUrlFor()).toBe('/assets/tiles/central-europe-z10.pmtiles');
    expect(DEFAULT_TILE_ARCHIVE).toBe('central-europe-z10');
  });

  it('refuses a name that is not an archive', () => {
    // A closed list is the point: a typo is caught by the schema in the
    // validator, in the editor and again in the browser, rather than becoming
    // a URL nobody will ever serve.
    expect(TileArchive.safeParse('central-pacific-z10').success).toBe(true);
    expect(TileArchive.safeParse('central-pacific').success).toBe(false);
    expect(TileArchive.safeParse('/assets/tiles/central-europe-z10.pmtiles').success).toBe(false);
  });

  it('offers exactly what the manifest records, minus what it has retired', () => {
    const offered = manifest.entries.filter((e) => e.status !== 'retired').map((e) => e.name);
    expect(offered).toEqual([...TILE_ARCHIVES]);
    const retired = manifest.entries.filter((e) => e.status === 'retired').map((e) => e.name);
    for (const name of retired) expect(TILE_ARCHIVES).not.toContain(name);
  });

  it('records a bbox, a zoom and what it serves for every archive', () => {
    for (const e of manifest.entries) {
      expect(e.bbox, e.name).toHaveLength(4);
      expect(e.bbox[0], e.name).toBeLessThan(e.bbox[2]);
      expect(e.bbox[1], e.name).toBeLessThan(e.bbox[3]);
      expect(e.maxzoom, e.name).toBeGreaterThan(0);
      expect(e.serves, e.name).toBeTruthy();
    }
  });
});
