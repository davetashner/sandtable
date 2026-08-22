/**
 * Colours for data layers come from the design tokens (src/styles/tokens.css),
 * read at run time so light/dark and the design-system palette (sand-neh.1)
 * flow through without literal colours in the engine. deck.gl wants RGBA
 * arrays, so we parse the CSS value once per token and cache per theme.
 */
import type { Side } from '../../packs/schema/index.js';

export type RGBA = [number, number, number, number];

const cache = new Map<string, RGBA>();

/** Parse `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()`. */
export function parseCssColor(value: string, alpha = 255): RGBA | undefined {
  const v = value.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return undefined;
    const n = parseInt(h, 16);
    return h.length === 8
      ? [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
      : [(n >>> 16) & 255, (n >>> 8) & 255, n & 255, alpha];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i.exec(
    v,
  );
  if (rgb) {
    const a =
      rgb[4] === undefined
        ? alpha
        : rgb[4].endsWith('%')
          ? Math.round((parseFloat(rgb[4]) / 100) * 255)
          : Math.round(parseFloat(rgb[4]) * 255);
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), a];
  }
  return undefined;
}

/** Reset the cache (theme change, tests). */
export function resetTokenColors() {
  cache.clear();
}

/**
 * `--army-1` → [154, 46, 34, 255], from the document's computed style.
 * Falls back to a neutral grey when the token is missing or there is no DOM.
 */
export function tokenColor(token: string, alpha = 255): RGBA {
  const key = `${token}/${alpha}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let rgba: RGBA | undefined;
  if (typeof document !== 'undefined') {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(token);
    if (raw) rgba = parseCssColor(raw, alpha);
  }
  const out: RGBA = rgba ?? [128, 128, 128, alpha];
  cache.set(key, out);
  return out;
}

/** Token families per alliance; sides cycle through their family in pack order. */
const FAMILIES: Record<string, string[]> = {
  'central powers': ['--army-1', '--army-2', '--army-3'],
  entente: ['--french', '--brass', '--muted'],
};
const DEFAULT_FAMILY = ['--brass', '--muted', '--ink'];

/** The token a side paints with, given the pack's sides list (stable per pack). */
export function sideToken(side: Side, sides: Side[]): string {
  const family = FAMILIES[(side.alliance ?? '').toLowerCase()] ?? DEFAULT_FAMILY;
  const peers = sides.filter((s) => (s.alliance ?? '') === (side.alliance ?? ''));
  const i = Math.max(
    0,
    peers.findIndex((s) => s.id === side.id),
  );
  return family[i % family.length]!;
}

export function sideColor(side: Side, sides: Side[], alpha = 255): RGBA {
  return tokenColor(sideToken(side, sides), alpha);
}
