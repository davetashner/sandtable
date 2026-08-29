/**
 * The Phase 1 design-review checklist, executable (sand-1l0.15).
 *
 * Walks the built app across every scene in `scripts/lib/visual-scenes.mjs`
 * × two themes × desktop and phone — the count is that list's length and is
 * deliberately not repeated here, because three copies of it had already
 * drifted apart (`sand-23b.55`) — screenshots each, and audits the DOM for
 * the defects a reading of
 * the CSS does not catch: a page that scrolls sideways, text clipped by its
 * own container, type below the floor, tap targets below the floor.
 *
 * This is the on-demand review, read by a human: real assets, long settles,
 * a screenshot of every scene. Its scene list and its audit are shared with
 * the CI gate in `scripts/visual-check.mjs` (ADR 0009) — both import
 * `scripts/lib/visual-scenes.mjs`, so a scene added here is a scene the gate
 * walks. Run it against a production-shaped build, never the dev server:
 *
 *   npm run build && npm run preview -- --port 4174 &
 *   npx playwright install chromium
 *   npm run visual:review
 *
 * Or against a deployment:  BASE=https://sandtable.davetashner.com npm run visual:review
 *
 * Note: `vite preview` proxies /assets/* to production, but PMTiles range
 * requests through that proxy can fail, leaving the basemap empty. That is a
 * property of the local harness, not the app — confirm any map-rendering
 * finding against BASE=<a deployment> before believing it.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { LAUNCH_ARGS, rollUp, walk } from './lib/visual-scenes.mjs';

const BASE = process.env.BASE ?? 'http://localhost:4174';
const OUT = process.env.OUT ?? 'visual-review';

const browser = await chromium.launch({ args: LAUNCH_ARGS });
const report = await walk(browser, { base: BASE, shots: OUT });
await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

// Roll up by defect and element — one line per thing to fix, not per scene.
for (const [scene, v] of Object.entries(report)) {
  if (v.error) console.log(`${scene}: ERROR ${v.error}`);
}
for (const e of rollUp(report)) {
  console.log(`${String(e.n).padStart(3)}  ${e.kind.padEnd(16)}  ${e.el}  | ${e.detail}`);
}
console.log(`\n${Object.keys(report).length} scenes, screenshots in ${OUT}/`);
