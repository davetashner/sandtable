import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Historiography, Source } from '../packs/schema/index.js';
import { seed } from '../packs/seed.js';
import { HistoriographyCardView } from './HistoriographyCardView.js';

const sources: Source[] = [
  {
    id: 'source:edmonds-1933',
    kind: 'official-history',
    tier: 'official-history',
    author: 'Edmonds, J. E.',
    title: 'Military Operations: France and Belgium, 1914, Volume I',
    year: 1933,
  },
];

const labeller = {
  label: (id: string) => ({ '1914:marne': 'First Battle of the Marne' })[id],
  open: () => undefined,
};

const point: Historiography = {
  id: '1914:historiography-x',
  title: 'Whose order was it?',
  question: 'A question, left as one.',
  positions: [
    { label: 'The charge', who: 'The First Army', summary: 'He had no such power.[^edmonds-1933]' },
    { label: 'The defence', who: 'The inquiry of 1917', summary: 'He did not exceed it.' },
  ],
  settled: 'That the instructions were verbal.',
  unread: 'Bd. 4 is not digitised.',
  links: { battles: ['1914:marne'] },
  sources: [{ source: 'source:edmonds-1933', pages: '348' }],
};

describe('<HistoriographyCardView>', () => {
  it('names the family, both positions and their holders, and takes no side', () => {
    render(<HistoriographyCardView point={point} sources={sources} labeller={labeller} />);
    expect(screen.getByText('Historiography · a contested point')).toBeInTheDocument();
    // The card says in its own meta line that it is not deciding.
    expect(screen.getByText('2 positions — the pack takes none of them')).toBeInTheDocument();
    for (const p of point.positions) {
      expect(screen.getByRole('heading', { level: 3, name: p.label })).toBeInTheDocument();
      expect(screen.getByText(p.who)).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { level: 3, name: 'What is not in dispute' })).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 3, name: 'What would settle it, and is unread' }),
    ).toBeVisible();
    expect(screen.getByRole('list', { name: 'Related' })).toHaveTextContent(
      'First Battle of the Marne',
    );
    expect(screen.getByRole('region', { name: 'Sources' })).toHaveTextContent(/Edmonds/);
  });

  // Both sides on screen at once is the whole design (ADR 0017): a tabbed or
  // collapsed card would make the reader choose before they have read.
  it('renders every position at once, in order, in one list', () => {
    render(<HistoriographyCardView point={point} sources={sources} labeller={labeller} />);
    const list = document.querySelector('ol.hgraphy__positions');
    expect(list?.querySelectorAll('.hgraphy__position')).toHaveLength(2);
    expect(document.querySelectorAll('details, [role="tab"]')).toHaveLength(0);
  });

  it('omits the two asides when the point does not carry them', () => {
    const bare: Historiography = {
      ...point,
      settled: undefined,
      unread: undefined,
    } as Historiography;
    render(<HistoriographyCardView point={bare} sources={sources} labeller={labeller} />);
    expect(screen.queryByText('What is not in dispute')).not.toBeInTheDocument();
    expect(screen.queryByText('What would settle it, and is unread')).not.toBeInTheDocument();
  });
});

describe('the 1914 pack’s contested points', () => {
  it('every one carries at least two positions, with different holders', () => {
    expect(seed.historiography.length).toBeGreaterThan(0);
    for (const h of seed.historiography) {
      expect(h.positions.length, h.id).toBeGreaterThanOrEqual(2);
      expect(new Set(h.positions.map((p) => p.who)).size, h.id).toBe(h.positions.length);
    }
  });

  /**
   * The point this bead exists to close: Hentsch's portrait manifest named
   * `1914:historiography-hentsch-authority` for two years and nothing was
   * there (#112). The id is the manifest's, and the entity is now real.
   */
  it('includes the one Hentsch’s portrait has been asking for', () => {
    const hentsch = seed.historiography.find(
      (h) => h.id === '1914:historiography-hentsch-authority',
    );
    expect(hentsch).toBeDefined();
    expect(hentsch!.unread, 'a card built on unreadable volumes must say so').toMatch(/Bd\. 4/);
  });
});
