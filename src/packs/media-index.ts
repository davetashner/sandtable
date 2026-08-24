/**
 * The attribution manifest the app renders images from —
 * content/shared/media/index.json, written by `npm run media`
 * (scripts/media-pipeline.ts). Bundled with the seed until the loader lands.
 */
import indexJson from '../../content/shared/media/index.json';

export interface MediaVariant {
  src: string;
  width: number;
  height: number;
  type: string;
}

export interface MediaIndexEntry {
  id: string;
  dir: string;
  original: MediaVariant;
  variants: MediaVariant[];
  width: number;
  height: number;
  caption: string;
  credit: string;
  licence: string;
  colorized: boolean;
  originalUrl?: string;
  focalPoint?: { x: number; y: number };
  person?: string;
  /** Everyone the manifest identifies, for a photograph of more than one. */
  people?: string[];
  present: boolean;
}

export interface MediaIndex {
  generatedAt: string;
  base: string;
  entries: MediaIndexEntry[];
}

export const mediaIndex = indexJson as MediaIndex;

const byId = new Map(mediaIndex.entries.map((e) => [e.id, e]));
const byPerson = new Map(mediaIndex.entries.filter((e) => e.person).map((e) => [e.person!, e]));

export const mediaById = (id: string): MediaIndexEntry | undefined => byId.get(id);
export const portraitFor = (personId: string): MediaIndexEntry | undefined =>
  byPerson.get(personId);

/**
 * Who is in the picture, as a readable phrase, for the full-size view
 * (sand-y0u.18). A portrait names its sitter; a photograph of several names
 * them in the manifest's order; a photograph of a place names nobody, and the
 * caller shows the credit alone rather than a blank line.
 */
export function subjectOf(
  entry: MediaIndexEntry,
  label: (id: string) => string | undefined,
): string | undefined {
  const ids = entry.people?.length ? entry.people : entry.person ? [entry.person] : [];
  const names = ids.map((id) => label(id)).filter((n): n is string => Boolean(n));
  if (names.length === 0) return undefined;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * The widest derivative available, falling back to the original file — what a
 * full-size view wants (sand-neh.10), as against MediaFigure's srcset, which
 * picks by rendered width.
 */
export function largestSrc(entry: MediaIndexEntry, base = '/assets/media/'): string {
  const widest = entry.variants.reduce<MediaVariant | undefined>(
    (best, v) => (!best || v.width > best.width ? v : best),
    undefined,
  );
  return `${base}${widest ? widest.src : entry.original.src}`;
}
