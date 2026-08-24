/**
 * Pack validator — the rules a schema cannot express.
 *
 * Pass 1 parses every file against the Zod schemas and indexes every entity
 * id. Pass 2 checks referential integrity (every id resolves, in this pack,
 * in shared/, or — for causal links and threads — in any pack), time ordering
 * and containment, branch semantics (ADR 0005), beat coverage, required
 * citations and the imagery policy. Errors fail CI; warnings are printed.
 *
 * Pure: no filesystem. `scripts/validate-content.ts` feeds it the tree.
 */
import type { ZodType } from 'zod';
import { entityLinksIn } from '../../engine/entity-links.js';
import {
  type Battle,
  type Branch,
  type CausalLink,
  type Citation,
  type DecisionPoint,
  type Document,
  type Event,
  type Formation,
  type Links,
  Cue,
  type Cue as CueT,
  type ScoreEntry as ScoreEntryT,
  Media,
  type Media as MediaT,
  type NarrativeBeat,
  Pack,
  type Pack as PackT,
  PACK_COLLECTIONS,
  type PackCollectionFile,
  type Person,
  type Place,
  type PlateSet,
  type Route,
  type ScienceCard,
  SHARED_COLLECTIONS,
  type SharedCollectionFile,
  type Source,
  type TechCard,
  Thread,
  type Thread as ThreadT,
  type TimeRange,
  BeatFrontMatter,
  type CastEntry,
  type CasualtyRecord,
  type SupplyLine,
  type Tally,
  type Timetable,
  type PersonTrack as PersonTrackT,
  type Tour,
  type Vignette,
} from '../schema/index.js';
import { footnoteLabels, splitFrontMatter } from './frontmatter.js';
import { paceFindings, paceMessage } from './pace.js';
import type { RawContent, RawFile, RawPack } from './tree.js';

// ------------------------------------------------------------------ report

export type Level = 'error' | 'warning';

export interface Problem {
  level: Level;
  /** File the problem was found in (relative to content/). */
  path: string;
  /** Entity id, when known. */
  id?: string;
  message: string;
}

export interface ParsedPack {
  dir: string;
  pack: PackT;
  formations: Formation[];
  routes: Route[];
  events: Event[];
  battles: Battle[];
  decisions: DecisionPoint[];
  tech: TechCard[];
  science: ScienceCard[];
  documents: Document[];
  links: CausalLink[];
  sources: Source[];
  cast: CastEntry[];
  clocks: Timetable[];
  tallies: Tally[];
  supply: SupplyLine[];
  casualties: CasualtyRecord[];
  vignettes: Vignette[];
  tours: Tour[];
  tracks: PersonTrackT[];
  score: ScoreEntryT[];
  beats: NarrativeBeat[];
  /** Stems of diagrams/*.svg, and the text, for the beats that inline them. */
  diagrams: Map<string, string>;
}

export interface ParsedContent {
  packs: ParsedPack[];
  shared: {
    people: Person[];
    places: Place[];
    sources: Source[];
    media: MediaT[];
    audio: CueT[];
  };
  threads: ThreadT[];
}

export interface Report {
  ok: boolean;
  errors: Problem[];
  warnings: Problem[];
  /** Parsed content — complete only when there are no schema errors. */
  content: ParsedContent;
  counts: Record<string, number>;
}

// ------------------------------------------------------------------- index

type Kind =
  | 'pack'
  | 'cast'
  | 'clock'
  | 'tally'
  | 'supply'
  | 'casualties'
  | 'vignette'
  | 'tour'
  | 'track'
  | 'branch'
  | 'formation'
  | 'route'
  | 'event'
  | 'battle'
  | 'decision'
  | 'tech'
  | 'science'
  | 'document'
  | 'link'
  | 'source'
  | 'beat'
  | 'person'
  | 'place'
  | 'media'
  | 'cue'
  | 'score'
  | 'thread';

interface IndexEntry {
  kind: Kind;
  path: string;
  /** Pack dir for pack-scoped entities; undefined for shared. */
  pack?: string;
  /** Battle id for battle-level sub-entities. */
  battle?: string;
}

class Ctx {
  readonly errors: Problem[] = [];
  readonly warnings: Problem[] = [];
  readonly index = new Map<string, IndexEntry>();

  error(path: string, message: string, id?: string) {
    this.errors.push(
      id ? { level: 'error', path, id, message } : { level: 'error', path, message },
    );
  }
  warn(path: string, message: string, id?: string) {
    this.warnings.push(
      id ? { level: 'warning', path, id, message } : { level: 'warning', path, message },
    );
  }

  /** Register an id; duplicates anywhere in content/ are errors. */
  register(id: string, entry: IndexEntry) {
    const prev = this.index.get(id);
    if (prev) {
      this.error(entry.path, `duplicate id ${id} (also defined in ${prev.path})`, id);
      return;
    }
    this.index.set(id, entry);
  }

  /** Assert `id` resolves to one of `kinds`; returns the entry or undefined. */
  ref(
    path: string,
    owner: string,
    id: string,
    kinds: Kind[],
    what: string,
    level: Level = 'error',
  ) {
    const entry = this.index.get(id);
    if (!entry) {
      this[level === 'error' ? 'error' : 'warn'](path, `${what} ${id} does not exist`, owner);
      return undefined;
    }
    if (!kinds.includes(entry.kind)) {
      this.error(path, `${what} ${id} is a ${entry.kind}, expected ${kinds.join('|')}`, owner);
      return undefined;
    }
    return entry;
  }
}

// ----------------------------------------------------------------- helpers

function parseWith<T>(ctx: Ctx, schema: ZodType<T>, file: RawFile, label: string): T | undefined {
  const r = schema.safeParse(file.data);
  if (r.success) return r.data;
  for (const issue of r.error.issues) {
    const at = issue.path.length ? issue.path.map(String).join('.') : '(root)';
    ctx.error(file.path, `${label}: ${at}: ${issue.message}`);
  }
  return undefined;
}

const t = (iso: string) => Date.parse(iso);

function within(range: TimeRange, iso: string) {
  const x = t(iso);
  return x >= t(range.start) && x <= t(range.end);
}

function checkRange(ctx: Ctx, path: string, id: string, range: TimeRange, what = 'timeRange') {
  if (!(t(range.start) < t(range.end)))
    ctx.error(path, `${what}.start must precede ${what}.end`, id);
}

/**
 * docs/sources.md §8: Wikipedia carries reference data — a person's dates, a
 * place's coordinates — and never an operational claim. The shared people and
 * place registries are where reference data lives, so a citation to it there
 * is in order; anywhere else it is standing in front of a strength, a
 * position, a time of day or a casualty figure, and owes the reader a real
 * source. A warning, not an error: the standard admits the pointer "until a
 * better reference replaces it". The 1914 pack now carries none — the last of
 * them, the twelve forts of Liège, went to Reichsarchiv Bd. 1 pp. 105–120 in
 * sand-23b.5, after the sand-1l0.16 pass.
 */
const REFERENCE_ONLY_SOURCE = 'source:wikipedia-en';
const REFERENCE_REGISTRIES = /(?:^|\/)(?:people|places)\.json$/;

