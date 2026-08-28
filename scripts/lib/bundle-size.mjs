/**
 * What a build weighs, read off `dist/`.
 *
 * Shared by the two things that ask: `scripts/bundle-budget.mjs` (the CI
 * ceiling, ADR 0016) and `scripts/perf-measure.mjs` (the report a human
 * reads). One reading, so the gate and the report can never disagree.
 */
import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIST = fileURLToPath(new URL('../../dist', import.meta.url));
export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Everything a build reads, so that `dist/` can be asked whether it still
 * describes the working tree (`sand-pmz.31`).
 *
 * `src/` and `content/` are the two that move daily; the rest are the files
 * that change what Vite emits from them. `node_modules` is deliberately not
 * here — reinstalling dependencies touches sixty thousand files and would
 * make every reading stale for a reason nobody cares about; `package-lock.json`
 * is the same question asked once.
 */
const BUILD_INPUTS = [
  'src',
  'content',
  // The pack plugin and the assembler live here, and they decide what lands in
  // dist/pack/ — the group the `pack` ceiling holds.
  'scripts/lib',
  'index.html',
  'atlas.html',
  'gallery.html',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'package.json',
  'package-lock.json',
];

/** Nothing under here reaches the bundle, so nothing here can make it stale. */
const NOT_BUILT = (name) => name.startsWith('.') || /\.test\.(ts|tsx|mjs)$/.test(name);

function newestInput(root) {
  let newest = null;
  const visit = (abs, rel) => {
    let st;
    try {
      st = statSync(abs);
    } catch {
      return; // an optional input that this checkout does not have
    }
    if (st.isDirectory()) {
      for (const name of readdirSync(abs)) {
        if (!NOT_BUILT(name)) visit(join(abs, name), rel + '/' + name);
      }
      return;
    }
    if (!newest || st.mtimeMs > newest.mtimeMs) newest = { path: rel, mtimeMs: st.mtimeMs };
  };
  for (const input of BUILD_INPUTS) visit(join(root, input), input);
  return newest;
}

/**
 * Whether `dist/` is older than the sources it was built from.
 *
 * The trap this closes is quiet and was sprung for real: run by hand,
 * `npm run bundle:budget` happily measures whatever build is lying around and
 * prints a number with no date on it. On 2026-08-28 that number was a whole
 * content pull request out of date — 281.6 kB against a real 308.1 — and it
 * was being used to decide whether two finished packs could merge. In CI the
 * question never arises because `build` runs immediately before, which is
 * exactly why nobody had met it: the reading is only ever stale when a human
 * is reading it, which is when it matters most.
 *
 * The oldest file in `dist/` is the one compared, not the newest: a build
 * writes them all within a second of each other, and taking the oldest fails
 * towards refusing rather than towards a stale answer.
 */
export function distFreshness(dist = DIST, root = ROOT) {
  const built = [
    join(dist, 'index.html'),
    ...['app', 'pack'].flatMap((d) => {
      const dir = join(dist, d);
      return existsSync(dir) ? readdirSync(dir).map((f) => join(dir, f)) : [];
    }),
  ].reduce((oldest, f) => {
    try {
      const { mtimeMs } = statSync(f);
      return oldest === null || mtimeMs < oldest ? mtimeMs : oldest;
    } catch {
      return oldest;
    }
  }, null);
  const newest = newestInput(root);
  return {
    /** When the build ran, as ms since the epoch; null if there is no dist/. */
    builtAt: built,
    /** The source file that moved last, and when. */
    newest,
    stale: built !== null && newest !== null && newest.mtimeMs > built,
  };
}

/** `2026-08-28 21:14:03`, local time — the only form these two dates are read in. */
export const stamp = (ms) =>
  new Date(ms - new Date(ms).getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

/**
 * Every emitted asset, in three groups.
 *
 * **eager** is what `index.html` names — the entry script, its modulepreloads,
 * its stylesheets. It is the code between the reader and first paint.
 * **lazy** is the rest of `dist/app/`: reached by a dynamic `import()` or by
 * the map worker. **pack** is `dist/pack/` — the content bundle the app
 * fetches (ADR 0018). The bundle is downloaded on every cold load and is
 * counted, but on its own line: it is content, it moves with every content
 * pull request, and holding it against the code ceiling is what made every
 * content change a performance change.
 *
 * Sourcemaps are excluded: they are emitted, and no browser fetches them
 * unless devtools is open.
 */
export function bundleReport(dist = DIST) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const eager = new Set(
    [...html.matchAll(/(?:src|href)="\/app\/([^"]+)"/g)].map((m) => m[1]).filter(Boolean),
  );
  const read = (dir, prefix, isEager) => {
    if (!existsSync(join(dist, dir))) return [];
    return readdirSync(join(dist, dir))
      .filter((f) => !f.endsWith('.map'))
      .map((f) => {
        const bytes = readFileSync(join(dist, dir, f));
        return {
          file: prefix + f,
          group: dir,
          eager: isEager(f),
          raw: bytes.length,
          gzip: gzipSync(bytes, { level: 9 }).length,
        };
      });
  };
  const files = [
    ...read('app', '', (f) => eager.has(f)),
    ...read('pack', 'pack/', () => false),
  ].sort((a, b) => b.gzip - a.gzip);
  const htmlBytes = statSync(join(dist, 'index.html')).size;
  const sum = (p) => files.filter(p).reduce((a, b) => a + b.gzip, 0);
  // One era per page load (sand-shn.1), so what a cold load costs is the
  // largest single bundle plus the atlas index — not the sum of every era.
  // Summing them would turn the ceiling red the moment a second era existed,
  // for bytes no reader ever downloads.
  const eras = files.filter((f) => f.group === 'pack' && f.file !== 'pack/index.json');
  const indexGzip = sum((f) => f.file === 'pack/index.json');
  return {
    files,
    htmlBytes,
    eagerGzip: sum((f) => f.eager) + htmlBytes,
    lazyGzip: sum((f) => f.group === 'app' && !f.eager),
    codeGzip: sum((f) => f.group === 'app') + htmlBytes,
    /** The heaviest era, which is what the slowest cold load actually fetches. */
    packGzip: eras.reduce((a, f) => Math.max(a, f.gzip), 0) + indexGzip,
    /** Every era together — the deploy's weight, reported and not gated. */
    packAllGzip: sum((f) => f.group === 'pack'),
    eraCount: eras.length,
    totalGzip: sum(() => true) + htmlBytes,
  };
}

/**
 * Where a chunk's weight comes from, by npm package, read off its sourcemap.
 * The content bundle has no sourcemap and is a single JSON document; there is
 * nothing to break down, so it answers empty.
 */
export function chunkOrigins(file, top = 8, dist = DIST) {
  if (file.startsWith('pack/')) return [];
  let map;
  try {
    map = JSON.parse(readFileSync(join(dist, 'app', file + '.map'), 'utf8'));
  } catch {
    return [];
  }
  const by = new Map();
  (map.sources ?? []).forEach((s, i) => {
    const len = (map.sourcesContent?.[i] ?? '').length;
    const nm = s.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
    const key = nm ? nm[1] : s.includes('/content/') ? 'content/ (pack JSON)' : 'src/';
    by.set(key, (by.get(key) ?? 0) + len);
  });
  return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
}
