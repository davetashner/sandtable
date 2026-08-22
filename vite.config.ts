import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

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

// https://vite.dev/config/ — test options are Vitest's (vitest/config extends Vite's defineConfig)
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
    assetsDir: 'app',
    // The map chunk (maplibre-gl + deck.gl, lazy-loaded by App) is large by
    // nature; the performance budget story (sand-pmz.3) tunes it further.
    chunkSizeWarningLimit: 1800,
  },
  server: {
    proxy: {
      '/assets': {
        target: ASSETS_ORIGIN,
        changeOrigin: true,
        bypass: (req) =>
          req.url && existsSync(join('public', req.url.split('?')[0])) ? req.url : undefined,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    css: false,
  },
});
