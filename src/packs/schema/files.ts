/**
 * File-level schemas: what each file in a pack or registry directory holds.
 *
 *   content/eras/<yyyy>-<slug>/
 *     pack.json          Pack
 *     formations.json    Formation[]
 *     routes.json        Route[]
 *     events.json        Event[]
 *     battles.json       Battle[]
 *     decisions.json     DecisionPoint[]
 *     tech.json          TechCard[]
 *     science.json       ScienceCard[]
 *     documents.json     Document[]
 *     links.json         CausalLink[]
 *     sources.json       Source[]          (pack-local; shared/sources for the rest)
 *     beats/*.md         NarrativeBeat     (YAML front matter + Markdown)
 *   content/shared/
 *     people/people.json    Person[]
 *     places/places.json    Place[]
 *     sources/sources.json  Source[]
 *     media/** /media.json  Media             (one manifest per image)
 *   content/threads/<slug>/thread.json  Thread
 *
 * Only pack.json is mandatory; every other file is optional and, when
 * present, must be an array of the entity (possibly empty).
 */
import { z } from 'zod';
import {
  Battle,
  BeatFrontMatter,
  CausalLink,
  DecisionPoint,
  Document,
  Event,
  Formation,
  Media,
  Pack,
  Person,
  Place,
  Route,
  ScienceCard,
  Source,
  TechCard,
  Thread,
  CastEntry,
  SupplyLine,
  Tally,
  Timetable,
} from './entities.js';

/** Pack files that hold an array of one entity kind, keyed by file name. */
export const PACK_COLLECTIONS = {
  'formations.json': Formation,
  'routes.json': Route,
  'events.json': Event,
  'battles.json': Battle,
  'decisions.json': DecisionPoint,
  'tech.json': TechCard,
  'science.json': ScienceCard,
  'documents.json': Document,
  'links.json': CausalLink,
  'sources.json': Source,
  'cast.json': CastEntry,
  'clocks.json': Timetable,
  'tallies.json': Tally,
  'supply.json': SupplyLine,
} as const;

export type PackCollectionFile = keyof typeof PACK_COLLECTIONS;

/** Shared registry files. */
export const SHARED_COLLECTIONS = {
  'people/people.json': Person,
  'places/places.json': Place,
  'sources/sources.json': Source,
} as const;

export type SharedCollectionFile = keyof typeof SHARED_COLLECTIONS;

export const PACK_FILE = 'pack.json';
export const BEATS_DIR = 'beats';
export const MEDIA_MANIFEST = 'media.json';
export const THREAD_FILE = 'thread.json';

/** Every JSON Schema we publish under schema/, keyed by output file stem. */
export const JSON_SCHEMAS = {
  pack: Pack,
  formations: z.array(Formation),
  routes: z.array(Route),
  events: z.array(Event),
  battles: z.array(Battle),
  decisions: z.array(DecisionPoint),
  tech: z.array(TechCard),
  science: z.array(ScienceCard),
  documents: z.array(Document),
  links: z.array(CausalLink),
  sources: z.array(Source),
  cast: z.array(CastEntry),
  clocks: z.array(Timetable),
  tallies: z.array(Tally),
  supply: z.array(SupplyLine),
  'beat-frontmatter': BeatFrontMatter,
  people: z.array(Person),
  places: z.array(Place),
  media: Media,
  thread: Thread,
} as const;
