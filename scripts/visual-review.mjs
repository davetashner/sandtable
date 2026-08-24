/**
 * The Phase 1 design-review checklist, executable (sand-1l0.15).
 *
 * Walks the built app across seventeen scenes × two themes × desktop and
 * phone, screenshots each, and audits the DOM for the defects a reading of
 * the CSS does not catch: a page that scrolls sideways, text clipped by its
 * own container, type below the floor, tap targets below the floor.
 *
 * Playwright is deliberately not a dependency — this is an on-demand review,
 * not a CI gate (that is sand-pmz.2). Run it against a production-shaped
 * build, never the dev server:
 *
 *   npm run build && npm run preview -- --port 4174 &
 *   npm i --no-save playwright && npx playwright install chromium
 *   node scripts/visual-review.mjs
 *
 * Or against a deployment:  BASE=https://sandtable.davetashner.com node scripts/visual-review.mjs
 *
 * Note: `vite preview` proxies /assets/* to production, but PMTiles range
 * requests through that proxy can fail, leaving the basemap empty. That is a
 * property of the local harness, not the app — confirm any map-rendering
 * finding against BASE=<a deployment> before believing it.
 */
import { chromium } from 'playwright'; // npm i --no-save playwright
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4174';
const OUT = process.env.OUT ?? 'visual-review';
mkdirSync(OUT, { recursive: true });

const T0 = '1914-08-04T06:00:00Z';
const T20 = '1914-08-24T12:00:00Z';
const T35 = '1914-09-08T12:00:00Z';

/** Campaign day 0/20/35, both zoom-in kinds, and one of every card. */
const SCENES = [
  ['opening', ''],
  ['campaign-day0', `?t=${T0}`],
  ['campaign-day20', `?t=${T20}`],
  ['campaign-day35', `?t=${T35}`],
  ['battle-marne', `?t=${T35}&focus=1914:marne`],
  ['battle-liege', `?t=1914-08-06T12:00:00Z&focus=1914:liege`],
  ['chapter-origins', `?t=${T0}&focus=1914:origins`],
  ['july-crisis', `?t=1914-07-05T12:00:00Z&focus=1914:july-crisis`],
  ['card-person', `?t=${T20}&card=1914:cast-kluck-alexander-von`],
  ['card-tech', `?t=${T20}&card=1914:tech-heavy-siege-artillery`],
  ['card-document', `?t=${T20}&card=1914:document-afgg-instruction-generale-2-1914-08-25`],
  ['card-decision', `?t=1914-08-30T12:00:00Z&card=1914:decision-1914-08-30-kluck-wheel`],
  ['card-casualty', `?t=${T35}&card=1914:casualties-marne`],
  ['card-vignette', `?t=${T35}&card=1914:vignette-taxis`],
  ['card-causal', `?t=${T20}&card=1914:link-wheel-to-marne`],
  ['card-science', `?t=${T20}&card=1914:science-manifesto-of-the-93`],
  ['tour-step', `?tour=1914:tour-the-campaign`],
];

const VIEWPORTS = [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844 }],
];

/** Runs in the page. Returns the defects visible in the rendered DOM. */
const AUDIT = () => {
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

const report = {};
const browser = await chromium.launch();
for (const [vpName, viewport] of VIEWPORTS) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 200)));
    for (const [name, qs] of SCENES) {
      const key = `${name}__${vpName}__${scheme}`;
      errs.length = 0;
      try {
        await page.goto(BASE + '/' + qs, { waitUntil: 'load', timeout: 30000 });
        if (name !== 'opening') {
          const skip = page.locator('.opening__skip');
          if (await skip.count())
            await skip
              .first()
              .click({ timeout: 4000 })
              .catch(() => {});
        }
        // The map settles on its own schedule; the label layout runs after it.
        await page.waitForTimeout(name === 'opening' ? 3000 : 9000);
        const problems = await page.evaluate(AUDIT);
        await page.screenshot({ path: `${OUT}/${key}.png` });
        report[key] = { problems, consoleErrs: [...new Set(errs)] };
      } catch (e) {
        report[key] = { error: String(e).slice(0, 300) };
      }
    }
    await ctx.close();
  }
}
await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

// Roll up by defect and element — one line per thing to fix, not per scene.
const agg = new Map();
for (const [scene, v] of Object.entries(report)) {
  if (v.error) console.log(`${scene}: ERROR ${v.error}`);
  for (const p of v.problems ?? []) {
    const k = `${p.kind}\t${p.el ?? ''}`;
    const e = agg.get(k) ?? { n: 0, detail: p.detail };
    e.n += 1;
    agg.set(k, e);
  }
}
for (const [k, e] of [...agg].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`${String(e.n).padStart(3)}  ${k.replace('\t', '  ')}  | ${e.detail}`);
}
console.log(`\n${Object.keys(report).length} scenes, screenshots in ${OUT}/`);
