/**
 * Entity schemas — the content model from ADR 0003 (scenario packs) and
 * ADR 0005 (authored branches). See docs/content-model.md for the prose
 * version and the validator rules that go beyond what a schema can say.
 */
import { z } from 'zod';
import {
  AltName,
  BBox,
  Camera,
  Citation,
  Confidence,
  Id,
  IsoDate,
  IsoTime,
  LngLat,
  Markdown,
  Slug,
  TimeRange,
  When,
} from './primitives.js';

// ------------------------------------------------------------------ shared

/** Cross-references an entity may carry to open related cards. */
export const Links = z
  .object({
    people: z.array(Id).optional(),
    formations: z.array(Id).optional(),
    places: z.array(Id).optional(),
    events: z.array(Id).optional(),
    battles: z.array(Id).optional(),
    tech: z.array(Id).optional(),
    science: z.array(Id).optional(),
    documents: z.array(Id).optional(),
    casualties: z.array(Id).optional(),
    media: z.array(Id).optional(),
  })
  .strict()
  .describe('Related entities by id; every id must resolve');

const Sources = z.array(Citation).describe('Citations supporting the claims in this entity');

// ------------------------------------------------------------------- Source

export const Source = z
  .object({
    id: Id,
    kind: z.enum([
      'book',
      'chapter',
      'article',
      'official-history',
      'archive',
      'map',
      'web',
      'other',
    ]),
    title: z.string().min(1),
    author: z.string().optional().describe('"Surname, Given" — separate several with ";"'),
    year: z.number().int().min(1000).max(2100).optional(),
    publisher: z.string().optional(),
    edition: z.string().optional(),
    url: z.url().optional(),
    isbn: z.string().optional(),
    notes: z.string().optional().describe('What this source is good for; known biases'),
  })
  .strict();

// ------------------------------------------------------------------- Person

export const Person = z
  .object({
    id: Id.describe('person:<slug>'),
    name: z.string().min(1),
    sortName: z.string().optional().describe('"Moltke, Helmuth von (the Younger)"'),
    names: z.array(AltName).optional(),
    born: IsoDate.optional(),
    died: IsoDate.optional(),
    nationality: z
      .string()
      .optional()
      .describe('ISO 3166-1 alpha-2 of the 1914 state, e.g. DE, FR, GB, BE'),
    roles: z
      .array(
        z
          .object({
            title: z.string().min(1).describe('e.g. "Commander, German 1st Army"'),
            from: When.optional(),
            to: When.optional(),
          })
          .strict(),
      )
      .optional(),
    summary: Markdown.describe('One paragraph, era-neutral'),
    media: z.array(Id).optional().describe('Portrait media ids'),
    sources: Sources.optional(),
  })
  .strict();

// -------------------------------------------------------------------- Place

export const Place = z
  .object({
    id: Id.describe('place:<slug>'),
    name: z.string().min(1).describe('Name used in the narrative (usually the period name)'),
    names: z.array(AltName).optional().describe('Period and modern names: Port Arthur / Lüshun'),
    kind: z.enum([
      'city',
      'town',
      'village',
      'fortress',
      'river',
      'region',
      'sea',
      'strait',
      'forest',
      'other',
    ]),
    lngLat: LngLat,
    country: z.string().optional().describe('State in 1914 (or the pack era), e.g. "Belgium"'),
    notes: z.string().optional(),
    sources: Sources.optional(),
  })
  .strict();

// -------------------------------------------------------------------- Media
// Provisional — mirrors today's content/shared/media/**/media.json manifests
// and tolerates extra keys; formalised (and made strict) by sand-y0u.2.

