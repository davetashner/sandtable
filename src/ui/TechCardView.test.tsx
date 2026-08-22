import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Source, TechCard } from '../packs/schema/index.js';
import { linksToChips, TechCardView } from './TechCardView.js';

const sources: Source[] = [
  {
    id: 'source:strachan-2001',
    kind: 'book',
    author: 'Strachan, Hew',
    title: 'To Arms',
    year: 2001,
    publisher: 'OUP, Oxford',
  },
];
const card: TechCard = {
  id: '1914:tech-x',
  title: 'Heavy siege artillery',
  field: 'artillery',
  introduced: { at: '1914-08-12', label: 'First fired at Liège, 12 August 1914' },
  summary: 'Forts built against 21 cm met **42 cm** howitzers.[^strachan-2001]',
  body: 'They fell in days.',
  links: { events: ['1914:event-liege'], places: ['place:liege'], people: ['person:nobody'] },
  sources: [{ source: 'source:strachan-2001', pages: '209–212', note: 'the siege train' }],
};

const labeller = {
  label: (id: string) =>
    ({ '1914:event-liege': 'Siege of Liège', 'place:liege': 'Liège' })[id] as string | undefined,
  open: (id: string, kind: string) => (kind === 'events' ? () => void id : undefined),
};

describe('<TechCardView>', () => {
  it('renders eyebrow, title, when, markdown, chips and sources with a back link', () => {
    const onBack = vi.fn();
    render(<TechCardView card={card} sources={sources} labeller={labeller} onBack={onBack} />);
    expect(screen.getByText('Technology · Artillery')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Heavy siege artillery' }),
    ).toBeInTheDocument();
    expect(screen.getByText('First fired at Liège, 12 August 1914')).toBeInTheDocument();
    expect(screen.getByText('42 cm')).toBeInTheDocument();
    expect(screen.getByText('They fell in days.')).toBeInTheDocument();
    const related = screen.getByRole('list', { name: 'Related' });
    expect(related).toHaveTextContent('Siege of Liège');
    expect(related).toHaveTextContent('Liège');
    expect(related).not.toHaveTextContent('nobody'); // unknown ids are skipped
    expect(screen.getByRole('button', { name: 'Liège' })).toBeDisabled(); // place chips are inert
    expect(screen.getByRole('region', { name: 'Sources' })).toHaveTextContent(
      /Strachan, Hew.*pp\. 209–212.*the siege train/,
    );
    fireEvent.click(screen.getByRole('button', { name: /Back to the narrative/ }));
    expect(onBack).toHaveBeenCalled();
  });

  it('turns links into chips with singular kinds', () => {
    const chips = linksToChips(card.links, labeller);
    expect(chips.map((c) => [c.kind, c.label])).toEqual([
      ['event', 'Siege of Liège'],
      ['place', 'Liège'],
    ]);
    expect(chips[0]!.onClick).toBeTypeOf('function');
    expect(chips[1]!.onClick).toBeUndefined();
  });
});
