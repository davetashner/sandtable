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
import { TileArchive } from './tiles.js';

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
    /** The dispute a claim on this entity is part of (`Historiography`). */
    historiography: z.array(Id).optional(),
    media: z.array(Id).optional(),
  })
  .strict()
  .describe('Related entities by id; every id must resolve');

const Sources = z.array(Citation).describe('Citations supporting the claims in this entity');

/**
 * The cap on a plate set, and the reason the pattern is not a gallery
 * (ADR 0014). Four is what the dossier column holds as a complete 2×2 at the
 * type floor, what the editorial need asks for on both of its axes (headgear,
 * rifle, machine gun, field gun; Germany, France, Britain, Belgium), and
 * about as many pictures as a reader compares rather than scans. A fifth
 * point is a second card, not a fifth cell.
 */
export const PLATE_SET_MAX = 4;

/**
 * A comparison set of photographs on one card (ADR 0014): a fixed few plates
 * with one declared axis, one crop, and a label on each — all of them on
 * screen at once, in a grid, with no way to page through them. What keeps it
 * from being the gallery ADR 0006 refuses is that it is bounded, ordered by a
 * claim rather than by arrival, and complete at a glance.
 *
 * Never on a beat: ADR 0012's one picture per beat stands. A beat is what the
 * reader is given; a card is what they asked for, and that is the difference
 * that pays for four pictures.
 */
export const PlateSet = z
  .object({
    axis: z
      .string()
      .min(1)
      .max(80)
      .describe(
        'What is being compared, in one line: "German kit, August 1914" — short, because it renders as an eyebrow over the set',
      ),
    fit: z
      .enum(['band', 'portrait'])
      .optional()
      .describe(
        'One crop for every plate in the set (ADR 0012 fits), default band. A shared frame is the control variable; `contain` is not offered here',
      ),
    items: z
      .array(
        z
          .object({
            media: Id.describe('media:<kind>/<slug>/<file-stem>'),
            label: z
              .string()
              .min(1)
              .max(48)
              .describe('This plate’s point on the axis: "Pickelhaube", "Belgium"'),
          })
          .strict(),
      )
      .min(2, { message: 'a set of one is a plate — use the card’s own picture slot' })
      .max(PLATE_SET_MAX, {
        message: `a plate set holds at most ${PLATE_SET_MAX} pictures (ADR 0014) — a fifth point is a second card`,
      }),
  })
  .strict()
  .describe('A bounded comparison set of photographs on one axis (ADR 0014)');

// ------------------------------------------------------------------- Source

/**
 * Where a work stands in the hierarchy of evidence (`docs/sources.md`).
 *
 * `kind` says what the thing physically is — a book, an article, a web page.
 * That is a librarian's answer and it puts Kluck's memoir, Tuchman's narrative
 * and Herwig's archive study in one undifferentiated pile of fifty, which is
 * precisely the distinction `docs/sources.md` says matters when two works
 * disagree. `tier` says how much weight the work carries and why, so the
 * hierarchy the standard declares in prose is in the data, checkable by the
 * validator and visible to a reader in the bibliography.
 *
 * A work is filed by its **form**, not by the use one pack makes of it: an
 * edition that prints a document is `primary` even when its editor also
 * argues a case, and a monograph is a `study` even when it prints a document
 * in an appendix. `notes` carries the rest. The five middle values are the
 * five rungs of the hierarchy in `docs/sources.md`, in its order; `primary`
 * sits above them (rule 7 — the record itself) and `reference` below them
 * (rule 8 — never an operational claim).
 */
export const EvidenceTier = z
  .enum(
    ['primary', 'official-history', 'study', 'unit-history', 'memoir', 'general', 'reference'],
    {
      // The message is the whole point of overriding it. A source is added by
      // whoever is writing content, in the PR that first cites it, and the
      // default enum error names seven slugs with no way to choose between
      // them. This one asks the question `docs/sources.md` asks and says where
      // the answer is written down.
      error:
        'a source must say where it stands in the hierarchy of evidence — one of ' +
        'primary, official-history, study, unit-history, memoir, general, reference. ' +
        'File the work by its form, not by the use one pack makes of it (docs/sources.md).',
    },
  )
  .describe('Standing in the hierarchy of evidence (docs/sources.md)');
