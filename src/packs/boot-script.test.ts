/**
 * The face a failed pack fetch wears (`sand-shn.1.2`).
 *
 * The script under test never runs in a bundle — it is inlined into `<head>`
 * as text, precisely so that it works when the bundle does not (ADR 0018's
 * top-level `await` fails the whole module graph on a bad fetch). So the tests
 * run it the way the browser does: as source, over the real markup from
 * `index.html`, with `fetch` answering the way a network does when it is
 * having a bad day.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootScript } from './boot-script.js';
import { resolvePackUrl } from './content-bundle.js';

const SEED = '1914-schlieffen-marne';
const URLS = {
  [SEED]: `/pack/${SEED}-abc123.json`,
  '1870-sedan': '/pack/1870-sedan-def456.json',
};

/** The boot markup as it actually ships — read from `index.html`, not retyped. */
function mountBootMarkup(): void {
  const html = readFileSync('index.html', 'utf8');
  const root = new DOMParser().parseFromString(html, 'text/html').getElementById('root');
  if (!root) throw new Error('index.html no longer has a #root to boot into');
  document.body.innerHTML = root.outerHTML;
}

/**
 * The two `window` listeners the script installs outlive the test that
 * installed them, and jsdom's window is shared across the file, so they are
 * recorded on the way in and taken off again on the way out. Without this a
 * later test's unhandled rejection is caught by an earlier test's closure.
 */
const installed: [string, EventListener][] = [];

function runBootScript(): void {
  const realAdd = window.addEventListener.bind(window);
  const spy = vi
    .spyOn(window, 'addEventListener')
    .mockImplementation((type: string, handler: EventListenerOrEventListenerObject) => {
      installed.push([type, handler as EventListener]);
      realAdd(type, handler as EventListener);
    });
  new Function(bootScript(URLS, SEED))();
  spy.mockRestore();
}

/** Let the fetch's `then`/`catch` chain settle. */
const flush = () => new Promise((r) => setTimeout(r, 0));

const answer = (init: { ok: boolean; status: number; statusText: string; json?: () => unknown }) =>
  vi.fn(async () => ({
    ...init,
    json: init.json ?? (async () => ({ id: SEED })),
  }));

const failureBox = () => document.getElementById('boot-failure');
const shownCase = () =>
  failureBox()
    ?.querySelector<HTMLElement>('[data-failure]:not([hidden])')
    ?.getAttribute('data-failure') ?? null;

afterEach(() => {
  for (const [type, handler] of installed) window.removeEventListener(type, handler);
  installed.length = 0;
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the boot hook resolves the era', () => {
  it('agrees with the loader, so the request the page starts is the one it awaits', () => {
    for (const search of ['', '?pack=1870-sedan', '?pack=nope', '?t=1914-09-01T00:00:00Z']) {
      mountBootMarkup();
      window.history.replaceState(null, '', `/${search}`);
      const fetchSpy = answer({ ok: true, status: 200, statusText: 'OK' });
      vi.stubGlobal('fetch', fetchSpy);
      runBootScript();

      expect(window.__sandtablePackUrl, search).toBe(resolvePackUrl(search, URLS, SEED));
      expect(fetchSpy, search).toHaveBeenCalledTimes(1);
      expect(fetchSpy, search).toHaveBeenCalledWith(window.__sandtablePackUrl);
    }
  });

  it('opens the seed era when the id is one the build never emitted (ADR 0009)', async () => {
    mountBootMarkup();
    window.history.replaceState(null, '', '/?pack=1815-waterloo');
    vi.stubGlobal('fetch', answer({ ok: true, status: 200, statusText: 'OK' }));
    runBootScript();
    await flush();

    expect(window.__sandtablePackUrl).toBe(URLS[SEED]);
    // A mistyped or stale link still opens something, so there is no face here.
    expect(failureBox()?.hidden).toBe(true);
  });
});

