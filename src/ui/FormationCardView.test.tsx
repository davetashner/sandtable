import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { ClockProvider } from '../engine/ClockContext.js';
import { DAY } from '../engine/clock.js';
import type { Formation, Route, Side, Source } from '../packs/schema/index.js';
import { FormationCardView } from './FormationCardView.js';

// The commander is a portrait chip that links to his card, and an entity link
// reads the URL slots — the same context every card is mounted inside.
const START = Date.UTC(1914, 7, 2);
const render = (ui: ReactElement) =>
  rtlRender(
    <ClockProvider range={{ start: START, end: START + 40 * DAY }} syncUrl={false}>
      {ui}
    </ClockProvider>,
  );

const sources: Source[] = [
  {
    id: 'source:edmonds-1922',
    kind: 'official-history',
    tier: 'official-history',
    author: 'Edmonds, James E.',
    title: 'Military Operations: France and Belgium, 1914',
    year: 1922,
  },
  {
    id: 'source:herwig-2009',
    kind: 'book',
    tier: 'study',
    author: 'Herwig, Holger H.',
    title: 'The Marne, 1914',
    year: 2009,
  },
];

const sides: Side[] = [
  { id: 'de', name: 'German Empire', short: 'Germany', alliance: 'Central Powers' },
  { id: 'gb', name: 'British Empire', short: 'Britain', alliance: 'Entente' },
];

const bef: Formation = {
  id: '1914:bef',
  name: 'British Expeditionary Force',
  short: 'BEF',
  side: 'gb',
  kind: 'army',
  commander: 'person:french-john',
  strength: {
    men: 80000,
    corps: 2,
    divisions: 4,
    asOf: '1914-08-21',
    sources: [{ source: 'source:edmonds-1922' }],
  },
  concentration: {
    area: "Maubeuge–Le Cateau, on the left of Lanrezac's 5th Army",
    asOf: '1914-08-21',
    sources: [{ source: 'source:edmonds-1922' }],
  },
  summary: 'I Corps and II Corps, the Cavalry Division and the 19th Brigade.',
  sources: [{ source: 'source:edmonds-1922' }, { source: 'source:herwig-2009' }],
};

const labels: Record<string, string> = {
  'person:french-john': 'Sir John French',
  '1914:corps-gb-i': 'I Corps',
};

const opened: string[] = [];
const labeller = {
  label: (id: string) => labels[id],
  open: (id: string, kind: string) =>
    kind === 'formations' ? () => opened.push(id) : (undefined as (() => void) | undefined),
};

