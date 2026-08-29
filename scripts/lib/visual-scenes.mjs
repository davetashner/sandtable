/**
 * The scene list, the DOM audit, and the driver that walks one against the
 * other. Shared by the two things that look at the built app in a browser:
 *
 *   scripts/visual-review.mjs  the on-demand design review — real assets,
 *                              long settles, screenshots for a human to read
 *                              (docs/design-review.md)
 *   scripts/visual-check.mjs   the CI gate — assets stubbed, short settles,
 *                              the audit compared against a committed
 *                              baseline (ADR 0011)
 *
 * One list of scenes, one audit, two purposes: a scene added for the review
 * is a scene the gate walks the next time it runs.
 */
import { mkdirSync } from 'node:fs';

const T0 = '1914-08-04T06:00:00Z';
const T20 = '1914-08-24T12:00:00Z';
const T35 = '1914-09-08T12:00:00Z';

/**
 * Campaign day 0/20/35, both zoom-in kinds, the epilogue chapter with a window
 * of its own (ADR 0015), one of every card — including the bibliography, which
 * is the longest card in the app and therefore the one most likely to overflow
 * a phone, and the contested point, which is the densest structure in one —
 * the layer switches off their defaults, one campaign view of every era, and
 * the component gallery.
 *
 * Every scene is a URL and nothing else. The URL is the whole view (ADR
 * 0009), so a scene is reproduced by opening it, never by clicking into it —
 * which is what makes the walk repeatable. `layers=` carries only the
 * switches that differ from their default, so `layers-off-default` is the one
 * scene that renders the commander portraits and hides a "Meanwhile" field.
 */
export const SCENES = [
  // The campaign's opening view names its era, because `/` is the atlas now
  // (ADR 0024). The scenes below it deliberately do not: a URL with view state
  // and no `pack` is the shape of every link written before that record, and
  // walking them is how the gate keeps that path alive.
  ['opening', '?pack=1914-schlieffen-marne'],
  ['campaign-day0', `?t=${T0}`],
  ['campaign-day20', `?t=${T20}`],
  ['campaign-day35', `?t=${T35}`],
  ['battle-marne', `?t=${T35}&focus=1914:marne`],
  ['battle-liege', `?t=1914-08-06T12:00:00Z&focus=1914:liege`],
  ['chapter-origins', `?t=${T0}&focus=1914:origins`],
  ['july-crisis', `?t=1914-07-05T12:00:00Z&focus=1914:july-crisis`],
  ['chapter-epilogue', `?t=1915-11-25T00:00:00Z&focus=1914:meanwhile-epilogue`],
  ['card-person', `?t=${T20}&card=1914:cast-kluck-alexander-von`],
  ['card-tech', `?t=${T20}&card=1914:tech-heavy-siege-artillery`],
  ['card-formation', `?t=${T20}&card=1914:army-de-1`],
  ['card-document', `?t=${T20}&card=1914:document-afgg-instruction-generale-2-1914-08-25`],
  ['card-decision', `?t=1914-08-30T12:00:00Z&card=1914:decision-1914-08-30-kluck-wheel`],
  ['card-historiography', `?t=${T35}&card=1914:historiography-hentsch-authority`],
  ['card-casualty', `?t=${T35}&card=1914:casualties-marne`],
  ['card-vignette', `?t=${T35}&card=1914:vignette-taxis`],
  ['card-causal', `?t=${T20}&card=1914:link-wheel-to-marne`],
  ['card-science', `?t=${T20}&card=1914:science-manifesto-of-the-93`],
  ['card-bibliography', `?t=${T20}&card=bibliography`],
  ['card-source', `?t=${T20}&card=source:edmonds-1933`],
  ['tour-step', `?tour=1914:tour-the-campaign`],
  ['layers-off-default', `?t=${T20}&layers=-commanders,-meanwhile.physics`],
  // First Ypres, the level that ends the campaign (`sand-23b.55`). The hour is
  // the Worcesters' counter-attack at Gheluvelt — the one moment in the level
  // written in hours rather than days, so it is the one worth pinning.
  ['battle-ypres', '?t=1914-10-31T14:00:00Z&focus=1914:ypres'],
  // One scene per era (`sand-pmz.9.1`). A page load is one era (ADR 0018), and
  // until this list grew, four of the five had never been walked in either
  // theme at either width — so no gate had confirmed they render at all, and
  // the screenshot artifact a reviewer opens did not contain the Pacific.
  // That is how PR #161's antimeridian routes shipped through a green run.
  // Each is a campaign view at a date inside the pack's own `timeRange`.
  ['era-1915', '?pack=1915-attrition&t=1915-05-09T12:00:00Z'],
  ['era-1917', '?pack=1917-russian-revolution&t=1917-03-12T12:00:00Z'],
  ['era-1918', '?pack=1918-russian-civil-war&t=1920-08-16T12:00:00Z'],
  ['era-1941', '?pack=1941-pearl-harbor&t=1941-12-07T18:00:00Z'],
  // The one zoom-in outside 1914 worth a scene of its own: the Oahu level is
  // the assault scale ADR 0002 cut a dedicated z13 archive for, and it is the
  // view the antimeridian defect was next door to.
  ['battle-oahu', '?pack=1941-pearl-harbor&t=1941-12-07T18:00:00Z&focus=1941-pearl-harbor:oahu'],
  ['gallery', 'gallery.html'],
  // The home page, which is the atlas (ADR 0024). `/atlas.html` still serves
  // the same page and is what the boot failure states link to; this walks the
  // address a reader actually arrives at.
  ['atlas', ''],
];

