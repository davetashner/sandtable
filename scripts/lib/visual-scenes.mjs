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
 * of its own (ADR 0015), one of every card, the layer switches off their
 * defaults, and the component gallery.
 *
 * Every scene is a URL and nothing else. The URL is the whole view (ADR
 * 0009), so a scene is reproduced by opening it, never by clicking into it —
 * which is what makes the walk repeatable. `layers=` carries only the
 * switches that differ from their default, so `layers-off-default` is the one
 * scene that renders the commander portraits and hides a "Meanwhile" field.
 */
export const SCENES = [
  ['opening', ''],
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
  ['card-casualty', `?t=${T35}&card=1914:casualties-marne`],
  ['card-vignette', `?t=${T35}&card=1914:vignette-taxis`],
  ['card-causal', `?t=${T20}&card=1914:link-wheel-to-marne`],
  ['card-science', `?t=${T20}&card=1914:science-manifesto-of-the-93`],
  ['tour-step', `?tour=1914:tour-the-campaign`],
  ['layers-off-default', `?t=${T20}&layers=commanders,-meanwhile.physics`],
  ['gallery', 'gallery.html'],
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
async function stubAssets(ctx) {
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

/** A context with the console wired up and, optionally, the bucket stubbed. */
async function newContext(browser, viewport, scheme, stub) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
  if (stub) await stubAssets(ctx);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 200)));
  return { ctx, page, errs };
}

function record(errs, problems, stub) {
  const seen = [...new Set(errs)];
  return {
    problems,
    consoleErrs: stub ? seen.filter((e) => !STUB_NOISE.test(e)) : seen,
    ...(stub ? { stubbedErrs: seen.filter((e) => STUB_NOISE.test(e)).length } : {}),
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
      if (shots) await page.screenshot({ path: `${shots}/${key}.png` });
      out[key] = record(errs, problems, stub);
    } catch (e) {
      out[key] = { error: String(e).slice(0, 300) };
    }
  }
  await ctx.close();
  return out;
}

/**
 * The matrix walk: one navigation per scene per viewport, both themes audited
 * off that one load.
 *
 * Booting the app is the expensive part — a software-GL WebGL context, the
 * deck.gl layers, the portrait masking — and the theme is a change of custom
 * properties, nothing more: `emulateMedia` recolours the page without moving
 * a box. Halving the loads was verified cell by cell against `walkFaithful`.
 *
 * The viewport does not get the same treatment, and the attempt is worth
 * recording. Auditing all four cells off one load meant resizing the page, and
 * MapLibre resizes its canvas from a ResizeObserver — a frame that, on a
 * machine running two of these at once, arrives whenever it arrives. Every run
 * then reported a handful of `overflows-right` on `canvas.maplibregl-canvas`,
 * a different handful each time: the desktop map still inside the phone shell.
 * A wait on the container's width did not fix it, because the container had
 * already resized and the canvas had not. That is precisely the gate that
 * goes red for reasons unrelated to the change (ADR 0011), so the viewport
 * gets a fresh context and a fresh load, and stays honest.
 */
async function walkMatrix(browser, scenes, vpName, viewport, opts) {
  const { base, schemes, settleMs, shots, stub } = opts;
  const out = {};
  const { ctx, page, errs } = await newContext(browser, viewport, schemes[0], stub);
  for (const [name, qs] of scenes) {
    errs.length = 0;
    try {
      await page.emulateMedia({ colorScheme: schemes[0] });
      await open(page, base, name, qs);
      await page.waitForTimeout(settleMs(name));
      for (const scheme of schemes) {
        await page.emulateMedia({ colorScheme: scheme });
        const key = `${name}__${vpName}__${scheme}`;
        const problems = await page.evaluate(AUDIT);
        if (shots) await page.screenshot({ path: `${shots}/${key}.png` });
        out[key] = record(errs, problems, stub);
      }
    } catch (e) {
      for (const scheme of schemes)
        out[`${name}__${vpName}__${scheme}`] = { error: String(e).slice(0, 300) };
    }
  }
  await ctx.close();
  return out;
}

/**
 * Walk every scene across every viewport and scheme. `reuse` picks the matrix
 * walk over the faithful one; `concurrency` splits the work across that many
 * pages of the one browser.
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
  } = opts;
  if (shots) mkdirSync(shots, { recursive: true });
  const shared = { base, scenes, viewports, schemes, settleMs, shots, stub };

  // The matrix walk shards by viewport × scene; the faithful walk by
  // viewport × scheme, one context each.
  const jobs = viewports.flatMap(([vpName, viewport]) =>
    reuse
      ? shard(scenes, concurrency).map(
          (chunk) => () => walkMatrix(browser, chunk, vpName, viewport, shared),
        )
      : schemes.map((scheme) => () => walkFaithful(browser, vpName, viewport, scheme, shared)),
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
