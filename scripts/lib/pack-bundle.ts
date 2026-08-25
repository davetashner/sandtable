/**
 * Assemble the content bundle the app fetches (ADR 0018, `sand-shn.1.1`).
 *
 * Node-only. It reads one era directory plus the shared registries and writes
 * them into a single JSON document whose shape is `ContentBundle`
 * (`src/packs/content-bundle.ts`). Nothing here validates: the browser parses
 * the whole thing with the schema on arrival (`src/packs/seed.ts`), so this is
 * a file-concatenator and the schema stays the only contract.
 *
 * The output is deterministic — files read in sorted order, no timestamp — so
 * an unchanged `content/` produces an unchanged bundle and therefore an
 * unchanged content hash in the emitted file name.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PACK_BUNDLE_DIR, type ContentBundle } from '../../src/packs/content-bundle.js';
import { BEATS_DIR, DIAGRAMS_DIR, PACK_FILE } from '../../src/packs/schema/files.js';

/** The pack the shell boots into until the atlas landing page lands (`sand-shn.1`). */
export const SEED_PACK_ID = '1914-schlieffen-marne';

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

  return {
    id,
    pack: readJson(join(dir, PACK_FILE)),
    collections,
    beats,
    diagrams,
    shared: {
      people: optionalJson(join(shared, 'people', 'people.json')) ?? [],
      places: optionalJson(join(shared, 'places', 'places.json')) ?? [],
      sources: optionalJson(join(shared, 'sources', 'sources.json')) ?? [],
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
    },
  };
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
