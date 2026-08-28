#!/usr/bin/env tsx
/**
 * Front-line pipeline (sand-g80.1).
 *
 * Turns the authored `content/shared/geo/front/western-front.json` — a
 * gazetteer of named control points plus one dated snapshot per list of them —
 * into `western-front.geojson`, which is what the app fetches, plus a
 * manifest recording the method and its accuracy. The deploy workflows sync
 * `content/shared/geo` to the assets bucket, so the app reads
 * `/assets/geo/front/western-front.geojson`.
 *
 *   npm run front            # rebuild the GeoJSON and the manifest
 *   npm run front -- --check # exit 1 if the committed output is stale
 *
 * The point of generating rather than hand-editing the GeoJSON is that the
 * *claim* stays reviewable: a snapshot is a list of place names and a citation,
 * so a diff says "the line moved from Neuville-Saint-Vaast to Avion" instead of
 * showing four hundred changed coordinates. The checks below are the other
 * half of that — they catch the authoring mistakes this format makes easy
 * (a name out of order, a segment dropped, a line that stops short of the sea).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readRegistry } from './lib/registry.js';

export const FRONT_DIR = 'content/shared/geo/front';
export const SOURCE_FILE = 'western-front.json';
export const OUTPUT_FILE = 'western-front.geojson';

/** How far apart two consecutive control points may be before it reads as a gap. */
const MAX_SEGMENT_KM = 45;
/** The Western Front ran about 700–750 km; a salient lengthens it, 1918 shortens it. */
const LENGTH_BAND_KM = [500, 850] as const;
/** The line is anchored on the North Sea or the Dutch frontier, and on Switzerland. */
const NORTH_ANCHOR_LAT = 51.0;
const SOUTH_ANCHOR_LAT = 47.7;

export type Precision = 'high' | 'medium' | 'low';

export interface ControlPoint {
  name: string;
  lngLat: [number, number];
}
export interface Citation {
  source: string;
  pages?: string;
  note?: string;
}
export interface Snapshot {
  date: string;
  label: string;
  precision: Precision;
  summary: string;
  sources: Citation[];
  through: string[];
}
export interface FrontSource {
  $comment?: string;
  gazetteer: Record<string, ControlPoint>;
  snapshots: Snapshot[];
}

export function readSource(dir = FRONT_DIR): FrontSource {
  return JSON.parse(readFileSync(join(dir, SOURCE_FILE), 'utf8')) as FrontSource;
}

const R_KM = 6371;
/** Great-circle distance in km. */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

export function lengthKm(points: [number, number][]): number {
  let km = 0;
  for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1]!, points[i]!);
  return km;
}

/** Resolve a snapshot's control-point names to coordinates. Throws on an unknown name. */
export function resolve(
  snap: Snapshot,
  gazetteer: Record<string, ControlPoint>,
): [number, number][] {
  return snap.through.map((key) => {
    const p = gazetteer[key];
    if (!p) throw new Error(`${snap.date}: unknown control point "${key}"`);
    return p.lngLat;
  });
}

/**
 * Everything that can be checked without knowing any history: that the names
 * resolve, that the dates are a strictly ascending series of ISO days, that the
 * line still runs from one anchor to the other, and that no two consecutive
 * points are far enough apart to mean a segment was dropped.
 */
export function validate(doc: FrontSource, knownSources?: Set<string>): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  let previousDate = '';

  for (const key of Object.keys(doc.gazetteer)) {
    const p = doc.gazetteer[key]!;
    const [lng, lat] = p.lngLat;
    if (!p.name) problems.push(`gazetteer "${key}": no name`);
    if (lng < 1.5 || lng > 8.5 || lat < 46.5 || lat > 51.8)
      problems.push(`gazetteer "${key}": ${lng},${lat} is outside the Western Front`);
  }

  const usedPoints = new Set<string>();
  for (const snap of doc.snapshots) {
    const where = snap.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(snap.date)) problems.push(`${where}: date is not an ISO day`);
    if (seen.has(snap.date)) problems.push(`${where}: duplicate date`);
    seen.add(snap.date);
    if (snap.date <= previousDate)
      problems.push(`${where}: dates must ascend (after ${previousDate})`);
    previousDate = snap.date;

    if (!snap.label) problems.push(`${where}: no label`);
    if (!snap.summary) problems.push(`${where}: no summary`);
    if (!['high', 'medium', 'low'].includes(snap.precision))
      problems.push(`${where}: precision must be high, medium or low`);
    if (!snap.sources?.length) problems.push(`${where}: a snapshot must cite a source`);
    for (const c of snap.sources ?? []) {
      if (!c.source?.startsWith('source:')) problems.push(`${where}: citation is not a source id`);
      else if (knownSources && !knownSources.has(c.source))
        problems.push(`${where}: cites ${c.source}, which is not in the source registry`);
    }

    for (const key of snap.through) usedPoints.add(key);
    let points: [number, number][];
    try {
      points = resolve(snap, doc.gazetteer);
    } catch (e) {
      problems.push((e as Error).message);
      continue;
    }
    if (points.length < 10) problems.push(`${where}: only ${points.length} control points`);
    for (let i = 1; i < snap.through.length; i++) {
      if (snap.through[i] === snap.through[i - 1])
        problems.push(`${where}: "${snap.through[i]}" repeated`);
    }
    for (let i = 1; i < points.length; i++) {
      const km = haversineKm(points[i - 1]!, points[i]!);
      if (km > MAX_SEGMENT_KM)
        problems.push(
          `${where}: ${km.toFixed(0)} km from "${snap.through[i - 1]}" to "${snap.through[i]}" — ` +
            `a gap that size usually means a segment was dropped or two names are out of order`,
        );
    }
    const first = points[0]!;
    const last = points[points.length - 1]!;
    if (first[1] < NORTH_ANCHOR_LAT)
      problems.push(
        `${where}: starts at "${snap.through[0]}" (${first[1]}), short of the northern anchor`,
      );
    if (last[1] > SOUTH_ANCHOR_LAT)
      problems.push(
        `${where}: ends at "${snap.through[snap.through.length - 1]}" (${last[1]}), short of the Swiss frontier`,
      );
    const km = lengthKm(points);
    if (km < LENGTH_BAND_KM[0] || km > LENGTH_BAND_KM[1])
      problems.push(
        `${where}: the line is ${km.toFixed(0)} km, outside ${LENGTH_BAND_KM.join('–')} km`,
      );
  }

  for (const key of Object.keys(doc.gazetteer))
    if (!usedPoints.has(key)) problems.push(`gazetteer "${key}": no snapshot uses it`);

  return problems;
}