export const Media = z.looseObject({
  $comment: z.string().optional(),
  id: Id.describe('media:<kind>/<slug>/<file-stem>'),
  person: Id.optional().describe('Person depicted, for portraits'),
  file: z.string().min(1).describe('File name beside the manifest, stored in the assets bucket'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  colorized: z.boolean(),
  original: z.looseObject({
    description: z.string().optional(),
    photographer: z.string().optional(),
    date: z.string().optional(),
    archive: z.string().optional(),
    archive_url: z.url().optional(),
    uncropped_url: z.url().optional(),
    original_dimensions: z.string().optional(),
    licence: z.string().min(1),
  }),
  colorization: z
    .looseObject({
      author: z.string().optional(),
      method: z.string().optional(),
      licence: z.string().optional(),
      status: z.string().min(1),
    })
    .optional(),
  content_policy: z.string().min(1),
  caption: z.string().min(1),
  credit: z.string().min(1),
  used_by: z.array(Id).optional().describe('Intended placements (beats, events, cards)'),
  focal_point: z
    .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
    .strict()
    .optional(),
  notes: z.string().optional(),
});

// --------------------------------------------------------------------- Pack

export const Side = z
  .object({
    id: Slug.describe('Short side id used by formations: de, fr, be, gb, ru'),
    name: z.string().min(1),
    short: z.string().min(1).max(12).optional(),
    alliance: z
      .string()
      .optional()
      .describe('"Central Powers" / "Entente" — drives the colour family'),
  })
  .strict();

export const Branch = z
  .object({
    id: Id.describe('<era>:<slug>; the historical branch is conventionally <era>:historical'),
    title: z.string().min(1),
    kind: z.enum(['historical', 'counterfactual']),
    divergesAt: IsoTime.optional().describe(
      'Required for counterfactual branches: shared history before this instant',
    ),
    summary: Markdown,
    historiography: Markdown.optional().describe(
      'The debate: who argues what about whether this could have happened',
    ),
    feasibility: z
      .array(
        z
          .object({
            condition: z.string().min(1),
            met: z.boolean().describe('Was the condition actually met in history?'),
            note: Markdown.optional(),
            sources: Sources.optional(),
          })
          .strict(),
      )
      .optional()
      .describe('For "success" branches: what would have had to be true'),
    sources: Sources.optional(),
  })
  .strict();

// -------------------------------------------------------------- Timetable
/**
 * A plan measured against what happened (sand-1l0.18): a clock with a day-0
 * origin and milestones the plan expected on given days, each recording when
 * (if ever) it was actually reached. Generic — the Schlieffen timetable, the
 * Russian-mobilization assumption, any later era's plan vs. actual.
 */
export const Timetable = z
  .object({
    id: Id.describe('<era>:clock-<slug>'),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    origin: IsoTime.describe('Day 0 of the timetable (e.g. the first mobilization day)'),
    dayLabel: z.string().optional().describe('Prefix for day numbers, default "M+"'),
    assumption: Markdown.describe('What the plan expected, footnoted [^slug] to `sources`'),
    milestones: z
      .array(
        z
          .object({
            id: Slug,
            label: z.string().min(1),
            plannedDay: z.number().optional().describe('Day the plan expected it; absent for reality-only marks'),
            actualAt: IsoTime.optional().describe('When it actually happened; absent if never'),
            place: Id.optional(),
            note: Markdown.optional(),
            sources: Sources.optional(),
          })
          .strict(),
      )
      .min(1),
    sources: Sources,
  })
  .strict();

// ------------------------------------------------------------- SupplyLine
/**
 * Rail against feet (sand-1l0.21): an army's marching distance read off its
 * route, and the gap between the army and the railhead that feeds it — the
 * railhead being a formation of its own with a route that creeps forward.
 * Generic: any army/railhead (or depot, port) pair.
 */
export const SupplyLine = z
  .object({
    id: Id.describe('<era>:supply-<slug>'),
    title: z.string().min(1),
    army: Id.describe('Formation whose march is measured'),
    railhead: Id.describe('Formation (kind other) whose route is the railhead/depot position over time'),
    thresholdKm: z
      .number()
      .positive()
      .optional()
      .describe('Gap beyond which horse-drawn supply failed in this era (default 100)'),
    summary: Markdown.optional().describe('Footnoted [^slug] to `sources`'),
    sources: Sources,
  })
  .strict();

// ------------------------------------------------------------------ Tally
/**
 * A running strength ledger (sand-1l0.19): a starting value in some unit and
 * dated entries that add or subtract — the corps that left the right wing —
 * each with where it went and why; plus named comparisons (right:left under
 * the 1905 memorandum vs. Moltke's deployment). Generic: any force ratio or
 * attrition ledger in a later era.
 */
export const Tally = z
  .object({
    id: Id.describe('<era>:tally-<slug>'),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    unit: z.string().min(1).describe('"corps", "divisions", "men"…'),
    start: z
      .object({
        value: z.number(),
        asOf: IsoTime,
        note: Markdown.optional(),
        sources: Sources.optional(),
      })
      .strict(),
    entries: z
      .array(
        z
          .object({
            id: Slug,
            at: IsoTime,
            delta: z.number().describe('Negative when strength leaves'),
            label: z.string().min(1),
            formations: z.array(Id).optional(),
            place: Id.optional(),
            lngLat: LngLat.optional().describe('Where the marker goes on the map'),
            note: Markdown.optional(),
            sources: Sources.optional(),
          })
          .strict(),
      )
      .min(1),
    comparisons: z
      .array(
        z
          .object({
            id: Slug,
            label: z.string().min(1),
            a: z.number().describe('Left-hand quantity, e.g. the right wing'),
            b: z.number().describe('Right-hand quantity, e.g. the left wing'),
            unit: z.string().optional(),
            note: Markdown.optional(),
            sources: Sources.optional(),
          })
          .strict(),
      )
      .optional()
      .describe('Named a:b comparisons drawn as paired bars'),
    summary: Markdown.optional().describe('Footnoted [^slug] to `sources`'),
    sources: Sources,
  })
  .strict();

// ------------------------------------------------------------- Casualties
/**
 * The human cost (sand-1l0.24): the losses of one battle, day or period as a
 * set of figures per side and category, each with its confidence and its own
 * sources — a range where historians disagree, never a single number dressed
 * as fact. Records are summed "to date" by the engine; nothing is scored.
 */
export const CasualtyCategory = z
  .enum(['killed', 'wounded', 'missing', 'prisoners', 'casualties'])
  .describe('casualties = killed + wounded + missing (+ prisoners) where the source gives only a total');

export const CasualtyFigure = z
  .object({
    side: Slug.describe('One of pack.sides[].id'),
    category: CasualtyCategory,
    value: z.number().int().nonnegative().optional().describe('Point estimate'),
    low: z.number().int().nonnegative().optional().describe('Lower bound of a range'),
    high: z.number().int().nonnegative().optional().describe('Upper bound of a range'),
    confidence: Confidence,
    note: Markdown.optional().describe('What the figure counts, and who gives it'),
    sources: Sources.optional(),
  })
  .strict()
  .refine((f) => f.value !== undefined || (f.low !== undefined && f.high !== undefined), {
    message: 'a figure needs a value or both low and high',
  })
  .refine((f) => f.low === undefined || f.high === undefined || f.low <= f.high, {
    message: 'low must be <= high',
  });

export const CasualtyRecord = z
  .object({
    id: Id.describe('<era>:casualties-<slug>'),
    title: z.string().min(1),
    timeRange: TimeRange.describe('The battle, day or period the figures cover'),
    battle: Id.optional().describe('Battle the record belongs to'),
    event: Id.optional().describe('Event the record belongs to'),
    place: Id.optional(),
    figures: z.array(CasualtyFigure).min(1),
    summary: Markdown.optional().describe('What happened to people, footnoted [^slug] to `sources`'),
    historiography: Markdown.optional().describe('Why the figures differ, who gives what'),
    links: Links.optional(),
    sources: Sources,
  })
  .strict();

// --------------------------------------------------------------- Vignette
/**
 * A first-person moment (sand-1l0.24): a short, sourced scene at an instant —
 * Ludendorff at the citadel gate, the taxis at the Invalides — rendered in
 * the dossier as a voice distinct from the narrative when the clock passes
 * it. Generic: any era's witnesses.
 */
export const Vignette = z
  .object({
    id: Id.describe('<era>:vignette-<slug>'),
    title: z.string().min(1),
    at: IsoTime.describe('The moment; shows once the clock has passed it'),
    branch: Id.optional().describe('Absent: every branch; present: only that branch'),
    place: Id.optional(),
    lngLat: LngLat.optional(),
    voice: z.string().min(1).describe('Whose eyes: "Erich Ludendorff", "a British liaison officer"'),
    kind: z
      .enum(['memoir', 'witness', 'reconstruction'])
      .describe(
        'memoir: told by a participant afterwards; witness: a contemporary diary, letter or report; reconstruction: assembled from secondary accounts',
      ),
    text: Markdown.describe('A few sentences, footnoted [^slug] to `sources`'),
    people: z.array(Id).optional(),
    links: Links.optional(),
    sources: Sources,
  })
  .strict();

// ------------------------------------------------------------------- Cast
/**
 * A pack's dramatis personae: who the story is about in *this* period. The
 * shared Person stays era-neutral (names, dates, portrait); what they are
 * known for in the pack's window — role, biography, sources — lives here, so
 * the same person reads differently in a 1914 and a 1916 pack (sand-9ts).
 */
export const CastEntry = z
  .object({
    id: Id.describe('<era>:cast-<slug>'),
    person: Id.describe('person:<slug> in the shared registry'),
    role: z.string().min(1).describe('Period role, one line: "Commander-in-Chief, French armies"'),
    side: Slug.optional().describe('Pack side id (de, fr, gb, be…) for grouping and colour'),
    bio: Markdown.describe(
      'What they are known for in this period — a few paragraphs, footnoted [^slug] to `sources`; contested points as historiography',
    ),
    sources: Sources.describe('At least one citation; footnote slugs in `bio` must name these'),
    order: z.number().int().optional().describe('Explicit ordering within the side (default: file order)'),
  })
  .strict();

export const Pack = z
  .object({
    id: Id.describe('<era>:pack, e.g. 1914:schlieffen-marne'),
    idPrefix: Slug.describe('Era prefix every entity id in this pack carries, e.g. "1914"'),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    summary: Markdown,
    timeRange: TimeRange.describe('The campaign clock: the timeline spans this range'),
    region: BBox.describe('Geographic extent of the pack'),
    borderYear: z.number().int().describe('Which shared/geo/borders/<year>.geojson to draw'),
    camera: Camera.describe('Opening camera'),
    sides: z.array(Side).min(1),
    branches: z.array(Branch).min(1),
    defaultBranch: Id,
    language: z.string().default('en').optional(),
    status: z
      .enum(['seed', 'draft', 'review', 'published'])
      .describe('seed: scaffolding; draft: being authored; review: in fact-check; published'),
    sources: Sources.optional().describe('General bibliography for the pack'),
  })
  .strict();

// ---------------------------------------------------------------- Formation

export const Formation = z
  .object({
    id: Id,
    name: z.string().min(1).describe('"German 1st Army"'),
    short: z.string().min(1).max(16).optional().describe('Token label: "1. Armee", "BEF"'),
    side: Slug.describe('One of pack.sides[].id'),
    kind: z.enum([
      'army-group',
      'army',
      'corps',
      'division',
      'brigade',
      'regiment',
      'detachment',
      'garrison',
      'fleet',
      'squadron',
      'flotilla',
      'other',
    ]),
    commander: Id.optional().describe('person:<slug>'),
    parent: Id.optional().describe('Higher formation in this pack'),
    strength: z
      .object({
        men: z.number().int().nonnegative().optional(),
        guns: z.number().int().nonnegative().optional(),
        corps: z.number().int().nonnegative().optional().describe('Corps-equivalents'),
        divisions: z.number().int().nonnegative().optional().describe('Infantry divisions'),
        asOf: When.optional(),
        sources: Sources.optional(),
      })
      .strict()
      .optional(),
    /** When it ceased to exist (disbanded, merged, destroyed); its token disappears then. */
    dissolved: When.optional(),
    /** Where it assembled before moving (the order of battle, sand-1l0.1). */
    concentration: z
      .object({
        area: z.string().min(1).describe('In words: "Aachen–Jülich, behind the Dutch frontier"'),
        position: LngLat.optional().describe('Representative point for the start token'),
        asOf: When.optional(),
        sources: Sources.optional(),
      })
      .strict()
      .optional(),
    summary: Markdown.optional(),
    media: z.array(Id).optional(),
    sources: Sources.optional(),
  })
  .strict();

// -------------------------------------------------------------------- Route

/** [lng, lat, ISO time] — where the formation's centre of mass / HQ was at that instant. */
export const Waypoint = z
  .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90), IsoTime])
  .describe('[lng, lat, ISO time]');

