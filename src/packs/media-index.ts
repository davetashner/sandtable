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
