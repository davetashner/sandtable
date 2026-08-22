#!/usr/bin/env tsx
/**
 * Historical borders pipeline (sand-a55.10).
 *
 * Pulls the open historical-basemaps GeoJSON (aourednik/historical-basemaps,
 * GPL-3.0) for every era year the roadmap needs, simplifies it with mapshaper
 * to web size, and writes one world file per *target* year into
 * content/shared/geo/borders/<year>.geojson plus a manifest.json with the
 * provenance, licence and the known caveats. The deploy workflows sync the
 * directory to the assets bucket, so the app fetches /assets/geo/borders/…
 *
 *   npm run borders              # refresh every year in TARGETS
 *   npm run borders -- 1914 1870 # just those target years
 *   npm run borders -- --check   # exit 1 if the committed files are missing
 *
 * The dataset has files only for some years; each target year maps to the
 * nearest upstream file and the caveat is recorded. Packs declare
 * `borderYear` (pack.json) and get the file of that name.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import mapshaper from 'mapshaper';

export const BORDERS_DIR = 'content/shared/geo/borders';
const REPO = 'aourednik/historical-basemaps';
const RAW = `https://raw.githubusercontent.com/${REPO}`;
/** Pinned upstream commit so the pipeline is reproducible. */
export const UPSTREAM_COMMIT = '62d8f1a03a71f2d3ff17f2d166f7553f256bce68';

export interface Target {
  /** Year a pack declares as borderYear. */
  year: number;
  /** Upstream file year. */
  source: number;
  /** What to know about using it for the target year. */
  caveat: string;
}

/** Target years from the roadmap → nearest upstream file, with caveats. */
export const TARGETS: Target[] = [
  {
    year: 1870,
    source: 1880,
    caveat:
      'Upstream has no 1870 file; 1880 shows Alsace-Lorraine already German and the Empire proclaimed. The 1870 prequel (sand-mny.1) must restore the pre-annexation frontier and the North German Confederation / southern states by hand.',
  },
  {
    year: 1871,
    source: 1880,
    caveat: 'Post-Frankfurt borders as of 1880; acceptable for 1871 in western Europe.',
  },
  {
    year: 1905,
    source: 1900,
    caveat:
      'Upstream 1900; Europe is unchanged to 1905. East Asia: Port Arthur/Liaodong is the Russian lease, Korea is still the Korean Empire — check the Manchuria/Korea detail (sand-6dh.1).',
  },
  { year: 1914, source: 1914, caveat: 'August 1914 borders; Alsace-Lorraine German.' },
  {
    year: 1918,
    source: 1920,
    caveat:
      'Upstream 1920 (post-Versailles/Trianon/Saint-Germain; some eastern frontiers still unsettled). For 11 November 1918 the legal borders are still those of 1914 with the front line overlaid — packs that need the armistice-day map should use 1914 plus the front-line layer (sand-g80.1).',
  },
  {
    year: 1939,
    source: 1938,
    caveat:
      'Upstream 1938 — confirm whether Austria (March 1938) and the Sudetenland (October 1938) are included before using for September 1939; Czechoslovakia, Memel and Albania changed in 1939.',
  },
  {
    year: 1945,
    source: 1945,
    caveat:
      'Upstream 1945; check whether it shows May or December 1945 (Poland shifted west, Germany in zones).',
  },
  {
    year: 1950,
    source: 1960,
    caveat:
      'Upstream 1960 — decolonisation has changed Africa and Asia; for Europe and Korea (38th parallel) 1950 is served adequately. Revisit when a Cold War era exists.',
  },
];

/** Upstream fields we keep. */
const FIELDS = ['NAME', 'SUBJECTO', 'PARTOF', 'BORDERPRECISION'];

export interface ManifestEntry extends Target {
  file: string;
  sourceUrl: string;
  features: number;
  bytes: number;
}

export interface Manifest {
  dataset: string;
  licence: string;
  attribution: string;
  upstreamCommit: string;
  generatedAt: string;
  simplification: string;
  fields: string[];
  entries: ManifestEntry[];
}

