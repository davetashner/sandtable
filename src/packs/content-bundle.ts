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
    /** `people/people.json`. */
    people: unknown;
    /** `places/places.json`. */
    places: unknown;
    /** `sources/sources.json`. */
    sources: unknown;
    /** `media/index.json`, written by `npm run media`. */
    media: unknown;
    /** `audio/index.json`, written by `npm run audio`. */
    audio: unknown;
  };
}

/** The dev-server path for an era's bundle; the build serves a hashed sibling. */
export const devBundlePath = (id: string): string => `/${PACK_BUNDLE_DIR}/${id}.json`;