export const VIEWPORTS = [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844 }],
];

export const SCHEMES = ['light', 'dark'];

/** Runs in the page. Returns the defects visible in the rendered DOM. */
export const AUDIT = () => {
  const problems = [];
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) {
    problems.push({ kind: 'page-h-overflow', detail: `${de.scrollWidth} > ${de.clientWidth}` });
  }
  const seen = new Set();
  const add = (kind, el, detail) => {
    const key = `${kind}:${el}`;
    if (seen.has(key)) return;
    seen.add(key);
    problems.push({ kind, el, detail });
  };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // The visually-hidden idiom is a clipped 1×1 box; it is not a defect.
    if (r.width <= 2 && r.height <= 2) continue;
    const tag = el.tagName.toLowerCase();
    const cls = typeof el.className === 'string' ? el.className : '';
    const id = `${tag}.${cls.split(' ').filter(Boolean).slice(0, 2).join('.')}`;
    const clipped = (o) => o === 'hidden' || o === 'clip';
    if (clipped(cs.overflowX) && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2) {
      add('clipped-x', id, `${el.scrollWidth}>${el.clientWidth}`);
    }
    if (clipped(cs.overflowY) && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 2) {
      add('clipped-y', id, `${el.scrollHeight}>${el.clientHeight}`);
    }
    if (r.right > window.innerWidth + 2 && r.left < window.innerWidth) {
      add('overflows-right', id, `right=${Math.round(r.right)} vw=${window.innerWidth}`);
    }
    const fs = parseFloat(cs.fontSize);
    const hasText = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 1,
    );
    if (hasText && fs < 11) add('tiny-text', id, `${fs}px "${el.textContent.trim().slice(0, 40)}"`);
    if (['button', 'a', 'input', 'select'].includes(tag) && (r.height < 24 || r.width < 24)) {
      add(
        'small-target',
        id,
        `${Math.round(r.width)}x${Math.round(r.height)} "${el.textContent.trim().slice(0, 30)}"`,
      );
    }
  }
  return problems;
};