export interface FrontFeature {
  type: 'Feature';
  id: string;
  properties: {
    date: string;
    /** Epoch ms, so the map can pick a snapshot without parsing. */
    at: number;
    label: string;
    precision: Precision;
    summary: string;
    sources: Citation[];
    /** The named control points, in order — the claim behind the geometry. */
    through: string[];
    lengthKm: number;
  };
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}

export function buildGeoJSON(doc: FrontSource) {
  const features: FrontFeature[] = doc.snapshots.map((snap) => {
    const coordinates = resolve(snap, doc.gazetteer);
    return {
      type: 'Feature' as const,
      id: `front:${snap.date}`,
      properties: {
        date: snap.date,
        at: Date.parse(`${snap.date}T00:00:00Z`),
        label: snap.label,
        precision: snap.precision,
        summary: snap.summary,
        sources: snap.sources,
        through: snap.through.map((k) => doc.gazetteer[k]!.name),
        lengthKm: Math.round(lengthKm(coordinates)),
      },
      geometry: { type: 'LineString' as const, coordinates },
    };
  });
  return {
    type: 'FeatureCollection' as const,
    attribution: 'Western Front snapshots © Sandtable, from the works cited on each snapshot',
    method:
      'A schematic through named control points, not a digitised trace: each snapshot is the ' +
      'sequence of localities the front is recorded as running through or immediately beside on ' +
      'that date, joined by straight segments. Good to about five kilometres. Battle zoom-ins ' +
      'draw their own geometry.',
    features,
  };
}

function sourceRegistry(): Set<string> {
  return new Set(readRegistry<{ id: string }>('content', 'sources').map((r) => r.id));
}

function render(doc: FrontSource): string {
  return JSON.stringify(buildGeoJSON(doc), null, 2) + '\n';
}

function main() {
  const check = process.argv.slice(2).includes('--check');
  const doc = readSource();
  const problems = validate(doc, sourceRegistry());
  if (problems.length) {
    console.error(`${problems.length} problem(s) in ${FRONT_DIR}/${SOURCE_FILE}:`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }

  const body = render(doc);
  const out = join(FRONT_DIR, OUTPUT_FILE);
  if (check) {
    const current = existsSync(out) ? readFileSync(out, 'utf8') : '';
    if (current !== body) {
      console.error(`${out} is stale — run: npm run front`);
      process.exit(1);
    }
    console.log(`${doc.snapshots.length} snapshots, ${OUTPUT_FILE} up to date`);
    return;
  }

  writeFileSync(out, body);
  const manifest = {
    $comment:
      'Generated by `npm run front` from western-front.json — do not edit either this file or ' +
      'western-front.geojson by hand; edit the snapshots in western-front.json and rerun.',
    generatedAt: new Date().toISOString().slice(0, 10),
    snapshots: doc.snapshots.length,
    controlPoints: Object.keys(doc.gazetteer).length,
    accuracy: 'about 5 km; a schematic through named control points, not a digitised trace',
    bytes: Buffer.byteLength(body),
    entries: doc.snapshots.map((s) => ({
      date: s.date,
      label: s.label,
      precision: s.precision,
      controlPoints: s.through.length,
      lengthKm: Math.round(lengthKm(resolve(s, doc.gazetteer))),
      sources: s.sources.map((c) => c.source),
    })),
  };
  writeFileSync(join(FRONT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `wrote ${out} — ${doc.snapshots.length} snapshots, ` +
      `${Object.keys(doc.gazetteer).length} control points, ${(manifest.bytes / 1024).toFixed(0)} kB`,
  );
}

if (process.argv[1] && /build-front\.ts$/.test(process.argv[1])) main();
