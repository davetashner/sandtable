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
  return {
    files,
    htmlBytes,
    eagerGzip: sum((f) => f.eager) + htmlBytes,
    lazyGzip: sum((f) => f.group === 'app' && !f.eager),
    codeGzip: sum((f) => f.group === 'app') + htmlBytes,
    packGzip: sum((f) => f.group === 'pack'),
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
