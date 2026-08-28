/**
 * The atlas of eras (sand-shn.1): what it lists, where each entry goes, and
 * what a reader sees when the index cannot be read.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { resolvePackUrl, PACK_SLOT } from '../packs/content-bundle.js';
import { Atlas } from './Atlas.js';

const INDEX = {
  default: '1914-schlieffen-marne',
  packs: [
    {
      id: '1914-schlieffen-marne',
      title: 'The Schlieffen Plan and the march to the Marne',
      subtitle: 'A timetable the world fell behind',
      summary: 'Germany staked everything on beating France in six weeks.',
      timeRange: { start: '1914-08-02T00:00:00Z', end: '1914-11-25T00:00:00Z' },
      region: [0, 47, 9, 52],
      status: 'seed',
      bytes: 1099266,
    },
    {
      id: '1915-attrition',
      title: '1915: the year of failed breakthroughs',
      summary: 'Gas at Ypres, and a line that would not move.',
      timeRange: { start: '1915-01-01T00:00:00Z', end: '1915-12-31T00:00:00Z' },
      region: [1.5, 47, 8.5, 51.6],
      status: 'seed',
      bytes: 209264,
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
    expect(eras).toHaveLength(2);

    // The default era is the bare address, so links written before the atlas
    // existed still open the campaign they meant.
    expect(eras[0]).toHaveAttribute('href', '/');
    expect(eras[1]).toHaveAttribute('href', '/?pack=1915-attrition');

    expect(screen.getByText(/failed breakthroughs/)).toBeInTheDocument();
    expect(screen.getByText('August 1914 – November 1914')).toBeInTheDocument();
  });

  it('says when a pack is still being written, rather than letting it pass as finished', async () => {
    stub(INDEX);
    render(<Atlas />);
    await screen.findAllByRole('link');
    expect(screen.getAllByText('seed')).toHaveLength(2);
  });

  it('keeps a way into the campaign when the index cannot be read', async () => {
    stub(null, false);
    render(<Atlas />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not be read/);
    // A dead end is not an option: the campaign is still there.
    expect(screen.getByRole('link', { name: /open the 1914 campaign/i })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('says it is working while it reads', async () => {
    stub(INDEX);
    render(<Atlas />);
    expect(screen.getByRole('status')).toHaveTextContent(/Reading the atlas/);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
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