export type EvidenceTier = z.infer<typeof EvidenceTier>;

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
    tier: EvidenceTier,
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
      .describe(
        'The 1914 state, ISO 3166-1 alpha-2 where one exists (DE, FR, GB, BE, RU) and the ' +
          'historical code where it does not: AT-HU is Austria-Hungary, which is not AT — ' +
          'Franz Ferdinand and the Bosnian Serb who shot him were subjects of the same empire',
      ),
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
    file: z
      .string()
      .min(1)
      .optional()
      .describe(
        'The unaltered original beside the manifest, when the project holds a copy of it: ' +
          '"show original" then swaps the picture in place instead of linking out (ADR 0012)',
      ),
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

/**
 * The opening sequence (sand-1l0.26): the first thirty seconds, before the map
 * is interactive. A pack states its own premise — the engine knows nothing
 * about 1914 — and hands off into the guided tour or free exploration.
 *
 * `headline` is read one line at a time, so each line is a beat of the reveal.
 * A premise that asserts a number must be able to show its working: `claim`
 * points at the card the number rests on (typically a clock), and `sources`
 * carries the citations the lede footnotes.
 */
export const Opening = z
  .object({
    eyebrow: z.string().min(1).optional().describe('Mono eyebrow above the premise'),
    headline: z
      .array(z.string().min(1))
      .min(1)
      .max(4)
      .describe('The premise, one line per beat of the reveal'),
    lede: Markdown.describe('One or two sentences under the headline'),
    camera: Camera.optional().describe('Where the map settles while the premise is read'),
    claim: z
      .object({
        label: z.string().min(1).describe('"Where does “forty days” come from?"'),
        card: Id.describe('Card that shows the working — typically a clock'),
      })
      .strict()
      .optional()
      .describe('One click from the premise to the evidence behind it'),
    chain: z
      .object({
        label: z.string().min(1).optional().describe('"How did it start?"'),
        hint: z.string().min(1).optional().describe('Sub-label: "the chain of events"'),
        focus: Id.optional().describe(
          'Chapter or zoom-in the backstory establishes itself in: the map goes there, so a chain that begins somewhere other than the campaign front is seen where it happened',
        ),
        card: Id.optional().describe('Card to open — typically the first link of the chain'),
      })
      .strict()
      .optional()
      .describe('Where the pack’s backstory lives (sand-1l0.32)'),
    sources: Sources.optional(),
  })
  .strict();

// ----------------------------------------------------------------- movement

/**
 * How a formation — or a man — covered the ground, and the reason the model
 * has the field at all: what moved something says how fast it could move, and
 * the validator holds every leg to the rate of its mode (`sand-23b.8`).
 *
 * `march` is the default and the whole war on foot. `rail`, `sea` and `air`
 * are **transfers**: the formation is inside the train, the ship or the
 * aeroplane, so the leg draws dashed and the token appears only while it is
 * under way. `motor` is the road — Hentsch's staff car, the Paris taxis,
 * Joffre's drive to Melun — and it is not a transfer: a column of cars is on
 * the ground the whole way and stays on the map, drawn with its own finer
 * dash.
 */
export const MovementMode = z
  .enum(['march', 'motor', 'rail', 'sea', 'air'])
  .describe('march (on foot), motor (road), rail, sea, air');

/**
 * What one mode could do in this pack's decade, in km/h of straight-line
 * displacement (ADR 0020).
 *
 * The validator's built-in table is 1914's, and a fast carrier task force at
 * 25–33 knots is above the 1914 `sea` *limit*. A pack whose technology
 * outran the default says so here rather than having the check quietly
 * widened underneath every pack at once.
 *
 * `note` and `sources` are required and are the whole point: a pace band is a
 * number about the past, and in this project every number about the past
 * cites a source. It sits in `pack.json`, where a content reviewer will see
 * it next to the reasoning that justifies it, rather than as a constant in a
 * validator nobody reviewing content ever opens.
 */
export const PaceBand = z
  .object({
    sustained: z
      .number()
      .positive()
      .describe('km/h this mode held day after day in this era — above it, a warning'),
    limit: z
      .number()
      .positive()
      .describe('km/h this mode could not beat on any leg in this era — above it, an error'),
    note: z
      .string()
      .min(1)
      .describe(
        'What these are the speeds of, in words: "US fast carrier task force, 25–33 knots economical to flank"',
      ),
    sources: Sources.describe('Where the numbers come from; at least one citation'),
  })
  .strict();

