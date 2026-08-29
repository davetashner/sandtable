/**
 * The visual gate (sand-pmz.2, ADR 0011; tiers added by sand-pmz.9).
 *
 * Walks every scene in `scripts/lib/visual-scenes.mjs` — the same list the
 * design review walks — in two themes at desktop and phone width, and sorts
 * what it finds into **two outcomes over three severities**:
 *
 *   BLOCKING   breakage    a scene that did not render at all, or an error the
 *                          app itself raised on the console. Unambiguous: the
 *                          app is broken and nothing should merge over it.
 *              structural  a layout defect `scripts/visual-baseline.json` does
 *                          not allow — a page that scrolls sideways, a box
 *                          clipping content it is not scrolling, an element
 *                          past the right edge, a tap target under the floor.
 *                          The reason this gate exists.
 *   REPORTED   advisory    printed on every run and never fatal, because the
 *                          rule behind it has documented exemptions this audit
 *                          cannot see (`tiny-text`, ADR 0010).
 *
 * The split is the point (sand-pmz.9): the gate is being made a required check
 * on `main`, and a required check has to be red for reasons everybody already
 * agreed are reasons. Making the tiers legible here — in the sections below
 * and in the exit code — is what leaves phase 2 a repository-settings change
 * and nothing more.
 *
 *   exit 0  nothing blocking. Reported findings may still have been printed.
 *   exit 1  BLOCKING · breakage — a dead scene or an error the app raised.
 *   exit 2  BLOCKING · structural — a layout defect off the baseline.
 *   exit 3  the gate could not run, or is not configured: no build to serve,
 *           or a defect kind with no severity. Not a finding about the app.
 *
 * CI needs none of that resolution — any non-zero fails the job — but a human
 * reading a log, and anyone who later wraps this, can tell "the app is broken"
 * from "the layout drifted" without parsing prose.
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
 * **What that leaves uncaught is written down**, in ADR 0011 under "What a
 * green run does not prove". Read it before trusting this. The short version:
 * everything the map draws lives inside one `<canvas>`, and this audit reads
 * the boxes of DOM elements, so a route drawn the long way round the planet is
 * a scene that renders successfully with no structural defect and a green
 * gate. That happened, on PR #161.
 *
 * The pixels are still taken. `--shots <dir>` writes one screenshot per cell
 * for a human to look at; in CI they are an artifact of the run, never a
 * comparison.
 *
 *   npm run build
 *   npx playwright install chromium
 *   npm run visual:check                        # the gate
 *   npm run visual:check -- --shots visual-check
 *   npm run visual:check -- --update            # rewrite the baseline
 *   npm run visual:check -- --timings           # where the time goes
 *
 * `BASE=<url>` walks a deployment instead of an in-process `vite preview`; the
 * stub still applies, so the answer means the same thing either way. `PORT=`
 * moves the preview server it stands up otherwise.
 *
 * `--timings` exists because the obvious reading of the clock is wrong. The
 * wall time around `page.evaluate(AUDIT)` is not the audit: the app's first
 * map render is a single main-thread task of about five seconds — software-GL
 * shader compilation, once per load — and whatever the harness asks the page
 * for next queues behind it. The audit's own work, on the page's own clock, is
 * under three milliseconds, and the table prints it on its own line
 * (`sand-pmz.2.6`, ADR 0011).
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { LAUNCH_ARGS, newTimings, rollUp, walk } from './lib/visual-scenes.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

/**
 * The severity of every defect kind the DOM audit can report.
 *
 * `structural` blocks; `reported` is printed and never fatal. A kind in
 * neither column stops the run rather than defaulting to either, which is the
 * same argument ADR 0023 makes for a warning with no ceiling: defaulting to
 * blocking enforces a rule nobody wrote, and defaulting to reported lets a new
 * class of defect land the day it is invented. Classifying one is a line here
 * and a sentence saying why.
 */
const SEVERITY = {
  // The document scrolls sideways. Never deliberate, never on the baseline.
  'page-h-overflow': 'structural',
  // A box hides content it is not offering to scroll. Six of the design
  // review's eight findings were this shape (ADR 0011).
  'clipped-x': 'structural',
  'clipped-y': 'structural',
  // An element crosses the right edge of the viewport.
  'overflows-right': 'structural',
  // Under the 24×24px target floor. Fatal since sand-pmz.4, and only because
  // that bead wrote the rule down first: 24×24px with the two inline cases
  // WCAG names by name allowed on the baseline in writing
  // (docs/accessibility.md). A rule with a written record is a rule a gate may
  // hold; this one was correctly advisory until it had one.
  'small-target': 'structural',
  // Under ADR 0010's type floor. Reported, because the audit cannot see the
  // floor's own exemptions — one of the marks still under it is a label inside
  // an authored SVG rather than type on a page, and a gate red on that is
  // enforcing a rule nobody agreed to.
  'tiny-text': 'reported',
};

