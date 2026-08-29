/**
 * The shape of the content bundle the app fetches at runtime (ADR 0018).
 *
 * One file holds everything the app reads out of `content/` for one era: the
 * pack manifest, its collections, its beats and schematics, the shared
 * registries it joins against, and the generated media and audio manifests.
 * `scripts/lib/pack-bundle.ts` assembles it from the filesystem;
 * `src/packs/pack-loader.ts` fetches it in the browser; `src/packs/seed.ts`
 * re-validates every field of it with the schema, which is why nothing here is
 * typed more precisely than `unknown`. **This file is the contract between a
 * Node build step and a browser loader, so it imports nothing** — it is
 * compiled by both `tsconfig.app.json` and `tsconfig.node.json`.
 */

/** Where the bundle is emitted and served from — a sibling of `app/`, not of `assets/`. */
export const PACK_BUNDLE_DIR = 'pack';

export interface ContentBundle {
  /** The era directory this bundle carries, e.g. `1914-schlieffen-marne`. */
  id: string;
  /** `pack.json`. */
  pack: unknown;
  /** Every other `<name>.json` in the era directory, keyed by file name. */
  collections: Record<string, unknown>;
  /** `beats/*.md` in file order — raw text, front matter included. */
  beats: { file: string; text: string }[];
  /** `diagrams/*.svg`, keyed by file stem, as SVG source. */
  diagrams: Record<string, string>;
  /** The registries and manifests under `content/shared/`. */
  shared: {
    /** Every `people/<slug>.json` the era reaches, as one array (ADR 0022). */
    people: unknown;
    /** Every `places/<slug>.json` the era reaches, as one array. */
    places: unknown;
    /** Every `sources/<slug>.json` the era reaches, as one array. */
    sources: unknown;
    /** `media/index.json`, written by `npm run media`. */
    media: unknown;
    /** `audio/index.json`, written by `npm run audio`. */
    audio: unknown;
  };
}

/** The dev-server path for an era's bundle; the build serves a hashed sibling. */
export const devBundlePath = (id: string): string => `/${PACK_BUNDLE_DIR}/${id}.json`;

/** The atlas's index of eras, served beside the bundles (`sand-shn.1`). */
export const PACK_INDEX_PATH = `/${PACK_BUNDLE_DIR}/index.json`;

/**
 * The URL slot that names which era to open (`sand-shn.1`, extending ADR 0009).
 * Absent means the seed pack, so every link written before the atlas existed
 * still resolves to the campaign it was written for.
 */
export const PACK_SLOT = 'pack';

/**
 * Every named slot of the URL contract, in the order they are written
 * (ADR 0009 rule 1, `pack` promoted to a slot by ADR 0024).
 *
 * It lives here, in the one module both a Node build step and the browser can
 * read, because three things have to agree about it and only one of them is in
 * the app bundle: `src/engine/url-state.ts` (which owns how each slot is read
 * and written, and whose table is held against this list by its own test), the
 * boot script inlined into `<head>`, and `namesAView` below.
 */
export const VIEW_SLOTS = [
  PACK_SLOT,
  't',
  'branch',
  'focus',
  'card',
  'pick',
  'tour',
  'step',
  'layers',
] as const;

/**
 * Does this query string name a view, or does it name nothing (ADR 0024)?
 *
 * This is what `/` branches on. A URL that fills any slot of the contract is a
 * campaign view and opens the campaign; a URL that fills none of them — a bare
 * `/`, or `/?utm_source=…`, which names a link to the project rather than a
 * view inside it — is the atlas. An empty value (`?t=`) fills nothing, the same
 * reading `resolvePackUrl` already gives `?pack=`.
 */
export function namesAView(search: string): boolean {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return VIEW_SLOTS.some((slot) => (q.get(slot) ?? '') !== '');
}

/**
 * Which pack a location asks for, given what the build emitted. Shared by the
 * boot script in `<head>` and by `pack-loader.ts`, so the request the browser
 * starts and the one the loader awaits can never disagree.
 */
export function resolvePackUrl(
  search: string,
  urls: Record<string, string>,
  fallback: string,
): string {
  const want = new URLSearchParams(search).get(PACK_SLOT);
  return (want && urls[want]) || urls[fallback] || '';
}