function checkCitations(
  ctx: Ctx,
  path: string,
  id: string,
  citations: Citation[] | undefined,
  required: boolean,
  what = 'sources',
) {
  if (required && (!citations || citations.length === 0)) {
    ctx.error(path, `${what}: at least one citation is required`, id);
  }
  for (const c of citations ?? []) {
    ctx.ref(path, id, c.source, ['source'], `${what}: citation`);
    if (c.source === REFERENCE_ONLY_SOURCE && !REFERENCE_REGISTRIES.test(path)) {
      ctx.warn(
        path,
        `${what}: ${REFERENCE_ONLY_SOURCE} is reference data only — an operational claim needs a source from the hierarchy of evidence (docs/sources.md §8)`,
        id,
      );
    }
  }
}

const LINK_KINDS: Record<keyof Links, Kind[]> = {
  people: ['person'],
  formations: ['formation'],
  places: ['place'],
  events: ['event'],
  battles: ['battle'],
  tech: ['tech'],
  science: ['science'],
  documents: ['document'],
  casualties: ['casualties'],
  media: ['media'],
};

function checkLinks(ctx: Ctx, path: string, id: string, links: Links | undefined) {
  if (!links) return;
  for (const key of Object.keys(links) as (keyof Links)[]) {
    for (const target of links[key] ?? [])
      ctx.ref(path, id, target, LINK_KINDS[key], `links.${key}`);
  }
}

function checkIds(
  ctx: Ctx,
  path: string,
  ids: string[] | undefined,
  owner: string,
  kinds: Kind[],
  what: string,
) {
  for (const id of ids ?? []) ctx.ref(path, owner, id, kinds, what);
}

// ------------------------------------------------------------------- pass 1

interface PackState extends ParsedPack {
  files: Record<string, string>; // collection → path
  branchById: Map<string, Branch>;
  historical?: Branch | undefined;
}

function parseShared(ctx: Ctx, raw: RawContent): ParsedContent['shared'] {
  const shared: ParsedContent['shared'] = {
    people: [],
    places: [],
    sources: [],
    media: [],
    audio: [],
  };
  for (const [file, schema] of Object.entries(SHARED_COLLECTIONS) as [
    SharedCollectionFile,
    ZodType,
  ][]) {
    const f = raw.shared.collections[file];
    if (!f) continue;
    const items = parseWith(ctx, schema.array(), f, file) as unknown[] | undefined;
    if (!items) continue;
    const kind: Kind = file.startsWith('people')
      ? 'person'
      : file.startsWith('places')
        ? 'place'
        : 'source';
    for (const item of items as { id: string }[]) ctx.register(item.id, { kind, path: f.path });
    if (kind === 'person') shared.people = items as Person[];
    else if (kind === 'place') shared.places = items as Place[];
    else shared.sources = items as Source[];
  }
  for (const f of raw.shared.media) {
    const m = parseWith(ctx, Media, f, 'media.json');
    if (!m) continue;
    ctx.register(m.id, { kind: 'media', path: f.path });
    shared.media.push(m);
  }
  for (const f of raw.shared.audio ?? []) {
    const c = parseWith(ctx, Cue, f, 'cue.json');
    if (!c) continue;
    ctx.register(c.id, { kind: 'cue', path: f.path });
    shared.audio.push(c);
  }
  return shared;
}

function parsePack(ctx: Ctx, raw: RawPack): PackState | undefined {
  const pack = parseWith(ctx, Pack, raw.pack, 'pack.json');
  if (!pack) return undefined;
  const state: PackState = {
    dir: raw.dir,
    pack,
    formations: [],
    routes: [],
    events: [],
    battles: [],
    decisions: [],
    tech: [],
    science: [],
    documents: [],
    links: [],
    sources: [],
    cast: [],
    clocks: [],
    tallies: [],
    supply: [],
    casualties: [],
    vignettes: [],
    tours: [],
    tracks: [],
    score: [],
    beats: [],
    diagrams: new Map(
      (raw.diagrams ?? []).map((f) => [
        (f.path.split('/').pop() ?? '').replace(/\.svg$/, ''),
        typeof f.data === 'string' ? f.data : '',
      ]),
    ),
    files: {},
    branchById: new Map(),
  };
  ctx.register(pack.id, { kind: 'pack', path: raw.pack.path, pack: raw.dir });
  for (const b of pack.branches) {
    ctx.register(b.id, { kind: 'branch', path: raw.pack.path, pack: raw.dir });
    state.branchById.set(b.id, b);
  }

  const kindOf: Record<PackCollectionFile, Kind> = {
    'formations.json': 'formation',
    'routes.json': 'route',
    'events.json': 'event',
    'battles.json': 'battle',
    'decisions.json': 'decision',
    'tech.json': 'tech',
    'science.json': 'science',
    'documents.json': 'document',
    'links.json': 'link',
    'sources.json': 'source',
    'cast.json': 'cast',
    'clocks.json': 'clock',
    'tallies.json': 'tally',
    'supply.json': 'supply',
    'casualties.json': 'casualties',
    'vignettes.json': 'vignette',
    'tours.json': 'tour',
    'tracks.json': 'track',
    'score.json': 'score',
  };
  for (const [file, schema] of Object.entries(PACK_COLLECTIONS) as [
    PackCollectionFile,
    ZodType,
  ][]) {
    const f = raw.collections[file];
    if (!f) continue;
    state.files[file] = f.path;
    const items = parseWith(ctx, schema.array(), f, file) as { id: string }[] | undefined;
    if (!items) continue;
    const kind = kindOf[file];
    // Score entries are anonymous — they say when a cue plays, they are not
    // themselves referable.
    for (const item of items)
      if (item.id) ctx.register(item.id, { kind, path: f.path, pack: raw.dir });
    const key = file.replace('.json', '') as keyof ParsedPack;
    (state as unknown as Record<string, unknown>)[key] = items;
    if (kind === 'battle') {
      for (const b of items as Battle[]) {
        for (const x of b.formations ?? [])
          ctx.register(x.id, { kind: 'formation', path: f.path, pack: raw.dir, battle: b.id });
        for (const x of b.routes ?? [])
          ctx.register(x.id, { kind: 'route', path: f.path, pack: raw.dir, battle: b.id });
        for (const x of b.events ?? [])
          ctx.register(x.id, { kind: 'event', path: f.path, pack: raw.dir, battle: b.id });
      }
    }
  }
  for (const unknownFile of Object.keys(raw.collections)) {
    if (!(unknownFile in PACK_COLLECTIONS))
      ctx.warn(raw.collections[unknownFile]!.path, `unknown pack file ${unknownFile} is ignored`);
  }

  for (const f of raw.beats) {
    if (typeof f.data !== 'string') {
      ctx.error(f.path, 'beat must be Markdown text');
      continue;
    }
    const split = splitFrontMatter(f.data);
    if (!split) {
      ctx.error(f.path, 'beat needs YAML front matter between --- lines');
      continue;
    }
    const fm = parseWith(ctx, BeatFrontMatter, { path: f.path, data: split.data }, 'front matter');
    if (!fm) continue;
    if (!split.body) {
      ctx.error(f.path, 'beat body is empty', fm.id);
      continue;
    }
    ctx.register(fm.id, { kind: 'beat', path: f.path, pack: raw.dir });
    state.beats.push({ ...fm, body: split.body, file: f.path });
  }
  return state;
}

// ------------------------------------------------------------------- pass 2

