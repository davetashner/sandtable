/**
 * Reading a shared registry off the filesystem (ADR 0022, `sand-shn.19`).
 *
 * `content/shared/people/`, `places/` and `sources/` hold one JSON file per
 * entity, named for the entity's id. Four callers need the same listing — the
 * validator's reader, the bundle assembler, the front-line builder and the
 * pack scaffold — and they need it in the same order every time, because the
 * emitted bundle is content-addressed and a directory read that came back in
 * a different order would change the hash without changing the content.
 *
 * Node-only, like everything else in `scripts/lib`. The browser never sees a
 * registry directory: it is handed the assembled arrays in the bundle.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { SharedRegistryDir } from '../../src/packs/schema/files.js';

export interface RegistryFile {
  /** Path as the filesystem sees it, for reading and for error messages. */
  path: string;
  /** File name without `.json` — the entity's id minus its kind prefix. */
  stem: string;
}

/**
 * Every entity file in one registry, sorted by name. Sorted by name is sorted
 * by id, since the name is the id's slug, so the order is the same on every
 * machine and stable as the registry grows.
 */
export function listRegistryFiles(root: string, dir: SharedRegistryDir): RegistryFile[] {
  const path = join(root, 'shared', dir);
  try {
    if (!statSync(path).isDirectory()) return [];
  } catch {
    return [];
  }
  return readdirSync(path)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({ path: join(path, name), stem: name.slice(0, -'.json'.length) }));
}

/**
 * One registry as the array it used to be on disk. Nothing here validates —
 * the caller either runs the schema over it or is shipping it to a browser
 * that will.
 */
export function readRegistry<T = unknown>(root: string, dir: SharedRegistryDir): T[] {
  return listRegistryFiles(root, dir).map((f) => JSON.parse(readFileSync(f.path, 'utf8')) as T);
}
