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
import { devBundlePath } from '../../src/packs/content-bundle.js';
import { SEED_PACK_ID, bundleFileName, contentBundleJson } from './pack-bundle.js';

const VIRTUAL = 'virtual:sandtable-pack';
const RESOLVED = '\0' + VIRTUAL;

/**
 * The boot hook. It is inline on purpose: a `<link rel="preload">` for
 * `as="fetch"` has to match the eventual request's CORS and credentials mode
 * to be reused, and a mismatch downloads the bundle twice. Four lines of
 * script have no such rule — the promise the loader awaits is the request the
 * browser has already started.
 */
const bootScript = (url: string) =>
  `var p=fetch(${JSON.stringify(url)}).then(function(r){` +
  `if(!r.ok)throw new Error("pack "+r.status+" "+r.statusText);return r.json()});` +
  `p.catch(function(){});window.__sandtablePack=p;`;

export function packBundlePlugin(id = SEED_PACK_ID): Plugin {
  let contentRoot = join(process.cwd(), 'content');
  let isBuild = false;
  let inline = false;
  let url = devBundlePath(id);
  let emitted = false;

  const json = () => contentBundleJson(contentRoot, id);

  return {
    name: 'sandtable:pack-bundle',
    configResolved(config) {
      contentRoot = join(config.root, 'content');
      isBuild = config.command === 'build';
      // Vitest drives Vite in `serve` mode with no HTTP server the page can
      // reach, so the bundle rides along in the virtual module instead.
      inline = Boolean(process.env.VITEST);
      url = devBundlePath(id);
    },
    buildStart() {
      if (!isBuild) return;
      const source = json();
      const fileName = bundleFileName(source, id);
      url = '/' + fileName;
      if (emitted) return;
      this.emitFile({ type: 'asset', fileName, source });
      emitted = true;
    },
    resolveId(source) {
      return source === VIRTUAL ? RESOLVED : undefined;
    },
    load(moduleId) {
      if (moduleId !== RESOLVED) return undefined;
      return (
        `export const PACK_URL = ${JSON.stringify(url)};\n` +
        `export const PACK_INLINE = ${inline ? json() : 'null'};\n`
      );
    },
    configureServer(server) {
      const path = devBundlePath(id);
      server.middlewares.use((req, res, next) => {
        if ((req.url ?? '').split('?')[0] !== path) return next();
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-cache');
        res.end(json());
      });
    },
    transformIndexHtml() {
      return [{ tag: 'script', children: bootScript(url), injectTo: 'head' as const }];
    },
  };
}