/**
 * A 1×1 fully transparent PNG. Stands in for every archive photograph when the
 * assets bucket is stubbed: the `<img>` keeps the layout box its CSS gives it,
 * which is all the DOM audit reads, nothing crosses the network, and the
 * screenshot shows the frame the photograph would have sat in rather than a
 * coloured block over it.
 */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAA' +
    'DUlEQVR42mNgYGBgAAAABQABeqhXUAAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * A valid, empty PMTiles v3 archive: the 127-byte header, a root directory of
 * zero entries, and `{}` for metadata.
 *
 * A 404 would be simpler and is the wrong shape of lie — the pmtiles client
 * throws on it, and a gate that has to ignore an exception it caused itself
 * cannot also assert "no console errors". An archive with no tiles in it is a
 * truthful answer to every range request: the map builds its style, reports
 * ready, lays out its labels, and draws no basemap.
 */
function emptyPmtiles() {
  const h = Buffer.alloc(127);
  h.write('PMTiles', 0, 'ascii');
  h.writeUInt8(3, 7); // spec version
  const u64 = (v, at) => h.writeBigUInt64LE(BigInt(v), at);
  u64(127, 8); // root directory offset / length
  u64(1, 16);
  u64(128, 24); // metadata offset / length
  u64(2, 32);
  u64(130, 40); // leaf directories, tile data: empty, at the end
  u64(0, 48);
  u64(130, 56);
  u64(0, 64);
  u64(0, 72); // addressed tiles, tile entries, tile contents
  u64(0, 80);
  u64(0, 88);
  h.writeUInt8(1, 96); // clustered
  h.writeUInt8(1, 97); // internal compression: none
  h.writeUInt8(1, 98); // tile compression: none
  h.writeUInt8(1, 99); // tile type: MVT
  h.writeUInt8(0, 100); // min zoom / max zoom
  h.writeUInt8(14, 101);
  h.writeInt32LE(-1800000000, 102); // bounds, E7 — the whole world
  h.writeInt32LE(-850511287, 106);
  h.writeInt32LE(1800000000, 110);
  h.writeInt32LE(850511287, 114);
  h.writeUInt8(0, 118); // centre zoom / lon / lat
  h.writeInt32LE(0, 119);
  h.writeInt32LE(0, 123);
  return Buffer.concat([h, Buffer.from([0]), Buffer.from('{}')]);
}

const PMTILES = emptyPmtiles();

/** Answer a `Range:` request honestly — the pmtiles client reads by range. */
function serveRange(route, body, contentType) {
  const m = /bytes=(\d+)-(\d+)?/.exec(route.request().headers()['range'] ?? '');
  if (!m) return route.fulfill({ status: 200, contentType, body });
  const start = Number(m[1]);
  const end = Math.min(m[2] === undefined ? body.length - 1 : Number(m[2]), body.length - 1);
  if (start > end) return route.fulfill({ status: 416, contentType, body: Buffer.alloc(0) });
  return route.fulfill({
    status: 206,
    contentType,
    body: body.subarray(start, end + 1),
    headers: { 'content-range': `bytes ${start}-${end}/${body.length}`, 'accept-ranges': 'bytes' },
  });
}

/**
 * Serve `/assets/*` from inside the browser instead of the network.
 *
 * The assets bucket holds the PMTiles basemap, the historical borders and the
 * media (ADR 0004); `vite preview` proxies it to production, and PMTiles range
 * requests through that proxy can fail. Anything that depends on it is
 * therefore not reproducible — which is fine for a review a human reads, and
 * fatal for a gate. Stubbing it makes the walk hermetic and silent: images
 * become a pixel, borders an empty FeatureCollection, the basemap an empty
 * archive. Every one of them is a well-formed answer, so nothing the gate
 * hears on the console is the harness's own voice.
 */
export async function stubAssets(ctx) {
  await ctx.route('**/assets/**', (route) => {
    const url = route.request().url().split('?')[0];
    if (/\.pmtiles$/i.test(url)) return serveRange(route, PMTILES, 'application/octet-stream');
    if (/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(url)) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
    }
    if (/\.(geo)?json$/i.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"type":"FeatureCollection","features":[]}',
      });
    }
    return route.fulfill({ status: 404, contentType: 'text/plain', body: 'stubbed' });
  });
}

