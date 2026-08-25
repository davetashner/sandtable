/**
 * The one performance number CI holds (`sand-pmz.3`, ADR 0016).
 *
 * Of the four things the budget covers — bundle size, first map paint, frame
 * rate, PMTiles cost — this is the only one that is a function of the source
 * alone. The other three are measured by `scripts/perf-measure.mjs` and
 * reported, because a runner rasterising through SwiftShader answers a
 * different question from a reader's laptop, and a gate that goes red for
 * reasons unrelated to the change is worse than no gate (ADR 0011).
 *
 * Three ceilings, all in `scripts/bundle-budget.json` with the reason for each
 * written next to it:
 *
 *   eager  index.html plus everything it names — the code the reader
 *          downloads before anything is on screen
 *   code   every emitted chunk, so the eager ceiling cannot be met forever by
 *          moving bytes behind a dynamic import
 *   pack   dist/pack/ — the content bundle the app fetches (ADR 0018)
 *
 * Three rather than two because code weight and content weight move for
 * different reasons and neither should be able to break the other's gate
 * (ADR 0018). `npm run perf` still prints the sum.
 *
 *   npm run build && npm run bundle:budget
 *   npm run bundle:budget -- --update   # rewrite `measuredKb`, never the max
 *
 * Gzip is recomputed here rather than read off a header, so it can drift a
 * byte or two with the zlib version. The headroom in the budget is larger
 * than that drift by three orders of magnitude; if it ever is not, the budget
 * is too tight rather than the measurement too noisy.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bundleReport } from './lib/bundle-size.mjs';

const BUDGET = fileURLToPath(new URL('./bundle-budget.json', import.meta.url));
const update = process.argv.includes('--update');
const kb = (n) => n / 1024;

let report;
try {
  report = bundleReport();
} catch (e) {
  console.error(`no usable dist/ — run \`npm run build\` first (${e.message}).`);
  process.exit(2);
}

const doc = JSON.parse(readFileSync(BUDGET, 'utf8'));
const measured = {
  eager: kb(report.eagerGzip),
  code: kb(report.codeGzip),
  pack: kb(report.packGzip),
};

const headroom = (r) =>
  r.over ? `${(-r.head).toFixed(1)} kB over` : `${r.head.toFixed(1)} kB of headroom`;

console.log('bundle budget (gzip, kB)\n');
const rows = Object.entries(doc.budgets).map(([name, b]) => {
  const now = measured[name];
  const head = b.maxGzipKb - now;
  return { name, now, max: b.maxGzipKb, was: b.measuredKb, head, over: now > b.maxGzipKb };
});
for (const r of rows) {
  const delta = r.now - r.was;
  console.log(
    `  ${r.over ? '✗' : '✓'} ${r.name.padEnd(6)} ${r.now.toFixed(1).padStart(8)}` +
      ` / ${r.max.toFixed(0).padStart(6)}   ` +
      `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kB since ${r.was.toFixed(1)} kB` +
      ` (${headroom(r)})`,
  );
}

console.log('\n  chunks:');
for (const f of report.files) {
  console.log(
    `    ${f.eager ? '▶' : f.group === 'pack' ? '◆' : ' '} ${f.file.padEnd(38)}` +
      ` ${kb(f.gzip).toFixed(1).padStart(8)} kB gzip`,
  );
}
console.log('    ▶ = named by index.html, downloaded before first paint');
console.log('    ◆ = the content bundle, fetched alongside it (ADR 0018)\n');

if (update) {
  const today = new Date().toISOString().slice(0, 10);
  for (const [name, budget] of Object.entries(doc.budgets)) {
    budget.measuredKb = Number(measured[name].toFixed(1));
    budget.measuredOn = today;
  }
  writeFileSync(BUDGET, JSON.stringify(doc, null, 2) + '\n');
  console.log('  measuredKb refreshed. The ceilings are untouched — raise one by hand,');
  console.log('  in the same commit as the sentence saying what the bytes bought.');
  process.exit(0);
}

const over = rows.filter((r) => r.over);
if (!over.length) {
  console.log('  ✓ within budget');
  process.exit(0);
}
for (const r of over) {
  console.log(
    `\n  ✗ ${r.name} is ${(-r.head).toFixed(1)} kB over its ${r.max} kB ceiling.\n` +
      `    ${doc.budgets[r.name].why}\n` +
      '    `npm run perf` prints what each chunk is made of. Either the weight is\n' +
      '    avoidable — a heavy import reached from the shell, an asset that could\n' +
      '    be fetched instead of bundled — or it is not, and the ceiling moves in\n' +
      '    this commit with a sentence saying what the app gained for it.',
  );
}
process.exit(1);
