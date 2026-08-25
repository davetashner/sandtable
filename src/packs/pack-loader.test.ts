/**
 * The fetch path (ADR 0018).
 *
 * Under Vitest the bundle is inlined into `virtual:sandtable-pack` — there is
 * no server for the page to fetch from — so the module's own top-level await
 * never touches the network. These cover the code that does, because in a
 * browser it is the only way the pack arrives.
 */
import { describe, expect, it, vi } from 'vitest';
import { contentBundle, fetchContentBundle } from './pack-loader.js';

describe('fetchContentBundle', () => {
  it('takes the request the boot script already started, without issuing another', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const pending = Promise.resolve({ id: 'started-in-head' });
    await expect(fetchContentBundle('/pack/x.json', pending)).resolves.toEqual({
      id: 'started-in-head',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('fetches when nothing is in flight — a page without the boot hook', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ id: 'fetched' }),
    }));
    vi.stubGlobal('fetch', fetchSpy);
    await expect(fetchContentBundle('/pack/x.json')).resolves.toEqual({ id: 'fetched' });
    expect(fetchSpy).toHaveBeenCalledWith('/pack/x.json');
    vi.unstubAllGlobals();
  });

  it('names the URL and the status when the bundle is not there', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, statusText: 'Not Found' })),
    );
    await expect(fetchContentBundle('/pack/missing.json')).rejects.toThrow(
      /pack \/pack\/missing\.json answered 404 Not Found/,
    );
    vi.unstubAllGlobals();
  });
});

describe('the bundle the app boots from', () => {
  it('carries the era, its collections, its beats and the shared registries', () => {
    expect(contentBundle.id).toBe('1914-schlieffen-marne');
    expect(contentBundle.collections['events.json']).toBeInstanceOf(Array);
    expect(contentBundle.beats.length).toBeGreaterThan(0);
    expect(contentBundle.beats[0]?.file).toMatch(/^beats\/.+\.md$/);
    expect(Object.keys(contentBundle.diagrams).length).toBeGreaterThan(0);
    expect(contentBundle.shared.people).toBeInstanceOf(Array);
    expect(contentBundle.shared.media).toHaveProperty('entries');
    expect(contentBundle.shared.audio).toHaveProperty('entries');
  });
});
