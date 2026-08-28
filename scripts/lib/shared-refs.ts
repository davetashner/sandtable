/**
 * Which shared entities an era actually reaches (`sand-shn.15`).
 *
 * ADR 0018's argument is that a page load is one era and fetches one era. The
 * shared registries under `content/shared/` quietly broke it: they are the
 * union of *every* era and were copied whole into *every* bundle, so a reader
 * opening 1914 downloaded the cast, the places and the bibliography of every
 * other campaign in the project. With twenty packs projected (ADR 0019) the
 * registries alone would exceed the pack ceiling long before any single era's
 * own content did — and the recorded answer for a too-heavy pack, "split that
 * era by chapter" (`sand-shn.1.3`), cannot help, because the weight is not
 * that era's.
 *
 * So the bundler emits the shared entities the era reaches, and nothing else.
 * The dangerous failure is the opposite of the one being fixed: an entity that
 * resolves in the validator and is *missing* at run time. Two defences:
 *
 *   1. **The set is found syntactically, not from the schema.** Every
 *      reference in `content/` is the entity's literal id — there is no place
 *      in the app or the content that builds one out of parts — so scanning
 *      the era's own bytes for id-shaped tokens finds every reference a
 *      schema-walker would, plus any field a schema-walker was never taught
 *      about. It over-approximates by construction, and over-approximating
 *      costs bytes where under-approximating costs a broken page. It also
 *      cannot drift when the schema grows a new reference field, which a
 *      second hand-written resolver certainly would.
 *   2. **The set is closed under reference.** A kept person cites sources; a
 *      kept media entry names the people in the photograph; a kept place
 *      cites its coordinates. Each newly kept entity is scanned in turn until
 *      nothing new appears.
 *
 * One reference is not a literal id and must be stated: `portraitFor(person)`
 * in `src/packs/media-index.ts` finds a portrait by looking up the *person*,
 * so a media entry whose subject is kept is kept too, even though its own id
 * appears nowhere in the era.
 *
 * `scripts/pack-bundle.test.ts` holds both properties: that nothing an emitted
 * bundle points at is missing from it, and that everything the validator
 * resolves for a pack is in that pack's bundle.
 */

/**
 * A maximal id-shaped token: the `Id` primitive
 * (`src/packs/schema/primitives.ts`) as it appears inside a longer string.
 *
 * The lookbehind is what makes it maximal — without it `source:kluck-1920`
 * would also yield the tail of a longer id, and `https://…` would yield its
 * path. Matches are then required to name a registry entry exactly, so a
 * prefix of a real id (`source:foo` inside `source:foo-bar`) resolves to
 * nothing rather than to the wrong entity.
 */
const ID_TOKEN = /(?<![a-z0-9._/-])[a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9._/-]*/g;

/** Every id-shaped token in a string. Markdown prose and JSON alike. */
function tokensIn(text: string, seen: (id: string) => void): void {
  for (const m of text.matchAll(ID_TOKEN)) seen(m[0]);
}

/**
 * Offer every string in a JSON value — object keys included, since the bundle
 * keys collections by file name and could one day key something by id.
 */
function walk(value: unknown, seen: (id: string) => void): void {
  if (typeof value === 'string') tokensIn(value, seen);
  else if (Array.isArray(value)) for (const v of value) walk(v, seen);
  else if (value !== null && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) {
      tokensIn(k, seen);
      walk(v, seen);
    }
}

/** The registries as they sit on disk: three arrays and two generated indexes. */
export interface SharedRegistries {
  /** `people/people.json` — `Person[]`. */
  people: unknown;
  /** `places/places.json` — `Place[]`. */
  places: unknown;
  /** `sources/sources.json` — `Source[]`. */
  sources: unknown;
  /** `media/index.json` — `{ entries: … }`, written by `npm run media`. */
  media: unknown;
  /** `audio/index.json` — `{ entries: … }`, written by `npm run audio`. */
  audio: unknown;
}

type Entity = Record<string, unknown>;

const entitiesOf = (value: unknown): Entity[] =>
  Array.isArray(value)
    ? value.filter((x): x is Entity => x !== null && typeof x === 'object' && !Array.isArray(x))
    : [];

const entriesOf = (value: unknown): Entity[] =>
  value !== null && typeof value === 'object' ? entitiesOf((value as Entity)['entries']) : [];

const idOf = (e: Entity): string | undefined =>
  typeof e['id'] === 'string' ? (e['id'] as string) : undefined;

/** Everyone a picture is of: the portrait's sitter, or the group it names. */
function subjectsOf(entry: Entity): string[] {
  const many = Array.isArray(entry['people'])
    ? (entry['people'] as unknown[]).filter((p): p is string => typeof p === 'string')
    : [];
  const one = typeof entry['person'] === 'string' ? [entry['person'] as string] : [];
  return [...one, ...many];
}

/**
 * The ids of every shared entity reachable from `roots`, closed under
 * reference. `roots` is the era half of the bundle — its pack, collections,
 * beats and schematics — so what is scanned is exactly what is shipped.
 */
export function reachableSharedIds(shared: SharedRegistries, roots: unknown): Set<string> {
  const media = entriesOf(shared.media);
  const byId = new Map<string, Entity>();
  for (const list of [
    entitiesOf(shared.people),
    entitiesOf(shared.places),
    entitiesOf(shared.sources),
    media,
    entriesOf(shared.audio),
  ])
    for (const e of list) {
      const id = idOf(e);
      if (id !== undefined && !byId.has(id)) byId.set(id, e);
    }

  // The one edge that runs backwards: a portrait is found by its sitter.
  const portraits = new Map<string, string[]>();
  for (const entry of media) {
    const id = idOf(entry);
    if (id === undefined) continue;
    for (const person of subjectsOf(entry))
      portraits.set(person, [...(portraits.get(person) ?? []), id]);
  }

  const kept = new Set<string>();
  const pending: unknown[] = [roots];
  const see = (id: string): void => {
    const entity = byId.get(id);
    if (entity === undefined || kept.has(id)) return;
    kept.add(id);
    pending.push(entity);
    for (const portrait of portraits.get(id) ?? []) see(portrait);
  };
  while (pending.length > 0) walk(pending.pop(), see);
  return kept;
}

/**
 * The registries narrowed to one era, each keeping its file's own shape and
 * order — so the bundle is still a subset of what is on disk, byte for byte,
 * and the content hash in the emitted file name stays a function of the tree.
 */
export function sharedFor(shared: SharedRegistries, roots: unknown): SharedRegistries {
  const kept = reachableSharedIds(shared, roots);
  const keep = (value: unknown) => entitiesOf(value).filter((e) => kept.has(idOf(e) ?? ''));
  const keepIndex = (value: unknown) => ({
    ...(value as Entity),
    entries: entriesOf(value).filter((e) => kept.has(idOf(e) ?? '')),
  });
  return {
    people: keep(shared.people),
    places: keep(shared.places),
    sources: keep(shared.sources),
    media: keepIndex(shared.media),
    audio: keepIndex(shared.audio),
  };
}