export const Route = z
  .object({
    id: Id,
    formation: Id,
    branch: Id.optional().describe(
      'Absent: the historical/default route. Present: a counterfactual continuation — its waypoints must start at or after the branch divergesAt and are appended to the default route’s earlier waypoints',
    ),
    waypoints: z.array(Waypoint).min(2).describe('Strictly increasing in time'),
    confidence: Confidence.default('medium'),
    mode: z
      .enum(['march', 'rail', 'sea', 'air'])
      .optional()
      .describe(
        'How the formation moved along this route; rail/sea/air legs draw dashed and show their token only while moving (default march)',
      ),
    derivation: z
      .string()
      .optional()
      .describe('How positions were derived (HQ locations, corps centres, …)'),
    notes: z.string().optional(),
    sources: Sources,
  })
  .strict();

// -------------------------------------------------------------------- Event

export const Event = z
  .object({
    id: Id,
    title: z.string().min(1),
    at: IsoTime.optional().describe('Instant, for point events'),
    timeRange: TimeRange.optional().describe('Range, for battles, sieges, crises'),
    kind: z.enum([
      'battle',
      'siege',
      'order',
      'decision',
      'political',
      'diplomatic',
      'mobilization',
      'movement',
      'technology',
      'science',
      'phase',
      'other',
    ]),
    significance: z
      .enum(['major', 'minor'])
      .default('minor')
      .describe('major events appear as timeline ticks'),
    branch: Id.optional().describe(
      'Absent: in every branch; present: only in that branch (the historical one included, for events after a divergence)',
    ),
    place: Id.optional().describe('place:<slug>'),
    lngLat: LngLat.optional().describe('Position when there is no Place'),
    summary: Markdown,
    links: Links.optional(),
    sources: Sources,
  })
  .strict();