function checkPack(ctx: Ctx, s: PackState, allPrefixes: Map<string, string>) {
  const { pack } = s;
  const path = `eras/${s.dir}/pack.json`;
  const prefix = `${pack.idPrefix}:`;

  checkRange(ctx, path, pack.id, pack.timeRange);
  if (!pack.id.startsWith(prefix)) ctx.error(path, `pack id must start with "${prefix}"`, pack.id);
  const other = allPrefixes.get(pack.idPrefix);
  if (other && other !== s.dir)
    ctx.error(path, `idPrefix "${pack.idPrefix}" is also used by ${other}`, pack.id);
  allPrefixes.set(pack.idPrefix, s.dir);

  const sideIds = new Set<string>();
  for (const side of pack.sides) {
    if (sideIds.has(side.id)) ctx.error(path, `duplicate side ${side.id}`, pack.id);
    sideIds.add(side.id);
  }

  const historical = pack.branches.filter((b) => b.kind === 'historical');
  if (historical.length !== 1)
    ctx.error(
      path,
      `exactly one historical branch is required (found ${historical.length})`,
      pack.id,
    );
  s.historical = historical[0];
  if (!s.branchById.has(pack.defaultBranch))
    ctx.error(path, `defaultBranch ${pack.defaultBranch} is not one of branches[]`, pack.id);
  for (const b of pack.branches) {
    if (b.kind === 'counterfactual') {
      if (!b.divergesAt) ctx.error(path, 'counterfactual branch needs divergesAt', b.id);
      else if (!within(pack.timeRange, b.divergesAt))
        ctx.error(path, 'divergesAt is outside the pack timeRange', b.id);
    } else if (b.divergesAt) ctx.error(path, 'historical branch must not set divergesAt', b.id);
    checkCitations(ctx, path, b.id, b.sources, false);
    for (const f of b.feasibility ?? [])
      checkCitations(ctx, path, b.id, f.sources, false, 'feasibility.sources');
  }
  checkCitations(ctx, path, pack.id, pack.sources, false);
  checkOpening(ctx, path, pack);

  // every pack-scoped id carries the prefix
  for (const [id, entry] of ctx.index) {
    if (entry.pack === s.dir && entry.kind !== 'pack' && !id.startsWith(prefix)) {
      ctx.error(entry.path, `id must start with "${prefix}" (pack idPrefix)`, id);
    }
  }
  return { path, sideIds };
}

/**
 * Resolve an entity's `branch`. Absent = every branch. For routes the
 * historical branch is the base and may not be named; beats and events may
 * name it to mean "historical only, after the divergence".
 */
function checkBranchRef(
  ctx: Ctx,
  s: PackState,
  path: string,
  id: string,
  branch: string | undefined,
  allowHistorical: boolean,
) {
  if (!branch) return undefined;
  const b = s.branchById.get(branch);
  if (!b) {
    ctx.error(path, `branch ${branch} is not defined in pack.json`, id);
    return undefined;
  }
  if (b.kind === 'historical' && !allowHistorical)
    ctx.error(
      path,
      `omit "branch" for the historical branch (${branch}); the base route is historical`,
      id,
    );
  return b;
}

function checkFormation(
  ctx: Ctx,
  s: PackState,
  path: string,
  f: Formation,
  sideIds: Set<string>,
  scope?: Battle,
) {
  if (!sideIds.has(f.side)) ctx.error(path, `side "${f.side}" is not one of pack.sides`, f.id);
  if (f.commander) ctx.ref(path, f.id, f.commander, ['person'], 'commander');
  if (f.parent) {
    const p = ctx.ref(path, f.id, f.parent, ['formation'], 'parent');
    if (p && p.pack !== s.dir) ctx.error(path, `parent ${f.parent} belongs to another pack`, f.id);
    if (f.parent === f.id) ctx.error(path, 'formation cannot be its own parent', f.id);
  }
  checkIds(ctx, path, f.media, f.id, ['media'], 'media');
  checkPlateSet(ctx, path, f.id, f.plates);
  checkCitations(ctx, path, f.id, f.sources, false);
  checkCitations(ctx, path, f.id, f.strength?.sources, false, 'strength.sources');
  if (f.dissolved) {
    const range = scope?.timeRange ?? s.pack.timeRange;
    if (!within(range, f.dissolved))
      ctx.error(
        path,
        `dissolved (${f.dissolved}) is outside the ${scope ? 'battle' : 'pack'} timeRange`,
        f.id,
      );
    if (f.concentration?.asOf && t(f.dissolved) <= t(f.concentration.asOf))
      ctx.error(path, 'dissolved must be later than concentration.asOf', f.id);
  }
  if (f.concentration) {
    const c = f.concentration;
    checkCitations(ctx, path, f.id, c.sources, false, 'concentration.sources');
    const range = scope?.timeRange ?? s.pack.timeRange;
    if (c.asOf && !within(range, c.asOf))
      ctx.error(
        path,
        `concentration.asOf (${c.asOf}) is outside the ${scope ? 'battle' : 'pack'} timeRange`,
        f.id,
      );
    const [w, so, e, n] = scope?.region ?? s.pack.region;
    if (c.position) {
      const [x, y] = c.position;
      if (x < w || x > e || y < so || y > n)
        ctx.warn(
          path,
          `concentration.position [${x}, ${y}] is outside the ${scope ? 'battle' : 'pack'} region`,
          f.id,
        );
    }
  }
}

function checkRoute(
  ctx: Ctx,
  s: PackState,
  path: string,
  r: Route,
  range: TimeRange,
  scope?: Battle,
) {
  const fe = ctx.ref(path, r.id, r.formation, ['formation'], 'formation');
  if (fe && fe.pack !== s.dir)
    ctx.error(path, `formation ${r.formation} belongs to another pack`, r.id);
  if (fe && scope && fe.battle && fe.battle !== scope.id)
    ctx.error(path, `formation ${r.formation} belongs to another battle`, r.id);
  if (fe && !scope && fe.battle)
    ctx.error(path, `campaign route cannot use battle-level formation ${r.formation}`, r.id);

  const branch = checkBranchRef(ctx, s, path, r.id, r.branch, false);
  let prev = -Infinity;
  r.waypoints.forEach((w, i) => {
    const at = t(w[2]);
    if (!(at > prev))
      ctx.error(path, `waypoints[${i}] is not later than the previous waypoint`, r.id);
    prev = at;
    if (!within(range, w[2]))
      ctx.error(
        path,
        `waypoints[${i}] (${w[2]}) is outside the ${scope ? 'battle' : 'pack'} timeRange`,
        r.id,
      );
  });
  if (branch?.divergesAt && r.waypoints[0] && t(r.waypoints[0][2]) < t(branch.divergesAt)) {
    ctx.error(
      path,
      `branch route starts before the branch diverges (${branch.divergesAt}); only waypoints after divergence belong here`,
      r.id,
    );
  }
  // nothing teleports: every leg is held to the pace of its own mode
  const mode = r.mode ?? 'march';
  for (const f of paceFindings(r.waypoints, mode))
    ctx[f.level === 'error' ? 'error' : 'warn'](path, paceMessage(f, mode), r.id);
  checkCitations(ctx, path, r.id, r.sources, true);
}

/**
 * A formation's route may be written in legs, one per mode — march, then the
 * train west, then march again — and the engine concatenates them into one
 * path. So the legs must meet: each begins at the instant and the place the
 * one before it ended. A gap would draw a line nobody sourced across it, and
 * an overlap would put the formation in two places at once.
 */
