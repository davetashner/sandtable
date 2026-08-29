/**
 * The atlas of eras (sand-shn.1), which is what `/` is as of ADR 0024: what it
 * lists, how it groups it, where each entry goes, and what a reader sees when
 * the index cannot be read.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { resolvePackUrl, namesAView, PACK_SLOT } from '../packs/content-bundle.js';
import { groupByArc, type Arc } from './arcs.js';

/**
 * The arc table as an author wrote it. Read rather than restated, so this
 * suite tests the file the atlas actually ships (`sand-shn.14`).
 */
const AUTHORED: Arc[] = (
  JSON.parse(readFileSync(join('content', 'shared', 'arcs.json'), 'utf8')) as { arcs: Arc[] }
).arcs;
import { Atlas } from './Atlas.js';

const INDEX = {
  default: '1914-schlieffen-marne',
  arcs: AUTHORED,
  packs: [
    {
      id: '1914-schlieffen-marne',
      title: 'The Schlieffen Plan and the march to the Marne',
      subtitle: 'A timetable the world fell behind',
      summary: 'Germany staked everything on beating France in six weeks.\n\nA second paragraph.',
      arc: 'western-front',
      timeRange: { start: '1914-08-02T00:00:00Z', end: '1914-11-25T00:00:00Z' },
      region: [0, 47, 9, 52],
      status: 'seed',
      bytes: 1099266,
    },
    {
      id: '1915-attrition',
      title: '1915: the year of failed breakthroughs',
      summary: 'Gas at Ypres, and a line that would not move.',
      arc: 'western-front',
      timeRange: { start: '1915-01-01T00:00:00Z', end: '1915-12-31T00:00:00Z' },
      region: [1.5, 47, 8.5, 51.6],
      status: 'seed',
      bytes: 209264,
    },
    {
      id: '1941-pearl-harbor',
      title: '1941: Pearl Harbor',
      summary: 'Two clocks, ten and a half hours apart.',
      arc: 'pacific',
      timeRange: { start: '1941-11-25T12:00:00Z', end: '1941-12-10T20:00:00Z' },
      region: [99, -12, -155, 52],
      status: 'seed',
      bytes: 310000,
    },
  ],
};

const stub = (body: unknown, ok = true) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok, status: ok ? 200 : 404, json: async () => body })),
  );

afterEach(() => vi.unstubAllGlobals());