/**
 * The one thing the stub cannot answer well: `content/shared/media/index.json`
 * and its kin are served as an empty FeatureCollection, and a request for an
 * asset this era does not have is a real 404. Both surface as a browser
 * resource message rather than an app error.
 */
const STUB_NOISE = /\/assets\/|ERR_FAILED|Failed to load resource|net::/i;

/** Open the scene, dismissing the opening sequence unless it is the subject. */
async function open(page, base, name, qs) {
  await page.goto(base + '/' + qs, { waitUntil: 'load', timeout: 30000 });
  if (name === 'opening') return;
  const skip = page.locator('.opening__skip');
  if (await skip.count())
    await skip
      .first()
      .click({ timeout: 4000 })
      .catch(() => {});
}

/**
 * Chromium throttles timers and animation frames in a page it thinks nobody
 * is looking at, and with several pages open only one is ever in front. The
 * map's resize and its label layout both hang off that clock.
 */
export const LAUNCH_ARGS = [
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

/**
 * Asks the app to publish what the map drew (`src/engine/map-probe.ts`,
 * `sand-pmz.9.2`). This runs before the document exists, which is the point:
 * it is a switch the harness can reach and a reader cannot, so the probe costs
 * a real page load nothing and the URL contract is left alone.
 */
const PROBE_INIT = () => {
  window.__sandtableProbe = true;
};

/** Reads what the app published, or null on a page with no map. */
export const PROBE = () => window.__sandtableMap ?? null;

/** A context with the console wired up and, optionally, the bucket stubbed. */
async function newContext(browser, viewport, scheme, stub) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
  await ctx.addInitScript(PROBE_INIT);
  if (stub) await stubAssets(ctx);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 200)));
  return { ctx, page, errs };
}

function record(errs, problems, stub, probe) {
  const seen = [...new Set(errs)];
  return {
    problems,
    consoleErrs: stub ? seen.filter((e) => !STUB_NOISE.test(e)) : seen,
    ...(stub ? { stubbedErrs: seen.filter((e) => STUB_NOISE.test(e)).length } : {}),
    ...(probe ? { probe } : {}),
  };
}

/**
 * The faithful walk: one context per viewport × scheme, one navigation per
 * scene, long settles, a screenshot of each. What a human reviews.
 */
async function walkFaithful(browser, vpName, viewport, scheme, opts) {
  const { base, scenes, settleMs, shots, stub } = opts;
  const out = {};
  const { ctx, page, errs } = await newContext(browser, viewport, scheme, stub);
  for (const [name, qs] of scenes) {
    const key = `${name}__${vpName}__${scheme}`;
    errs.length = 0;
    try {
      await open(page, base, name, qs);
      // The map settles on its own schedule; the label layout runs after it.
      await page.waitForTimeout(settleMs(name));
      const problems = await page.evaluate(AUDIT);
      const probe = await page.evaluate(PROBE);
      if (shots) await page.screenshot({ path: `${shots}/${key}.png` });
      out[key] = record(errs, problems, stub, probe);
    } catch (e) {
      out[key] = { error: String(e).slice(0, 300) };
    }
  }
  await ctx.close();
  return out;
}

/**
 * Wait for the resize to have finished travelling.
 *
 * `page.setViewportSize` moves the shell immediately; MapLibre and deck.gl
 * resize their canvases from a `ResizeObserver`, on a frame that — on a
 * machine running two of these at once — arrives whenever it arrives. The
 * condition below is what "arrived" means: every canvas is the width of the
 * element it sits in. It is polled on animation frames, so it is answered by
 * the same clock the observer is on, and it is bounded: on timeout the walk
 * audits anyway, and whatever the audit then sees is reported rather than
 * hidden.
 *
 * ADR 0011 recorded an earlier attempt at this that waited on the *container*
 * and failed, because the container had already resized and the canvas had
 * not. Waiting on the canvas is the fix.
 */