function checkRouteLegs(ctx: Ctx, path: string, routes: Route[]) {
  const byFormation = new Map<string, Route[]>();
  for (const r of routes) {
    const key = `${r.formation}|${r.branch ?? ''}`;
    const legs = byFormation.get(key);
    if (legs) legs.push(r);
    else byFormation.set(key, [r]);
  }
  for (const [key, legs] of byFormation) {
    if (legs.length < 2) continue;
    const [formation, branch] = key.split('|') as [string, string];
    const where = branch ? `branch ${branch}` : 'the historical branch';
    const ordered = [...legs].sort((a, b) => t(a.waypoints[0]![2]) - t(b.waypoints[0]![2]));
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1]!;
      const next = ordered[i]!;
      const end = prev.waypoints[prev.waypoints.length - 1]!;
      const start = next.waypoints[0]!;
      if (t(start[2]) === t(end[2]) && start[0] === end[0] && start[1] === end[1]) continue;
      ctx.error(
        path,
        `does not join ${prev.id}, the previous leg of ${formation} in ${where}: that leg ends at [${end[0]}, ${end[1]}] on ${end[2]} and this one starts at [${start[0]}, ${start[1]}] on ${start[2]}. Legs of one route must meet — write the movement between them as a leg of its own, with the mode that carried it`,
        next.id,
      );
    }
  }
}

function checkEvent(
  ctx: Ctx,
  s: PackState,
  path: string,
  e: Event,
  range: TimeRange,
  scope?: Battle,
) {
  if (!e.at && !e.timeRange) ctx.error(path, 'event needs "at" or "timeRange"', e.id);
  if (e.at && e.timeRange) ctx.error(path, 'event has both "at" and "timeRange"; use one', e.id);
  if (e.at && !within(range, e.at))
    ctx.error(path, `at (${e.at}) is outside the ${scope ? 'battle' : 'pack'} timeRange`, e.id);
  if (e.timeRange) {
    checkRange(ctx, path, e.id, e.timeRange);
    if (!within(range, e.timeRange.start) || !within(range, e.timeRange.end))
      ctx.error(path, `timeRange is outside the ${scope ? 'battle' : 'pack'} timeRange`, e.id);
  }
  checkBranchRef(ctx, s, path, e.id, e.branch, true);
  if (e.place) ctx.ref(path, e.id, e.place, ['place'], 'place');
  checkLinks(ctx, path, e.id, e.links);
  checkCitations(ctx, path, e.id, e.sources, true);
}

function checkBattle(ctx: Ctx, s: PackState, path: string, b: Battle, sideIds: Set<string>) {
  checkRange(ctx, path, b.id, b.timeRange);
  if (!within(s.pack.timeRange, b.timeRange.start) || !within(s.pack.timeRange, b.timeRange.end))
    ctx.error(path, 'battle timeRange is outside the pack timeRange', b.id);
  const [w, so, e, n] = b.region;
  if (!(w < e && so < n))
    ctx.error(
      path,
      'region must be [west, south, east, north] with west < east and south < north',
      b.id,
    );
  if (b.place) ctx.ref(path, b.id, b.place, ['place'], 'place');
  for (const p of b.participants ?? []) {
    const fe = ctx.ref(path, b.id, p, ['formation'], 'participants');
    if (fe?.battle)
      ctx.error(
        path,
        `participants must be campaign-level formations (${p} is battle-level)`,
        b.id,
      );
  }
  for (const f of b.formations ?? []) checkFormation(ctx, s, path, f, sideIds, b);
  for (const r of b.routes ?? []) checkRoute(ctx, s, path, r, b.timeRange, b);
  checkRouteLegs(ctx, path, b.routes ?? []);
  for (const ev of b.events ?? []) checkEvent(ctx, s, path, ev, b.timeRange, b);
  checkLinks(ctx, path, b.id, b.links);
  checkCitations(ctx, path, b.id, b.sources, true);
}

function checkDecision(ctx: Ctx, s: PackState, path: string, d: DecisionPoint) {
  if (!within(s.pack.timeRange, d.at)) ctx.error(path, 'at is outside the pack timeRange', d.id);
  if (d.actor) ctx.ref(path, d.id, d.actor, ['person'], 'actor');
  const optionIds = new Set<string>();
  for (const o of d.options) {
    if (optionIds.has(o.id)) ctx.error(path, `duplicate option id ${o.id}`, d.id);
    optionIds.add(o.id);
    if (o.branch) {
      const b = s.branchById.get(o.branch);
      if (!b)
        ctx.error(path, `option ${o.id}: branch ${o.branch} is not defined in pack.json`, d.id);
    }
  }
  if (!optionIds.has(d.historical))
    ctx.error(path, `historical option "${d.historical}" is not one of options[]`, d.id);
  checkLinks(ctx, path, d.id, d.links);
  checkCitations(ctx, path, d.id, d.sources, true);
  checkProseLinks(ctx, path, d.id, d.reasoning, 'reasoning');
  checkProseLinks(ctx, path, d.id, d.verdict, 'verdict');
  for (const o of d.options) checkProseLinks(ctx, path, d.id, o.summary, `option ${o.id}`);
}

/**
 * A plate set (ADR 0014). The count is the schema's — two at least, four at
 * most — because the cap is the decision and a cap in one place is a cap. The
 * rules here are the ones that make the set a comparison rather than a strip
 * of pictures that happen to be on the same card: every plate is a real
 * image, no image appears twice, and no two plates claim the same point on
 * the axis. A set that fails any of them still renders; it just compares
 * nothing.
 */
function checkPlateSet(ctx: Ctx, path: string, id: string, set: PlateSet | undefined) {
  if (!set) return;
  const seen = new Map<string, number>();
  const labels = new Map<string, number>();
  set.items.forEach((item, i) => {
    ctx.ref(path, id, item.media, ['media'], `plates.items[${i}].media`);
    const first = seen.get(item.media);
    if (first !== undefined)
      ctx.error(
        path,
        `plates: ${item.media} appears twice (items[${first}] and items[${i}]) — a picture compared with itself is not a comparison`,
        id,
      );
    else seen.set(item.media, i);
    const key = item.label.trim().toLowerCase();
    const firstLabel = labels.get(key);
    if (firstLabel !== undefined)
      ctx.error(
        path,
        `plates: two plates are labelled "${item.label}" (items[${firstLabel}] and items[${i}]) — each is one point on the axis`,
        id,
      );
    else labels.set(key, i);
  });
}

function checkCard(ctx: Ctx, path: string, c: TechCard | ScienceCard | Document) {
  if ('counter' in c && c.counter) ctx.ref(path, c.id, c.counter, ['tech'], 'counter');
  if ('plates' in c) checkPlateSet(ctx, path, c.id, c.plates);
  if ('people' in c) checkIds(ctx, path, c.people, c.id, ['person'], 'people');
  if ('media' in c) checkIds(ctx, path, c.media, c.id, ['media'], 'media');
  if ('author' in c && c.author.includes(':')) ctx.ref(path, c.id, c.author, ['person'], 'author');
  checkLinks(ctx, path, c.id, c.links);
  checkCitations(ctx, path, c.id, c.sources, true);
  if ('body' in c) checkProseLinks(ctx, path, c.id, c.body, 'body');
  if ('summary' in c) checkProseLinks(ctx, path, c.id, c.summary, 'summary');
}

function checkCast(ctx: Ctx, path: string, c: CastEntry, sideIds: Set<string>) {
  ctx.ref(path, c.id, c.person, ['person'], 'person');
  if (c.side && !sideIds.has(c.side)) ctx.error(path, `side ${c.side} is not a pack side`, c.id);
  checkCitations(ctx, path, c.id, c.sources, true);
  const slugs = new Set(c.sources.map((x) => x.source.split(':')[1] ?? x.source));
  for (const m of c.bio.matchAll(/\[\^([^\]\s]+)\]/g)) {
    if (!slugs.has(m[1]!))
      ctx.error(path, `bio footnote [^${m[1]}] is not one of the entry's sources`, c.id);
  }
  checkProseLinks(ctx, path, c.id, c.bio, 'bio');
}

