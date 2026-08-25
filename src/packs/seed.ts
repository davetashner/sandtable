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
import peopleJson from '../../content/shared/people/people.json';
import placesJson from '../../content/shared/places/places.json';
import sourcesJson from '../../content/shared/sources/sources.json';
import techJson from '../../content/eras/1914-schlieffen-marne/tech.json';
import scienceJson from '../../content/eras/1914-schlieffen-marne/science.json';
import documentsJson from '../../content/eras/1914-schlieffen-marne/documents.json';
import historiographyJson from '../../content/eras/1914-schlieffen-marne/historiography.json';
import linksJson from '../../content/eras/1914-schlieffen-marne/links.json';
import castJson from '../../content/eras/1914-schlieffen-marne/cast.json';
import decisionsJson from '../../content/eras/1914-schlieffen-marne/decisions.json';
import clocksJson from '../../content/eras/1914-schlieffen-marne/clocks.json';
import talliesJson from '../../content/eras/1914-schlieffen-marne/tallies.json';
import supplyJson from '../../content/eras/1914-schlieffen-marne/supply.json';
import casualtiesJson from '../../content/eras/1914-schlieffen-marne/casualties.json';
import vignettesJson from '../../content/eras/1914-schlieffen-marne/vignettes.json';
import toursJson from '../../content/eras/1914-schlieffen-marne/tours.json';
import scoreJson from '../../content/eras/1914-schlieffen-marne/score.json';
import tracksJson from '../../content/eras/1914-schlieffen-marne/tracks.json';
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

const beatsRaw = import.meta.glob('../../content/eras/1914-schlieffen-marne/beats/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Concept schematics (sand-1l0.33), keyed by file stem. Bundled as text, not
// as URLs: they are inlined so they can use the design tokens.
const diagramsRaw = import.meta.glob('../../content/eras/1914-schlieffen-marne/diagrams/*.svg', {
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
  const people = Person.array().parse(peopleJson);
  const tech = TechCard.array().parse(techJson);
  const science = ScienceCard.array().parse(scienceJson);
  const documents = Document.array().parse(documentsJson);
  const historiography = Historiography.array().parse(historiographyJson);
  const links = CausalLink.array().parse(linksJson);
  const cast = CastEntry.array().parse(castJson);
  const clocks = Timetable.array().parse(clocksJson);
  const tallies = Tally.array().parse(talliesJson);
  const supply = SupplyLine.array().parse(supplyJson);
  const casualties = CasualtyRecord.array().parse(casualtiesJson);
  const vignettes = Vignette.array()
    .parse(vignettesJson)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const tours = Tour.array().parse(toursJson);
  const score = ScoreEntry.array().parse(scoreJson);
  const tracks = PersonTrack.array().parse(tracksJson);
  const decisions = DecisionPoint.array()
    .parse(decisionsJson)
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
    diagrams: Object.fromEntries(
      Object.entries(diagramsRaw).map(([file, svg]) => [
        (file.split('/').pop() ?? '').replace(/\.svg$/, ''),
        svg,
      ]),
    ),
  };
}

export const seed: SeedPack = loadSeed();
mark('sandtable:pack-ready');
