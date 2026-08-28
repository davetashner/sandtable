/**
 * The build step that assembles the fetched content bundle (ADR 0018).
 *
 * The browser re-validates every field with the schema, so what matters here
 * is not the content but the two properties the deployment depends on: that
 * nothing in `content/` is left out, and that the same tree always produces
 * the same bytes — otherwise the content hash in the file name changes on
 * every build and the immutable cache header is a lie.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentBundle } from '../src/packs/content-bundle.js';
import { validateContent } from '../src/packs/validate/validate.js';
import { readContent } from './lib/read-content.js';
import {
  SEED_PACK_ID,
  buildContentBundle,
  bundleFileName,
  contentBundleJson,
  listPackIds,
  packSummary,
} from './lib/pack-bundle.js';

const CONTENT = join(process.cwd(), 'content');
const ERA = join(CONTENT, 'eras', SEED_PACK_ID);

describe('buildContentBundle', () => {
  const bundle = buildContentBundle(CONTENT);

  it('carries every JSON collection in the era directory', () => {
    const onDisk = readdirSync(ERA)
      .filter((f) => f.endsWith('.json') && f !== 'pack.json')
      .sort();
    expect(Object.keys(bundle.collections).sort()).toEqual(onDisk);
  });

  it('carries every beat and every schematic', () => {
    const beats = readdirSync(join(ERA, 'beats')).filter((f) => f.endsWith('.md'));
    const diagrams = readdirSync(join(ERA, 'diagrams')).filter((f) => f.endsWith('.svg'));
    expect(bundle.beats).toHaveLength(beats.length);
    expect(Object.keys(bundle.diagrams)).toHaveLength(diagrams.length);
    expect(bundle.beats.every((b) => b.text.includes('---'))).toBe(true);
  });

  it('joins the shared registries and the generated manifests', () => {
    expect(bundle.shared.people).toBeInstanceOf(Array);
    expect(bundle.shared.places).toBeInstanceOf(Array);
    expect(bundle.shared.sources).toBeInstanceOf(Array);
    expect(bundle.shared.media).toHaveProperty('entries');
    expect(bundle.shared.audio).toHaveProperty('entries');
  });
});

// ------------------------------------------------ shared registries, per era

/**
 * The registries are the union of every era; a bundle carries the part its own
 * era reaches (`sand-shn.15`, ADR 0018's second amendment). The size win is
 * the reason and is measured by `npm run bundle:budget`; what is worth a test
 * is the failure it could cause instead — an entity that resolves in the
 * validator and is missing in the browser, which no gate would otherwise see.
 */
const REGISTRY = join(CONTENT, 'shared');
const registryIds = (): Map<string, string> => {
  const of = (file: string, pick: (d: unknown) => { id: string }[]) => {
    const path = join(REGISTRY, file);
    return existsSync(path) ? pick(JSON.parse(readFileSync(path, 'utf8'))) : [];
  };
  const list = (d: unknown) => d as { id: string }[];
  const index = (d: unknown) => (d as { entries: { id: string }[] }).entries;
  const out = new Map<string, string>();
  for (const [file, pick, kind] of [
    ['people/people.json', list, 'people'],
    ['places/places.json', list, 'places'],
    ['sources/sources.json', list, 'sources'],
    ['media/index.json', index, 'media'],
    ['audio/index.json', index, 'audio'],
  ] as const)
    for (const e of of(file, pick)) out.set(e.id, kind);
  return out;
};

/** Every shared entity a bundle carries, whichever registry it came from. */
function carried(bundle: ContentBundle): Set<string> {
  const of = (v: unknown) => (v as { id: string }[]).map((e) => e.id);
  const entries = (v: unknown) => (v as { entries: { id: string }[] }).entries.map((e) => e.id);
  return new Set([
    ...of(bundle.shared.people),
    ...of(bundle.shared.places),
    ...of(bundle.shared.sources),
    ...entries(bundle.shared.media),
    ...entries(bundle.shared.audio),
  ]);
}