function checkClock(ctx: Ctx, path: string, c: Timetable) {
  const ids = new Set<string>();
  for (const m of c.milestones) {
    if (ids.has(m.id)) ctx.error(path, `duplicate milestone id ${m.id}`, c.id);
    ids.add(m.id);
    if (m.plannedDay === undefined && !m.actualAt)
      ctx.error(path, `milestone ${m.id} needs a plannedDay or an actualAt`, c.id);
    if (m.actualAt && t(m.actualAt) < t(c.origin))
      ctx.error(path, `milestone ${m.id}: actualAt is before the timetable origin`, c.id);
    if (m.place) ctx.ref(path, c.id, m.place, ['place'], `milestone ${m.id} place`);
    checkCitations(ctx, path, c.id, m.sources, false, `milestone ${m.id} sources`);
  }
  checkCitations(ctx, path, c.id, c.sources, true);
  const slugs = new Set(c.sources.map((x) => x.source.split(':')[1] ?? x.source));
  for (const m of c.assumption.matchAll(/\[\^([^\]\s]+)\]/g)) {
    if (!slugs.has(m[1]!))
      ctx.error(path, `assumption footnote [^${m[1]}] is not one of the timetable's sources`, c.id);
  }
}

function checkTally(ctx: Ctx, s: PackState, path: string, c: Tally) {
  const range = s.pack.timeRange;
  if (!within(range, c.start.asOf))
    ctx.error(path, 'start.asOf is outside the pack timeRange', c.id);
  checkCitations(ctx, path, c.id, c.start.sources, false, 'start.sources');
  const ids = new Set<string>();
  let prev = -Infinity;
  for (const e of c.entries) {
    if (ids.has(e.id)) ctx.error(path, `duplicate entry id ${e.id}`, c.id);
    ids.add(e.id);
    const at = t(e.at);
    if (!(at >= prev)) ctx.error(path, `entry ${e.id} is earlier than the previous entry`, c.id);
    prev = at;
    if (!within(range, e.at))
      ctx.error(path, `entry ${e.id}: at is outside the pack timeRange`, c.id);
    checkIds(ctx, path, e.formations, c.id, ['formation'], `entry ${e.id} formations`);
    if (e.place) ctx.ref(path, c.id, e.place, ['place'], `entry ${e.id} place`);
    checkCitations(ctx, path, c.id, e.sources, false, `entry ${e.id} sources`);
  }
  for (const cmp of c.comparisons ?? []) {
    if (cmp.a < 0 || cmp.b < 0)
      ctx.error(path, `comparison ${cmp.id}: quantities must be >= 0`, c.id);
    checkCitations(ctx, path, c.id, cmp.sources, false, `comparison ${cmp.id} sources`);
  }
  checkCitations(ctx, path, c.id, c.sources, true);
  if (c.summary) {
    const slugs = new Set(c.sources.map((x) => x.source.split(':')[1] ?? x.source));
    for (const m of c.summary.matchAll(/\[\^([^\]\s]+)\]/g)) {
      if (!slugs.has(m[1]!))
        ctx.error(path, `summary footnote [^${m[1]}] is not one of the tally's sources`, c.id);
    }
  }
}

function checkSupply(ctx: Ctx, s: PackState, path: string, c: SupplyLine) {
  const army = ctx.ref(path, c.id, c.army, ['formation'], 'army');
  const railhead = ctx.ref(path, c.id, c.railhead, ['formation'], 'railhead');
  for (const [what, fe, id] of [
    ['army', army, c.army],
    ['railhead', railhead, c.railhead],
  ] as const) {
    if (fe && fe.pack !== s.dir) ctx.error(path, `${what} ${id} belongs to another pack`, c.id);
    if (fe && !s.routes.some((r) => r.formation === id && !r.branch))
      ctx.error(path, `${what} ${id} has no historical route to measure`, c.id);
  }
  checkCitations(ctx, path, c.id, c.sources, true);
  if (c.summary) {
    const slugs = new Set(c.sources.map((x) => x.source.split(':')[1] ?? x.source));
    for (const m of c.summary.matchAll(/\[\^([^\]\s]+)\]/g)) {
      if (!slugs.has(m[1]!))
        ctx.error(
          path,
          `summary footnote [^${m[1]}] is not one of the supply line's sources`,
          c.id,
        );
    }
  }
}

function checkFootnotes(
  ctx: Ctx,
  path: string,
  id: string,
  text: string | undefined,
  sources: { source: string }[],
  what: string,
) {
  if (!text) return;
  const slugs = new Set(sources.map((x) => x.source.split(':')[1] ?? x.source));
  for (const m of text.matchAll(/\[\^([^\]\s]+)\]/g)) {
    if (!slugs.has(m[1]!))
      ctx.error(path, `${what} footnote [^${m[1]}] is not one of the entity's sources`, id);
  }
}

/**
 * Entity links in prose (sand-1l0.29): `[Joffre](person:joffre-joseph)` opens
 * a card, so a target that does not exist is a link the reader can click and
 * get nothing from.
 */
function checkProseLinks(
  ctx: Ctx,
  path: string,
  id: string,
  text: string | undefined,
  what: string,
) {
  if (!text) return;
  for (const target of entityLinksIn(text)) {
    if (!ctx.index.has(target)) ctx.error(path, `${what} link ${target} does not exist`, id);
  }
}

/**
 * A picture in the prose (ADR 0012). Markdown image syntax renders an <img>
 * with no caption, no credit and no colorized label — everything ADR 0007
 * requires — and it is the second picture a beat is not allowed. Pictures
 * arrive through the `media` slot, which renders all three.
 */
function checkNoInlineImage(ctx: Ctx, path: string, id: string, text: string, what: string) {
  if (/!\[[^\]]*\]\(/.test(text))
    ctx.error(
      path,
      `${what} embeds an image — a picture belongs in the media slot, which renders its caption and credit`,
      id,
    );
}

function checkCasualties(
  ctx: Ctx,
  s: PackState,
  path: string,
  c: CasualtyRecord,
  sideIds: Set<string>,
) {
  const range = s.pack.timeRange;
  checkRange(ctx, path, c.id, c.timeRange);
  if (!within(range, c.timeRange.start) || !within(range, c.timeRange.end))
    ctx.error(path, 'timeRange is outside the pack timeRange', c.id);
  if (c.battle) {
    const b = ctx.ref(path, c.id, c.battle, ['battle'], 'battle');
    if (b && b.pack !== s.dir) ctx.error(path, `battle ${c.battle} belongs to another pack`, c.id);
  }
  if (c.event) ctx.ref(path, c.id, c.event, ['event'], 'event');
  if (c.place) ctx.ref(path, c.id, c.place, ['place'], 'place');
  c.figures.forEach((f, i) => {
    if (!sideIds.has(f.side))
      ctx.error(path, `figures[${i}]: side ${f.side} is not a pack side`, c.id);
    checkCitations(ctx, path, c.id, f.sources, false, `figures[${i}] sources`);
  });
  checkLinks(ctx, path, c.id, c.links);
  checkCitations(ctx, path, c.id, c.sources, true);
  checkFootnotes(ctx, path, c.id, c.summary, c.sources, 'summary');
  checkFootnotes(ctx, path, c.id, c.historiography, c.sources, 'historiography');
}