// ------------------------------------------------------------------- Battle

export const Battle = z
  .object({
    id: Id,
    title: z.string().min(1),
    timeRange: TimeRange,
    region: BBox,
    camera: Camera,
    place: Id.optional(),
    summary: Markdown,
    outcome: Markdown.optional(),
    participants: z.array(Id).optional().describe('Campaign-level formation ids engaged'),
    formations: z
      .array(Formation)
      .optional()
      .describe('Battle-level formations (corps, divisions) shown only inside the zoom-in'),
    routes: z.array(Route).optional().describe('Battle-level routes, typically hourly'),
    events: z.array(Event).optional().describe('Battle-level events on the sub-timeline'),
    links: Links.optional(),
    sources: Sources,
  })
  .strict();

// ------------------------------------------------------------ DecisionPoint

export const DecisionPoint = z
  .object({
    id: Id,
    at: IsoTime,
    title: z.string().min(1),
    actor: Id.optional().describe('person:<slug> who had to choose'),
    question: Markdown,
    options: z
      .array(
        z
          .object({
            id: Slug,
            label: z.string().min(1),
            summary: Markdown,
            branch: Id.optional().describe('Branch that plays out if this option is chosen'),
          })
          .strict(),
      )
      .min(2),
    historical: Slug.describe('options[].id actually chosen'),
    reasoning: Markdown.describe('What was known at the time'),
    verdict: Markdown.describe('Outcome and the historians’ assessment'),
    links: Links.optional(),
    sources: Sources,
  })
  .strict();

