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
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  SEED_PACK_ID,
  buildContentBundle,
  bundleFileName,
  contentBundleJson,
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
