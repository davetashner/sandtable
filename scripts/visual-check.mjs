/**
 * The visual gate (sand-pmz.2, ADR 0011).
 *
 * Walks the same nineteen scenes × two themes × desktop and phone as the
 * design review, and fails the build on three things:
 *
 *   1. a scene that will not render at all
 *   2. a console or page error the app itself raised
 *   3. a structural layout defect — a page that scrolls sideways, a box
 *      clipping content it is not scrolling, an element past the right edge —
 *      that `scripts/visual-baseline.json` does not already allow
 *
 * It does not diff pixels, and ADR 0011 says why: the map is a WebGL render of
 * vector tiles fetched over the network, and the chrome around it is
 * rasterised by whatever fonts the runner happens to have, so a pixel baseline
 * taken on a laptop is red on a runner for reasons that have nothing to do
 * with the change under review. What it does instead is make the walk
 * hermetic — `/assets/*` is served from inside the browser, so no PMTiles
 * range request, no S3, no CloudFront — and assert the invariants that survive
 * that: structure, not colour.
 *
 * `small-target` **is** fatal, as of sand-pmz.4. It was not when this gate was
 * written, and the reason given was exactly right: the tap targets belonged to
 * another bead and a gate red on them would have been enforcing a rule nobody
 * had agreed to. That bead has since agreed it — 24×24px, with the two inline
 * cases WCAG names by name allowed on the baseline in writing
 * (docs/accessibility.md). A rule with a written record is a rule a gate may
 * hold.
 *
 * `tiny-text` is still counted and printed and never fatal. The type floor is
 * ADR 0010's, and one of the two things still under it is a label inside an
 * authored SVG rather than type on a page — not the gate's to rule on.
 *
 * The pixels are still taken. `--shots <dir>` writes one screenshot per scene
 * for a human to look at; in CI they are an artifact of the run, never a
 * comparison.
 *
 *   npm run build
 *   npx playwright install chromium
 *   npm run visual:check                        # the gate
 *   npm run visual:check -- --shots visual-check
 *   npm run visual:check -- --update            # rewrite the baseline
 *
 * `BASE=<url>` walks a deployment instead of an in-process `vite preview`; the
 * stub still applies, so the answer means the same thing either way.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { LAUNCH_ARGS, rollUp, walk } from './lib/visual-scenes.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

/** The defects that are regressions. Everything else is reported, not gated. */
const GATED = new Set([
  'page-h-overflow',
  'clipped-x',
  'clipped-y',
  'overflows-right',
  'small-target',
]);

const BASELINE = fileURLToPath(new URL('./visual-baseline.json', import.meta.url));
const SHOTS = opt('shots') ?? process.env.SHOTS ?? null;
const UPDATE = flag('update');
const SETTLE = Number(process.env.SETTLE ?? 1200);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 2);

/** Serve the build in-process unless BASE points at something already up. */
let server;
let base = process.env.BASE;
if (!base) {
  // Read it rather than test for it: a check followed by an act leaves a
  // window between them, and the read is the check.
  try {
    readFileSync(fileURLToPath(new URL('../dist/index.html', import.meta.url)));
  } catch {
    console.error('no dist/ — run `npm run build` first.');
    process.exit(2);
  }
  server = await preview({ preview: { port: 4179, strictPort: true } });
  base = server.resolvedUrls.local[0].replace(/\/$/, '');
}

const started = Date.now();
const browser = await chromium.launch({ args: LAUNCH_ARGS });
const report = await walk(browser, {
  base,
  stub: true,
  reuse: true,
  concurrency: CONCURRENCY,
  settleMs: () => SETTLE,
  shots: SHOTS,
});
await browser.close();
await server?.close();

const REPORT = opt('report');
if (REPORT) writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

const rolled = rollUp(report);

/** The committed allowances, or none the first time the file is written. */
function readBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE, 'utf8')).allow ?? [];
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}
const previous = readBaseline();

if (UPDATE) {
  const rows = rolled
    .filter((e) => GATED.has(e.kind))
    .map((e) => ({
      kind: e.kind,
      el: e.el,
      why:
        previous.find((a) => a.kind === e.kind && a.el === e.el)?.why ??
        'TODO: why this is deliberate, or the bead that will fix it',
    }));
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        $comment:
          'Structural defects the DOM audit sees and we have decided to live with — ' +
          'the "Known and deliberate" list of docs/design-review.md, machine-readable. ' +
          'Regenerate with `npm run visual:check -- --update`, then write the "why" for ' +
          'every new row before committing it: a row with a TODO why is a row nobody has ' +
          'justified. `el` may be "*" to allow a kind anywhere. See ADR 0011.',
        allow: rows,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `baseline rewritten: ${rows.length} allowance(s), ${Object.keys(report).length} cells`,
  );
  console.log('review every new row and write its "why" before committing.');
  process.exit(0);
}

// ── the three assertions ───────────────────────────────────────────────────
const failures = [];
for (const [cell, v] of Object.entries(report)) {
  if (v.error) failures.push(`${cell}: did not render — ${v.error}`);
  for (const e of v.consoleErrs ?? []) failures.push(`${cell}: console error — ${e}`);
}

const allowed = (p) =>
  previous.some((a) => a.kind === p.kind && (a.el === '*' || a.el === (p.el ?? '')));

const unexpected = new Map();
for (const [cell, v] of Object.entries(report)) {
  for (const p of v.problems ?? []) {
    if (!GATED.has(p.kind) || allowed(p)) continue;
    const k = `${p.kind} ${p.el ?? ''}`;
    const e = unexpected.get(k) ?? { ...p, n: 0, cells: [] };
    e.n += 1;
    if (e.cells.length < 3) e.cells.push(cell);
    unexpected.set(k, e);
  }
}

// ── output ─────────────────────────────────────────────────────────────────
const secs = ((Date.now() - started) / 1000).toFixed(0);
console.log(`${Object.keys(report).length} cells walked at ${base}, assets stubbed, ${secs}s\n`);

for (const e of [...unexpected.values()].sort((a, b) => b.n - a.n)) {
  console.log(`  ✗ ${e.kind.padEnd(16)} ${e.el}  ×${e.n}  | ${e.detail}`);
  console.log(`      seen in: ${e.cells.join(', ')}`);
}
for (const f of failures) console.log(`  ✗ ${f}`);

const stale = previous.filter(
  (a) => a.el !== '*' && !rolled.some((e) => e.kind === a.kind && e.el === a.el),
);
if (stale.length) {
  console.log(`\n  note: ${stale.length} baseline allowance(s) no longer occur — drop them`);
  for (const a of stale) console.log(`      ${a.kind} ${a.el}`);
}

const advisory = rolled.filter((e) => !GATED.has(e.kind));
if (advisory.length) {
  const total = advisory.reduce((n, e) => n + e.n, 0);
  console.log(
    `\n  reported, not gated: ${total} tiny-text finding(s) across ` +
      `${advisory.length} element(s) (ADR 0010 — docs/design-review.md).`,
  );
}

const bad = failures.length + unexpected.size;
if (bad === 0) {
  console.log(
    '\n  ✓ every scene rendered, no console errors, no structural defect off the baseline',
  );
  process.exit(0);
}
console.log(
  `\n${bad} problem(s). If one is a deliberate design decision, add it to ` +
    `scripts/visual-baseline.json with a reason; otherwise fix it.`,
);
process.exit(1);
