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
    expect(joffre?.originalUrl?.startsWith('https://commons.wikimedia.org/')).toBe(true);
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

  it('footnotes how the map’s positions were derived, and flags the approximate ones (sand-23b.4)', () => {
    render(
      <PersonCardView
        person={joffre}
        sources={sources}
        labeller={labeller}
        tracks={[
          {
            id: '1914:track-joffre-gqg',
            person: 'person:joffre-joseph',
            kind: 'hq',
            post: 'GQG',
            waypoints: [
              [4.58, 48.72, '1914-08-05T12:00:00Z'],
              [4.7, 48.24, '1914-09-05T12:00:00Z', 'low'],
            ],
            confidence: 'medium',
            derivation: 'Towns, not buildings; days, not hours.',
            sources: [{ source: 'source:herwig-2009' }],
          },
        ]}
      />,
    );
    const section = screen.getByRole('region', { name: 'Positions on the map' });
    expect(section).toHaveTextContent('Headquarters · GQG — inferred from the sources');
    expect(section).toHaveTextContent('Towns, not buildings; days, not hours.');
    // one low waypoint on a medium track is enough for the map to say so
    expect(section).toHaveTextContent(/drawn on the map as approximate/);
  });

  it('says nothing about positions when the person has no track', () => {
    render(<PersonCardView person={joffre} sources={sources} labeller={labeller} />);
    expect(screen.queryByRole('region', { name: 'Positions on the map' })).toBeNull();
  });

  it('renders a profile when a cast entry is given: headshot first, period role, footnoted bio, "In brief"', () => {
    const { container } = render(
      <PersonCardView
        person={joffre}
        sources={sources}
        labeller={labeller}
        cast={{
          id: '1914:cast-joffre-joseph',
          person: 'person:joffre-joseph',
          side: 'fr',
          role: 'Commander-in-Chief of the French armies',
          bio: 'Plan XVII failed on the frontiers.[^herwig-2009]\n\nHe did not panic.[^herwig-2009]',
          sources: [{ source: 'source:herwig-2009' }],
        }}
      />,
    );
    expect(
      screen.getByText(/Commander-in-Chief of the French armies — 12 January 1852/),
    ).toBeInTheDocument();
    // headshot precedes the body
    const hero = container.querySelector('.card__hero');
    const body = container.querySelector('.card__body');
    expect(hero).not.toBeNull();
    expect(body).not.toBeNull();
    expect(hero!.compareDocumentPosition(body!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(body).toHaveTextContent('Plan XVII failed on the frontiers.');
    expect(body!.querySelector('.footnotes')).toHaveTextContent(/Herwig/);
    expect(screen.getByRole('region', { name: 'In brief' })).toHaveTextContent(
      /Author of Plan XVII/,
    );
  });
});
