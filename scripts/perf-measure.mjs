/**
 * The performance measurement harness (`sand-pmz.3`, ADR 0016).
 *
 * Four numbers, taken separately because they are not equally trustworthy:
 *
 *   bundle   what the browser must download before anything is on screen,
 *            split into what index.html asks for and what the app fetches
 *            later. Read off `dist/`; deterministic, and the one thing CI
 *            gates (`scripts/bundle-budget.mjs`).
 *   boot     navigation → first contentful paint → seed pack parsed → the map
 *            reporting its style live, per scene, from the marks in
 *            `src/engine/perf.ts`.
 *   frames   the frame interval, idle and while the clock is playing, sampled
 *            with requestAnimationFrame.
 *   tiles    what the PMTiles basemap actually costs over the wire: how many
 *            range requests, how many bytes, how long, and whether the CDN
 *            served them from cache.
 *
 * **Hermetic vs. live.** By default `boot` and `frames` run against a
 * `vite preview` of `dist/` with `/assets/*` answered from inside the browser
 * exactly as the visual gate answers it (ADR 0011) — no S3, no CloudFront, no
 * proxy. That makes them repeatable and makes them *lower bounds*: the map has
 * no tiles to decode. `--live` drops the stub and walks a real deployment
 * instead, which is the only way `tiles` means anything; those numbers move
 * with the network and are reported, never gated. `--live` on its own is
 * usually what you want: the build in `dist/` served by `vite preview`, whose
 * `/assets/*` proxies to the real bucket, so the tiles are real and the marks
 * are this build's. `--base` at a deployment measures what is actually
 * published, marks and all — a deployment older than the marks reports blanks.
 *
 *   npm run build
 *   npm run perf                                   # hermetic, local preview
 *   npm run perf -- --live                         # local build, real bucket
 *   npm run perf -- --live --base https://sandtable.davetashner.com
 *   npm run perf -- --runs 5 --json perf.json
 *   npm run perf -- --headed          # a real GPU instead of SwiftShader
 *
 * Everything a headless runner produces here is software GL. A laptop with a
 * GPU is two to four times faster on the same build; the point of the number
 * is the delta between two builds, not the absolute.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { preview } from 'vite';
import { bundleReport, chunkOrigins } from './lib/bundle-size.mjs';
import { LAUNCH_ARGS, stubAssets } from './lib/visual-scenes.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};

const LIVE = flag('live');
const RUNS = Number(opt('runs', 3));
const FRAME_MS = Number(opt('frame-ms', 6000));
const JSON_OUT = opt('json');

const kb = (n) => (n / 1024).toFixed(1);
const ms = (n) => (n === null || n === undefined ? '   —' : Math.round(n).toString());

// ── bundle ─────────────────────────────────────────────────────────────────

function printBundle(r) {
  console.log('── bundle ' + '─'.repeat(60));
  console.log('  (gzip is what the wire carries; CloudFront compresses — ADR 0004)\n');
  for (const f of r.files) {
    console.log(
      `  ${f.eager ? '▶' : ' '} ${f.file.padEnd(38)} ${kb(f.raw).padStart(9)} kB  ` +
        `gzip ${kb(f.gzip).padStart(8)} kB`,
    );
  }
  console.log(
    `\n  ▶ eager (index.html + preloads): ${kb(r.eagerGzip)} kB gzip` +
      `\n    on demand (map surface, worker, gallery): ${kb(r.lazyGzip)} kB gzip` +
      `\n    everything: ${kb(r.totalGzip)} kB gzip`,
  );
  for (const f of r.files.filter((f) => f.gzip > 60 * 1024)) {
    const o = chunkOrigins(f.file);
    if (!o.length) continue;
    console.log(`\n  ${f.file} is made of:`);
    for (const [k, v] of o) console.log(`      ${kb(v).padStart(9)} kB source  ${k}`);
  }
  console.log('');
}

// ── in the browser ─────────────────────────────────────────────────────────

/** The scenes worth timing: the shell alone, the campaign map, a battle zoom. */
const BOOT_SCENES = [
  ['cold-open', ''],
  ['campaign-day20', '?t=1914-08-24T12:00:00Z'],
  ['battle-marne', '?t=1914-09-08T12:00:00Z&focus=1914:marne'],
];