describe('<FormationCardView>', () => {
  it('renders the identity, the side, the map label and the summary', () => {
    render(
      <FormationCardView formation={bef} sources={sources} labeller={labeller} sides={sides} />,
    );
    expect(screen.getByText('Formation · Army')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'British Expeditionary Force' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/British Empire/)).toHaveTextContent('“BEF” on the map');
    expect(screen.getByText(/I Corps and II Corps/)).toBeInTheDocument();
  });

  it('names the commander, as a face at name size linked to his card', () => {
    render(
      <FormationCardView formation={bef} sources={sources} labeller={labeller} sides={sides} />,
    );
    const section = screen.getByRole('region', { name: 'Commander' });
    expect(section).toHaveTextContent('Sir John French');
    expect(screen.getByRole('link', { name: 'Sir John French' })).toHaveAttribute(
      'href',
      '?card=person:french-john',
    );
  });

  it('gives the strength its figures and its date, and the concentration its area', () => {
    render(
      <FormationCardView formation={bef} sources={sources} labeller={labeller} sides={sides} />,
    );
    expect(screen.getByRole('region', { name: 'Strength' })).toHaveTextContent(
      'Strength, 21 August 1914',
    );
    expect(screen.getByRole('rowheader', { name: 'Men' }).nextSibling).toHaveTextContent('80,000');
    expect(screen.getByRole('rowheader', { name: 'Infantry divisions' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Concentration' })).toHaveTextContent(
      'Maubeuge–Le Cateau',
    );
  });

  it('cites the sources of the numbers as well as of the formation, once each', () => {
    render(
      <FormationCardView formation={bef} sources={sources} labeller={labeller} sides={sides} />,
    );
    const list = screen.getByRole('region', { name: 'Sources' });
    expect(list.querySelectorAll('li')).toHaveLength(2); // Edmonds cited three times, listed once
    expect(list).toHaveTextContent('Edmonds');
    expect(list).toHaveTextContent('Herwig');
  });

  it('opens the formations above and below it from its chips', () => {
    opened.length = 0;
    render(
      <FormationCardView
        formation={{ ...bef, parent: '1914:army-group' }}
        sources={sources}
        labeller={labeller}
        sides={sides}
        subordinates={[{ id: '1914:corps-gb-i', label: 'I Corps' }]}
      />,
    );
    const related = screen.getByRole('list', { name: 'Related' });
    expect(related).not.toHaveTextContent('army-group'); // an id the labeller cannot name is skipped
    fireEvent.click(screen.getByRole('button', { name: 'I Corps' }));
    expect(opened).toEqual(['1914:corps-gb-i']);
  });

  it('shows a plate set when the formation carries one, and nothing when it cannot resolve', () => {
    const entry = {
      id: 'media:kit/a/a',
      dir: 'kit/a',
      original: { src: 'a.jpg', width: 800, height: 600, type: 'image/jpeg' },
      variants: [{ src: 'a-400.webp', width: 400, height: 300, type: 'image/webp' }],
      width: 800,
      height: 600,
      caption: 'A cap',
      credit: 'A museum',
      licence: 'PD',
      colorized: false,
      present: true,
    };
    const withPlates: Formation = {
      ...bef,
      plates: {
        axis: 'British kit, 1914',
        items: [
          { media: 'media:kit/a/a', label: 'Cap' },
          { media: 'media:kit/b/b', label: 'Rifle' },
        ],
      },
    };
    const { unmount } = render(
      <FormationCardView
        formation={withPlates}
        sources={sources}
        labeller={labeller}
        sides={sides}
        resolveMedia={(id) => (id === 'media:kit/a/a' ? entry : undefined)}
      />,
    );
    // One of the two plates resolves; two is the floor, so the set stays off.
    expect(screen.queryByRole('figure', { name: 'British kit, 1914' })).not.toBeInTheDocument();
    unmount();

    render(
      <FormationCardView
        formation={withPlates}
        sources={sources}
        labeller={labeller}
        sides={sides}
        resolveMedia={() => entry}
      />,
    );
    expect(screen.getByRole('figure', { name: 'British kit, 1914' })).toHaveTextContent('Rifle');
  });

  it('goes back to the narrative', () => {
    const onBack = vi.fn();
    render(
      <FormationCardView
        formation={bef}
        sources={sources}
        labeller={labeller}
        sides={sides}
        onBack={onBack}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Back to the narrative/ }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('<FormationCardView> positions (sand-23b.4)', () => {
  const routes: Route[] = [
    {
      id: '1914:route-bef',
      formation: '1914:bef',
      waypoints: [
        [3.95, 50.45, '1914-08-21T12:00:00Z'],
        [3.63, 50.44, '1914-08-23T12:00:00Z'],
      ],
      confidence: 'medium',
      derivation: 'Centre of the two corps at noon each day from the Official History; ±10 km.',
      sources: [{ source: 'source:edmonds-1922' }],
    },
    {
      id: '1914:route-bef-schlieffen',
      formation: '1914:bef',
      branch: '1914:schlieffen-success',
      waypoints: [
        [2.8, 49.4, '1914-09-01T12:00:00Z'],
        [1.5, 48.4, '1914-09-05T12:00:00Z'],
      ],
      confidence: 'low',
      derivation: 'Hypothetical, schematic.',
      sources: [{ source: 'source:herwig-2009' }],
    },
  ];

  it('footnotes the historical legs and leaves the counterfactual out', () => {
    render(
      <FormationCardView
        formation={bef}
        sources={sources}
        labeller={labeller}
        sides={sides}
        routes={routes}
      />,
    );
    const section = screen.getByRole('region', { name: 'Positions on the map' });
    expect(section).toHaveTextContent('On foot — inferred from the sources');
    expect(section).toHaveTextContent(/Centre of the two corps at noon/);
    expect(section).not.toHaveTextContent(/Hypothetical, schematic/);
    expect(section).not.toHaveTextContent(/drawn on the map as approximate/);
  });

  it('says so when the pack calls the positions approximate', () => {
    const schematic: Route = { ...routes[0]!, confidence: 'low' };
    render(
      <FormationCardView
        formation={bef}
        sources={sources}
        labeller={labeller}
        sides={sides}
        routes={[schematic]}
      />,
    );
    expect(screen.getByRole('region', { name: 'Positions on the map' })).toHaveTextContent(
      /drawn on the map as approximate/,
    );
  });

  it('says nothing about positions when the formation has no route', () => {
    render(<FormationCardView formation={bef} sources={sources} labeller={labeller} />);
    expect(screen.queryByRole('region', { name: 'Positions on the map' })).toBeNull();
  });
});
