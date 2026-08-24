import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClockProvider } from '../engine/ClockContext.js';
import type { Timetable } from '../packs/schema/index.js';
import { ClockGauges } from './ClockGauges.js';

const clock: Timetable = {
  id: '1914:clock-x',
  title: 'The plan',
  origin: '1914-08-02T00:00:00Z',
  assumption: 'a',
  milestones: [
    { id: 'liege', label: 'Liège', plannedDay: 12, actualAt: '1914-08-16T00:00:00Z' },
    { id: 'decision', label: 'Decision', plannedDay: 39 },
  ],
  sources: [{ source: 'source:x' }],
};

describe('<ClockGauges>', () => {
  it('renders a gauge per clock with the day and the slip, and opens the card on click', () => {
    const onSelect = vi.fn();
    render(
      <ClockProvider
        range={{ start: Date.UTC(1914, 7, 2), end: Date.UTC(1914, 8, 12) }}
        initialNow={Date.UTC(1914, 7, 17)}
      >
        <ClockGauges clocks={[clock]} onSelect={onSelect} />
      </ClockProvider>,
    );
    const gauge = screen.getByRole('button', { name: /The plan: M\+15, 2 d behind on Liège/ });
    expect(gauge).toHaveAttribute('data-tone', 'behind');
    fireEvent.click(gauge);
    expect(onSelect).toHaveBeenCalledWith('1914:clock-x');
  });
});