/**
 * The pack's pace table: one band per mode whose technology differs from
 * 1914's. **Every mode left out keeps the 1914 default**, which is why no
 * existing pack moved when this was introduced and why a Pacific pack
 * declares `sea` and `air` but says nothing about `march` — a Marine on Betio
 * walks no faster than a poilu on the Marne.
 */
export const PaceTable = z
  .object({
    march: PaceBand.optional(),
    motor: PaceBand.optional(),
    rail: PaceBand.optional(),
    sea: PaceBand.optional(),
    air: PaceBand.optional(),
  })
  .strict();

// ------------------------------------------------------------------- Pack

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
    tiles: TileArchive.optional().describe(
      'Basemap archive this campaign is drawn on, by name — "central-pacific-z10", never a URL ' +
        '(content/shared/geo/tiles/manifest.json, ADR 0002); omit for the Central-Europe default',
    ),
    frontLine: Slug.optional().describe(
      'Shared front-line series to draw as the clock moves, e.g. "western-front" ' +
        '(content/shared/geo/front/<name>.geojson, sand-g80.1); omit for none',
    ),
    camera: Camera.describe('Opening camera'),
    sides: z.array(Side).min(1),
    branches: z.array(Branch).min(1),
    defaultBranch: Id,
    language: z.string().default('en').optional(),
    status: z
      .enum(['seed', 'draft', 'review', 'published'])
      .describe('seed: scaffolding; draft: being authored; review: in fact-check; published'),
    sources: Sources.optional().describe('General bibliography for the pack'),
    pace: PaceTable.optional().describe(
      'How fast this era’s technology moved, per mode, where it differs from the 1914 default (ADR 0020); omit a mode to keep the default',
    ),
    opening: Opening.optional().describe('The first thirty seconds (sand-1l0.26)'),
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
    /** The "who is who" set: what this army wore and carried (ADR 0014). */
    plates: PlateSet.optional(),
    sources: Sources.optional(),
  })
  .strict();

// -------------------------------------------------------------------- Route

/**
 * `[lng, lat, ISO time]` — where the formation's centre of mass / HQ was at
 * that instant — with an optional fourth element saying how good that
 * position is (`sand-23b.4`).
 *
 * The confidence vocabulary is the pack's one vocabulary, the same `high /
 * medium / low / contested` a casualty figure or a causal link carries: a
 * position is a claim like any other and there is no reason for it to be
 * graded on a scale of its own.
 *
 * **Absent means "as good as the path it belongs to"** — the waypoint
 * inherits its route's or track's `confidence`, which is where the general
 * statement belongs, because the `derivation` prose is written about the
 * whole path ("towns and days, not buildings and hours"). The fourth element
 * is for the exception the derivation already names: the hour that is nominal
 * inside a vaguer one, the leg that is the source's own contradiction, the
 * one waypoint on an otherwise documented journey that nobody timed. Marking
 * every waypoint of a route `medium` says nothing the route did not already
 * say; marking the one nominal position on a `high` track says a great deal.
 */
export const Waypoint = z
  .tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
    IsoTime,
    Confidence.optional().describe(
      'How good this one position is — high: documented; medium: inferred from sources; low: approximate; contested: the sources disagree. Omit to inherit the route’s or track’s confidence',
    ),
  ])
  .describe('[lng, lat, ISO time, confidence?]');

/**
 * A formation's movement, as one leg of it. Most formations need only one
 * route; a formation that changed how it moved needs one route per leg, each
 * beginning where and when the one before it ended — the French 2nd Army
 * marched in Lorraine, entrained for Picardy on 17 September and marched
 * again when it got there, and each of those is a Route of its own so that
 * each can carry its own `mode` (`sand-23b.8`). The engine joins the legs
 * into one path.
 */
