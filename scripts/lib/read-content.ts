/**
 * Read content/ from the filesystem into the validator's RawContent tree.
 * Node-only; the validator itself (src/packs/validate) is pure.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  BEATS_DIR,
  DIAGRAMS_DIR,
  CUE_MANIFEST,
  MEDIA_MANIFEST,
  PACK_FILE,
  RECEIPT_BACKLOG,
  RECEIPTS_DIR,
  THREAD_FILE,
} from '../../src/packs/schema/files.js';
import type { RawContent, RawFile, RawPack } from '../../src/packs/validate/tree.js';
import type { Problem } from '../../src/packs/validate/validate.js';

const isDir = (p: string) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};
const exists = (p: string) => {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
};

function walk(dir: string, match: (name: string) => boolean, out: string[] = []): string[] {
  if (!isDir(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (isDir(p)) walk(p, match, out);
    else if (match(name)) out.push(p);
  }
  return out;
}

export interface ReadResult {
  content: RawContent;
  /** JSON files that did not parse; they are omitted from `content`. */
  problems: Problem[];
}

export function readContent(root = 'content'): ReadResult {
  const problems: Problem[] = [];
  const rel = (p: string) => relative(root, p).split(sep).join('/');

  const readJson = (path: string): RawFile | undefined => {
    try {
      return { path: rel(path), data: JSON.parse(readFileSync(path, 'utf8')) };
    } catch (e) {
      problems.push({
        level: 'error',
        path: rel(path),
        message: `invalid JSON: ${(e as Error).message}`,
      });
      return undefined;
    }
  };
  const readJsonAll = (paths: string[]) =>
    paths.map(readJson).filter((f): f is RawFile => f !== undefined);

  const readPack = (dir: string): RawPack | undefined => {
    const packPath = join(dir, PACK_FILE);
    if (!exists(packPath)) return undefined;
    const pack = readJson(packPath);
    if (!pack) return undefined;
    const collections: Record<string, RawFile> = {};
    for (const name of readdirSync(dir).sort()) {
      if (name === PACK_FILE || !name.endsWith('.json')) continue;
      const f = readJson(join(dir, name));
      if (f) collections[name] = f;
    }
    const beats = walk(join(dir, BEATS_DIR), (n) => n.endsWith('.md')).map((p) => ({
      path: rel(p),
      data: readFileSync(p, 'utf8'),
    }));
    const diagrams = walk(join(dir, DIAGRAMS_DIR), (n) => n.endsWith('.svg')).map((p) => ({
      path: rel(p),
      data: readFileSync(p, 'utf8'),
    }));
    return {
      dir: relative(join(root, 'eras'), dir).split(sep).join('/'),
      pack,
      collections,
      beats,
      diagrams,
    };
  };

  const erasDir = join(root, 'eras');
  const packs: RawPack[] = [];
  if (isDir(erasDir)) {
    for (const name of readdirSync(erasDir).sort()) {
      const p = readPack(join(erasDir, name));
      if (p) packs.push(p);
    }
  }

  const sharedDir = join(root, 'shared');
  const shared: RawContent['shared'] = { collections: {}, media: [], audio: [] };
  for (const file of ['people/people.json', 'places/places.json', 'sources/sources.json']) {
    const p = join(sharedDir, file);
    if (!exists(p)) continue;
    const f = readJson(p);
    if (f) shared.collections[file] = f;
  }
  shared.media = readJsonAll(walk(join(sharedDir, 'media'), (n) => n === MEDIA_MANIFEST));
  shared.audio = readJsonAll(walk(join(sharedDir, 'audio'), (n) => n === CUE_MANIFEST));
  const threads = readJsonAll(walk(join(root, 'threads'), (n) => n === THREAD_FILE));

  // Receipts (ADR 0021) sit beside the eras rather than inside them: they are
  // authoring apparatus, the pack build never looks here, and one file per era
  // keeps two agents authoring two eras out of each other's diff.
  const receiptsDir = join(root, RECEIPTS_DIR);
  const receipts = readJsonAll(
    walk(receiptsDir, (n) => n.endsWith('.json')).sort((a, b) => a.localeCompare(b)),
  );
  const backlogPath = join(receiptsDir, RECEIPT_BACKLOG);
  const receiptBacklog: RawFile | undefined = exists(backlogPath)
    ? { path: rel(backlogPath), data: readFileSync(backlogPath, 'utf8') }
    : undefined;

  return {
    content: { packs, shared, threads, receipts, ...(receiptBacklog ? { receiptBacklog } : {}) },
    problems,
  };
}
