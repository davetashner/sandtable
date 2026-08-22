import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { mediaIndex, portraitFor } from '../packs/media-index.js';
import type { Person, Source } from '../packs/schema/index.js';
import { MediaFigure } from './MediaFigure.js';
import { PersonCardView } from './PersonCardView.js';

const sources: Source[] = [
  {
    id: 'source:herwig-2009',
    kind: 'book',
    author: 'Herwig, Holger H.',
    title: 'The Marne, 1914',
    year: 2009,
  },
];
const labeller = { label: () => undefined };

describe('media index', () => {
  it('lists every manifest with derivatives and a portrait per person', () => {
    expect(mediaIndex.entries.length).toBeGreaterThanOrEqual(21);
    const joffre = portraitFor('person:joffre-joseph');
    expect(joffre?.variants.map((v) => v.width)).toEqual([320, 640, 1024]);
    expect(joffre?.colorized).toBe(true);
    expect(joffre?.originalUrl).toMatch(/commons\.wikimedia\.org/);
    expect(joffre?.credit).toMatch(/BnF Gallica/);
  });
});

describe('<MediaFigure>', () => {
  it('renders srcset from the derivatives, the colorized label, credit and show-original link', () => {
    const entry = portraitFor('person:joffre-joseph')!;
    render(<MediaFigure entry={entry} width={320} fit="portrait" />);
    const img = screen.getByRole('img', { name: entry.caption });
    expect(img).toHaveAttribute(
      'srcset',
      expect.stringContaining(
        '/assets/media/people/joffre-joseph/.derived/portrait-colorized.w640.webp 640w',
      ),
    );
    expect(img).toHaveAttribute(
      'src',
      '/assets/media/people/joffre-joseph/.derived/portrait-colorized.w320.webp',
    );
    expect(screen.getByText('Colorized (AI-assisted)')).toBeInTheDocument();
    expect(screen.getByText(/BnF Gallica/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show original' })).toHaveAttribute(
      'href',
      entry.originalUrl,
    );
  });
});

describe('<PersonCardView>', () => {
  const joffre: Person = {
    id: 'person:joffre-joseph',
    name: 'Joseph Joffre',
    born: '1852-01-12',
    died: '1931-01-03',
    nationality: 'FR',
    roles: [{ title: 'Commander-in-Chief, French armies', from: '1914-08-02', to: '1916-12' }],
    summary: 'Author of Plan XVII and of the Marne counterstroke.',
    sources: [{ source: 'source:herwig-2009' }],
  };
  it('shows the portrait with credit, dates, roles, commands and sources', () => {
    render(
      <PersonCardView
        person={joffre}
        sources={sources}
        labeller={labeller}
        commands={[{ id: '1914:army-fr-x', label: 'French armies' }]}
      />,
    );
    expect(screen.getByText('Person · FR')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Joseph Joffre' })).toBeInTheDocument();
    expect(
      screen.getByText(
        /12 January 1852 – 3 January 1931 — Commander-in-Chief, French armies \(2 August 1914 – December 1916\)/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Joseph Joffre/ })).toBeInTheDocument();
    expect(screen.getByText('Colorized (AI-assisted)')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Related' })).toHaveTextContent('French armies');
    expect(screen.getByRole('region', { name: 'Sources' })).toHaveTextContent(/Herwig/);
  });
});
