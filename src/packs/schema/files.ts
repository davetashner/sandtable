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
 *     historiography.json Historiography[]  (contested points, ADR 0017)
 *     links.json         CausalLink[]
 *     sources.json       Source[]          (pack-local; shared/sources for the rest)
 *     casualties.json    CasualtyRecord[]
 *     vignettes.json     Vignette[]
 *     tours.json         Tour[]
 *     score.json         ScoreEntry[]      (which cue plays when)
 *     beats/*.md         NarrativeBeat     (YAML front matter + Markdown)
 *   content/shared/
 *     people/people.json    Person[]
 *     places/places.json    Place[]
 *     sources/sources.json  Source[]
 *     media/** /media.json  Media             (one manifest per image)
 *     audio/** /cue.json    Cue               (one manifest per score cue)
 *   content/threads/<slug>/thread.json  Thread
 *   content/receipts/
 *     <era-dir>.json     Receipt[]         (verification receipts, ADR 0021)
 *     backlog.txt        ids allowed to go without one while sand-23b.57.1 runs
 *
 * Only pack.json is mandatory; every other file is optional and, when
 * present, must be an array of the entity (possibly empty).
 */
import { z } from 'zod';
import {
  Battle,
  BeatFrontMatter,
  CausalLink,
  Cue,
  DecisionPoint,
  Document,
  Event,
  Formation,
  Historiography,
  Media,
  Pack,
  Person,
  Place,
  Receipt,
  Route,
  ScienceCard,
  ScoreEntry,
  Source,
  TechCard,
  Thread,
  Tour,
  PersonTrack,
  CastEntry,
  CasualtyRecord,
  SupplyLine,
  Tally,
  Timetable,
  Vignette,
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
  'historiography.json': Historiography,
  'links.json': CausalLink,
  'sources.json': Source,
  'cast.json': CastEntry,
  'clocks.json': Timetable,
  'tallies.json': Tally,
  'supply.json': SupplyLine,
  'casualties.json': CasualtyRecord,
  'vignettes.json': Vignette,
  'tours.json': Tour,
  'tracks.json': PersonTrack,
  'score.json': ScoreEntry,
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
/** Hand-drawn concept schematics a beat can inline (sand-1l0.33). */
export const DIAGRAMS_DIR = 'diagrams';
export const MEDIA_MANIFEST = 'media.json';
export const CUE_MANIFEST = 'cue.json';
export const THREAD_FILE = 'thread.json';
/**
 * Verification receipts (ADR 0021). One file per era, named for the era's
 * directory, plus `shared.json` for quotations in the shared registries — per
 * file, because several agents author several eras at once and a single
 * register would be a merge conflict on every content PR.
 */
export const RECEIPTS_DIR = 'receipts';
/**
 * The one-time allowance that keeps the receipt gate off `main`'s back
 * (sand-23b.57.1). Same shape and same self-removing rule as
 * `scripts/media-index-backlog.txt`: one id per line, `#` comments, and the
 * validator refuses a line for an id that now has a receipt.
 */
export const RECEIPT_BACKLOG = 'backlog.txt';

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
  historiography: z.array(Historiography),
  links: z.array(CausalLink),
  sources: z.array(Source),
  cast: z.array(CastEntry),
  clocks: z.array(Timetable),
  tallies: z.array(Tally),
  supply: z.array(SupplyLine),
  casualties: z.array(CasualtyRecord),
  vignettes: z.array(Vignette),
  tours: z.array(Tour),
  tracks: z.array(PersonTrack),
  score: z.array(ScoreEntry),
  'beat-frontmatter': BeatFrontMatter,
  people: z.array(Person),
  places: z.array(Place),
  media: Media,
  cue: Cue,
  thread: Thread,
  receipts: z.array(Receipt),
} as const;
