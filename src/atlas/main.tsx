/**
 * The atlas entry (`sand-shn.1`). A page of its own, like the gallery, so none
 * of the campaign app — MapLibre, deck.gl, the pack itself — can reach it: the
 * landing page reads a manifest of a few hundred bytes an era and nothing more.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/global.css';
import { Atlas } from './Atlas.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Atlas />
  </StrictMode>,
);
