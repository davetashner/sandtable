// @vitest-environment node
/**
 * The committed front line must be in step with the file it is generated from,
 * every snapshot must cite a registered source, and the validator must actually
 * catch the authoring mistakes this format makes easy (sand-g80.1).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildGeoJSON,
  FRONT_DIR,
  lengthKm,
  OUTPUT_FILE,
  readSource,
  resolve,
  validate,
  type FrontSource,
  type Snapshot,
} from './build-front.js';

const doc = readSource();
const registry = new Set(
  (JSON.parse(readFileSync('content/shared/sources/sources.json', 'utf8')) as { id: string }[]).map(
    (s) => s.id,
  ),
);

/** A deep copy, so a test can break one snapshot without breaking the others. */
const clone = (): FrontSource => JSON.parse(JSON.stringify(doc)) as FrontSource;

describe('content/shared/geo/front', () => {
  it('the authored source is valid and every citation resolves', () => {
    expect(validate(doc, registry)).toEqual([]);
  });

  it('the committed GeoJSON is what the source generates', () => {
    const committed = readFileSync(join(FRONT_DIR, OUTPUT_FILE), 'utf8');
    expect(committed).toBe(JSON.stringify(buildGeoJSON(doc), null, 2) + '\n');
  });

  it('covers the war from the end of the movement to the Armistice', () => {
    const dates = doc.snapshots.map((s) => s.date);
    expect(dates[0]).toBe('1914-11-25');
    expect(dates.at(-1)).toBe('1918-11-11');
    expect([...dates].sort()).toEqual(dates);
    for (const year of ['1915', '1916', '1917', '1918'])
      expect(dates.some((d) => d.startsWith(year))).toBe(true);
  });

  it('says how good the geometry is, on the collection and on every snapshot', () => {
    const geo = buildGeoJSON(doc);
    expect(geo.method).toMatch(/not a digitised trace/);
    for (const f of geo.features) {
      expect(['high', 'medium', 'low']).toContain(f.properties.precision);
      expect(f.properties.sources.length).toBeGreaterThan(0);
      expect(f.properties.through.length).toBe(f.geometry.coordinates.length);
    }
  });

  it('the Hindenburg withdrawal shortens the line, and the salients lengthen it', () => {
    const km = new Map(
      buildGeoJSON(doc).features.map((f) => [f.properties.date, f.properties.lengthKm]),
    );
    // Alberich pulled the line back to a shorter one — the whole point of it.
    expect(km.get('1917-04-05')!).toBeLessThan(km.get('1916-12-18')! - 25);
    // Michael and Blücher bought ground by bulging, which costs frontage.
    expect(km.get('1918-07-17')!).toBeGreaterThan(km.get('1918-04-05')!);
    // By late September the salients are gone and the line is the shortest it has been.
    expect(km.get('1918-09-26')!).toBeLessThan(km.get('1918-07-17')! - 75);
  });

  it('every snapshot runs from the northern anchor to the Swiss frontier', () => {
    for (const f of buildGeoJSON(doc).features) {
      const c = f.geometry.coordinates;
      expect(c[0]![1]).toBeGreaterThan(51);
      expect(c.at(-1)!).toEqual(doc.gazetteer['pfetterhouse']!.lngLat);
      expect(lengthKm(c)).toBeGreaterThan(500);
    }
  });
});

describe('the validator', () => {
  const first = (problems: string[]) => problems[0] ?? '';

  it('catches a control point that is not in the gazetteer', () => {
    const d = clone();
    d.snapshots[0]!.through[5] = 'nowhere-at-all';
    expect(first(validate(d, registry))).toMatch(/unknown control point "nowhere-at-all"/);
  });

  it('catches a name moved into the wrong part of the line', () => {
    const d = clone();
    const t = d.snapshots[0]!.through;
    // Move the Swiss anchor into the middle of Flanders: two 500 km segments.
    t.splice(4, 0, t.pop()!);
    expect(validate(d, registry).filter((p) => /km from/.test(p)).length).toBe(2);
  });

  it('catches a snapshot that stops short of the Swiss frontier', () => {
    const d = clone();
    d.snapshots[0]!.through.splice(-14);
    expect(validate(d, registry).some((p) => /short of the Swiss frontier/.test(p))).toBe(true);
  });

  it('catches a snapshot that stops short of the sea', () => {
    const d = clone();
    d.snapshots[0]!.through.splice(0, 12);
    expect(validate(d, registry).some((p) => /short of the northern anchor/.test(p))).toBe(true);
  });

  it('catches a citation to a work that is not in the registry', () => {
    const d = clone();
    d.snapshots[1]!.sources = [{ source: 'source:not-a-real-book' }];
    expect(first(validate(d, registry))).toMatch(/not in the source registry/);
  });

  it('catches an uncited snapshot', () => {
    const d = clone();
    d.snapshots[1]!.sources = [];
    expect(first(validate(d, registry))).toMatch(/must cite a source/);
  });

  it('catches dates out of order and duplicated', () => {
    const d = clone();
    d.snapshots[3]!.date = d.snapshots[1]!.date;
    const problems = validate(d, registry);
    expect(problems.some((p) => /duplicate date/.test(p))).toBe(true);
    expect(problems.some((p) => /dates must ascend/.test(p))).toBe(true);
  });

  it('catches a control point left in the gazetteer that nothing uses', () => {
    const d = clone();
    d.gazetteer['somewhere-unused'] = { name: 'Somewhere', lngLat: [3, 50] };
    expect(validate(d, registry).some((p) => /no snapshot uses it/.test(p))).toBe(true);
  });

  it('catches a coordinate typed outside the Western Front', () => {
    const d = clone();
    d.gazetteer['arras-east']!.lngLat = [22.5, 50.291];
    expect(validate(d, registry).some((p) => /outside the Western Front/.test(p))).toBe(true);
  });
});

describe('resolve', () => {
  it('maps names to the gazetteer coordinates in order', () => {
    const snap = { date: '1914-11-25', through: ['nieuwpoort', 'dixmude'] } as Snapshot;
    expect(resolve(snap, doc.gazetteer)).toEqual([
      doc.gazetteer['nieuwpoort']!.lngLat,
      doc.gazetteer['dixmude']!.lngLat,
    ]);
  });
});
