import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Document, ScienceCard, ScienceField, Source } from '../packs/schema/index.js';
import { DocumentCardView } from './DocumentCardView.js';
import { MeanwhileFilter } from './MeanwhileFilter.js';
import { ScienceCardView, whenLabel } from './ScienceCardView.js';

const sources: Source[] = [
  {
    id: 'source:pais-1982',
    kind: 'book',
    author: 'Pais, Abraham',
    title: 'Subtle is the Lord',
    year: 1982,
  },
];
const labeller = {
  label: (id: string) =>
    ({ 'person:einstein': 'Albert Einstein', '1914:marne': 'First Battle of the Marne' })[id],
  open: (id: string, kind: string) => (kind === 'battles' ? () => void id : undefined),
};

describe('whenLabel', () => {
  it('renders full, month and year dates', () => {
    expect(whenLabel('1914-08-21')).toBe('21 August 1914');
    expect(whenLabel('1914-08')).toBe('August 1914');
    expect(whenLabel('1891')).toBe('1891');
    expect(whenLabel('1914-08-21T12:00:00Z')).toBe('21 August 1914');
  });
});

describe('<ScienceCardView>', () => {
  const card: ScienceCard = {
    id: '1914:science-x',
    title: 'The eclipse that did not test relativity',
    field: 'physics',
    at: '1914-08-21',
    people: ['person:einstein'],
    summary: 'Interned in the Crimea.[^pais-1982]',
    connections: [{ to: 'GPS', note: 'clocks corrected daily' }],
    sources: [{ source: 'source:pais-1982' }],
  };
  it('shows the field, date, connections, people chips and sources', () => {
    render(<ScienceCardView card={card} sources={sources} labeller={labeller} />);
    expect(screen.getByText('Meanwhile · Physics')).toBeInTheDocument();
    expect(screen.getByText('21 August 1914')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Connections' })).toHaveTextContent(
      'GPS — clocks corrected daily',
    );
    expect(screen.getByRole('list', { name: 'Related' })).toHaveTextContent('Albert Einstein');
    expect(screen.getByRole('region', { name: 'Sources' })).toHaveTextContent(/Pais, Abraham/);
  });
});

describe('<DocumentCardView>', () => {
  const doc: Document = {
    id: '1914:document-x',
    title: "Joffre's order of the day",
    date: '1914-09-06',
    author: 'person:joffre',
    kind: 'order',
    language: 'fr',
    excerpt: 'Au moment où s’engage une bataille…',
    translation: 'At the moment when a battle is joined…',
    archive: 'AFGG annexes',
    links: { battles: ['1914:marne'] },
    sources: [{ source: 'source:pais-1982' }],
  };
  it('quotes the original with lang, shows the translation, archive and a clickable battle chip', () => {
    const onBack = vi.fn();
    render(<DocumentCardView doc={doc} sources={sources} labeller={labeller} onBack={onBack} />);
    expect(screen.getByText('Document · Order')).toBeInTheDocument();
    expect(screen.getByText(/person:joffre · 6 September 1914/)).toBeInTheDocument(); // unknown person falls back to the id
    const quote = screen.getByText('Au moment où s’engage une bataille…').closest('blockquote');
    expect(quote).toHaveAttribute('lang', 'fr');
    expect(screen.getByText(/At the moment when a battle is joined/)).toBeInTheDocument();
    expect(screen.getByText('AFGG annexes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'First Battle of the Marne' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Back to the narrative/ }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('<MeanwhileFilter>', () => {
  it('lists available fields and toggles them', () => {
    const onToggle = vi.fn();
    const active = new Set<ScienceField>(['physics']);
    render(
      <MeanwhileFilter
        available={['physics', 'ideas-culture']}
        active={active}
        onToggle={onToggle}
      />,
    );
    expect(screen.getByRole('button', { name: 'Physics' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Ideas & culture' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ideas & culture' }));
    expect(onToggle).toHaveBeenCalledWith('ideas-culture');
  });
  it('renders nothing when no fields are available', () => {
    const { container } = render(
      <MeanwhileFilter available={[]} active={new Set()} onToggle={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