function checkVignette(ctx: Ctx, s: PackState, path: string, v: Vignette) {
  if (!within(s.pack.timeRange, v.at)) ctx.error(path, 'at is outside the pack timeRange', v.id);
  checkBranchRef(ctx, s, path, v.id, v.branch, true);
  if (v.place) ctx.ref(path, v.id, v.place, ['place'], 'place');
  checkIds(ctx, path, v.people, v.id, ['person'], 'people');
  checkLinks(ctx, path, v.id, v.links);
  checkCitations(ctx, path, v.id, v.sources, true);
  checkFootnotes(ctx, path, v.id, v.text, v.sources, 'text');
  checkProseLinks(ctx, path, v.id, v.text, 'text');
}

/**
 * The opening sequence (sand-1l0.26). The premise is authored content, so the
 * claim it rests on must resolve and its footnotes must cite the opening's own
 * sources — a headline number with nothing behind it is the one thing this
 * screen must not do. The camera, if given, is checked against the pack region
 * the same way any other camera is.
 */
function checkOpening(ctx: Ctx, path: string, pack: PackT) {
  const o = pack.opening;
  if (!o) return;
  const CARD_KINDS: Kind[] = [
    'tech',
    'science',
    'document',
    'decision',
    'clock',
    'tally',
    'supply',
    'casualties',
    'vignette',
    'link',
    'person',
  ];
  if (o.claim) ctx.ref(path, pack.id, o.claim.card, CARD_KINDS, 'opening.claim.card');
  if (o.chain) {
    if (o.chain.card) ctx.ref(path, pack.id, o.chain.card, CARD_KINDS, 'opening.chain.card');
    // The backstory's map identity: a chapter or zoom-in the camera can go to.
    if (o.chain.focus) ctx.ref(path, pack.id, o.chain.focus, ['battle'], 'opening.chain.focus');
    if (!o.chain.card && !o.chain.focus)
      ctx.warn(path, 'opening.chain has neither card nor focus, so it does nothing', pack.id);
  }
  checkCitations(ctx, path, pack.id, o.sources, false, 'opening.sources');
  checkFootnotes(ctx, path, pack.id, o.lede, o.sources ?? [], 'opening.lede');
  if (o.camera) {
    const [w, so, e, n] = pack.region;
    const [lng, lat] = o.camera.center;
    if (lng < w || lng > e || lat < so || lat > n)
      ctx.warn(path, 'opening.camera.center is outside the pack region', pack.id);
  }
}

/**
 * A guided tour (sand-1l0.14). Each step is a complete view: its clock instant
 * must sit inside the range the step will actually be shown on — the pack's,
 * or the battle's when the step names a `focus` — and every id it opens must
 * resolve. Steps that run backwards in time are legal (a tour may compare a
 * branch with history) but warned about, since it is usually a typo.
 */
function checkTour(ctx: Ctx, s: PackState, path: string, tr: Tour) {
  const CARD_KINDS: Kind[] = [
    'tech',
    'science',
    'document',
    'decision',
    'clock',
    'tally',
    'supply',
    'casualties',
    'vignette',
    'link',
    'person',
  ];
  const seen = new Set<string>();
  let previous: string | undefined;
  tr.steps.forEach((step, i) => {
    const where = `steps[${i}] (${step.id})`;
    if (seen.has(step.id)) ctx.error(path, `${where}: duplicate step id`, tr.id);
    seen.add(step.id);
    let range = s.pack.timeRange;
    if (step.focus) {
      const b = ctx.ref(path, tr.id, step.focus, ['battle'], `${where}: focus`);
      if (b && b.pack !== s.dir)
        ctx.error(path, `${where}: focus ${step.focus} belongs to another pack`, tr.id);
      const battle = s.battles.find((x) => x.id === step.focus);
      if (battle) range = battle.timeRange;
    }
    const scope = step.focus ? `the battle's timeRange` : `the pack timeRange`;
    if (!within(range, step.at)) ctx.error(path, `${where}: at is outside ${scope}`, tr.id);
    if (step.playUntil) {
      if (!(t(step.at) < t(step.playUntil)))
        ctx.error(path, `${where}: playUntil must be after at`, tr.id);
      if (!within(range, step.playUntil))
        ctx.error(path, `${where}: playUntil is outside ${scope}`, tr.id);
    }
    checkBranchRef(ctx, s, path, tr.id, step.branch, true);
    if (step.card) ctx.ref(path, tr.id, step.card, CARD_KINDS, `${where}: card`);
    checkFootnotes(ctx, path, tr.id, step.narration, tr.sources, `${where} narration`);
    if (previous && t(step.at) < t(previous))
      ctx.warn(path, `${where}: at runs backwards from the previous step`, tr.id);
    previous = step.at;
  });
  checkFootnotes(ctx, path, tr.id, tr.summary, tr.sources, 'summary');
  checkCitations(ctx, path, tr.id, tr.sources, true);
}

function checkLink(ctx: Ctx, path: string, l: CausalLink) {
  const any: Kind[] = [
    'pack',
    'branch',
    'formation',
    'event',
    'battle',
    'decision',
    'tech',
    'science',
    'document',
    'casualties',
    'vignette',
    'beat',
    'person',
    'place',
  ];
  ctx.ref(path, l.id, l.from, any, 'from');
  ctx.ref(path, l.id, l.to, any, 'to');
  if (l.from === l.to) ctx.error(path, 'from and to are the same entity', l.id);
  checkCitations(ctx, path, l.id, l.evidence, true, 'evidence');
}

/**
 * A beat's schematic must be there and must be a drawing, not a stray file.
 * The SVG is inlined into the page (sand-1l0.33), so it inherits the theme
 * tokens — and so anything in it runs: a <script> or an event handler in
 * content is a hole, and the validator is where that is caught, not review.
 */
function checkDiagram(
  ctx: Ctx,
  s: PackState,
  path: string,
  id: string,
  diagram: { file: string; caption: string; alt: string },
) {
  const svg = s.diagrams.get(diagram.file);
  if (svg === undefined) {
    ctx.error(path, `diagram.file "${diagram.file}.svg" is not in the pack's diagrams/`, id);
    return;
  }
  if (!/<svg[\s>]/i.test(svg)) {
    ctx.error(path, `diagrams/${diagram.file}.svg has no <svg> element`, id);
  }
  if (/<script[\s>]/i.test(svg) || /\son[a-z]+\s*=/i.test(svg)) {
    ctx.error(
      path,
      `diagrams/${diagram.file}.svg carries a script or an inline event handler; a schematic is a drawing`,
      id,
    );
  }
  if (!/viewBox=/i.test(svg)) {
    ctx.warn(path, `diagrams/${diagram.file}.svg has no viewBox, so it will not scale`, id);
  }
}

/**
 * Commander tracks (sand-1l0.27). A track says where a man — or the
 * headquarters he commanded from — was, so the checks are the route checks
 * plus the one rule that keeps the two kinds honest: a person has at most one
 * `hq` track, because he cannot command from two places at once, while he may
 * have as many documented journeys as the sources record.
 */