describe('<Atlas>', () => {
  it('lists every era with its span, and links each one into the campaign shell', async () => {
    stub(INDEX);
    render(<Atlas />);
    const eras = await screen.findAllByRole('link');
    expect(eras).toHaveLength(3);

    // Every era names itself, the seed one included: `/` is this page now, so
    // a campaign link that named no campaign would depend on which era
    // happened to be the seed (ADR 0024).
    expect(eras.map((a) => a.getAttribute('href'))).toEqual([
      '/?pack=1914-schlieffen-marne',
      '/?pack=1915-attrition',
      '/?pack=1941-pearl-harbor',
    ]);
    for (const href of eras.map((a) => a.getAttribute('href') ?? '')) {
      const search = href.slice(href.indexOf('?'));
      expect(namesAView(search)).toBe(true);
    }

    expect(screen.getByText(/failed breakthroughs/)).toBeInTheDocument();
    expect(screen.getByText('August 1914 – November 1914')).toBeInTheDocument();
  });

  it('groups the eras by arc, each arc saying what it is an argument about', async () => {
    stub(INDEX);
    render(<Atlas />);
    const arcs = await screen.findAllByRole('heading', { level: 2 });
    expect(arcs.map((h) => h.textContent)).toEqual([
      'The Western Front, 1914–1918',
      'The Pacific War, 1931–1945',
    ]);
    // The arc's one line is on the page, not only its name.
    expect(screen.getByText(/a line, and four years of trying to break it/)).toBeInTheDocument();

    const western = arcs[0]!.closest('section')!;
    expect(within(western).getAllByRole('link')).toHaveLength(2);
  });

  it('leads with what the project is, before any list of directories', async () => {
    stub(INDEX);
    render(<Atlas />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/atlas of campaigns/i);
    expect(screen.getByText(/Every date, number and position cites a source/)).toBeInTheDocument();
  });

  it('shows the opening paragraph of a summary, not the whole of it', async () => {
    stub(INDEX);
    render(<Atlas />);
    await screen.findAllByRole('link');
    expect(screen.getByText(/beating France in six weeks/)).toBeInTheDocument();
    expect(screen.queryByText(/A second paragraph/)).not.toBeInTheDocument();
  });

  it('says when a pack is still being written, rather than letting it pass as finished', async () => {
    stub(INDEX);
    render(<Atlas />);
    await screen.findAllByRole('link');
    expect(screen.getAllByText('seed')).toHaveLength(3);
  });

  it('keeps a way into the campaign when the index cannot be read', async () => {
    stub(null, false);
    render(<Atlas />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not be read/);
    // A dead end is not an option: the campaigns are still there.
    const out = screen.getByRole('link', { name: /open the seed campaign/i });
    expect(out.getAttribute('href')).toMatch(/^\/\?pack=/);
  });

  it('says it is working while it reads', async () => {
    stub(INDEX);
    render(<Atlas />);
    expect(screen.getByRole('status')).toHaveTextContent(/Reading the atlas/);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});

describe('arcs (ADR 0024)', () => {
  /**
   * The atlas is the front door, so an era that names an arc this build does
   * not know must still be listed — but the tree should never contain one. A
   * typo in a slug would otherwise show up as a campaign quietly filed under
   * "Elsewhere" at the bottom of the home page.
   */
  it('every era in content/eras names an arc the atlas knows', () => {
    const eras = join('content', 'eras');
    const ids = readdirSync(eras, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    expect(ids.length).toBeGreaterThan(0);
    const known = new Set(AUTHORED.map((a) => a.id));
    for (const id of ids) {
      const pack = JSON.parse(readFileSync(join(eras, id, 'pack.json'), 'utf8')) as {
        arc?: string;
      };
      expect(
        known.has(pack.arc ?? ''),
        `${id}/pack.json declares arc "${pack.arc ?? '(none)'}", which ` +
          `content/shared/arcs.json does not name. Set pack.json#arc to one of: ` +
          `${AUTHORED.map((a) => a.id).join(', ')} — or add an arc to that file.`,
      ).toBe(true);
    }
  });

  it('reads the table from content, so adding an arc is authoring', () => {
    // The whole point of the second half of `sand-shn.14`: an arc the app has
    // never heard of groups correctly, because the app no longer holds a list.
    const invented: Arc[] = [
      { id: 'invented', title: 'An arc added by an author', argument: 'One line about it.' },
    ];
    const groups = groupByArc([{ id: 'x', arc: 'invented' }], invented);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.arc?.title).toBe('An arc added by an author');
    expect(groups[0]!.packs.map((p) => p.id)).toEqual(['x']);
  });

  it('lists every era when the index carries no arc table at all', async () => {
    // An index emitted before the field existed, or a malformed arcs.json that
    // `readArcs` declined. A front door must not lose a campaign either way.
    stub({ ...INDEX, arcs: undefined });
    render(<Atlas />);
    const heads = await screen.findAllByRole('heading', { level: 2 });
    expect(heads.map((h) => h.textContent)).toEqual(['Elsewhere']);
    expect(within(heads[0]!.closest('section')!).getAllByRole('link')).toHaveLength(3);
  });

  it('shows only the arcs that have eras, and never drops one it does not know', () => {
    const groups = groupByArc(
      [{ id: 'a', arc: 'pacific' }, { id: 'b', arc: 'not-an-arc' }, { id: 'c' }],
      AUTHORED,
    );
    expect(groups.map((g) => g.arc?.id ?? null)).toEqual(['pacific', null]);
    expect(groups[1]!.packs.map((p) => p.id)).toEqual(['b', 'c']);
  });
});

describe('resolvePackUrl (sand-shn.1)', () => {
  const urls = { a: '/pack/a-1.json', b: '/pack/b-2.json' };

  it('opens the era the URL names', () => {
    expect(resolvePackUrl(`?${PACK_SLOT}=b`, urls, 'a')).toBe('/pack/b-2.json');
  });

  it('falls back to the seed for no slot, an unknown era, or an empty one', () => {
    expect(resolvePackUrl('', urls, 'a')).toBe('/pack/a-1.json');
    expect(resolvePackUrl('?t=1914-08-02T00:00:00Z', urls, 'a')).toBe('/pack/a-1.json');
    // An id the build never emitted must not leave the reader with nothing.
    expect(resolvePackUrl(`?${PACK_SLOT}=nope`, urls, 'a')).toBe('/pack/a-1.json');
    expect(resolvePackUrl(`?${PACK_SLOT}=`, urls, 'a')).toBe('/pack/a-1.json');
  });
});