const blocking = (kind) => SEVERITY[kind] === 'structural';

const EXIT = { clean: 0, breakage: 1, structural: 2, misconfigured: 3 };

const BASELINE = fileURLToPath(new URL('./visual-baseline.json', import.meta.url));
const SHOTS = opt('shots') ?? process.env.SHOTS ?? null;
const UPDATE = flag('update');
const SETTLE = Number(process.env.SETTLE ?? 1200);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 2);

/**
 * Serve the build in-process unless BASE points at something already up.
 *
 * The port is not fixed (`sand-pmz.29`): it used to be 4179 with
 * `strictPort`, so a second run on the same machine — which is now ordinary,
 * with several worktrees in flight — died with "Port 4179 is already in use"
 * instead of walking anything. Vite's default is to step up from a busy port,
 * and the URL is read back from the server rather than assumed.
 */
let server;
let base = process.env.BASE;
if (!base) {
  // Read it rather than test for it: a check followed by an act leaves a
  // window between them, and the read is the check.
  try {
    readFileSync(fileURLToPath(new URL('../dist/index.html', import.meta.url)));
  } catch {
    console.error('no dist/ — run `npm run build` first.');
    process.exit(EXIT.misconfigured);
  }
  server = await preview({ preview: { port: Number(process.env.PORT ?? 4179) } });
  base = server.resolvedUrls.local[0].replace(/\/$/, '');
}

const started = Date.now();
const timings = flag('timings') ? newTimings() : null;
const browser = await chromium.launch({ args: LAUNCH_ARGS });
const report = await walk(browser, {
  base,
  stub: true,
  reuse: true,
  concurrency: CONCURRENCY,
  settleMs: () => SETTLE,
  shots: SHOTS,
  timings,
});
await browser.close();
await server?.close();

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
  // A kind with no severity is neither written to the baseline nor allowed by
  // it, so say so here rather than let `--update` look like it covered it.
  for (const k of [...new Set(rolled.map((e) => e.kind))].filter((k) => !(k in SEVERITY)))
    console.log(`unclassified defect kind "${k}" — give it a severity in scripts/visual-check.mjs`);
  const rows = rolled
    .filter((e) => blocking(e.kind))
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
          'It holds the blocking tier only: a reported finding is printed on every run ' +
          'and needs no allowance. Regenerate with `npm run visual:check -- --update`, ' +
          'then write the "why" for every new row before committing it: a row with a ' +
          'TODO why is a row nobody has justified. `el` may be "*" to allow a kind ' +
          'anywhere. See ADR 0011.',
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
  process.exit(EXIT.clean);
}

// ── sort every finding into its tier ───────────────────────────────────────
/** BLOCKING · breakage: the app did not come up, or it shouted. */
const breakage = [];
for (const [cell, v] of Object.entries(report)) {
  if (v.error) breakage.push(`${cell}: did not render — ${v.error}`);
  for (const e of v.consoleErrs ?? []) breakage.push(`${cell}: console error — ${e}`);
}

const allowed = (p) =>
  previous.some((a) => a.kind === p.kind && (a.el === '*' || a.el === (p.el ?? '')));

/** Roll the per-cell findings of one tier up into one row per kind+element. */
function group(want) {
  const out = new Map();
  for (const [cell, v] of Object.entries(report)) {
    for (const p of v.problems ?? []) {
      if (!want(p)) continue;
      const k = `${p.kind} ${p.el ?? ''}`;
      const e = out.get(k) ?? { ...p, n: 0, cells: [] };
      e.n += 1;
      if (e.cells.length < 3) e.cells.push(cell);
      out.set(k, e);
    }
  }
  return [...out.values()].sort((a, b) => b.n - a.n);
}

/** A kind the audit reports and this file has never heard of — see SEVERITY. */
const unclassified = [...new Set(rolled.map((e) => e.kind))].filter((k) => !(k in SEVERITY));

/** BLOCKING · structural: a gated kind the baseline does not allow. */
const structural = group((p) => blocking(p.kind) && !allowed(p));
/** REPORTED: everything whose rule has exemptions this audit cannot see. */
const advisory = group((p) => SEVERITY[p.kind] === 'reported');

/** Allowances that no longer occur — hygiene, never fatal. */
const stale = previous.filter(
  (a) => a.el !== '*' && !rolled.some((e) => e.kind === a.kind && e.el === a.el),
);

// ── output ─────────────────────────────────────────────────────────────────
const secs = ((Date.now() - started) / 1000).toFixed(0);
const cells = Object.keys(report).length;
console.log(`${cells} cells walked at ${base}, assets stubbed, ${secs}s\n`);