export const Route = z
  .object({
    id: Id,
    formation: Id,
    branch: Id.optional().describe(
      'Absent: the historical/default route. Present: a counterfactual continuation — its waypoints must start at or after the branch divergesAt and are appended to the default route’s earlier waypoints',
    ),
    waypoints: z.array(Waypoint).min(2).describe('Strictly increasing in time'),
    confidence: Confidence.default('medium').describe(
      'How good the positions on this path are — high: documented; medium: inferred from sources; low: approximate; contested: historians disagree. Every waypoint inherits it unless it carries one of its own',
    ),
    mode: MovementMode.optional().describe(
      'How the formation moved along this route; rail/sea/air are transfers and draw dashed with their token shown only while moving, motor draws with a finer dash and keeps its token (default march)',
    ),
    derivation: z
      .string()
      .optional()
      .describe('How positions were derived (HQ locations, corps centres, …)'),
    notes: z.string().optional(),
    sources: Sources,
  })
  .strict();

// -------------------------------------------------------- PersonTrack

/**
 * Where a commander was, as against where his army was (sand-1l0.27).
 *
 * Two kinds, and the difference is the whole point. An `hq` track is the
 * headquarters his army was run from — evidence for it is good, day by day,
 * but a headquarters is a place on a map and not the man, who spent much of
 * the campaign in a car. A `journey` track is a documented movement of the
 * person himself, at the hours the sources give: Hentsch's drive of 8–9
 * September, Joffre's visits, Moltke's one tour of the front. The UI says
 * which it is showing, because an HQ pin is not a claim about where anybody
 * stood at that hour.
 */