describe('the shared registries a bundle carries (sand-shn.15)', () => {
  const all = registryIds();
  const ids = listPackIds('content');

  it('is a subset of the registry, not the whole of it', () => {
    // 1915 is a seed pack that names three works and nobody; if it is carrying
    // the 1914 cast, the narrowing has stopped working.
    const trimmed = ids.filter((id) => carried(buildContentBundle(CONTENT, id)).size < all.size);
    expect(trimmed).toEqual(ids);
  });

  it('leaves nothing dangling: every shared id in a bundle is in that bundle', () => {
    // Deliberately not the emitter's own walk — this re-reads the finished
    // bytes and asks the question the browser will ask.
    const ID = /(?<![a-z0-9._/-])[a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9._/-]*/g;
    for (const id of ids) {
      const json = contentBundleJson(CONTENT, id);
      const has = carried(buildContentBundle(CONTENT, id));
      const missing = [...new Set(json.match(ID) ?? [])]
        .filter((token) => all.has(token) && !has.has(token))
        .sort();
      expect({ pack: id, missing }).toEqual({ pack: id, missing: [] });
    }
  });

  it('carries everything the validator resolved for that pack', () => {
    // The validator is the other answer to "what does this era reference".
    // Two answers that disagree is how a dangling reference reaches production
    // without CI noticing, so they are held against each other here.
    const { content } = readContent('content');
    const { sharedRefs } = validateContent(content);
    for (const id of ids) {
      const has = carried(buildContentBundle(CONTENT, id));
      // Only what the registries actually hold: the validator reads the
      // `media.json` manifests, while the bundle carries the generated
      // `media/index.json`, and the index lags the manifests until someone
      // runs `npm run media` (sand-shn.16). An id the registry never had is
      // not something this build step dropped.
      const missing = (sharedRefs[id] ?? []).filter((ref) => all.has(ref) && !has.has(ref));
      expect({ pack: id, missing }).toEqual({ pack: id, missing: [] });
    }
    // …and the validator must have had something to say about the seed pack,
    // or this test would pass by resolving nothing at all.
    expect((sharedRefs[SEED_PACK_ID] ?? []).length).toBeGreaterThan(20);
  });

  it('carries the portrait of everyone it carries', () => {
    // `portraitFor` (src/packs/media-index.ts) looks a picture up by its
    // sitter, so a portrait's own id need appear nowhere in the era. This is
    // the one reference the byte scan cannot see.
    const media = JSON.parse(readFileSync(join(REGISTRY, 'media', 'index.json'), 'utf8')) as {
      entries: { id: string; person?: string }[];
    };
    for (const id of ids) {
      const bundle = buildContentBundle(CONTENT, id);
      const has = carried(bundle);
      const people = new Set((bundle.shared.people as { id: string }[]).map((p) => p.id));
      const missing = media.entries
        .filter((e) => e.person !== undefined && people.has(e.person) && !has.has(e.id))
        .map((e) => e.id);
      expect({ pack: id, missing }).toEqual({ pack: id, missing: [] });
    }
  });
});

describe('the emitted file name', () => {
  it('is a function of the bytes alone, so an unchanged tree keeps its URL', () => {
    const a = contentBundleJson(CONTENT);
    const b = contentBundleJson(CONTENT);
    expect(a).toBe(b);
    expect(bundleFileName(a)).toBe(bundleFileName(b));
    expect(bundleFileName(a)).toMatch(/^pack\/1914-schlieffen-marne-[0-9a-f]{8}\.json$/);
  });

  it('changes when the content does', () => {
    expect(bundleFileName('{"id":"a"}')).not.toBe(bundleFileName('{"id":"b"}'));
  });
});

describe('many packs (sand-shn.1)', () => {
  it('lists every era directory that has a pack.json, chronologically', () => {
    const ids = listPackIds('content');
    expect(ids).toContain(SEED_PACK_ID);
    expect(ids.length).toBeGreaterThan(1);
    // `<yyyy>-<slug>` sorts chronologically, which is the order the atlas wants.
    expect([...ids].sort()).toEqual(ids);
  });

  it('summarises a pack from its own header, without its bundle', () => {
    const s = packSummary('content', SEED_PACK_ID);
    expect(s.id).toBe(SEED_PACK_ID);
    expect(s.title).toMatch(/Schlieffen/);
    expect(s.timeRange.start).toMatch(/^1914-/);
    expect(s.region).toHaveLength(4);
    // The atlas is honest about what opening an era costs.
    expect(s.bytes).toBeGreaterThan(1000);
  });

  it('gives every pack its own content-addressed file name', () => {
    const ids = listPackIds('content');
    const names = ids.map((id) => bundleFileName(contentBundleJson('content', id), id));
    expect(new Set(names).size).toBe(names.length);
    for (const [i, name] of names.entries()) expect(name).toContain(ids[i]!);
  });
});
