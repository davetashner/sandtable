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
 *     people/<slug>.json    Person            (one file per person)
 *     places/<slug>.json    Place             (one file per place)
 *     sources/<slug>.json   Source            (one file per work)
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

/**
 * The shared registries, keyed by their directory under `content/shared/`.
 *
 * Each directory holds **one file per entity**, named for the entity's own id
 * (ADR 0022, `sand-shn.19`): `sources/tyng-1935.json` holds `source:tyng-1935`
 * and nothing else. They were three arrays until every parallel authoring wave
 * put two agents on the tail of the same file; the schema of what is in them
 * did not change, only how many files they are spread over.
 */
export const SHARED_REGISTRIES = {
  people: Person,
  places: Place,
  sources: Source,
} as const;

export type SharedRegistryDir = keyof typeof SHARED_REGISTRIES;

/** The registry directories, in one fixed order, for anything that walks them. */
export const SHARED_REGISTRY_DIRS = Object.keys(SHARED_REGISTRIES) as SharedRegistryDir[];

/**
 * Where an entity lives, from its id alone: `source:tyng-1935` is
 * `sources/tyng-1935.json`. The prefix names the kind and the rest names the
 * file, which is what makes the directory listing and the id index the same
 * thing — a reader who knows the id knows the path, and a file that disagrees
 * with the entity inside it is an error the validator reports.
 *
 * Returns undefined for an id with no `<kind>:<slug>` shape; the schema's `Id`
 * primitive requires one, so that only happens for content the schema is about
 * to reject anyway.
 */
export function registryFileName(id: string): string | undefined {
  const slug = id.slice(id.indexOf(':') + 1);
  return id.includes(':') && slug.length > 0 ? `${slug}.json` : undefined;
}

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