describe('the face a failed pack fetch wears', () => {
  it('says the era is not there when the server answers 404, and points at the atlas', async () => {
    mountBootMarkup();
    vi.stubGlobal('fetch', answer({ ok: false, status: 404, statusText: 'Not Found' }));
    runBootScript();
    await flush();

    expect(shownCase()).toBe('missing');
    expect(document.getElementById('boot-frame')?.hidden).toBe(true);
    expect(failureBox()?.hidden).toBe(false);
    expect(document.activeElement).toBe(failureBox());

    const shown = failureBox()!.querySelector<HTMLElement>('[data-failure="missing"]')!;
    expect(shown.querySelector('a')?.getAttribute('href')).toBe('/atlas.html');
    expect(typeof shown.querySelector<HTMLButtonElement>('[data-retry]')!.onclick).toBe('function');
    // Only one case is ever on screen.
    expect(failureBox()!.querySelectorAll('[data-failure]:not([hidden])')).toHaveLength(1);
  });

  it('still rejects the promise the loader awaits, naming the URL and the status', async () => {
    mountBootMarkup();
    vi.stubGlobal('fetch', answer({ ok: false, status: 404, statusText: 'Not Found' }));
    runBootScript();

    await expect(window.__sandtablePack).rejects.toThrow(
      new RegExp(`pack ${URLS[SEED]} answered 404 Not Found`),
    );
  });

  it('blames the connection when the request never gets an answer', async () => {
    mountBootMarkup();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    runBootScript();
    await flush();

    expect(shownCase()).toBe('offline');
    // Retry leads here, and the atlas is still offered.
    const shown = failureBox()!.querySelector<HTMLElement>('[data-failure="offline"]')!;
    expect(shown.querySelector('.boot__action--lead')?.tagName).toBe('BUTTON');
    expect(shown.querySelector('a')?.getAttribute('href')).toBe('/atlas.html');
  });

  it('blames the connection when the server itself fails', async () => {
    mountBootMarkup();
    vi.stubGlobal('fetch', answer({ ok: false, status: 503, statusText: 'Service Unavailable' }));
    runBootScript();
    await flush();

    expect(shownCase()).toBe('offline');
  });

  it('says the content is damaged when what arrives is not readable JSON', async () => {
    mountBootMarkup();
    vi.stubGlobal(
      'fetch',
      answer({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      }),
    );
    runBootScript();
    await flush();

    expect(shownCase()).toBe('invalid');
  });

  /**
   * The schema-validation case. The bundle arrives intact and `seed.ts` then
   * refuses it at module scope, which the browser reports as an unhandled
   * rejection out of the entry module's top-level `await` — nothing the fetch
   * chain can see, which is why the script listens for it as well.
   */
  it('says the content is damaged when the schema rejects it after it arrives', async () => {
    mountBootMarkup();
    vi.stubGlobal('fetch', answer({ ok: true, status: 200, statusText: 'OK' }));
    runBootScript();
    await flush();
    expect(failureBox()?.hidden).toBe(true);

    window.dispatchEvent(new Event('unhandledrejection'));

    expect(shownCase()).toBe('invalid');
    expect(document.getElementById('boot-frame')?.hidden).toBe(true);
  });

  it('keeps the first diagnosis when a second failure follows it', async () => {
    mountBootMarkup();
    vi.stubGlobal('fetch', answer({ ok: false, status: 404, statusText: 'Not Found' }));
    runBootScript();
    await flush();
    expect(shownCase()).toBe('missing');

    window.dispatchEvent(new Event('unhandledrejection'));
    window.dispatchEvent(new Event('error'));

    expect(shownCase()).toBe('missing');
    expect(failureBox()!.querySelectorAll('[data-failure]:not([hidden])')).toHaveLength(1);
  });

  /**
   * React replaces the whole of `#root` on its first commit, so the markup
   * this script reveals is gone once the app is up. That absence is the guard:
   * a rejection thrown by the map an hour into a session must not put an error
   * page over a working campaign.
   */
  it('does nothing once the app has taken over #root', async () => {
    mountBootMarkup();
    vi.stubGlobal('fetch', answer({ ok: true, status: 200, statusText: 'OK' }));
    runBootScript();
    await flush();

    document.getElementById('root')!.innerHTML = '<main>the campaign</main>';
    window.dispatchEvent(new Event('unhandledrejection'));

    expect(document.getElementById('root')!.innerHTML).toBe('<main>the campaign</main>');
  });
});
