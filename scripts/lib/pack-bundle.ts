/**
 * Assemble the content bundle the app fetches (ADR 0018, `sand-shn.1.1`).
 *
 * Node-only. It reads one era directory plus the part of the shared registries
 * that era reaches, and writes them into a single JSON document whose shape is
 * `ContentBundle` (`src/packs/content-bundle.ts`). Nothing here validates: the
 * browser parses the whole thing with the schema on arrival
 * (`src/packs/seed.ts`), so this is a file-concatenator and the schema stays
 * the only contract.
 *
 * "The part that era reaches" is `scripts/lib/shared-refs.ts`, and is the one
 * thing here that is not a straight copy of a file. It has to exist: the
 * registries are the union of every era, and copying them whole put every
 * other campaign's cast, places and bibliography in front of a reader who
 * asked for one (`sand-shn.15`, ADR 0018's second amendment).
 *
 * The output is deterministic — files read in sorted order, no timestamp — so
 * an unchanged `content/` produces an unchanged bundle and therefore an
 * unchanged content hash in the emitted file name.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PACK_BUNDLE_DIR, type ContentBundle } from '../../src/packs/content-bundle.js';
import { BEATS_DIR, DIAGRAMS_DIR, PACK_FILE } from '../../src/packs/schema/files.js';
import { readRegistry } from './registry.js';
import { sharedFor, type SharedRegistries } from './shared-refs.js';

/** The pack the shell boots into when the URL names none (`sand-shn.1`). */
export const SEED_PACK_ID = '1914-schlieffen-marne';

/**
 * Every era directory under `content/eras`, sorted, so the build emits a
 * bundle per pack and the atlas has something to list (`sand-shn.1`). Sorted
 * by name, which is `<yyyy>-<slug>` and therefore chronological — the order
 * the atlas wants anyway.
 */
export function listPackIds(root: string): string[] {
  const dir = join(root, 'eras');
  try {
    if (!statSync(dir).isDirectory()) return [];
  } catch {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => {
      try {
        return statSync(join(dir, name)).isDirectory() && existsSync(join(dir, name, PACK_FILE));
      } catch {
        return false;
      }
    })
    .sort();
}

/**
 * What the atlas needs to draw an era without fetching its whole bundle: the
 * pack's own header, and nothing else. A few hundred bytes each, so the
 * landing page costs one small request rather than one bundle per era.
 */
export interface PackSummary {
  id: string;
  title: string;
  subtitle?: string;
  summary: string;
  /** Which arc the atlas files it under (`pack.json#arc`, ADR 0024). */
  arc?: string;
  timeRange: { start: string; end: string };
  region: [number, number, number, number];
  status: string;
  /** Bytes of the era's own bundle, so the atlas can be honest about the cost. */
  bytes: number;
}

export function packSummary(root: string, id: string): PackSummary {
  const pack = readJson(join(root, 'eras', id, PACK_FILE)) as Record<string, unknown>;
  const json = contentBundleJson(root, id);
  return {
    id,
    title: String(pack['title'] ?? id),
    ...(pack['subtitle'] ? { subtitle: String(pack['subtitle']) } : {}),
    summary: String(pack['summary'] ?? ''),
    ...(pack['arc'] ? { arc: String(pack['arc']) } : {}),
    timeRange: pack['timeRange'] as { start: string; end: string },
    region: pack['region'] as [number, number, number, number],
    status: String(pack['status'] ?? 'seed'),
    bytes: Buffer.byteLength(json),
  };
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

function listing(dir: string, ext: string): string[] {
  try {
    if (!statSync(dir).isDirectory()) return [];
  } catch {
    return [];
  }
  return readdirSync(dir)
    .filter((n) => n.endsWith(ext))
    .sort();
}

function optionalJson(path: string): unknown {
  try {
    return readJson(path);
  } catch {
    return undefined;
  }
}

/**
 * Read one era plus `content/shared/` into a bundle.
 *
 * `root` is the `content/` directory. It is passed in rather than derived from
 * `import.meta.url` because the caller is a Vite plugin whose module is bundled
 * into the config, and Vite's own `config.root` is the honest answer there.
 */
export function buildContentBundle(root: string, id = SEED_PACK_ID): ContentBundle {
  const dir = join(root, 'eras', id);
  const shared = join(root, 'shared');

  const collections: Record<string, unknown> = {};
  for (const name of listing(dir, '.json')) {
    if (name === PACK_FILE) continue;
    collections[name] = readJson(join(dir, name));
  }

  const beatsDir = join(dir, BEATS_DIR);
  const beats = listing(beatsDir, '.md').map((name) => ({
    file: `${BEATS_DIR}/${name}`,
    text: readFileSync(join(beatsDir, name), 'utf8'),
  }));

  const diagramsDir = join(dir, DIAGRAMS_DIR);
  const diagrams: Record<string, string> = {};
  for (const name of listing(diagramsDir, '.svg')) {
    diagrams[name.replace(/\.svg$/, '')] = readFileSync(join(diagramsDir, name), 'utf8');
  }

  const registries: SharedRegistries = {
    // One file per entity (ADR 0022), gathered back into the array the browser
    // is handed. Name order, so the bundle — and therefore its content hash —
    // does not depend on what order a filesystem happens to list a directory in.
    people: readRegistry(root, 'people'),
    places: readRegistry(root, 'places'),
    sources: readRegistry(root, 'sources'),
    // Written by `npm run media` / `npm run audio`; absent on a fresh clone
    // that has not run them, and an empty manifest is the honest stand-in.
    media: optionalJson(join(shared, 'media', 'index.json')) ?? {
      generatedAt: '',
      base: '/assets/media/',
      entries: [],
    },
    audio: optionalJson(join(shared, 'audio', 'index.json')) ?? {
      generatedAt: '',
      base: '/assets/audio/',
      entries: [],
    },
  };

  // The era half first, then the registries narrowed against it: what is
  // scanned for references is exactly what the bundle ships.
  const era = { id, pack: readJson(join(dir, PACK_FILE)), collections, beats, diagrams };
  return { ...era, shared: sharedFor(registries, era) };
}

/**
 * The bundle as it goes on the wire.
 *
 * U+2028 and U+2029 are legal in JSON and are escaped here because the same
 * string is also embedded as a JavaScript expression when Vitest inlines the
 * bundle instead of serving it.
 */
export function contentBundleJson(root: string, id = SEED_PACK_ID): string {
  return JSON.stringify(buildContentBundle(root, id))
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** `pack/<id>-<hash>.json` — content-addressed, so the deploy can call it immutable. */
export function bundleFileName(json: string, id = SEED_PACK_ID): string {
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 8);
  return `${PACK_BUNDLE_DIR}/${id}-${hash}.json`;
}
