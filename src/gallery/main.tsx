/**
 * Entry for the component gallery (gallery.html, sand-neh.3) — a second Vite
 * entry so none of this ships in the app bundle. `npm run dev` serves it at
 * /gallery.html; the build emits it beside index.html, so every PR preview
 * has one.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Gallery } from './Gallery.js';
import '../styles/tokens.css';
import '../styles/global.css';
import './gallery.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Sandtable gallery: #root element not found');
}

createRoot(container).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
);