function checkTracks(ctx: Ctx, s: PackState, path: string, range: TimeRange, sideIds: Set<string>) {
  const hqOf = new Map<string, string>();
  for (const tk of s.tracks) {
    ctx.ref(path, tk.id, tk.person, ['person'], 'person');
    if (tk.side && !sideIds.has(tk.side)) ctx.error(path, `unknown side ${tk.side}`, tk.id);
    if (tk.kind === 'hq' && !tk.post)
      ctx.error(path, 'an hq track must name the post it commanded from', tk.id);
    if (tk.kind === 'journey' && tk.post)
      ctx.warn(path, 'a journey is the man, not a headquarters; drop `post`', tk.id);
    if (tk.kind === 'hq') {
      const seen = hqOf.get(tk.person);
      if (seen)
        ctx.error(
          path,
          `${tk.person} already has an hq track (${seen}); a commander runs one headquarters at a time — split the posts by time in a single track, or make this a journey`,
          tk.id,
        );
      else hqOf.set(tk.person, tk.id);
    }
    let prev = -Infinity;
    tk.waypoints.forEach((w, i) => {
      const at = t(w[2]);
      if (!(at > prev))
        ctx.error(path, `waypoints[${i}] is not later than the previous waypoint`, tk.id);
      prev = at;
      if (!within(range, w[2]))
        ctx.error(path, `waypoints[${i}] (${w[2]}) is outside the pack timeRange`, tk.id);
    });
    // A commander travelled by car or by train, and a headquarters moves the
    // same way; an unmarked track is read as road travel, never as a march.
    const mode = tk.mode ?? 'motor';
    for (const f of paceFindings(tk.waypoints, mode))
      ctx[f.level === 'error' ? 'error' : 'warn'](path, paceMessage(f, mode), tk.id);
    checkCitations(ctx, path, tk.id, tk.sources, true);
  }
}

function checkBeats(ctx: Ctx, s: PackState) {
  const { pack } = s;
  for (const b of s.beats) {
    const path = b.file;
    checkRange(ctx, path, b.id, { start: b.from, end: b.to }, 'from/to');
    if (!within(pack.timeRange, b.from) || !within(pack.timeRange, b.to))
      ctx.error(path, 'beat from/to is outside the pack timeRange', b.id);
    checkBranchRef(ctx, s, path, b.id, b.branch, true);
    if (b.focus) {
      const f = ctx.ref(path, b.id, b.focus, ['battle'], 'focus');
      if (f && f.pack !== s.dir) ctx.error(path, `focus ${b.focus} belongs to another pack`, b.id);
    }
    if (b.media) ctx.ref(path, b.id, b.media, ['media'], 'media');
    if (b.diagram) checkDiagram(ctx, s, path, b.id, b.diagram);
    checkLinks(ctx, path, b.id, b.links);
    checkCitations(ctx, path, b.id, b.sources, true);
    checkProseLinks(ctx, path, b.id, b.body, 'body');
    checkNoInlineImage(ctx, path, b.id, b.body, 'body');
    // inline footnotes [^slug] must be among the beat's citations
    const slugs = new Set(b.sources.map((c) => c.source.split(':')[1]));
    for (const label of footnoteLabels(b.body)) {
      if (!slugs.has(label))
        ctx.error(
          path,
          `footnote [^${label}] is not one of this beat's sources (use the source slug, e.g. [^herwig-2009])`,
          b.id,
        );
    }
  }

  // Coverage: for each branch, shared beats ∪ that branch's beats (same focus) must not overlap.
  for (const branch of pack.branches) {
    const visible = s.beats.filter((b) => !b.branch || b.branch === branch.id);
    const byFocus = new Map<string, NarrativeBeat[]>();
    for (const b of visible) {
      const key = b.focus ?? '';
      byFocus.set(key, [...(byFocus.get(key) ?? []), b]);
    }
    for (const [focus, beats] of byFocus) {
      const sorted = [...beats].sort((a, b) => t(a.from) - t(b.from));
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]!;
        const cur = sorted[i]!;
        if (t(cur.from) < t(prev.to)) {
          ctx.error(
            cur.file,
            `overlaps ${prev.id} (${prev.file}) in branch ${branch.id}${focus ? ` / focus ${focus}` : ''}: beats visible together must not overlap in time`,
            cur.id,
          );
        }
      }
    }
    if (visible.length === 0 && pack.status !== 'seed')
      ctx.warn(`eras/${s.dir}/pack.json`, `branch ${branch.id} has no narrative beats`, branch.id);
  }
}

function checkMedia(ctx: Ctx, m: MediaT, path: string) {
  const flagged = [m.original.licence, m.colorization?.status, m.colorization?.licence, m.$comment]
    .filter((x): x is string => typeof x === 'string')
    .join(' ');
  if (/\b(BLOCKED|UNVERIFIED|UNKNOWN|HOLD)\b/i.test(flagged))
    ctx.error(
      path,
      'manifest is flagged BLOCKED/UNVERIFIED/UNKNOWN/HOLD — resolve before merging',
      m.id,
    );
  if (!m.original.archive && !m.original.archive_url)
    ctx.error(path, 'no archive record (original.archive or original.archive_url)', m.id);
  if (m.colorized) {
    if (!/colori[sz]ed/i.test(m.caption))
      ctx.error(path, 'colorized=true but the caption does not say so', m.id);
    if (!m.colorization) ctx.error(path, 'colorized=true needs a colorization block', m.id);
  }
  if (/^Bundesarchiv/.test(m.original.archive ?? '') && !/Bundesarchiv, Bild/.test(m.credit))
    ctx.error(
      path,
      "Bundesarchiv image without the required 'Bundesarchiv, Bild …' credit string",
      m.id,
    );
  // Provisional manifests predate the registries: dangling person/used_by are warnings until sand-y0u.2.
  if (m.person) ctx.ref(path, m.id, m.person, ['person'], 'person', 'warning');
  for (const u of m.used_by ?? []) {
    if (!ctx.index.has(u)) ctx.warn(path, `used_by ${u} does not exist yet`, m.id);
  }
}

/**
 * One picture per beat (ADR 0012). The schema gives a beat a single `media`
 * id, so the only way a second photograph can reach one is a manifest naming
 * it as a placement — which is how a dossier becomes a slideshow, one
 * reasonable addition at a time. Only claims on ids that really are beats
 * count; `used_by` is also where an author records intentions for cards and
 * battles that do not exist yet.
 */
function checkOnePicturePerBeat(ctx: Ctx, media: MediaT[]) {
  const claims = new Map<string, string[]>();
  for (const m of media) {
    for (const u of m.used_by ?? []) {
      if (ctx.index.get(u)?.kind !== 'beat') continue;
      claims.set(u, [...(claims.get(u) ?? []), m.id]);
    }
  }
  for (const [beat, ids] of claims) {
    if (ids.length < 2) continue;
    ctx.error(
      ctx.index.get(beat)!.path,
      `${ids.length} images claim this beat as a placement (${ids.join(', ')}) — a beat has one hero image`,
      beat,
    );
  }
}

function checkShared(ctx: Ctx, shared: ParsedContent['shared'], raw: RawContent) {
  const p = (file: string) => raw.shared.collections[file]?.path ?? `shared/${file}`;
  for (const person of shared.people) {
    checkIds(ctx, p('people/people.json'), person.media, person.id, ['media'], 'media');
    checkCitations(ctx, p('people/people.json'), person.id, person.sources, false);
    if (person.born && person.died && t(person.born) > t(person.died))
      ctx.error(p('people/people.json'), 'born is after died', person.id);
  }
  for (const place of shared.places)
    checkCitations(ctx, p('places/places.json'), place.id, place.sources, false);
  raw.shared.media.forEach((f, i) => {
    const m = shared.media[i];
    if (m) checkMedia(ctx, m, f.path);
  });
  checkOnePicturePerBeat(ctx, shared.media);
  (raw.shared.audio ?? []).forEach((f, i) => {
    const c = shared.audio[i];
    if (c) checkCue(ctx, c, f.path);
  });
}