if (timings) {
  // Summed across the contending pages, so the columns add to more than the
  // wall clock; the point is the ratio between them, not the total.
  const rows = [
    ['goto → load', timings.goto, timings.loads],
    ['settle', timings.settle, timings.loads],
    ['viewport resize', timings.resize, timings.loads],
    ['theme (emulateMedia)', timings.theme, timings.audits],
    ['audit (wall)', timings.audit, timings.audits],
    ['audit (inside the page)', Math.round(timings.auditInPageMs), timings.audits],
    ...(timings.shot ? [['screenshots', timings.shot, timings.audits]] : []),
  ];
  console.log(`  phase, summed over ${timings.loads} loads on ${CONCURRENCY} pages:`);
  for (const [label, ms = 0, n] of rows)
    console.log(
      `    ${label.padEnd(26)}${String(ms).padStart(7)} ms   ${(ms / n).toFixed(1)} ms each`,
    );
  console.log(
    '\n    The audit is the last row, not the second-to-last: the wall time\n' +
      '    around page.evaluate(AUDIT) is mostly the queue in front of it —\n' +
      "    the map's first render is one main-thread task of several seconds.\n",
  );
}

const line = (row) => {
  console.log(`      ✗ ${row.kind.padEnd(16)} ${row.el}  ×${row.n}  | ${row.detail}`);
  console.log(`          seen in: ${row.cells.join(', ')}`);
};

console.log('  BLOCKING — a required check goes red on these\n');

console.log('    breakage    a scene that did not render, or an error the app raised');
if (breakage.length === 0)
  console.log('      ✓ none: every scene rendered, nothing on the console');
for (const f of breakage) console.log(`      ✗ ${f}`);

console.log('\n    structural  a layout defect off scripts/visual-baseline.json');
if (structural.length === 0) console.log('      ✓ none off the baseline');
for (const row of structural) line(row);

console.log('\n  REPORTED — printed every run, never fatal\n');
if (advisory.length === 0) {
  console.log('    ✓ none');
} else {
  const total = advisory.reduce((n, e) => n + e.n, 0);
  console.log(
    `    tiny-text   ${total} finding(s) across ${advisory.length} element(s). ADR 0010's` +
      '\n                type floor has exemptions this audit cannot see' +
      '\n                (docs/accessibility.md, docs/design-review.md).',
  );
  for (const e of advisory)
    console.log(`      · ${e.kind.padEnd(16)} ${e.el}  ×${e.n}  | ${e.detail}`);
}
if (stale.length) {
  console.log(
    `\n    baseline    ${stale.length} allowance(s) no longer occur — drop them from` +
      '\n                scripts/visual-baseline.json:',
  );
  for (const a of stale) console.log(`      · ${a.kind} ${a.el}`);
}

if (unclassified.length) {
  console.log('\n  UNCLASSIFIED — the gate cannot rule on these\n');
  for (const k of unclassified) console.log(`      ? ${k}`);
  console.log(
    '\n    A defect kind with no entry in SEVERITY (scripts/visual-check.mjs).' +
      '\n    Give it one, with a sentence saying whether it blocks and why.',
  );
}

// ── the verdict ────────────────────────────────────────────────────────────
// Worst first, and breakage outranks a misconfigured gate: a dead scene is a
// dead scene whatever the severity table says, and it is the more actionable
// of the two. An unclassified kind outranks a structural finding, because
// until it is classified the structural tier is not known to be complete.
const code = breakage.length
  ? EXIT.breakage
  : unclassified.length
    ? EXIT.misconfigured
    : structural.length
      ? EXIT.structural
      : EXIT.clean;

const REPORT = opt('report');
if (REPORT) {
  writeFileSync(
    REPORT,
    JSON.stringify(
      {
        verdict: {
          exit: code,
          cells,
          blocking: { breakage: breakage.length, structural: structural.length },
          reported: advisory.reduce((n, e) => n + e.n, 0),
          unclassified,
        },
        blocking: { breakage, structural },
        reported: advisory,
        cells: report,
      },
      null,
      2,
    ) + '\n',
  );
}

if (code === EXIT.clean) {
  console.log(
    '\n  ✓ nothing blocking: every scene rendered, no console errors, no structural' +
      '\n    defect off the baseline. A green run does not prove the design is' +
      "\n    unchanged, or that what the map drew is right — ADR 0011, 'What a green" +
      "\n    run does not prove'.",
  );
  process.exit(EXIT.clean);
}

const n = code === EXIT.misconfigured ? unclassified.length : breakage.length + structural.length;
console.log(
  `\n${n} blocking problem(s), exit ${code}. If a structural one is a deliberate design` +
    '\ndecision, add it to scripts/visual-baseline.json with a reason; otherwise fix it.',
);
process.exit(code);
