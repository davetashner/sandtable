import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClockProvider } from '../engine/ClockContext.js';
import { DAY } from '../engine/clock.js';
import type { Branch, NarrativeBeat, Side, Source } from '../packs/schema/index.js';
import { formatCitation, selectBeat, withFootnotes } from '../engine/beats.js';
import { Dossier } from './Dossier.js';

const START = Date.UTC(1914, 7, 2);
const END = START + 40 * DAY;
const iso = (d: number) => new Date(START + d * DAY).toISOString().replace(/\.000Z$/, 'Z');

const sources: Source[] = [
  {
    id: 'source:herwig-2009',
    kind: 'book',
    author: 'Herwig, Holger H.',
    title: 'The Marne, 1914',
    year: 2009,
    publisher: 'Random House, New York',
  },
  {
    id: 'source:tuchman-1962',
    kind: 'book',
    author: 'Tuchman, Barbara W.',
    title: 'The Guns of August',
    year: 1962,
  },
];
const sides: Side[] = [
  { id: 'de', name: 'German Empire', short: 'Germany', alliance: 'Central Powers' },
  { id: 'fr', name: 'France', alliance: 'Entente' },
];
const historical: Branch = {
  id: '1914:historical',
  title: 'What happened',
  kind: 'historical',
  summary: 's',
};
const concept: Branch = {
  id: '1914:concept',
  title: "Schlieffen's concept",
  kind: 'counterfactual',
  divergesAt: iso(20),
  summary: 's',
};
const beats: NarrativeBeat[] = [
  {
    id: '1914:beat-a',
    title: 'The door swings open',
    dateLabel: '4–9 August 1914',
    from: iso(2),
    to: iso(7),
    sources: [{ source: 'source:herwig-2009', pages: '90–95' }, { source: 'source:tuchman-1962' }],
    pullQuote: { text: 'The lamps are going out.', attribution: 'Sir Edward Grey' },
    body: 'Germany **declares war**.[^herwig-2009]',
    file: 'a.md',
  },
  {
    id: '1914:beat-b',
    title: 'History after the fork',
    dateLabel: '24 August – on',
    from: iso(20),
    to: iso(40),
    branch: '1914:historical',
    sources: [{ source: 'source:herwig-2009' }],
    body: 'Kluck turns.[^herwig-2009]',
    file: 'b.md',
  },
  {
    id: '1914:beat-c',
    title: 'The wide wheel',
    dateLabel: 'Hypothetical',
    from: iso(20),
    to: iso(40),
    branch: '1914:concept',
    sources: [{ source: 'source:herwig-2009' }],
    body: 'West of Paris.[^herwig-2009]',
    file: 'c.md',
  },
];

function mount(branch: Branch, now: number) {
  return render(
    <ClockProvider range={{ start: START, end: END }} initialNow={now} syncUrl={false}>
      <Dossier
        beats={beats}
        sources={sources}
        sides={sides}
        branch={branch}
        packTitle="Test pack"
      />
    </ClockProvider>,
  );
}

describe('selectBeat / citations', () => {
  it('selects by time, branch and focus; half-open ranges; inclusive at the range end', () => {
    expect(selectBeat(beats, START + 3 * DAY, '1914:historical')?.id).toBe('1914:beat-a');
    expect(selectBeat(beats, START + 7 * DAY, '1914:historical')).toBeUndefined();
    expect(selectBeat(beats, START + 25 * DAY, '1914:historical')?.id).toBe('1914:beat-b');
    expect(selectBeat(beats, START + 25 * DAY, '1914:concept')?.id).toBe('1914:beat-c');
    expect(selectBeat(beats, END, '1914:concept', undefined, END)?.id).toBe('1914:beat-c');
    expect(selectBeat(beats, START + 3 * DAY, '1914:historical', '1914:marne')).toBeUndefined();
  });

  it('formats citations and appends footnote definitions', () => {
    expect(formatCitation(sources[0], 'herwig-2009', '90–95')).toBe(
      'Herwig, Holger H., *The Marne, 1914* (Random House, New York, 2009), pp. 90–95.',
    );
    expect(formatCitation(undefined, 'ghost')).toMatch(/not in the registry/);
    const md = withFootnotes(beats[0]!, sources);
    expect(md).toContain('[^herwig-2009]: Herwig, Holger H.');
    expect(md).toContain('[^tuchman-1962]: Tuchman');
    expect(md).toMatch(/_Also drawing on_\[\^tuchman-1962\]/);
  });
});

describe('<Dossier>', () => {
  it('renders the active beat with markdown, pull quote, footnotes and legend', () => {
    mount(historical, START + 3 * DAY);
    expect(screen.getByRole('complementary', { name: 'Dossier' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'The door swings open' }),
    ).toBeInTheDocument();
    expect(screen.getByText('4–9 August 1914')).toBeInTheDocument();
    expect(screen.getByText('declares war')).toBeInTheDocument();
    expect(screen.getByText('The lamps are going out.')).toBeInTheDocument();
    expect(screen.getByText(/Herwig, Holger H\./)).toBeInTheDocument();
    expect(screen.getByText(/Tuchman, Barbara W\./)).toBeInTheDocument();
    expect(screen.getByLabelText('Legend')).toHaveTextContent('Germany');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('labels counterfactual beats as hypothetical and shows the next beat when none is active', () => {
    mount(concept, START + 25 * DAY);
    expect(screen.getByRole('note')).toHaveTextContent(/Hypothetical/);
    expect(screen.getByRole('heading', { level: 2, name: 'The wide wheel' })).toBeInTheDocument();
  });

  it('shows an empty state with the next beat', () => {
    mount(historical, START + 10 * DAY);
    expect(screen.getByText(/No narrative beat/)).toBeInTheDocument();
    expect(screen.getByText(/History after the fork/)).toBeInTheDocument();
  });
});
