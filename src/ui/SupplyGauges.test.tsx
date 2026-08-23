import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClockProvider } from '../engine/ClockContext.js';
import type { Route, Source, SupplyLine } from '../packs/schema/index.js';
import { SupplyCardView } from './SupplyCardView.js';
import { SupplyGauges } from './SupplyGauges.js';

const routes: Route[] = [
  {
    id: 'r-army',
    formation: '1914:army',
    waypoints: [
      [5, 50, '1914-08-10T00:00:00Z'],
      [3, 50, '1914-08-14T00:00:00Z'],
    ],
    confidence: 'medium',
    sources: [{ source: 'source:x' }],
  },
  {
    id: 'r-rail',
    formation: '1914:rail',
    waypoints: [
      [6, 50, '1914-08-10T00:00:00Z'],
      [5, 50, '1914-08-14T00:00:00Z'],
    ],
    confidence: 'low',
    sources: [{ source: 'source:x' }],
  },
];
const line: SupplyLine = {
  id: '1914:supply-x',
  title: 'Feet against rail',
  army: '1914:army',
  railhead: '1914:rail',
  thresholdKm: 100,
  summary: 'Horses.[^x]',
  sources: [{ source: 'source:x' }],
};
const sources = [
  {
    id: 'source:x',
    kind: 'book',
    title: 'A Book',
    authors: ['A.'],
    year: 2000,
  } as unknown as Source,
];
const wrap = (ui: React.ReactNode) => (
  <ClockProvider
    range={{ start: Date.UTC(1914, 7, 2), end: Date.UTC(1914, 8, 12) }}
    initialNow={Date.UTC(1914, 7, 14)}
  >
    {ui}
  </ClockProvider>
);

describe('<SupplyGauges> and <SupplyCardView>', () => {
  it('reads marched km and the railhead gap at the clock, strained past the threshold, and opens the card', () => {
    const onSelect = vi.fn();
    render(
      wrap(
        <SupplyGauges
          lines={[line]}
          routes={routes}
          label={() => '1. Armee'}
          onSelect={onSelect}
        />,
      ),
    );
    const gauge = screen.getByRole('listitem', {
      name: /1\. Armee: marched 14\d km, railhead 14\d km behind/,
    });
    expect(gauge).toHaveAttribute('data-tone', 'behind');
    fireEvent.click(gauge);
    expect(onSelect).toHaveBeenCalledWith('1914:supply-x');
  });
  it('renders the card with the live numbers and footnoted summary', () => {
    render(
      wrap(
        <SupplyCardView
          line={line}
          routes={routes}
          sources={sources}
          labeller={{ label: () => '1. Armee' }}
        />,
      ),
    );
    expect(screen.getByText('Rail against feet')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows[0]).toHaveTextContent(/Marched so far14\d km/);
    expect(rows[1]).toHaveTextContent(/Railhead behind the army14\d km/);
    expect(rows[2]).toHaveTextContent(/100 km/);
    expect(document.querySelector('.footnotes')).toHaveTextContent(/A Book/);
  });
});