/** Read the boot marks out of a page that has finished loading. */
const READ_MARKS = () => {
  const nav = performance.getEntriesByType('navigation')[0];
  const at = (n) => performance.getEntriesByName(n)[0]?.startTime ?? null;
  const fcp = performance
    .getEntriesByType('paint')
    .find((p) => p.name === 'first-contentful-paint');
  const res = performance.getEntriesByType('resource');
  return {
    domContentLoaded: nav?.domContentLoadedEventEnd ?? null,
    fcp: fcp?.startTime ?? null,
    packStart: at('sandtable:pack-start'),
    packReady: at('sandtable:pack-ready'),
    mapReady: at('sandtable:map-ready'),
    transferBytes: res.reduce((a, r) => a + (r.transferSize || 0), 0),
    requests: res.length,
  };
};

async function bootOnce(browser, base, qs, { stub }) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (stub) await stubAssets(ctx);
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(`${base}/${qs}`, { waitUntil: 'load', timeout: 60000 });
  // The map mark lands after load: the surface is a lazy import and MapLibre
  // builds its style asynchronously. Wait for the mark rather than a timeout,
  // so the number is the app's and not the harness's.
  const sawMark = await page
    .waitForFunction(() => performance.getEntriesByName('sandtable:map-ready').length > 0, null, {
      timeout: 20000,
    })
    .then(() => true)
    .catch(() => false);
  const marks = await page.evaluate(READ_MARKS);
  marks.sawMark = sawMark;
  marks.wallMs = Date.now() - t0;
  await ctx.close();
  return marks;
}

const median = (xs) => {
  const v = xs.filter((x) => x !== null && x !== undefined).sort((a, b) => a - b);
  if (!v.length) return null;
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
};

async function measureBoot(browser, base, stub) {
  const out = {};
  for (const [name, qs] of BOOT_SCENES) {
    const runs = [];
    for (let i = 0; i < RUNS; i += 1) runs.push(await bootOnce(browser, base, qs, { stub }));
    out[name] = {
      runs,
      fcp: median(runs.map((r) => r.fcp)),
      packMs: median(runs.map((r) => (r.packReady ?? 0) - (r.packStart ?? 0))),
      mapReady: median(runs.map((r) => r.mapReady)),
      wallMs: median(runs.map((r) => r.wallMs)),
      transferKb: median(runs.map((r) => r.transferBytes)) / 1024,
      requests: median(runs.map((r) => r.requests)),
    };
  }
  return out;
}

function printBoot(boot, stub, renderer) {
  console.log('── boot ' + '─'.repeat(62));
  console.log(
    `  median of ${RUNS} run(s), ${stub ? 'assets stubbed (hermetic)' : 'live deployment'}\n` +
      `  ${renderer}\n`,
  );
  console.log(
    '  scene              FCP    pack   map-ready   wall   transfer  reqs\n' +
      '  ' +
      '-'.repeat(66),
  );
  for (const [name, r] of Object.entries(boot)) {
    console.log(
      `  ${name.padEnd(16)} ${ms(r.fcp).padStart(5)}  ${ms(r.packMs).padStart(5)}  ` +
        `${ms(r.mapReady).padStart(9)}  ${ms(r.wallMs).padStart(5)}  ` +
        `${kb(r.transferKb * 1024).padStart(7)} kB  ${String(r.requests).padStart(4)}`,
    );
  }
  console.log('  all times ms from navigation start.');
  if (Object.values(boot).some((r) => r.mapReady === null)) {
    console.log(
      '  a blank map-ready means the build under test has no `sandtable:map-ready`\n' +
        '  mark — an older deployment. Point --base at a build that carries it.',
    );
  }
  console.log('');
}

// ── frames ─────────────────────────────────────────────────────────────────