async function settleResize(page) {
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('canvas')].every((c) => {
          const p = c.parentElement;
          return !p || Math.abs(c.clientWidth - p.clientWidth) <= 1;
        }),
      undefined,
      { timeout: 15000, polling: 'raf' },
    )
    .catch(() => {});
  // And for the transitions the new width started. A card that moves between
  // the dossier and the sheet is re-mounted and fades in; measured on the way
  // through, its box is a fraction of a pixel short of the box it settles at,
  // which is enough to invent a `small-target` finding that nothing on a fresh
  // load ever reports. Endless animations — anything that pulses — are not
  // waited for, because they never end.
  await page
    .waitForFunction(
      () =>
        !document
          .getAnimations()
          .some(
            (a) => a.playState === 'running' && a.effect?.getTiming?.().iterations !== Infinity,
          ),
      undefined,
      { timeout: 5000, polling: 'raf' },
    )
    .catch(() => {});
  // One more frame, so a layout that reacts to the canvas has had its turn.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}

/**
 * The matrix walk: one navigation per scene, every viewport and every theme
 * audited off that one load.
 *
 * Booting the app is the whole cost and it is not the audit's. Measured with
 * `--timings` (sand-pmz.2.6): the audit's own work inside the page is about
 * 3ms, and the first render of the map is a *single* main-thread task of
 * roughly five seconds — software-GL shader compilation, once per WebGL
 * context, once per load. Whatever the harness asks the page for next waits on
 * that task and is billed for it, which is how PR #119 came to read the cost
 * of the app's boot off the audit's stopwatch.
 *
 * So the lever is loads, and there are two ways to spend fewer of them.
 * The theme is a change of custom properties, nothing more: `emulateMedia`
 * recolours the page without moving a box. The viewport does move boxes, and
 * ADR 0011 gave it a fresh load for a reason — the resize lottery, a different
 * handful of `overflows-right` on `canvas.maplibregl-canvas` every run. That
 * reason is answered by `settleResize` above rather than by another load:
 * wait on the canvas, not on the container. Both halvings were verified cell
 * by cell against a fresh-load walk of the same tree.
 *
 * **The narrowest viewport gets the load**, and the wider ones are reached by
 * resizing up. Not arbitrary: the phone layout is the one with a component
 * that exists only at phone width — the bottom sheet — and a sheet reached by
 * resize is a sheet that has already had a settled desktop layout to grow out
 * of, which is not the sheet a reader gets. Verified: with the load at
 * desktop, `card-source__phone` stopped reporting the `clipped-y section.sheet`
 * that a fresh phone load reports; with the load at phone, every cell matches
 * a fresh-load walk.
 *
 * One thing does widen: the console is cleared per load rather than per cell,
 * so an error raised at one width is attributed to every cell off that load.
 * It over-reports and never hides — any console error still fails the gate,
 * and it names one more cell than it strictly should while doing it.
 */
async function walkMatrix(browser, scenes, unordered, opts) {
  const { base, schemes, settleMs, shots, stub, timings } = opts;
  const out = {};
  const viewports = [...unordered].sort((a, b) => a[1].width - b[1].width);
  const [[, firstViewport]] = viewports;
  const { ctx, page, errs } = await newContext(browser, firstViewport, schemes[0], stub);
  for (const [name, qs] of scenes) {
    errs.length = 0;
    try {
      await page.emulateMedia({ colorScheme: schemes[0] });
      await page.setViewportSize(firstViewport);
      await time(timings, 'goto', () => open(page, base, name, qs));
      if (timings) timings.loads += 1;
      await time(timings, 'settle', () => page.waitForTimeout(settleMs(name)));
      for (const [vpName, viewport] of viewports) {
        if (viewport !== firstViewport) {
          await time(timings, 'resize', async () => {
            await page.setViewportSize(viewport);
            await settleResize(page);
          });
        }
        for (const scheme of schemes) {
          await time(timings, 'theme', () => page.emulateMedia({ colorScheme: scheme }));
          const key = `${name}__${vpName}__${scheme}`;
          const problems = await time(timings, 'audit', () => page.evaluate(AUDIT));
          if (timings) timings.audits += 1;
          if (timings) timings.auditInPageMs += await auditSelfTime(page);
          // Re-read per cell: the resize changes what the map drew, so a probe
          // taken once per scene would describe the wrong viewport.
          const probe = await page.evaluate(PROBE);
          if (shots)
            await time(timings, 'shot', () => page.screenshot({ path: `${shots}/${key}.png` }));
          out[key] = record(errs, problems, stub, probe);
        }
      }
    } catch (e) {
      for (const [vpName] of viewports)
        for (const scheme of schemes)
          out[`${name}__${vpName}__${scheme}`] = { error: String(e).slice(0, 300) };
    }
  }
  await ctx.close();
  return out;
}

