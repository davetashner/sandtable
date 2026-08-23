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
  Media,
  type Media as MediaT,
  type NarrativeBeat,
  Pack,
  type Pack as PackT,
  PACK_COLLECTIONS,
  type PackCollectionFile,
  type Person,
  type Place,
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
  type Tally,
  type Timetable,
} from '../schema/index.js';
import { footnoteLabels, splitFrontMatter } from './frontmatter.js';
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
  beats: NarrativeBeat[];
}

export interface ParsedContent {
  packs: ParsedPack[];
  shared: { people: Person[]; places: Place[]; sources: Source[]; media: MediaT[] };
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
  for (const c of citations ?? []) ctx.ref(path, id, c.source, ['source'], `${what}: citation`);
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
  const shared: ParsedContent['shared'] = { people: [], places: [], sources: [], media: [] };
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
    beats: [],
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
    for (const item of items) ctx.register(item.id, { kind, path: f.path, pack: raw.dir });
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
  checkCitations(ctx, path, r.id, r.sources, true);
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
}

function checkCard(ctx: Ctx, path: string, c: TechCard | ScienceCard | Document) {
  if ('counter' in c && c.counter) ctx.ref(path, c.id, c.counter, ['tech'], 'counter');
  if ('people' in c) checkIds(ctx, path, c.people, c.id, ['person'], 'people');
  if ('media' in c) checkIds(ctx, path, c.media, c.id, ['media'], 'media');
  if ('author' in c && c.author.includes(':')) ctx.ref(path, c.id, c.author, ['person'], 'author');
  checkLinks(ctx, path, c.id, c.links);
  checkCitations(ctx, path, c.id, c.sources, true);
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
    'beat',
    'person',
    'place',
  ];
  ctx.ref(path, l.id, l.from, any, 'from');
  ctx.ref(path, l.id, l.to, any, 'to');
  if (l.from === l.to) ctx.error(path, 'from and to are the same entity', l.id);
  checkCitations(ctx, path, l.id, l.evidence, true, 'evidence');
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
    checkLinks(ctx, path, b.id, b.links);
    checkCitations(ctx, path, b.id, b.sources, true);
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
      const key = `${r.formation}|${r.branch ?? ''}`;
      if (seenRoute.has(key))
        ctx.error(
          file('routes.json'),
          `formation ${r.formation} already has a route for ${r.branch ?? 'the historical branch'}`,
          r.id,
        );
      seenRoute.add(key);
    }
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