async function fetchUpstream(sourceYear: number): Promise<string> {
  const url = `${RAW}/${UPSTREAM_COMMIT}/geojson/world_${sourceYear}.geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

export async function buildOne(t: Target, dir = BORDERS_DIR): Promise<ManifestEntry> {
  const raw = await fetchUpstream(t.source);
  const input = `world_${t.source}.geojson`;
  const output = `${t.year}.geojson`;
  // Simplify hard (continent-scale data anyway), snap vertices, drop fields we
  // don't use, round coordinates to 3 decimals (~100 m) and write compact.
  const cmd = [
    `-i ${input} snap`,
    '-simplify 12% keep-shapes planar',
    `-filter-fields ${FIELDS.join(',')}`,
    '-clean',
    `-o ${output} format=geojson precision=0.001 rfc7946`,
  ].join(' ');
  const out = (await mapshaper.applyCommands(cmd, { [input]: raw })) as Record<
    string,
    Buffer | string
  >;
  const text = String(out[output]);
  const geo = JSON.parse(text) as { type: string; features: unknown[] };
  // Stamp provenance on the FeatureCollection itself.
  const stamped = {
    type: 'FeatureCollection',
    name: `borders-${t.year}`,
    attribution: 'Historical borders: aourednik/historical-basemaps (GPL-3.0), simplified',
    source: `${REPO}@${UPSTREAM_COMMIT.slice(0, 7)} geojson/world_${t.source}.geojson`,
    targetYear: t.year,
    sourceYear: t.source,
    caveat: t.caveat,
    features: geo.features,
  };
  const body = JSON.stringify(stamped);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, output), body + '\n');
  return {
    ...t,
    file: output,
    sourceUrl: `https://github.com/${REPO}/blob/${UPSTREAM_COMMIT}/geojson/world_${t.source}.geojson`,
    features: geo.features.length,
    bytes: Buffer.byteLength(body),
  };
}

export function readManifest(dir = BORDERS_DIR): Manifest | undefined {
  const p = join(dir, 'manifest.json');
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Manifest) : undefined;
}

/** Missing files for the targets — used by --check and the tests. */
export function missingBorders(dir = BORDERS_DIR): string[] {
  return TARGETS.map((t) => `${t.year}.geojson`).filter((f) => !existsSync(join(dir, f)));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    const missing = missingBorders();
    if (missing.length) {
      console.error(`missing border files: ${missing.join(', ')} — run: npm run borders`);
      process.exit(1);
    }
    console.log(`${TARGETS.length} border files present`);
    return;
  }
  const years = args.filter((a) => /^\d{4}$/.test(a)).map(Number);
  const targets = years.length ? TARGETS.filter((t) => years.includes(t.year)) : TARGETS;
  const previous = readManifest();
  const entries: ManifestEntry[] =
    previous?.entries.filter((e) => !targets.some((t) => t.year === e.year)) ?? [];
  for (const t of targets) {
    process.stdout.write(`${t.year} ← world_${t.source} … `);
    const e = await buildOne(t);
    entries.push(e);
    console.log(`${e.features} features, ${(e.bytes / 1024).toFixed(0)} kB`);
  }
  entries.sort((a, b) => a.year - b.year);
  const manifest: Manifest = {
    dataset: `https://github.com/${REPO}`,
    licence: 'GPL-3.0 (upstream); these files are derived works and carry the same licence',
    attribution:
      'Historical borders © aourednik/historical-basemaps contributors, GPL-3.0, simplified by Sandtable',
    upstreamCommit: UPSTREAM_COMMIT,
    generatedAt: new Date().toISOString().slice(0, 10),
    simplification:
      'mapshaper: snap, simplify 12% keep-shapes (planar), clean, precision 0.001, fields NAME/SUBJECTO/PARTOF/BORDERPRECISION',
    fields: FIELDS,
    entries,
  };
  writeFileSync(join(BORDERS_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`wrote ${BORDERS_DIR}/manifest.json`);
}

if (process.argv[1] && /fetch-borders\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
