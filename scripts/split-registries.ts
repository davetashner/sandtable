/**
 * Split the shared registries into one file per entity, and keep them honest
 * (`sand-shn.19`, ADR 0022).
 *
 * `content/shared/people/people.json` was a single array that every author
 * appended to, so two agents writing two different packs on the same night
 * produced the same rebase conflict every time — three of them on 2026-08-27/28.
 * The registries are now `content/shared/<registry>/<slug>.json`, one entity per
 * file, and two authors adding two different people no longer touch the same
 * bytes.
 *
 * This script is both halves of that: the migration that performed it, kept so
 * the change can be re-run and audited rather than taken on trust, and the
 * check that the shape still holds. It is re-runnable — once the monoliths are
 * gone it verifies and exits — and `--check` never writes.
 *
 *   npx tsx scripts/split-registries.ts            migrate if needed, then verify
 *   npx tsx scripts/split-registries.ts --check    verify only; exit 1 on a problem
 *
 * The verification is deliberately not "the validator passed": it re-reads the
 * split files, reassembles each registry, and compares it to the monolith byte
 * for byte as a set of entities, so a migration that silently dropped or
 * altered one is a failure and not a mystery.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import {
  SHARED_REGISTRY_DIRS,
  registryFileName,
  type SharedRegistryDir,
} from '../src/packs/schema/files.js';
import { listRegistryFiles } from './lib/registry.js';

const ROOT = 'content';
const dirs = SHARED_REGISTRY_DIRS;

/** The file the registry used to live in — present only before the migration. */
const monolith = (dir: SharedRegistryDir) => join(ROOT, 'shared', dir, `${dir}.json`);

type Entity = { id: string } & Record<string, unknown>;

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

/**
 * One entity, formatted the way Prettier formats the rest of `content/` — so
 * re-running the migration reproduces the committed files exactly and
 * `npm run format:check` has nothing to say about them.
 */
async function render(entity: Entity, path: string): Promise<string> {
  const options = await resolveConfig(path);
  return format(JSON.stringify(entity), { ...options, filepath: path });
}

async function split(dir: SharedRegistryDir, problems: string[]): Promise<number> {
  const from = monolith(dir);
  if (!existsSync(from)) return 0;
  const entities = readJson(from) as Entity[];
  const out = join(ROOT, 'shared', dir);
  mkdirSync(out, { recursive: true });
  for (const entity of entities) {
    const name = registryFileName(entity.id);
    if (name === undefined) {
      problems.push(`${from}: ${entity.id} has no <kind>:<slug> shape, so it has no file name`);
      continue;
    }
    const path = join(out, name);
    writeFileSync(path, await render(entity, path));
  }
  rmSync(from);
  return entities.length;
}

/**
 * Every rule the split shape has to keep: one object per file, the file named
 * after the entity in it, and no two files claiming the same id. The validator
 * enforces the first two as well (`parseShared`); this repeats them so the
 * migration can be checked without running the whole content pipeline.
 */
function verify(dir: SharedRegistryDir, problems: string[]): number {
  const files = listRegistryFiles(ROOT, dir);
  const seen = new Set<string>();
  for (const { path, stem } of files) {
    let data: unknown;
    try {
      data = readJson(path);
    } catch (e) {
      problems.push(`${path}: invalid JSON: ${(e as Error).message}`);
      continue;
    }
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      problems.push(`${path}: a registry file holds one entity object, not an array`);
      continue;
    }
    const id = (data as Entity).id;
    if (typeof id !== 'string') {
      problems.push(`${path}: no id`);
      continue;
    }
    if (registryFileName(id) !== `${stem}.json`)
      problems.push(
        `${path}: holds ${id}, which belongs in ${registryFileName(id) ?? '(nowhere)'}`,
      );
    if (seen.has(id)) problems.push(`${path}: duplicate id ${id}`);
    seen.add(id);
  }
  return files.length;
}

async function main(): Promise<void> {
  const check = process.argv.slice(2).includes('--check');
  const problems: string[] = [];
  let migrated = 0;

  for (const dir of dirs) {
    if (existsSync(monolith(dir))) {
      if (check) {
        problems.push(`${monolith(dir)} still exists — run: npx tsx scripts/split-registries.ts`);
        continue;
      }
      const before = readJson(monolith(dir)) as Entity[];
      const n = await split(dir, problems);
      migrated += n;
      // The round trip, on the entities as they were read a moment ago: the
      // split is faithful only if reassembling it gives the same entities.
      const after = new Map(
        listRegistryFiles(ROOT, dir).map(({ path }) => {
          const e = readJson(path) as Entity;
          return [e.id, JSON.stringify(e)];
        }),
      );
      for (const e of before) {
        const round = after.get(e.id);
        if (round === undefined) problems.push(`${dir}: ${e.id} was lost in the split`);
        else if (round !== JSON.stringify(e)) problems.push(`${dir}: ${e.id} changed in the split`);
      }
      if (after.size !== before.length)
        problems.push(`${dir}: ${before.length} entities became ${after.size} files`);
      console.log(`  ${dir}: ${n} entities → ${after.size} files`);
    }
    const count = verify(dir, problems);
    if (migrated === 0) console.log(`  ${dir}: ${count} files`);
  }

  if (problems.length > 0) {
    console.error(`${problems.length} problem(s):`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log(check ? 'registries are one file per entity' : 'registries split and verified');
}

await main();
