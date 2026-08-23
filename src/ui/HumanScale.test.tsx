import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClockProvider } from '../engine/ClockContext.js';
import type { CasualtyRecord, Side, Source, Vignette } from '../packs/schema/index.js';
import { CasualtyCardView } from './CasualtyCardView.js';
import { HumanCostLine } from './HumanCostLine.js';
import { VignetteView, momentLabel } from './VignetteView.js';

const sources = [
  {
    id: 'source:steg-2013',
    kind: 'book',
    title: 'Le jour le plus meurtrier',
    author: 'Steg, J.-M.',
    year: 2013,
  },
  {
    id: 'source:herwig-2009',
    kind: 'book',
    title: 'The Marne, 1914',
    author: 'Herwig, H.',
    year: 2009,
  },
] as Source[];
const sides: Side[] = [
  { id: 'de', name: 'German Empire', short: 'Germany' },
  { id: 'fr', name: 'France' },
  { id: 'gb', name: 'United Kingdom', short: 'Britain' },
];
const records: CasualtyRecord[] = [
  {
    id: '1914:casualties-22-august',
    title: '22 August 1914',
    timeRange: { start: '1914-08-22T00:00:00Z', end: '1914-08-23T00:00:00Z' },
    figures: [
      {
        side: 'fr',
        category: 'killed',
        value: 27000,
        confidence: 'medium',
        note: 'Dead on the day.',
        sources: [{ source: 'source:steg-2013' }],
      },
    ],
    summary: 'The Ardennes.[^steg-2013]',
    historiography: 'Steg’s count.[^steg-2013]',
    sources: [{ source: 'source:steg-2013' }],
  },
  {
    id: '1914:casualties-marne',
    title: 'The Marne',
    timeRange: { start: '1914-09-05T00:00:00Z', end: '1914-09-12T00:00:00Z' },
    figures: [
      { side: 'fr', category: 'casualties', low: 200000, high: 250000, confidence: 'contested' },
      { side: 'de', category: 'casualties', low: 200000, high: 250000, confidence: 'contested' },
    ],
    sources: [{ source: 'source:herwig-2009' }],
  },
];
const labeller = { label: (id: string) => (id === 'person:x' ? 'Someone' : undefined) };
const wrap = (ui: React.ReactNode, now: number) => (
  <ClockProvider
    range={{ start: Date.UTC(1914, 7, 2), end: Date.UTC(1914, 10, 25) }}
    initialNow={now}
  >
    {ui}
  </ClockProvider>
);

describe('<HumanCostLine>', () => {
  it('is quiet before any record has ended, then reads the to-date sums and opens the latest record', () => {
    const onSelect = vi.fn();
    const early = render(
      wrap(
        <HumanCostLine records={records} sides={sides} onSelect={onSelect} />,
        Date.UTC(1914, 7, 10),
      ),
    );
    expect(
      screen.getByRole('listitem', { name: /Human cost to date: No recorded losses yet/ }),
    ).toBeDisabled();
    early.unmount();
    render(
      wrap(
        <HumanCostLine records={records} sides={sides} onSelect={onSelect} />,
        Date.UTC(1914, 8, 20),
      ),
    );
    const line = screen.getByRole('listitem', { name: /Human cost to date/ });
    expect(line).toHaveAccessibleName(/France 27,000 killed/);
    expect(line).toHaveAccessibleName(/France 200,000–250,000 killed, wounded and missing/);
    expect(line).toHaveAccessibleName(/Germany 200,000–250,000/);
    expect(line).toHaveTextContent('2 recorded periods');
    fireEvent.click(line);
    expect(onSelect).toHaveBeenCalledWith('1914:casualties-marne');
  });
});

describe('<CasualtyCardView>', () => {
  it('shows the figures with confidence and range, the footnoted text, and the to-date sum at the clock', () => {
    render(
      wrap(
        <CasualtyCardView
          record={records[1]!}
          records={records}
          sides={sides}
          sources={sources}
          labeller={labeller}
        />,
        Date.UTC(1914, 8, 1),
      ),
    );
    expect(screen.getByText('Human cost')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The Marne' })).toBeInTheDocument();
    expect(screen.getByText('5 September 1914 – 11 September 1914')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('France');
    expect(rows[1]).toHaveTextContent('200,000–250,000');
    expect(rows[1]).toHaveTextContent('contested');
    // on 1 September only the 22 August record has ended
    const todate = screen.getByRole('region', { name: 'To date' });
    expect(todate).toHaveTextContent('1 recorded period');
    expect(todate).toHaveTextContent('France 27,000 killed');
    expect(todate).not.toHaveTextContent('German Empire');
  });
  it('renders summary and historiography with footnotes and lists the figure sources', () => {
    render(
      wrap(
        <CasualtyCardView
          record={records[0]!}
          records={records}
          sides={sides}
          sources={sources}
          labeller={labeller}
        />,
        Date.UTC(1914, 7, 10),
      ),
    );
    expect(screen.getByRole('heading', { name: '22 August 1914' })).toBeInTheDocument();
    expect(screen.getByText(/The Ardennes\./)).toBeInTheDocument();
    expect(screen.getByText(/The figures\./)).toBeInTheDocument();
    expect(screen.getByText(/No recorded period has ended yet/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toHaveTextContent(/Steg/);
  });
});

describe('<VignetteView>', () => {
  const vignettes: Vignette[] = [
    {
      id: '1914:vignette-a',
      title: 'A staff officer knocks',
      at: '1914-08-07T12:00:00Z',
      voice: 'Erich Ludendorff',
      kind: 'memoir',
      text: 'He hammers on the gate.[^herwig-2009]',
      people: ['person:x'],
      sources: [{ source: 'source:herwig-2009' }],
    },
  ];
  it('renders the voice, kind, moment, footnoted text and people', () => {
    render(<VignetteView vignettes={vignettes} sources={sources} label={labeller.label} />);
    const region = screen.getByRole('region', { name: 'Voices' });
    expect(region).toHaveTextContent('Erich Ludendorff');
    expect(region).toHaveTextContent('Memoir');
    expect(region).toHaveTextContent('7 August 1914 · 12:00');
    expect(region).toHaveTextContent('He hammers on the gate.');
    expect(region).toHaveTextContent('Herwig');
    expect(region).toHaveTextContent('Someone');
    expect(screen.getByRole('article', { name: 'A staff officer knocks' })).toHaveAttribute(
      'data-kind',
      'memoir',
    );
  });
  it('renders nothing without vignettes', () => {
    const { container } = render(<VignetteView vignettes={[]} sources={sources} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('labels a midnight moment by date alone', () => {
    expect(momentLabel('1914-08-22T00:00:00Z')).toBe('22 August 1914');
    expect(momentLabel('1914-09-09T11:30:00Z')).toBe('9 September 1914 · 11:30');
  });
});