// ----------------------------------------------------------------- TechCard

export const TechField = z.enum([
  'railways',
  'artillery',
  'small-arms',
  'machine-guns',
  'aviation',
  'signals',
  'naval',
  'armour',
  'chemistry',
  'medicine',
  'motor-transport',
  'fortification',
  'industry-logistics',
  'other',
]);

export const TechCard = z
  .object({
    id: Id,
    title: z.string().min(1),
    field: TechField,
    introduced: z
      .object({ at: When.optional(), label: z.string().min(1) })
      .strict()
      .describe('When it mattered: at = timeline glyph position, label = human text'),
    summary: Markdown.describe('The card’s first paragraph'),
    body: Markdown.optional(),
    counter: z
      .string()
      .optional()
      .describe('The counter-innovation it provoked (tech-tree edge), as a TechCard id'),
    media: z.array(Id).optional(),
    links: Links.optional(),
    sources: Sources,
  })
  .strict();

// -------------------------------------------------------------- ScienceCard

export const ScienceField = z.enum([
  'physics',
  'chemistry',
  'biology-medicine',
  'earth-science',
  'mathematics',
  'ideas-culture',
]);

export const ScienceCard = z
  .object({
    id: Id,
    title: z.string().min(1),
    field: ScienceField,
    at: When.describe('Timeline glyph position'),
    people: z.array(Id).optional(),
    summary: Markdown,
    body: Markdown.optional(),
    connections: z
      .array(
        z
          .object({
            to: z.string().min(1).describe('Later consequence — free text or an entity id'),
            note: Markdown.optional(),
          })
          .strict(),
      )
      .optional()
      .describe('"Connections" forward: relativity → GPS'),
    media: z.array(Id).optional(),
    links: Links.optional(),
    sources: Sources,
  })
  .strict();

