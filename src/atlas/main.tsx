/**
 * The `/atlas.html` entry (`sand-shn.1`). A page of its own, like the gallery,
 * so none of the campaign app — MapLibre, deck.gl, the pack itself — can reach
 * it: the atlas reads a manifest of a few hundred bytes an era and nothing more.
 *
 * The atlas's home is now `/` (ADR 0024). This address is kept because it is
 * published: the three failure states in `index.html` link to it, and they are
 * exactly the case where the page at `/` may be the thing that is broken.
 */
import '../styles/tokens.css';
import '../styles/global.css';
import { mountAtlas } from './mount.js';

mountAtlas();