/** Time one phase into the accumulator, or just run it. */
async function time(timings, phase, fn) {
  if (!timings) return fn();
  const t = Date.now();
  try {
    return await fn();
  } finally {
    timings[phase] = (timings[phase] ?? 0) + (Date.now() - t);
  }
}

/**
 * How long the audit takes *inside* the page, measured by the page's own
 * clock — the number the wall time around `page.evaluate(AUDIT)` does not
 * give you, because that wall time is mostly the queue in front of it.
 */
async function auditSelfTime(page) {
  return page
    .evaluate((src) => {
      const f = new Function('return (' + src + ')')();
      const t = performance.now();
      f();
      return performance.now() - t;
    }, AUDIT.toString())
    .catch(() => 0);
}

/** A fresh accumulator for `walk({ timings })`. */
export const newTimings = () => ({ loads: 0, audits: 0, auditInPageMs: 0 });

/**
 * Walk every scene across every viewport and scheme. `reuse` picks the matrix
 * walk over the faithful one; `concurrency` splits the work across that many
 * pages of the one browser. Pass `timings` (see `newTimings`) to have each
 * phase's wall time accumulated into it.
 */
export async function walk(browser, opts = {}) {
  const {
    base = 'http://localhost:4174',
    scenes = SCENES,
    viewports = VIEWPORTS,
    schemes = SCHEMES,
    settleMs = (name) => (name === 'opening' ? 3000 : 9000),
    shots = null,
    stub = false,
    reuse = false,
    concurrency = 1,
    timings = null,
  } = opts;
  if (shots) mkdirSync(shots, { recursive: true });
  const shared = { base, scenes, viewports, schemes, settleMs, shots, stub, timings };

  // The matrix walk shards by scene and covers every viewport off one load;
  // the faithful walk takes a context per viewport × scheme.
  const jobs = reuse
    ? shard(scenes, concurrency).map((chunk) => () => walkMatrix(browser, chunk, viewports, shared))
    : viewports.flatMap(([vpName, viewport]) =>
        schemes.map((scheme) => () => walkFaithful(browser, vpName, viewport, scheme, shared)),
      );

  const report = {};
  for (let i = 0; i < jobs.length; i += concurrency) {
    for (const r of await Promise.all(jobs.slice(i, i + concurrency).map((j) => j())))
      Object.assign(report, r);
  }
  return report;
}

/** Deal `items` round-robin into `n` piles, dropping any that stay empty. */
function shard(items, n) {
  const piles = Array.from({ length: Math.max(1, n) }, () => []);
  items.forEach((item, i) => piles[i % piles.length].push(item));
  return piles.filter((p) => p.length);
}

/** Roll a report up by defect and element — one line per thing to fix. */
export function rollUp(report) {
  const agg = new Map();
  for (const v of Object.values(report)) {
    for (const p of v.problems ?? []) {
      const k = `${p.kind} ${p.el ?? ''}`;
      const e = agg.get(k) ?? { n: 0, kind: p.kind, el: p.el ?? '', detail: p.detail };
      e.n += 1;
      agg.set(k, e);
    }
  }
  return [...agg.values()].sort((a, b) => b.n - a.n);
}
