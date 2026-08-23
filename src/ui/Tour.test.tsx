import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Source, Tour } from '../packs/schema/index.js';
import { TourLauncher, TourPanel } from './TourPanel.js';

const sources: Source[] = [
  {
    id: 'source:herwig-2009',
    kind: 'book',
    author: 'Herwig, Holger H.',
    title: 'The Marne, 1914',
    year: 2009,
  },
];

const tour: Tour = {
  id: '1914:tour-the-campaign',
  title: 'The campaign, end to end',
  summary: 'A guided pass over the campaign.',
  sources: [{ source: 'source:herwig-2009' }],
  steps: [
    {
      id: 'one',
      title: 'A plan is a bet about time',
      narration: 'The bet.',
      at: '1914-08-02T00:00:00Z',
    },
    {
      id: 'two',
      title: 'Liège holds',
      narration: 'The forts hold until 16 August.[^herwig-2009]',
      at: '1914-08-05T00:00:00Z',
    },
    { id: 'three', title: 'The Marne', narration: 'The gap.', at: '1914-09-05T00:00:00Z' },
  ],
};

const panel = (over: Partial<Parameters<typeof TourPanel>[0]> = {}) => {
  const props = {
    tour,
    step: tour.steps[1]!,
    index: 1,
    running: true,
    sources,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToggleRunning: vi.fn(),
    onExit: vi.fn(),
    ...over,
  };
  render(<TourPanel {...props} />);
  return props;
};

describe('TourPanel', () => {
  it('shows where the tour is, and the step narration with its citation', () => {
    panel();
    expect(screen.getByRole('region', { name: /Guided tour — The campaign/ })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Liège holds' })).toBeInTheDocument();
    expect(screen.getByText(/The forts hold until 16 August/)).toBeInTheDocument();
    // the footnote resolved to the source registry
    expect(screen.getByText(/Herwig, Holger H\./)).toBeInTheDocument();
  });

  it('offers pause, step and exit at every moment — a tour is never a trap', () => {
    const props = panel();
    fireEvent.click(screen.getByRole('button', { name: 'Pause the tour' }));
    expect(props.onToggleRunning).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(props.onNext).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(props.onPrev).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Exit tour' }));
    expect(props.onExit).toHaveBeenCalled();
  });

  it('says resume when paused, and disables the ends of the tour', () => {
    panel({ running: false, index: 0, step: tour.steps[0]!, onPrev: undefined });
    expect(screen.getByRole('button', { name: 'Resume the tour' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled();
  });
});

describe('TourPanel at a break in the narrative (sand-1l0.28)', () => {
  it('offers Continue instead of Pause, and says what the pause is for', () => {
    const props = panel({
      waiting: true,
      stop: { at: Date.parse('1914-08-25T12:00:00Z'), kind: 'decision', id: '1914:decision-x' },
      onContinue: vi.fn(),
      onSetAutoAdvance: vi.fn(),
    });
    expect(screen.queryByRole('button', { name: 'Pause the tour' })).not.toBeInTheDocument();
    const go = screen.getByRole('button', { name: /Continue past a decision point/ });
    fireEvent.click(go);
    expect(props.onContinue).toHaveBeenCalled();
    expect(screen.getByText(/A decision point — going on shortly/)).toBeInTheDocument();
    // the keyboard route is spelled out, not just implied
    expect(screen.getByText(/Space or → to go on, ← to go back, Esc to leave/)).toBeInTheDocument();
  });

  it('switches between leaning back and reading at your own pace', () => {
    const props = panel({ waiting: true, autoAdvance: true, onSetAutoAdvance: vi.fn() });
    const toggle = screen.getByRole('button', { name: /Auto-advance/ });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(props.onSetAutoAdvance).toHaveBeenCalledWith(false);
  });

  it('waits for the reader when auto-advance is off', () => {
    panel({ waiting: true, autoAdvance: false, onSetAutoAdvance: vi.fn(), onContinue: vi.fn() });
    expect(screen.getByRole('button', { name: /Auto-advance/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByText(/continue when you are ready/)).toBeInTheDocument();
  });
});

describe('TourLauncher', () => {
  it('announces the tour and its length, and starts it', () => {
    const onStart = vi.fn();
    render(<TourLauncher tour={tour} minutes={6} onStart={onStart} />);
    const button = screen.getByRole('button', {
      name: /Play the story — The campaign, end to end, about 6 minutes/,
    });
    fireEvent.click(button);
    expect(onStart).toHaveBeenCalled();
  });
});
