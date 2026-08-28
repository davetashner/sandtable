/**
 * Serve the content bundle instead of bundling it (ADR 0018, `sand-shn.1.1`).
 *
 * Three jobs, one plugin:
 *
 *   **build**  — assemble `content/` into one JSON document and emit it as
 *                `dist/pack/<id>-<hash>.json`, deliberately outside `dist/app/`
 *                so the two are read as what they are: code, and content.
 *   **dev**    — answer `/pack/<id>.json` from the filesystem on every request,
 *                so editing a beat needs a reload and not a restart.
 *   **both**   — expose the URL to the app through `virtual:sandtable-pack`,
 *                and put a four-line script in `<head>` that starts the fetch
 *                while the browser is still downloading the module graph.
 *
 * Under Vitest there is no server to fetch from, so the same virtual module
 * carries the bundle inline; `src/packs/pack-loader.ts` prefers it when it is
 * there. The fetch path itself is covered by `src/packs/pack-loader.test.ts`.
 */
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { PACK_INDEX_PATH, devBundlePath } from '../../src/packs/content-bundle.js';
import {
  SEED_PACK_ID,
  bundleFileName,
  contentBundleJson,
  listPackIds,
  packSummary,
} from './pack-bundle.js';

const VIRTUAL = 'virtual:sandtable-pack';
const RESOLVED = '\0' + VIRTUAL;

/**
 * The boot hook. It is inline on purpose: a `<link rel="preload">` for
 * `as="fetch"` has to match the eventual request's CORS and credentials mode
 * to be reused, and a mismatch downloads the bundle twice. Four lines of
 * script have no such rule — the promise the loader awaits is the request the
 * browser has already started.
 */
const bootScript = (urls: Record<string, string>, fallback: string) =>
  `var U=${JSON.stringify(urls)},D=${JSON.stringify(fallback)};` +
  `var w=new URLSearchParams(location.search).get("pack");` +
  `var u=(w&&U[w])||U[D];window.__sandtablePackUrl=u;` +
  `var p=fetch(u).then(function(r){` +
  `if(!r.ok)throw new Error("pack "+r.status+" "+r.statusText);return r.json()});` +
  `p.catch(function(){});window.__sandtablePack=p;`;

export function packBundlePlugin(id = SEED_PACK_ID): Plugin {
  let contentRoot = join(process.cwd(), 'content');
  let isBuild = false;
  let inline = false;
  /** Every era's bundle URL, keyed by era id — one entry before sand-shn.1. */
  let urls: Record<string, string> = { [id]: devBundlePath(id) };
  let emitted = false;

  const ids = () => {
    const found = listPackIds(contentRoot);
    return found.length ? found : [id];
  };
  const json = (packId = id) => contentBundleJson(contentRoot, packId);
  const indexJson = () =>
    JSON.stringify({ default: id, packs: ids().map((p) => packSummary(contentRoot, p)) });

  return {
    name: 'sandtable:pack-bundle',
    configResolved(config) {
      contentRoot = join(config.root, 'content');
      isBuild = config.command === 'build';
      // Vitest drives Vite in `serve` mode with no HTTP server the page can
      // reach, so the bundle rides along in the virtual module instead.
      inline = Boolean(process.env.VITEST);
      urls = Object.fromEntries(ids().map((p) => [p, devBundlePath(p)]));
    },
    buildStart() {
      if (!isBuild || emitted) return;
      const next: Record<string, string> = {};
      for (const packId of ids()) {
        const source = json(packId);
        const fileName = bundleFileName(source, packId);
        next[packId] = '/' + fileName;
        this.emitFile({ type: 'asset', fileName, source });
      }
      urls = next;
      // The atlas reads this instead of every bundle: a few hundred bytes an
      // era rather than a few hundred kilobytes.
      this.emitFile({
        type: 'asset',
        fileName: PACK_INDEX_PATH.replace(/^\//, ''),
        source: indexJson(),
      });
      emitted = true;
    },
    resolveId(source) {
      return source === VIRTUAL ? RESOLVED : undefined;
    },
    load(moduleId) {
      if (moduleId !== RESOLVED) return undefined;
      return (
        `export const PACK_URLS = ${JSON.stringify(urls)};\n` +
        `export const PACK_DEFAULT = ${JSON.stringify(id)};\n` +
        `export const PACK_INDEX = ${JSON.stringify(PACK_INDEX_PATH)};\n` +
        `export const PACK_INLINE = ${inline ? json() : 'null'};\n`
      );
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0] ?? '';
        const send = (body: string) => {
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.setHeader('cache-control', 'no-cache');
          res.end(body);
        };
        if (path === PACK_INDEX_PATH) return send(indexJson());
        const match = ids().find((p) => path === devBundlePath(p));
        if (!match) return next();
        send(json(match));
      });
    },
    transformIndexHtml() {
      return [{ tag: 'script', children: bootScript(urls, id), injectTo: 'head' as const }];
    },
  };
}
