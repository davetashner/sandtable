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

// -------------------------------------------------------------------- types

export type Links = z.infer<typeof Links>;
export type Source = z.infer<typeof Source>;
export type Person = z.infer<typeof Person>;
export type CastEntry = z.infer<typeof CastEntry>;
export type Timetable = z.infer<typeof Timetable>;
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
