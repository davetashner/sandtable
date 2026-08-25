/**
 * The seed pack, parsed.
 *
 * The 1914 pack is fetched rather than bundled (ADR 0018,
 * `src/packs/pack-loader.ts`); this module is what turns the fetched bundle
 * into typed content. Every field is parsed with the schema on arrival, which
 * is why zod is in the eager bundle and is the reason it earns its place: the
 * app validates what it was served rather than trusting it, and the validation
 * costs about 35 ms.
 *
 * Nothing here is era-specific beyond the pack id the loader was given.
 */
import { contentBundle } from './pack-loader.js';
import {
  Battle,
  BeatFrontMatter,
  CastEntry,
  CasualtyRecord,
  CausalLink,
  DecisionPoint,
  Event,
  Formation,
  Historiography,
  Pack,
  Person,
  Place,
  Document,
  Route,
  ScienceCard,
  Source,
  SupplyLine,
  TechCard,
  Tally,
  Timetable,
  Tour,
  PersonTrack,
  ScoreEntry,
  Vignette,
  type Battle as BattleT,
  type CastEntry as CastEntryT,
  type CasualtyRecord as CasualtyRecordT,
  type Vignette as VignetteT,
  type DecisionPoint as DecisionPointT,
  type CausalLink as CausalLinkT,
  type Document as DocumentT,
  type Historiography as HistoriographyT,
  type ScienceCard as ScienceCardT,
  type Event as EventT,
  type Formation as FormationT,
  type NarrativeBeat,
  type Pack as PackT,
  type Person as PersonT,
  type Place as PlaceT,
  type Route as RouteT,
  type Source as SourceT,
  type TechCard as TechCardT,
  type SupplyLine as SupplyLineT,
  type Tally as TallyT,
  type Timetable as TimetableT,
  type Tour as TourT,
  type PersonTrack as PersonTrackT,
  type ScoreEntry as ScoreEntryT,
} from './schema/index.js';
import { splitFrontMatter } from './validate/frontmatter.js';
import { mark } from '../engine/perf.js';

/** A pack collection by file name; an absent file is an empty collection. */
const collection = (file: string): unknown => contentBundle.collections[file] ?? [];

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
  /** Shared people registry (content/shared/people). */
  people: PersonT[];
  tech: TechCardT[];
  science: ScienceCardT[];
  documents: DocumentT[];
  /** Contested points carried as arguments (historiography.json, ADR 0017). */
  historiography: HistoriographyT[];
  links: CausalLinkT[];
  /** The pack's dramatis personae (cast.json), in file order. */
  cast: CastEntryT[];
  /** Decision points (decisions.json), in time order. */
  decisions: DecisionPointT[];
  /** Plan-vs-actual clocks (clocks.json). */
  clocks: TimetableT[];
  /** Strength ledgers (tallies.json). */
  tallies: TallyT[];
  /** Rail-vs-feet supply lines (supply.json). */
  supply: SupplyLineT[];
  /** Casualty records (casualties.json), the human scale. */
  casualties: CasualtyRecordT[];
  /** First-person vignettes (vignettes.json), in time order. */
  vignettes: VignetteT[];
  /** Guided tours (tours.json); the first is the pack's headline tour. */
  tours: TourT[];
  /** Which cue plays when (score.json, ADR 0008). */
  score: ScoreEntryT[];
  /** Where the commanders were (tracks.json, sand-1l0.27). */
  tracks: PersonTrackT[];
  /** Concept schematics by file stem, as SVG source (sand-1l0.33). */
  diagrams: Record<string, string>;
}

function loadSeed(): SeedPack {
  mark('sandtable:pack-start');
  const pack = Pack.parse(contentBundle.pack);
  const events = Event.array().parse(collection('events.json'));
  const battles = Battle.array().parse(collection('battles.json'));
  const formations = Formation.array().parse(collection('formations.json'));
  const routes = Route.array().parse(collection('routes.json'));
  const beats: NarrativeBeat[] = contentBundle.beats
    .map(({ file, text }) => ({ file, split: splitFrontMatter(text) }))
    .filter((x): x is { file: string; split: NonNullable<typeof x.split> } => x.split !== null)
    .map((x) => ({ ...BeatFrontMatter.parse(x.split.data), body: x.split.body, file: x.file }))
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
  const sources = Source.array().parse(contentBundle.shared.sources);
  const places = Place.array().parse(contentBundle.shared.places);
  const people = Person.array().parse(contentBundle.shared.people);
  const tech = TechCard.array().parse(collection('tech.json'));
  const science = ScienceCard.array().parse(collection('science.json'));
  const documents = Document.array().parse(collection('documents.json'));
  const historiography = Historiography.array().parse(collection('historiography.json'));
  const links = CausalLink.array().parse(collection('links.json'));
  const cast = CastEntry.array().parse(collection('cast.json'));
  const clocks = Timetable.array().parse(collection('clocks.json'));
  const tallies = Tally.array().parse(collection('tallies.json'));
  const supply = SupplyLine.array().parse(collection('supply.json'));
  const casualties = CasualtyRecord.array().parse(collection('casualties.json'));
  const vignettes = Vignette.array()
    .parse(collection('vignettes.json'))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const tours = Tour.array().parse(collection('tours.json'));
  const score = ScoreEntry.array().parse(collection('score.json'));
  const tracks = PersonTrack.array().parse(collection('tracks.json'));
  const decisions = DecisionPoint.array()
    .parse(collection('decisions.json'))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return {
    pack,
    events,
    battles,
    formations,
    routes,
    beats,
    sources,
    places,
    people,
    tech,
    science,
    documents,
    historiography,
    links,
    cast,
    decisions,
    clocks,
    tallies,
    supply,
    casualties,
    vignettes,
    tours,
    score,
    tracks,
    diagrams: contentBundle.diagrams,
  };
}

export const seed: SeedPack = loadSeed();
mark('sandtable:pack-ready');