export const PersonTrack = z
  .object({
    id: Id,
    person: Id.describe('person:<slug> — the commander this track belongs to'),
    kind: z
      .enum(['hq', 'journey'])
      .describe(
        'hq: the headquarters he commanded from, day by day. journey: the man himself, at documented hours',
      ),
    /** For an hq track, the post held — "OHL", "GQG", "BEF GHQ", "1. Armee". */
    post: z.string().min(1).optional().describe('The headquarters, for an hq track'),
    postShort: z
      .string()
      .min(1)
      .max(16)
      .optional()
      .describe('The headquarters in a word, for the map token: OHL, GQG, Paris'),
    side: Slug.optional().describe('Side id, for the ring colour; inferred from the post otherwise'),
    waypoints: z.array(Waypoint).min(2).describe('Strictly increasing in time'),
    confidence: Confidence.default('medium').describe(
      'How good the positions on this path are — high: documented; medium: inferred from sources; low: approximate; contested: historians disagree. Every waypoint inherits it unless it carries one of its own',
    ),
    mode: MovementMode.optional().describe(
      'How he travelled, where the sources say: Joffre and Hentsch by car (motor), a headquarters moving by train (rail). Absent is not a claim that he walked — the pace check reads an unmarked track as road travel',
    ),
    derivation: z
      .string()
      .min(1)
      .describe('How the positions were derived, and at what resolution'),
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
    window: z
      .enum(['placed', 'outside'])
      .optional()
      .describe(
        'What timeRange means, when it is not the obvious thing. Absent: it is when this happened, ' +
          'inside the pack window. "placed": it is where a chapter sits on the campaign strip, not ' +
          'when it happened — the beats carry the real dates in dateLabel. "outside": it is when this ' +
          'happened, and that is outside the campaign — a prologue or an epilogue, which keeps its own clock.',
      ),
    region: BBox,
    camera: Camera,
    tiles: TileArchive.optional().describe(
      'Basemap archive for this zoom-in, when the campaign’s own archive does not reach this ' +
        'scale — an assault extract like "betio-z14" (ADR 0002); omit to keep the pack’s',
    ),
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
    /** The variants side by side: four field guns, three fuses (ADR 0014). */
    plates: PlateSet.optional(),
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

// ----------------------------------------------------------- Historiography

/**
 * One side of a dispute: who argues it, and the argument in its own terms.
 * `who` is prose rather than ids because the people who argue about 1914 are
 * historians and staff officers writing after it, and this pack's `Person`
 * registry is of the people who fought it.
 */
export const Position = z
  .object({
    label: z.string().min(1).describe('“The charge”, “The defence”, “The correction”'),
    who: z.string().min(1).describe('Who argues it — named, so the reader can weigh it'),
    summary: Markdown.describe('The argument as its holders would put it, with footnotes'),
  })
  .strict();

/**
 * A contested point, carried as the argument it is (`sand-23b.28`, ADR 0017).
 *
 * The other eleven card families each carry a claim: an event happened, an
 * order said this, a commander chose that. A `Historiography` card carries a
 * *disagreement* — the question, at least two positions with their holders
 * named, what is not in dispute, and what evidence would settle it and cannot
 * be read from here. It has no moment, so it has no timeline glyph: a dispute
 * about 9 September 1914 ran from 1914 to now. It is reached from the
 * entities it is about, which name it in `links.historiography`.
 *
 * **Two positions is the floor and it is enforced.** Rule 6 of
 * `docs/sources.md` says a contested point must not be settled for the
 * learner; a `historiography` *field* holding one side satisfies no schema,
 * and this is the version of the rule a validator can hold.
 */
export const Historiography = z
  .object({
    id: Id,
    title: z.string().min(1),
    question: Markdown.describe('The dispute stated as a question, not as a finding'),
    positions: z
      .array(Position)
      .min(2, {
        // The message is the rule. Rule 6 of `docs/sources.md` — a contested
        // point is not settled for the learner — is the reason this family
        // exists, and the default "expected array to have >=2 items" says
        // nothing about it to the author who has just written one side.
        error:
          'a contested point needs at least two positions: a card that carries one is a verdict ' +
          'in costume. Name who holds each one and cite it (docs/sources.md rule 6, ADR 0017).',
      })
      .describe('At least two: a card that carries one position is a verdict in costume'),
    settled: Markdown.optional().describe('What is *not* in dispute'),
    unread: Markdown.optional().describe('The evidence that would settle it, and why it is unread'),
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
    diagram: z
      .object({
        file: Slug.describe("Stem of an SVG in the pack's diagrams/ directory"),
        caption: z.string().min(1).describe('What the schematic shows and what to read from it'),
        alt: z
          .string()
          .min(1)
          .describe('The same, for a reader who cannot see it — not "a diagram"'),
      })
      .strict()
      .optional()
      .describe(
        'A concept schematic inlined above the prose (sand-1l0.33). Inlined, not an <img>, ' +
          'because the drawings are built from the design tokens and have to follow the theme; ' +
          "the claims they make are the beat's, and cite the beat's sources",
      ),
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

// ------------------------------------------------------------------ Receipt

/**
 * How a quotation was seen (ADR 0021).
 *
 * `fetch` is a retrieval a machine can repeat: a url that answered, and the
 * text it answered with. `read` is a person or an agent saying they opened a
 * copy nothing here can link — a lending copy, a library shelf, a scan whose
 * standing is not clear. The distinction is the whole point of the field:
 * `verify-receipts --fetch` can re-run the first kind and cannot re-run the
 * second, so a `read` receipt is an attestation and is worth exactly what the
 * person who signed it is worth.
 */
export const RetrievalMethod = z.enum(['fetch', 'read']);

/**
 * Whether asking twice gave the same answer.
 *
 * This field exists because of a specific failure: the Pearl Harbor pack found
 * the text-extraction layer returning different page markers for the same
 * sentence on repeated fetches — 196/197 then 195/196, 131 then 132 — and
 * wrote no page numbers for five transcriptions as a result. `differed` is how
 * a receipt records that, and the validator turns it into the rule that
 * behaviour deserved: a locator taken from a retrieval that would not repeat
 * itself is not a locator.
 */
export const RepeatCheck = z.enum(['agreed', 'differed', 'not-attempted']);

/**
 * A verification receipt for one quoted passage (ADR 0021).
 *
 * Every other entity in this model records what happened; this one records
 * what *we did* to find out. It exists because a quotation is the one claim
 * nothing else in the repository can check: the validator confirms a citation
 * resolves — that the source id exists — never that the source says what we
 * claim, and a fabricated quotation carrying a well-formed citation is worse
 * than no quotation, because the citation makes it look checked.
 *
 * The load-bearing field is `context`, not `quote`. Anyone can assert they
 * read something; a receipt has to paste back the retrieved text with the
 * quotation sitting inside it, and the validator checks the containment. That
 * turns an unfalsifiable claim ("I read this") into a falsifiable one ("this
 * url returned this text"), which is the only kind a script can re-run.
 *
 * Receipts live outside the packs, in `content/receipts/<era>.json`, because
 * they are apparatus and not content: a reader never sees one, and shipping
 * paragraphs of retrieved context inside a pack bundle would spend the
 * content budget (ADR 0018) on something nothing renders.
 */
export const Receipt = z
  .object({
    id: Id.describe('receipt:<slug> — unique across content/'),
    quote: z
      .string()
      .min(1)
      .describe(
        'The quoted words exactly as the content carries them. Elisions are written … or […] ' +
          'and the validator checks each surviving fragment against `context` in order.',
      ),
    source: Id.describe('The Source the quotation is attributed to'),
    pages: z.string().optional().describe('The locator, if one was actually seen'),
    usedIn: z
      .array(Id)
      .min(1)
      .describe('Entity ids whose text carries this quotation — a document, a beat, a card'),
    how: RetrievalMethod,
    url: z.url().optional().describe('What was fetched — required when `how` is "fetch"'),
    copy: z
      .string()
      .optional()
      .describe(
        'Which copy was opened — required when `how` is "read". Name it precisely enough that ' +
          'somebody else could find the same one: an edition and a library, an archive shelfmark.',
      ),
    checkedAt: IsoDate.describe('The day the retrieval happened'),
    checkedBy: z.string().min(1).describe('Who or what did it — a person, or an agent and model'),
    context: z
      .string()
      .min(1)
      .describe(
        'The retrieved text around the quotation, verbatim and long enough that a reviewer can ' +
          'see the quotation in place. This is the receipt; the rest is metadata about it.',
      ),
    repeat: RepeatCheck,
    note: z
      .string()
      .optional()
      .describe('Required when `repeat` is "differed": say what differed between the two fetches'),
  })
  .strict();

// -------------------------------------------------------------------- types

export type Links = z.infer<typeof Links>;
export type RetrievalMethod = z.infer<typeof RetrievalMethod>;
export type RepeatCheck = z.infer<typeof RepeatCheck>;
export type Receipt = z.infer<typeof Receipt>;
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
export type PlateSet = z.infer<typeof PlateSet>;

// ----------------------------------------------------------------------- Cue

/**
 * A piece of the background score (sand-1l0.34). One manifest per cue, in
 * content/shared/audio/<slug>/cue.json, with the master beside it as a
 * git-ignored staging copy — the same arrangement as media.json and for the
 * same reason (decision 0004; the binaries live in the assets bucket).
 *
 * Cues are shared, not pack-scoped: a score written for 1914 can underscore
 * another era, and which cue plays when is the pack's business, not the
 * asset's. `provenance` is the audio counterpart of a photograph's archive
 * record — for generated music the questions are which tool, which prompt and
 * which licence, and they are answered here or the cue does not ship.
 */
export const Cue = z.looseObject({
  $comment: z.string().optional(),
  id: Id.describe('cue:<slug>'),
  title: z.string().min(1),
  /** Position in the score, when it has one: A, B, C… */
  letter: z.string().max(2).optional(),
  /** Master file beside the manifest; the extension may be absent. */
  file: z.string().min(1),
  /**
   * cue = stage music, one at a time, crossfaded on a stage change.
   * bed = an overlay that fades in *under* whatever cue is playing.
   */
  role: z.enum(['cue', 'bed']).default('cue'),
  /** Seconds, from the master; the pipeline fills it and warns on drift. */
  duration: z.number().positive(),
  /** True when the tail joins the head cleanly enough to repeat. */
  loop: z.boolean(),
  /**
   * Trim in dB applied on top of the common loudness target — negative for a
   * bed that must sit under a cue. 0 for stage music.
   */
  mixDb: z.number().min(-24).max(6).optional(),
  /** What the score says it is, for the player and for anyone reading. */
  musical: z
    .looseObject({
      key: z.string().optional(),
      bpm: z.number().positive().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  /** Where the sound came from. Required: generated audio still needs a record. */
  provenance: z.looseObject({
    tool: z.string().min(1).describe('Suno, a performer, a library…'),
    model: z.string().optional(),
    prompt: z.string().optional(),
    excludes: z.string().optional(),
    generatedAt: z.string().optional(),
    licence: z.string().min(1),
  }),
  /** Rendered wherever the cue is credited. */
  credit: z.string().min(1),
  /** Intended placements — beats, battles, branches. */
  used_by: z.array(Id).optional(),
  notes: z.string().optional(),
});

export type Cue = z.infer<typeof Cue>;

// ---------------------------------------------------------------- ScoreEntry

/**
 * Which cue plays when (sand-1l0.34). The cues themselves are shared assets;
 * this is the pack's own reading of them, because the stages are the pack's.
 *
 * An entry matches on the opening sequence, on a zoom-in or chapter, or on a
 * window of campaign time. The narrowest match wins, so a one-day window can
 * carve silence out of a three-week cue — which is exactly what 22 August
 * does. Every entry either names a cue or declares `silence`; nothing else is
 * a valid thing to say about a moment.
 */
export const ScoreEntry = z
  .looseObject({
    cue: Id.optional().describe('cue:<slug> from the shared audio registry'),
    /** Deliberate silence. The music stops; it has not merely been forgotten. */
    silence: z.boolean().optional(),
    /** Matches while the opening sequence is on screen. */
    opening: z.boolean().optional(),
    /**
     * Matches while the view is on this branch. A counterfactual branch should
     * sound audibly not-history, the way the pack already labels it in text,
     * so a branch match outranks a focus or a time window.
     */
    branch: Id.optional(),
    /** Matches while this battle, chapter or zoom-in is in focus. */
    focus: Id.optional(),
    /**
     * Names the bed that fades in UNDER the stage cue while a first-person
     * vignette is on screen. A bed does not replace the cue; it joins it.
     */
    vignette: z.boolean().optional(),
    /** Matches while the clock is inside this window. */
    from: IsoTime.optional(),
    to: IsoTime.optional(),
    /** Why this cue here — read by people, not by the player. */
    note: z.string().optional(),
  })
  .superRefine((e, ctx) => {
    const named = e.cue !== undefined;
    const silent = e.silence === true;
    if (named === silent)
      ctx.addIssue({
        code: 'custom',
        message: 'an entry names a cue or declares silence: true, exactly one',
      });
    if ((e.from === undefined) !== (e.to === undefined))
      ctx.addIssue({ code: 'custom', message: 'from and to go together' });
    if (e.from && e.to && Date.parse(e.from) >= Date.parse(e.to))
      ctx.addIssue({ code: 'custom', message: 'to must be after from' });
    if (!e.opening && !e.focus && !e.from && !e.branch && !e.vignette)
      ctx.addIssue({
        code: 'custom',
        message:
          'an entry needs something to match on: opening, branch, focus, vignette, or from/to',
      });
    if (e.vignette && e.silence)
      ctx.addIssue({ code: 'custom', message: 'a vignette entry names a bed; it cannot be silence' });
  });

export type ScoreEntry = z.infer<typeof ScoreEntry>;
export type Side = z.infer<typeof Side>;
export type Branch = z.infer<typeof Branch>;
export type Opening = z.infer<typeof Opening>;
export type PaceBand = z.infer<typeof PaceBand>;
export type PaceTable = z.infer<typeof PaceTable>;
export type Pack = z.infer<typeof Pack>;
export type Formation = z.infer<typeof Formation>;
export type Waypoint = z.infer<typeof Waypoint>;
export type MovementMode = z.infer<typeof MovementMode>;
export type Route = z.infer<typeof Route>;
export type PersonTrack = z.infer<typeof PersonTrack>;
export type Event = z.infer<typeof Event>;
export type Battle = z.infer<typeof Battle>;
export type DecisionPoint = z.infer<typeof DecisionPoint>;
export type TechField = z.infer<typeof TechField>;
export type TechCard = z.infer<typeof TechCard>;
export type ScienceField = z.infer<typeof ScienceField>;
export type ScienceCard = z.infer<typeof ScienceCard>;
export type Document = z.infer<typeof Document>;
export type Position = z.infer<typeof Position>;
export type Historiography = z.infer<typeof Historiography>;
export type CausalLink = z.infer<typeof CausalLink>;
export type BeatFrontMatter = z.infer<typeof BeatFrontMatter>;
export type NarrativeBeat = z.infer<typeof NarrativeBeat>;
export type Thread = z.infer<typeof Thread>;
export type TourStep = z.infer<typeof TourStep>;
export type Tour = z.infer<typeof Tour>;
