import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClockProvider } from '../engine/ClockContext.js';
import { DAY } from '../engine/clock.js';
import { Timeline } from './Timeline.js';

const START = Date.UTC(1914, 7, 4);
const END = START + 42 * DAY;

function mount() {
  return render(
    <ClockProvider range={{ start: START, end: END }} syncUrl={false}>
      <Timeline
        title="Test"
        phases={[
          { id: 'p1', title: 'Mobilization', from: START, to: START + 5 * DAY },
          {
            id: 'p2',
            title: 'The wide wheel',
            from: START + 20 * DAY,
            to: END,
            hypothetical: true,
          },
        ]}
        markers={[{ id: 'm1', title: 'Liège falls', at: START + 12 * DAY }]}
      />
    </ClockProvider>,
  );
}

describe('<Timeline>', () => {
  it('shows now, the active phase and the scrubber', () => {
    mount();
    expect(screen.getByText('Day 0')).toBeInTheDocument();
    expect(screen.getByText(/4 August 1914/)).toBeInTheDocument();
    expect(screen.getByText('Mobilization', { selector: '.timeline__phase' })).toBeInTheDocument();
    const slider = screen.getByRole('slider', { name: 'Time — Test' });
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('Day 0'));
  });

  it('seeks with the scrubber and a marker, steps with the keyboard', () => {
    mount();
    const slider = screen.getByRole('slider', { name: 'Time — Test' });
    fireEvent.change(slider, { target: { value: String(START + 3 * DAY) } });
    expect(screen.getByText('Day 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Jump to Liège falls' }));
    expect(screen.getByText('Day 12')).toBeInTheDocument();

    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
    expect(screen.getByText('Day 13')).toBeInTheDocument();
    fireEvent.keyDown(slider, { key: 'End' });
    expect(screen.getByText('Day 42')).toBeInTheDocument();
    expect(screen.getByText(/Hypothetical · The wide wheel/)).toBeInTheDocument();
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(screen.getByText('Day 0')).toBeInTheDocument();
  });

  it('toggles play with the button and space, changes speed with the select', () => {
    mount();
    const play = screen.getByRole('button', { name: 'Play' });
    fireEvent.click(play);
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    const speed = screen.getByRole('combobox', { name: 'Playback speed' }) as HTMLSelectElement;
    fireEvent.change(speed, { target: { value: String(DAY) } });
    expect(speed.value).toBe(String(DAY));
  });
});
