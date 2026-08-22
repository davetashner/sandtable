// @vitest-environment node
/**
 * The committed border files must exist for every target year, parse, carry
 * provenance, and cover every pack's borderYear.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BORDERS_DIR, missingBorders, readManifest, TARGETS } from './fetch-borders.js';
import { readContent } from './lib/read-content.js';

interface BordersFile {
  type: string;
  targetYear: number;
  sourceYear: number;
  attribution: string;
  caveat: string;
  features: { type: string; properties: Record<string, unknown> }[];
}

describe('content/shared/geo/borders', () => {
  it('has a file for every target year and a manifest that matches', () => {
    expect(missingBorders()).toEqual([]);
    const manifest = readManifest();
    expect(manifest).toBeDefined();
    expect(manifest!.entries.map((e) => e.year)).toEqual(TARGETS.map((t) => t.year));
    expect(manifest!.licence).toMatch(/GPL-3.0/);
  });

  it('files are FeatureCollections with provenance and the kept fields', () => {
    for (const t of TARGETS) {
      const geo = JSON.parse(
        readFileSync(join(BORDERS_DIR, `${t.year}.geojson`), 'utf8'),
      ) as BordersFile;
      expect(geo.type).toBe('FeatureCollection');
      expect(geo.targetYear).toBe(t.year);
      expect(geo.sourceYear).toBe(t.source);
      expect(geo.attribution).toMatch(/historical-basemaps/);
      expect(geo.features.length).toBeGreaterThan(100);
      expect(Object.keys(geo.features[0]!.properties)).toEqual(
        expect.arrayContaining(['NAME', 'SUBJECTO', 'BORDERPRECISION']),
      );
    }
  });

  it('every pack declares a borderYear that has a file', () => {
    const { content } = readContent('content');
    for (const p of content.packs) {
      const year = (p.pack.data as { borderYear: number }).borderYear;
      expect(
        TARGETS.map((t) => t.year),
        `${p.dir} borderYear ${year}`,
      ).toContain(year);
    }
  });
});
