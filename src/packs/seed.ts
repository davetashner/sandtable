/**
 * Stop-gap pack access until the lazy pack loader and the "atlas of eras"
 * landing page land (sand-shn.1): the 1914 seed pack is bundled at build time
 * and parsed with the schema, so the shell has a real clock range, real
 * phases and real events to drive the timeline.
 *
 * Nothing here is era-specific beyond the import paths; swap the glob and the
 * JSON imports for fetches and the rest of the app does not change.
 */
import battlesJson from '../../content/eras/1914-schlieffen-marne/battles.json';
import eventsJson from '../../content/eras/1914-schlieffen-marne/events.json';
import formationsJson from '../../content/eras/1914-schlieffen-marne/formations.json';
import packJson from '../../content/eras/1914-schlieffen-marne/pack.json';
import routesJson from '../../content/eras/1914-schlieffen-marne/routes.json';
import placesJson from '../../content/shared/places/places.json';
import sourcesJson from '../../content/shared/sources/sources.json';
import {
  Battle,
  BeatFrontMatter,
  Event,
  Formation,
  Pack,
  Place,
  Route,
  Source,
  type Battle as BattleT,
  type Event as EventT,
  type Formation as FormationT,
  type NarrativeBeat,
  type Pack as PackT,
  type Place as PlaceT,
  type Route as RouteT,
  type Source as SourceT,
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
  battles: BattleT[];
  formations: FormationT[];
  routes: RouteT[];
  /** Front matter + Markdown body. */
  beats: NarrativeBeat[];
  /** Shared source registry (content/shared/sources). */
  sources: SourceT[];
  /** Shared places registry (content/shared/places). */
  places: PlaceT[];
}

function loadSeed(): SeedPack {
  const pack = Pack.parse(packJson);
  const events = Event.array().parse(eventsJson);
  const battles = Battle.array().parse(battlesJson);
  const formations = Formation.array().parse(formationsJson);
  const routes = Route.array().parse(routesJson);
  const beats: NarrativeBeat[] = Object.entries(beatsRaw)
    .map(([file, text]) => ({ file, split: splitFrontMatter(text) }))
    .filter((x): x is { file: string; split: NonNullable<typeof x.split> } => x.split !== null)
    .map((x) => ({ ...BeatFrontMatter.parse(x.split.data), body: x.split.body, file: x.file }))
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
  const sources = Source.array().parse(sourcesJson);
  const places = Place.array().parse(placesJson);
  return { pack, events, battles, formations, routes, beats, sources, places };
}

export const seed: SeedPack = loadSeed();
