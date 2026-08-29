/**
 * Mounting the campaign — everything `src/main.tsx` used to do before `/`
 * became two pages (ADR 0024).
 *
 * It is a module of its own because importing it is expensive in a way no
 * other import in this project is: `App` reaches `src/packs/pack-loader.ts`,
 * which awaits the era's content bundle at module scope (ADR 0018), so
 * evaluating this module means an era has arrived. The router imports it only
 * once it knows the URL names one.
 *
 * The shared stylesheets are imported by the router, so that `index.html`
 * carries the `<link>` for both of its pages.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Sandtable: #root element not found');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
