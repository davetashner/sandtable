/**
 * `virtual:sandtable-pack` — written by `scripts/lib/vite-plugin-pack.ts`.
 *
 * `PACK_URLS` is every era's bundle URL keyed by era id: hashed
 * `/pack/<id>-<hash>.json` in a build, unhashed in dev. `PACK_DEFAULT` is the
 * era a URL that names none resolves to. `PACK_INDEX` is where the atlas reads
 * its list of eras. `PACK_INLINE` is null everywhere except under Vitest, where
 * there is no server to fetch from and the default bundle rides along in the
 * module instead.
 */
declare module 'virtual:sandtable-pack' {
  export const PACK_URLS: Record<string, string>;
  export const PACK_DEFAULT: string;
  export const PACK_INDEX: string;
  export const PACK_INLINE: unknown;
}
