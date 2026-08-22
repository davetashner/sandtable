/**
 * Stop-gap pack access until the lazy pack loader and the "atlas of eras"
 * landing page land (sand-shn.1): the 1914 seed pack is bundled at build time
 * and parsed with the schema, so the shell has a real clock range, real
 * phases and real events to drive the timeline.
 *
 * Nothing here is era-specific beyond the import paths; swap the glob and the
 * JSON imports for fetches and the rest of the app does not change.
 */
import eventsJson from '../../content/eras/1914-schlieffen-marne/events.json';
import packJson from '../../content/eras/1914-schlieffen-marne/pack.json';
import {
  BeatFrontMatter,
  Event,
  Pack,
  type BeatFrontMatter as Beat,
  type Event as EventT,
  type Pack as PackT,
} from './schema/index.js';
import { splitFrontMatter } from './validate/frontmatter.js';

const beatsRaw = import.meta.glob('../../content/eras/1914-schlieffen-marne/beats/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface SeedPack {
  pack: PackT;
  events: EventT[];
  beats: Beat[];
}

function loadSeed(): SeedPack {
  const pack = Pack.parse(packJson);
  const events = Event.array().parse(eventsJson);
  const beats = Object.values(beatsRaw)
    .map((text) => splitFrontMatter(text))
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .map((x) => BeatFrontMatter.parse(x.data))
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
  return { pack, events, beats };
}

export const seed: SeedPack = loadSeed();
