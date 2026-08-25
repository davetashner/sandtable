import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { packBundlePlugin } from './scripts/lib/vite-plugin-pack.js';

/**
 * `/assets/*` is the assets bucket (tiles, borders, media) on every
 * deployment — production and PR previews — mounted on the same CloudFront
 * distribution as the app (ADR 0004, infra/lib/hosting-stack.ts). Vite's own
 * hashed bundles therefore go to `app/` instead of the default `assets/`.
 *
 * In development, `/assets/*` is proxied to production unless a local staging
 * copy exists under `public/assets/` (git-ignored), so nothing large needs
 * downloading to run the app.
 */
const ASSETS_ORIGIN = 'https://sandtable.davetashner.com';
const assetsProxy = {
  '/assets': {
    target: ASSETS_ORIGIN,
    changeOrigin: true,
    bypass: (req: { url?: string }) =>
      req.url && existsSync(join('public', req.url.split('?')[0])) ? req.url : undefined,
  },
};

// https://vite.dev/config/ — test options are Vitest's (vitest/config extends Vite's defineConfig)
export default defineConfig({
  // The content bundle is fetched, not imported: it is emitted to `dist/pack/`
  // and served from the app's own origin, which is why it is not under
  // `/assets/` — that is the bucket, and the visual gate answers it from
  // inside the browser (ADR 0011, ADR 0018).
  plugins: [react(), packBundlePlugin()],
  build: {
    target: 'es2022',
    sourcemap: true,
    assetsDir: 'app',
    // Two entries: the app, and the component gallery (sand-neh.3). The
    // gallery is a page of its own so none of it can reach the app bundle,
    // and so every deployment — production and PR previews — has one at
    // /gallery.html for design review.
    rollupOptions: { input: { main: 'index.html', gallery: 'gallery.html' } },
    // The map chunk (maplibre-gl + deck.gl, lazy-loaded by App) is large by
    // nature and this only silences the generic warning about it. The number
    // that is actually held is in `scripts/bundle-budget.json`, checked by
    // `npm run bundle:budget` in CI, and it distinguishes the bytes a reader
    // downloads before first paint from the ones the map fetches later
    // (ADR 0016).
    chunkSizeWarningLimit: 1800,
  },
  // MapLibre's worker is an ES module (it imports maplibre-gl-shared); see
  // src/engine/map/MapView.tsx for why it is bundled explicitly.
  worker: { format: 'es' },
  server: { proxy: assetsProxy },
  // `vite preview` serves a production build; proxy the same way so the map
  // can be checked locally exactly as deployed.
  preview: { proxy: assetsProxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    css: false,
  },
});
