import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClockProvider } from '../engine/ClockContext.js';
import type { Source, Tally } from '../packs/schema/index.js';
import { TallyCardView } from './TallyCardView.js';
import { TallyGauges } from './TallyGauges.js';

const tally: Tally = {
  id: '1914:tally-x',
  title: 'The right wing bleeds',
  unit: 'corps',
  start: { value: 16, asOf: '1914-08-17T12:00:00Z' },
  entries: [
    {
      id: 'antwerp',
      at: '1914-08-20T12:00:00Z',
      delta: -1,
      label: 'III Reserve to Antwerp',
      formations: ['1914:corps-de-iii-res'],
    },
    { id: 'east', at: '1914-08-26T00:00:00Z', delta: -2, label: 'Two corps east' },
  ],
  comparisons: [{ id: 'c1', label: 'Memorandum', a: 59, b: 9, unit: 'divisions' }],
  summary: 'Weight left the wheel.[^x]',
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
const labeller = {
  label: (id: string) => (id === '1914:corps-de-iii-res' ? 'German III Reserve Corps' : undefined),
};

describe('<TallyCardView>', () => {
  it('lists the ledger with running totals, formation names and the comparisons', () => {
    render(<TallyCardView tally={tally} sources={sources} labeller={labeller} />);
    expect(screen.getByText('Strength ledger')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent(/Start/);
    expect(rows[1]).toHaveTextContent(/16 corps/);
    expect(rows[2]).toHaveTextContent(/III Reserve to Antwerp/);
    expect(rows[2]).toHaveTextContent(/German III Reserve Corps/);
    expect(rows[2]).toHaveTextContent(/−1/);
    expect(rows[2]).toHaveTextContent(/15/);
    expect(rows[3]).toHaveTextContent(/13/);
    expect(screen.getByRole('region', { name: 'Comparisons' })).toHaveTextContent(
      /59 : 9 divisions · 6.6 to 1/,
    );
    expect(document.querySelector('.footnotes')).toHaveTextContent(/A Book/);
  });
});

describe('<TallyGauges>', () => {
  it('reads the running value at the clock and opens the card', () => {
    render(
      <ClockProvider
        range={{ start: Date.UTC(1914, 7, 2), end: Date.UTC(1914, 8, 12) }}
        initialNow={Date.UTC(1914, 7, 27)}
      >
        <TallyGauges tallies={[tally]} />
      </ClockProvider>,
    );
    const gauge = screen.getByRole('listitem', {
      name: 'The right wing bleeds: 13 of 16 corps, 3 gone',
    });
    expect(gauge).toHaveAttribute('data-tone', 'behind');
  });
});
