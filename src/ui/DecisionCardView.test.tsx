import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DecisionPoint, Source } from '../packs/schema/index.js';
import { DecisionCardView } from './DecisionCardView.js';

const decision: DecisionPoint = {
  id: '1914:decision-x',
  at: '1914-08-25T12:00:00Z',
  title: 'Two corps for East Prussia?',
  actor: 'person:moltke',
  question: 'Do you send corps east?',
  options: [
    { id: 'send', label: 'Send two corps east now', summary: 'Detach them.' },
    {
      id: 'keep',
      label: 'Keep every corps',
      summary: 'Accept risk in the East.',
      branch: '1914:schlieffen-success',
    },
  ],
  historical: 'send',
  reasoning: 'Moltke believed the West was won.',
  verdict: 'The corps were missing at the Marne.',
  sources: [{ source: 'source:herwig-2009' }],
};
const sources: Source[] = [
  {
    id: 'source:herwig-2009',
    kind: 'book',
    title: 'The Marne, 1914',
    authors: ['Herwig, Holger H.'],
    year: 2009,
  } as unknown as Source,
];
const labeller = {
  label: (id: string) => (id === 'person:moltke' ? 'Helmuth von Moltke' : undefined),
};

describe('<DecisionCardView>', () => {
  it('asks for a decision, then reveals what happened, the reasoning, the verdict and the branch', () => {
    const onPick = vi.fn();
    const onPlayBranch = vi.fn();
    const { rerender } = render(
      <DecisionCardView
        decision={decision}
        sources={sources}
        labeller={labeller}
        onPick={onPick}
        onPlayBranch={onPlayBranch}
      />,
    );
    expect(screen.getByText('Decision point ◇')).toBeInTheDocument();
    expect(screen.getByText(/Helmuth von Moltke must decide/)).toBeInTheDocument();
    expect(screen.getByText('Decide as Helmuth von Moltke')).toBeInTheDocument();
    expect(screen.queryByText(/What was known at the time/)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sources' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Keep every corps/ }));
    expect(onPick).toHaveBeenCalledWith('keep');
    rerender(
      <DecisionCardView
        decision={decision}
        sources={sources}
        labeller={labeller}
        pick="keep"
        onPick={onPick}
        onPlayBranch={onPlayBranch}
      />,
    );
    expect(screen.getByText('your choice')).toBeInTheDocument();
    expect(screen.getByText('what happened')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send two corps east now/ })).toHaveAttribute(
      'data-historical',
      'true',
    );
    expect(screen.getByText('What was known at the time')).toBeInTheDocument();
    expect(screen.getByText(/Moltke believed the West was won/)).toBeInTheDocument();
    expect(screen.getByText(/missing at the Marne/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toHaveTextContent(/The Marne, 1914/);
    fireEvent.click(screen.getByRole('button', { name: 'Play this choice on the map' }));
    expect(onPlayBranch).toHaveBeenCalledWith('1914:schlieffen-success');
    fireEvent.click(screen.getByRole('button', { name: 'Compare with what happened' }));
    expect(onPlayBranch).toHaveBeenCalledWith(undefined);
    // clicking the picked option again clears the pick
    fireEvent.click(screen.getByRole('button', { name: /Keep every corps/ }));
    expect(onPick).toHaveBeenLastCalledWith(undefined);
  });
});
