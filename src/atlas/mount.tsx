/**
 * Putting the atlas on screen, from either of its two addresses (ADR 0024):
 * `/`, where the router calls this once it finds the URL names no view, and
 * `/atlas.html`, whose entry is `main.tsx` next door.
 *
 * It carries no stylesheet of its own beyond the atlas's: the two shared ones
 * belong to whichever entry brought it here.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Atlas } from './Atlas.js';

export function mountAtlas(): void {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Sandtable: #root element not found');
  }
  createRoot(container).render(
    <StrictMode>
      <Atlas />
    </StrictMode>,
  );
}
