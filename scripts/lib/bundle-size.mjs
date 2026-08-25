/**
 * What a build weighs, read off `dist/`.
 *
 * Shared by the two things that ask: `scripts/bundle-budget.mjs` (the CI
 * ceiling, ADR 0016) and `scripts/perf-measure.mjs` (the report a human
 * reads). One reading, so the gate and the report can never disagree.
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIST = fileURLToPath(new URL('../../dist', import.meta.url));

/**
 * Every emitted asset, with the eager set marked.
 *
 * "Eager" is what `index.html` names — the entry script, its modulepreloads,
 * its stylesheets. Everything else is reached by a dynamic `import()` or by
 * the map worker, and does not stand between the reader and first paint.
 * Sourcemaps are excluded: they are emitted, and no browser fetches them
 * unless devtools is open.
 */
export function bundleReport(dist = DIST) {
  const app = join(dist, 'app');
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const eager = new Set(
    [...html.matchAll(/(?:src|href)="\/app\/([^"]+)"/g)].map((m) => m[1]).filter(Boolean),
  );
  const files = readdirSync(app)
    .filter((f) => !f.endsWith('.map'))
    .map((f) => {
      const bytes = readFileSync(join(app, f));
      return {
        file: f,
        eager: eager.has(f),
        raw: bytes.length,
        gzip: gzipSync(bytes, { level: 9 }).length,
      };
    })
    .sort((a, b) => b.gzip - a.gzip);
  const htmlBytes = statSync(join(dist, 'index.html')).size;
  const sum = (p) => files.filter(p).reduce((a, b) => a + b.gzip, 0);
  return {
    files,
    htmlBytes,
    eagerGzip: sum((f) => f.eager) + htmlBytes,
    lazyGzip: sum((f) => !f.eager),
    totalGzip: sum(() => true) + htmlBytes,
  };
}

/** Where a chunk's weight comes from, by npm package, read off its sourcemap. */
export function chunkOrigins(file, top = 8, dist = DIST) {
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