/** Sample requestAnimationFrame intervals in the page for `durationMs`. */
const SAMPLE_FRAMES = async (durationMs) => {
  const gaps = [];
  let last = performance.now();
  const end = last + durationMs;
  await new Promise((resolve) => {
    const tick = (t) => {
      gaps.push(t - last);
      last = t;
      if (t < end) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  return gaps.slice(1);
};

function summarise(samples, durationMs) {
  if (!samples.length) return { error: 'no frames' };
  const sorted = [...samples].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  return {
    frames: samples.length,
    seconds: durationMs / 1000,
    fps: samples.length / (durationMs / 1000),
    medianMs: pct(50),
    p95Ms: pct(95),
    worstMs: sorted[sorted.length - 1],
    over50ms: samples.filter((g) => g > 50).length,
  };
}

/**
 * Frame intervals, idle and then while the clock plays.
 *
 * Both, because either alone is unreadable. The idle number is the ceiling
 * this browser can reach on this page at all — an empty page in the same
 * headless Chromium runs at ~120 fps, so anything well below that is the map
 * costing frames, not the harness. The playing number is what a reader sees
 * while the campaign runs.
 *
 * Playback is started through the Play button rather than by poking state, so
 * what is sampled is the path a reader takes. `prefers-reduced-motion` is left
 * alone: this measures the animated case on purpose, and the reduced-motion
 * case has no camera flight to sample.
 */
async function measureFrames(browser, base, stub) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (stub) await stubAssets(ctx);
  const page = await ctx.newPage();
  await page.goto(`${base}/?t=1914-08-24T12:00:00Z`, { waitUntil: 'load', timeout: 60000 });
  await page
    .waitForFunction(() => performance.getEntriesByName('sandtable:map-ready').length > 0, null, {
      timeout: 20000,
    })
    .catch(() => {});
  const skip = page.locator('.opening__skip');
  if (await skip.count())
    await skip
      .first()
      .click({ timeout: 4000 })
      .catch(() => {});
  await page.waitForTimeout(1500);
  const idle = summarise(await page.evaluate(SAMPLE_FRAMES, FRAME_MS), FRAME_MS);
  const play = page.locator('.timeline__button--play');
  if (!(await play.count())) {
    await ctx.close();
    return { error: 'no play button' };
  }
  await play.first().click();
  const playing = summarise(await page.evaluate(SAMPLE_FRAMES, FRAME_MS), FRAME_MS);
  await ctx.close();
  return { idle, playing };
}

/** What is actually rasterising — SwiftShader on a runner, a real GPU headed. */
async function gpu(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const name = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const d = gl?.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  await ctx.close();
  return name;
}

function line(label, f) {
  if (f.error) return `    ${label.padEnd(8)} ${f.error}`;
  return (
    `    ${label.padEnd(8)} ${f.fps.toFixed(1).padStart(5)} fps · median ` +
    `${f.medianMs.toFixed(1).padStart(5)} ms · p95 ${f.p95Ms.toFixed(1).padStart(5)} ms · ` +
    `worst ${f.worstMs.toFixed(0).padStart(4)} ms · ${f.over50ms} frame(s) over 50 ms`
  );
}

function printFrames(f, stub) {
  console.log('── frames ' + '─'.repeat(60));
  if (f.error) return console.log(`  ${f.error}\n`);
  console.log(`  ${f.idle.seconds}s each, ${stub ? 'assets stubbed' : 'live'}\n`);
  console.log(line('idle', f.idle));
  console.log(line('playing', f.playing));
  console.log('');
}

// ── tiles ──────────────────────────────────────────────────────────────────

const TILES_URL = '/assets/tiles/central-europe-z10.pmtiles';

/**
 * Does the CDN honour a range request, and does it cache the answer?
 *
 * Three requests straight at the archive, no browser: the header the pmtiles
 * client reads first, an arbitrary interior slice, and the same slice again to
 * see whether the second one is an edge hit. If any of them answers 200 the
 * whole archive is coming down the wire on every read and PMTiles is the wrong
 * shape of decision (ADR 0002).
 */
async function probeRanges(origin) {
  const url = origin + TILES_URL;
  const probes = [
    ['header', 'bytes=0-16383'],
    ['interior', 'bytes=4194304-4210687'],
    ['interior again', 'bytes=4194304-4210687'],
  ];
  const out = [];
  for (const [what, range] of probes) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { headers: { range } });
      const body = await res.arrayBuffer();
      out.push({
        what,
        range,
        status: res.status,
        bytes: body.byteLength,
        ms: Date.now() - t0,
        contentRange: res.headers.get('content-range'),
        acceptRanges: res.headers.get('accept-ranges'),
        cacheControl: res.headers.get('cache-control'),
        edge: res.headers.get('x-cache'),
        age: res.headers.get('age'),
      });
    } catch (e) {
      out.push({ what, range, error: String(e).slice(0, 120) });
    }
  }
  return out;
}

/**
 * What the basemap costs over the wire while a reader looks at the campaign.
 * Only meaningful with `--live`: the stub answers range requests from a
 * 130-byte archive in memory.
 */