// ----------------------------------------------------------------- Document

export const Document = z
  .object({
    id: Id,
    title: z.string().min(1),
    date: When,
    author: z.string().min(1).describe('person:<slug> or free text'),
    kind: z.enum([
      'order',
      'directive',
      'memorandum',
      'letter',
      'telegram',
      'report',
      'diary',
      'speech',
      'treaty',
      'proclamation',
      'other',
    ]),
    language: z.string().optional().describe('BCP 47 of the excerpt, e.g. de, fr'),
    excerpt: Markdown.describe('The real text, in the original language where we have it'),
    translation: Markdown.optional(),
    archive: z.string().optional(),
    links: Links.optional(),
    sources: Sources,
  })
  .strict();

// --------------------------------------------------------------- CausalLink

export const CausalLink = z
  .object({
    id: Id,
    from: Id.describe('Cause — any entity id, in this pack or another'),
    to: Id.describe('Consequence — any entity id, in this pack or another'),
    relation: z.enum([
      'caused',
      'enabled',
      'accelerated',
      'prevented',
      'motivated',
      'shaped',
      'other',
    ]),
    claim: Markdown.describe('"This led to that because …"'),
    confidence: Confidence,
    historiography: Markdown.optional(),
    evidence: z.array(Citation).min(1),
  })
  .strict();

// ------------------------------------------------------------ NarrativeBeat
// Beats are Markdown files with YAML front matter; this is the front matter.

export const BeatFrontMatter = z
  .object({
    id: Id,
    title: z.string().min(1),
    dateLabel: z
      .string()
      .min(1)
      .describe('Human date shown in the dossier: "4–9 August 1914" or "Hypothetical, ~day 26"'),
    from: IsoTime,
    to: IsoTime,
    branch: Id.optional().describe(
      'Absent: shown in every branch; present: only in that branch (use the historical branch id for beats after a divergence)',
    ),
    focus: Id.optional().describe('Battle id when the beat belongs to a zoom-in'),
    pullQuote: z
      .object({ text: z.string().min(1), attribution: z.string().min(1) })
      .strict()
      .optional(),
    media: Id.optional().describe('Hero image'),
    links: Links.optional(),
    sources: z.array(Citation).min(1),
  })
  .strict();

export const NarrativeBeat = BeatFrontMatter.extend({
  body: Markdown,
  file: z.string().min(1).describe('Path relative to the pack, for error messages'),
});

// ------------------------------------------------------------------- Thread

export const Thread = z
  .object({
    id: Id.describe('thread:<slug>'),
    title: z.string().min(1),
    summary: Markdown,
    steps: z
      .array(
        z
          .object({
            pack: Id,
            beat: Id.optional(),
            at: IsoTime.optional().describe('Time to jump to if no beat'),
            branch: Id.optional(),
            note: Markdown.describe('Connective narrative between steps'),
          })
          .strict(),
      )
      .min(2),
    sources: Sources.optional(),
  })
  .strict();

