/**
 * `virtual:sandtable-pack` — written by `scripts/lib/vite-plugin-pack.ts`.
 *
 * `PACK_URL` is where the content bundle is served from: a hashed
 * `/pack/<id>-<hash>.json` in a build, an unhashed one in dev. `PACK_INLINE`
 * is null everywhere except under Vitest, where there is no server to fetch
 * from and the bundle rides along in the module instead.
 */
declare module 'virtual:sandtable-pack' {
  export const PACK_URL: string;
  export const PACK_INLINE: unknown;
}