async function measureTiles(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const reqs = [];
  const pending = new Map();
  page.on('response', (res) => {
    if (!/\.pmtiles/i.test(res.url())) return;
    pending.set(res.request(), {
      status: res.status(),
      range: res.request().headers()['range'] ?? null,
      bytes: Number(res.headers()['content-length'] ?? 0),
      edge: res.headers()['x-cache'] ?? null,
    });
  });
  // `requestfinished` is the only point at which the timing is complete.
  page.on('requestfinished', (req) => {
    const row = pending.get(req);
    if (!row) return;
    const t = req.timing();
    row.ms = t.responseEnd > 0 ? t.responseEnd - t.requestStart : null;
    reqs.push(row);
    pending.delete(req);
  });
  await page.goto(`${base}/?t=1914-08-24T12:00:00Z`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(12000);
  await ctx.close();
  const times = reqs.map((r) => r.ms).filter((x) => x !== null);
  return {
    probes: await probeRanges(new URL(base).origin),
    requests: reqs.length,
    partial: reqs.filter((r) => r.status === 206).length,
    full: reqs.filter((r) => r.status === 200).length,
    bytes: reqs.reduce((a, r) => a + r.bytes, 0),
    medianMs: median(times),
    slowestMs: times.length ? Math.max(...times) : null,
    hits: reqs.filter((r) => /Hit/i.test(r.edge ?? '')).length,
  };
}

function printTiles(t) {
  console.log('── PMTiles range requests ' + '─'.repeat(44));
  console.log(`  direct at the archive (${TILES_URL}):`);
  for (const p of t.probes) {
    if (p.error) {
      console.log(`    ${p.what.padEnd(15)} failed — ${p.error}`);
      continue;
    }
    console.log(
      `    ${p.what.padEnd(15)} ${p.status}  ${String(p.bytes).padStart(6)} B  ` +
        `${String(p.ms).padStart(5)} ms  ${p.edge ?? ''} ${p.age ? `age=${p.age}` : ''}`,
    );
  }
  console.log(`    accept-ranges: ${t.probes[0]?.acceptRanges ?? '—'}`);
  console.log(`    cache-control: ${t.probes[0]?.cacheControl ?? '—'}`);
  console.log(
    `\n  in the browser, 12s of the campaign view:\n` +
      `    ${t.requests} request(s): ${t.partial} answered 206 (range), ` +
      `${t.full} answered 200 (whole object)\n` +
      `    ${kb(t.bytes)} kB total · median ${ms(t.medianMs)} ms · slowest ${ms(t.slowestMs)} ms\n` +
      `    ${t.hits} served from the CloudFront edge\n`,
  );
  if (t.full > 0 || t.probes.some((p) => p.status === 200)) {
    console.log(
      '  ⚠ a 200 here means something read the whole archive instead of a range —\n' +
        '    check the origin honours Range and that the CDN forwards the header.\n',
    );
  }
}

// ── run ────────────────────────────────────────────────────────────────────

const result = { at: new Date().toISOString(), live: LIVE, runs: RUNS };

const bundle = bundleReport();
result.bundle = {
  eagerGzip: bundle.eagerGzip,
  lazyGzip: bundle.lazyGzip,
  totalGzip: bundle.totalGzip,
  files: bundle.files,
};
printBundle(bundle);

let server;
let base = process.env.BASE ?? opt('base');
if (!base) {
  server = await preview({ preview: { port: Number(opt('port', 4181)), strictPort: true } });
  base = server.resolvedUrls.local[0].replace(/\/$/, '');
}
console.log(`  measuring ${base}\n`);

const stub = !LIVE;
const browser = await chromium.launch({ args: LAUNCH_ARGS, headless: !flag('headed') });
result.renderer = await gpu(browser);
result.boot = await measureBoot(browser, base, stub);
printBoot(result.boot, stub, result.renderer);
result.frames = await measureFrames(browser, base, stub);
printFrames(result.frames, stub);
if (LIVE) {
  result.tiles = await measureTiles(browser, base);
  printTiles(result.tiles);
} else {
  console.log(
    '── PMTiles range requests ' +
      '─'.repeat(44) +
      '\n' +
      '  skipped: the stub answers ranges from memory. Re-run with --live\n' +
      '  --base https://sandtable.davetashner.com for the real cost.\n',
  );
}
await browser.close();
await server?.close();

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify(result, null, 2) + '\n');
  console.log(`  wrote ${JSON_OUT}`);
}
