import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClockProvider, useViewState } from '../engine/ClockContext.js';
import { DAY } from '../engine/clock.js';
import type { Branch } from '../packs/schema/index.js';
import { BranchToggle } from './BranchToggle.js';

const START = Date.UTC(1914, 7, 2);
const branches: Branch[] = [
  { id: '1914:historical', title: 'What happened', kind: 'historical', summary: 'History.' },
  {
    id: '1914:concept',
    title: "Schlieffen's concept",
    kind: 'counterfactual',
    divergesAt: '1914-08-25T00:00:00Z',
    summary: 'Hypothetical.',
  },
];

function Probe() {
  const { branch } = useViewState();
  return <output data-testid="branch">{branch ?? '(default)'}</output>;
}

describe('<BranchToggle>', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/?t=1914-08-30T00:00:00Z');
  });

  it('switches the URL branch slot and keeps the time', () => {
    render(
      <ClockProvider range={{ start: START, end: START + 40 * DAY }}>
        <BranchToggle branches={branches} defaultBranch="1914:historical" />
        <Probe />
      </ClockProvider>,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    expect(radios[1]).toHaveAccessibleName(/Schlieffen's concept/);
    expect(radios[1]).toHaveAccessibleName(/hypothetical/);

    fireEvent.click(radios[1]!);
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('branch')).toHaveTextContent('1914:concept');
    expect(window.location.search).toBe('?t=1914-08-30T00:00:00Z&branch=1914:concept');

    fireEvent.click(radios[0]!);
    expect(screen.getByTestId('branch')).toHaveTextContent('(default)');
    expect(window.location.search).toBe('?t=1914-08-30T00:00:00Z');
  });

  it('reads the initial branch from the URL', () => {
    window.history.replaceState(null, '', '/?branch=1914:concept');
    render(
      <ClockProvider range={{ start: START, end: START + 40 * DAY }}>
        <BranchToggle branches={branches} defaultBranch="1914:historical" />
      </ClockProvider>,
    );
    expect(screen.getByRole('radio', { name: /concept/ })).toHaveAttribute('aria-checked', 'true');
  });
});
