/**
 * Where the pack comes from (ADR 0018, `sand-shn.1.1`).
 *
 * The 1914 pack is about 135 kB gzip of JSON. It used to be `import`ed into
 * the bundle, which meant every reader downloaded it before the first frame
 * and every content pull request was also a performance pull request. It is
 * now one file fetched from the app's own origin, and this module is the only
 * place that knows that.
 *
 * **The module has a top-level `await` on purpose.** Everything downstream —
 * `seed.ts`, `media-index.ts`, `App.tsx`, the gallery, the tests — reads the
 * pack at module scope, and an async module makes every one of those importers
 * async without a line of change in any of them. The bytes are not on the
 * critical path anyway: `scripts/lib/vite-plugin-pack.ts` puts a four-line
 * script in `<head>` that starts the fetch while the browser is still
 * downloading the module graph, so by the time this module evaluates the
 * request is usually already answered.
 *
 * Nothing about the bundle is trusted. `seed.ts` parses every field of it with
 * the schema, exactly as it did when the JSON was compiled in.
 */
import { PACK_DEFAULT, PACK_INLINE, PACK_URLS } from 'virtual:sandtable-pack';
import { resolvePackUrl, type ContentBundle } from './content-bundle.js';

declare global {
  interface Window {
    /** The in-flight fetch started by the boot script in `index.html`. */
    __sandtablePack?: Promise<unknown>;
    /** Which era that fetch was for, so the loader can agree with it. */
    __sandtablePackUrl?: string;
  }
}

/**
 * The bundle, from the request the page already started if there is one, and
 * from a fresh fetch otherwise (a test harness, a page without the boot hook).
 */
export async function fetchContentBundle(
  url: string,
  pending?: Promise<unknown>,
): Promise<ContentBundle> {
  if (pending) return (await pending) as ContentBundle;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sandtable: pack ${url} answered ${res.status} ${res.statusText}`);
  return (await res.json()) as ContentBundle;
}

/**
 * Which era this page is (`sand-shn.1`). `?pack=<id>` names it and anything
 * else — no slot, an id the build did not emit — is the seed pack, so every
 * link written before the atlas existed still opens the campaign it meant.
 *
 * Switching eras is a navigation, not a runtime swap. That is the whole reason
 * the top-level `await` below still works: one page load is one era, so every
 * module downstream keeps reading the pack at module scope.
 */
export const packUrl: string =
  typeof window === 'undefined'
    ? (PACK_URLS[PACK_DEFAULT] ?? '')
    : resolvePackUrl(window.location.search, PACK_URLS, PACK_DEFAULT);

export const contentBundle: ContentBundle =
  (PACK_INLINE as ContentBundle | null) ??
  (await fetchContentBundle(
    packUrl,
    typeof window === 'undefined' ? undefined : window.__sandtablePack,
  ));