function checkScore(ctx: Ctx, s: PackState, path: string) {
  const entries = s.score;
  if (!entries.length) return;
  let opening = 0;
  entries.forEach((e, i) => {
    const where = `score[${i}]`;
    if (e.cue) ctx.ref(path, s.pack.id, e.cue, ['cue'], `${where}: cue`);
    if (e.focus) ctx.ref(path, s.pack.id, e.focus, ['battle'], `${where}: focus`);
    if (e.branch) checkBranchRef(ctx, s, path, s.pack.id, e.branch, true);
    if (e.from && e.to) {
      if (!within(s.pack.timeRange, e.from))
        ctx.error(path, `${where}: from is outside the pack timeRange`);
      if (!within(s.pack.timeRange, e.to))
        ctx.error(path, `${where}: to is outside the pack timeRange`);
    }
    if (e.opening) opening += 1;
  });
  if (opening > 1) ctx.error(path, 'more than one entry claims the opening sequence');
  if (entries.filter((e) => e.vignette).length > 1)
    ctx.error(path, 'more than one entry names the vignette bed');
  // A campaign moment with nothing to play is not an error — the score may be
  // deliberately sparse — but a pack whose score never covers the start is
  // almost certainly a mistake in authoring rather than a choice.
  const start = s.pack.timeRange.start;
  const covered = entries.some(
    (e) => e.from && e.to && within({ start: e.from, end: e.to }, start),
  );
  if (!covered && entries.some((e) => e.from))
    ctx.warn(path, 'no score entry covers the start of the campaign');
}

function checkCue(ctx: Ctx, c: CueT, path: string) {
  // The same bar the imagery policy sets: a manifest still carrying a
  // placeholder is not ready to ship, whoever or whatever made the sound.
  const flagged = [c.provenance.licence, c.provenance.tool, c.$comment]
    .filter((x): x is string => typeof x === 'string')
    .join(' ');
  if (/\b(BLOCKED|UNVERIFIED|UNKNOWN|HOLD|TODO|TBD)\b/i.test(flagged))
    ctx.error(
      path,
      'cue is flagged BLOCKED/UNVERIFIED/UNKNOWN/HOLD/TODO — resolve before merging',
      c.id,
    );
  // A generated cue without its prompt cannot be regenerated or defended.
  if (/suno|udio|generated|ai/i.test(c.provenance.tool) && !c.provenance.prompt)
    ctx.warn(path, 'generated audio without provenance.prompt — record what produced it', c.id);
  if (c.role === 'bed' && (c.mixDb === undefined || c.mixDb >= 0))
    ctx.warn(path, 'a bed should carry a negative mixDb so it sits under the cue it joins', c.id);
  for (const u of c.used_by ?? [])
    if (!ctx.index.has(u)) ctx.warn(path, `used_by ${u} does not exist yet`, c.id);
}

function checkThread(ctx: Ctx, path: string, th: ThreadT) {
  for (const step of th.steps) {
    const pk = ctx.ref(path, th.id, step.pack, ['pack'], 'step.pack');
    if (step.beat) {
      const be = ctx.ref(path, th.id, step.beat, ['beat'], 'step.beat');
      if (be && pk && be.pack !== pk.pack)
        ctx.error(path, `step.beat ${step.beat} is not in pack ${step.pack}`, th.id);
    }
    if (step.branch) {
      const br = ctx.ref(path, th.id, step.branch, ['branch'], 'step.branch');
      if (br && pk && br.pack !== pk.pack)
        ctx.error(path, `step.branch ${step.branch} is not in pack ${step.pack}`, th.id);
    }
    if (!step.beat && !step.at)
      ctx.warn(path, 'step has neither beat nor at; it will open the pack at its start', th.id);
  }
  checkCitations(ctx, path, th.id, th.sources, false);
}

// ------------------------------------------------------------------- entry

export function validateContent(raw: RawContent): Report {
  const ctx = new Ctx();

  // pass 1 — parse + index
  const shared = parseShared(ctx, raw);
  const packs = raw.packs
    .map((p) => parsePack(ctx, p))
    .filter((p): p is PackState => p !== undefined);
  const threads: ThreadT[] = [];
  const threadFiles: RawFile[] = [];
  for (const f of raw.threads) {
    const th = parseWith(ctx, Thread, f, 'thread.json');
    if (!th) continue;
    ctx.register(th.id, { kind: 'thread', path: f.path });
    threads.push(th);
    threadFiles.push(f);
  }

  // pass 2 — rules
  const prefixes = new Map<string, string>();
  for (const s of packs) {
    const { sideIds } = checkPack(ctx, s, prefixes);
    const range = s.pack.timeRange;
    const file = (k: string) => s.files[k] ?? `eras/${s.dir}/${k}`;
    for (const f of s.formations) checkFormation(ctx, s, file('formations.json'), f, sideIds);
    const seenRoute = new Set<string>();
    for (const r of s.routes) {
      checkRoute(ctx, s, file('routes.json'), r, range);
      seenRoute.add(`${r.formation}|${r.branch ?? ''}`);
    }
    checkRouteLegs(ctx, file('routes.json'), s.routes);
    for (const f of s.formations) {
      if (!seenRoute.has(`${f.id}|`) && s.pack.status !== 'seed')
        ctx.warn(file('formations.json'), 'formation has no historical route', f.id);
    }
    for (const e of s.events) checkEvent(ctx, s, file('events.json'), e, range);
    for (const b of s.battles) checkBattle(ctx, s, file('battles.json'), b, sideIds);
    for (const d of s.decisions) checkDecision(ctx, s, file('decisions.json'), d);
    for (const c of s.tech) checkCard(ctx, file('tech.json'), c);
    for (const c of s.science) checkCard(ctx, file('science.json'), c);
    for (const c of s.documents) checkCard(ctx, file('documents.json'), c);
    for (const l of s.links) checkLink(ctx, file('links.json'), l);
    for (const c of s.clocks) checkClock(ctx, file('clocks.json'), c);
    for (const c of s.tallies) checkTally(ctx, s, file('tallies.json'), c);
    for (const c of s.supply) checkSupply(ctx, s, file('supply.json'), c);
    for (const c of s.casualties) checkCasualties(ctx, s, file('casualties.json'), c, sideIds);
    for (const v of s.vignettes) checkVignette(ctx, s, file('vignettes.json'), v);
    for (const tr of s.tours) checkTour(ctx, s, file('tours.json'), tr);
    checkTracks(ctx, s, file('tracks.json'), range, sideIds);
    checkScore(ctx, s, file('score.json'));
    const seenCast = new Set<string>();
    for (const c of s.cast) {
      checkCast(ctx, file('cast.json'), c, sideIds);
      if (seenCast.has(c.person))
        ctx.error(file('cast.json'), `person ${c.person} appears twice in the cast`, c.id);
      seenCast.add(c.person);
    }
    checkBeats(ctx, s);
  }
  checkShared(ctx, shared, raw);
  threads.forEach((th, i) => checkThread(ctx, threadFiles[i]!.path, th));

  const counts: Record<string, number> = {};
  for (const { kind } of ctx.index.values()) counts[kind] = (counts[kind] ?? 0) + 1;

  const content: ParsedContent = {
    packs: packs.map(({ files: _f, branchById: _b, historical: _h, ...rest }) => rest),
    shared,
    threads,
  };
  return {
    ok: ctx.errors.length === 0,
    errors: ctx.errors,
    warnings: ctx.warnings,
    content,
    counts,
  };
}
