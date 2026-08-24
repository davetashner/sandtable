/**
 * The score manifest the app plays from — content/shared/audio/index.json,
 * written by `npm run audio` (scripts/audio-pipeline.ts). Bundled with the
 * seed until the loader lands, exactly as media-index.ts is.
 *
 * Every entry is already normalised to the same loudness, so the player sets
 * one volume and never has to ride the level between cues.
 */
import indexJson from '../../content/shared/audio/index.json';

export interface AudioSource {
  src: string;
  type: string;
  bitrateKbps: number;
  bytes: number;
}

export interface AudioIndexEntry {
  id: string;
  dir: string;
  title: string;
  letter?: string;
  role: 'cue' | 'bed';
  duration: number;
  loop: boolean;
  mixDb: number;
  sources: AudioSource[];
  credit: string;
  licence: string;
  key?: string;
  bpm?: number;
  loudness?: { inputLufs: number; outputLufs: number; targetLufs: number };
  present: boolean;
}

export interface AudioIndex {
  generatedAt: string;
  base: string;
  entries: AudioIndexEntry[];
}

export const audioIndex = indexJson as AudioIndex;

const byId = new Map(audioIndex.entries.map((e) => [e.id, e]));

export const cueById = (id: string): AudioIndexEntry | undefined => byId.get(id);

/**
 * Absolute URLs for a cue, best first. The browser takes the first source it
 * can play, so Opus leads and AAC catches the rest.
 */
export function sourcesFor(
  entry: AudioIndexEntry,
  base = audioIndex.base,
): { src: string; type: string }[] {
  return entry.sources.map((s) => ({ src: `${base}${s.src}`, type: s.type }));
}