// --------------------------------------------------------------------- Tour
/**
 * A guided tour (sand-1l0.14): a scripted pass over the pack for a viewer who
 * would rather lean back than drive — camera, clock, branch, zoom-in and card,
 * one step at a time, with narration. Authored as data, so any era can script
 * its own; the engine knows nothing about 1914.
 *
 * Each step is a **complete description of the view**, not a diff from the one
 * before: what a step does not name falls back to the default (the campaign
 * map, the pack's default branch, no card). Deep-linking to a step therefore
 * rebuilds the whole view — `?tour=<tour id>&step=<step id>`.
 */
export const TourStep = z
  .object({
    id: Slug.describe('Unique within the tour; the URL carries it as ?step=<id>'),
    title: z.string().min(1),
    narration: Markdown.describe('A few sentences, footnoted [^slug] to the tour’s sources'),
    at: IsoTime.describe('Where the clock stands when the step opens'),
    playUntil: IsoTime.optional().describe(
      'Play the clock from `at` to here, then advance; absent: hold at `at`',
    ),
    speed: z
      .number()
      .positive()
      .optional()
      .describe('Simulated ms per real second while this step plays'),
    hold: z
      .number()
      .positive()
      .optional()
      .describe('Seconds to hold a non-playing step before advancing'),
    camera: Camera.optional().describe(
      'Fly here; absent: the battle region when `focus` is set, else the pack region',
    ),
    focus: Id.optional().describe('Battle to be zoomed into; absent: the campaign map'),
    branch: Id.optional().describe('Branch to show; absent: the pack default'),
    card: Id.optional().describe('Dossier card to open on arrival'),
  })
  .strict();

export const Tour = z
  .object({
    id: Id.describe('<era>:tour-<slug>'),
    title: z.string().min(1),
    summary: Markdown.describe('One or two sentences: what the tour shows and roughly how long'),
    steps: z.array(TourStep).min(2),
    sources: Sources.describe(
      'At least one citation; footnote slugs in every step’s narration must name these',
    ),
  })
  .strict();

// -------------------------------------------------------------------- types

export type Links = z.infer<typeof Links>;
export type Source = z.infer<typeof Source>;
export type Person = z.infer<typeof Person>;
export type CastEntry = z.infer<typeof CastEntry>;
export type Timetable = z.infer<typeof Timetable>;
export type Tally = z.infer<typeof Tally>;
export type SupplyLine = z.infer<typeof SupplyLine>;
export type CasualtyCategory = z.infer<typeof CasualtyCategory>;
export type CasualtyFigure = z.infer<typeof CasualtyFigure>;
export type CasualtyRecord = z.infer<typeof CasualtyRecord>;
export type Vignette = z.infer<typeof Vignette>;
export type Place = z.infer<typeof Place>;
export type Media = z.infer<typeof Media>;
export type Side = z.infer<typeof Side>;
export type Branch = z.infer<typeof Branch>;
export type Pack = z.infer<typeof Pack>;
export type Formation = z.infer<typeof Formation>;
export type Waypoint = z.infer<typeof Waypoint>;
export type Route = z.infer<typeof Route>;
export type Event = z.infer<typeof Event>;
export type Battle = z.infer<typeof Battle>;
export type DecisionPoint = z.infer<typeof DecisionPoint>;
export type TechField = z.infer<typeof TechField>;
export type TechCard = z.infer<typeof TechCard>;
export type ScienceField = z.infer<typeof ScienceField>;
export type ScienceCard = z.infer<typeof ScienceCard>;
export type Document = z.infer<typeof Document>;
export type CausalLink = z.infer<typeof CausalLink>;
export type BeatFrontMatter = z.infer<typeof BeatFrontMatter>;
export type NarrativeBeat = z.infer<typeof NarrativeBeat>;
export type Thread = z.infer<typeof Thread>;
export type TourStep = z.infer<typeof TourStep>;
export type Tour = z.infer<typeof Tour>;
