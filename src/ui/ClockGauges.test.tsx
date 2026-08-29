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

const washington: Timetable = {
  id: '1941:clock-washington',
  title: 'The Washington clock',
  origin: '1941-11-26T00:00:00Z',
  dayLabel: 'D+',
  assumption: 'a',
  milestones: [
    {
      id: 'one-oclock',
      label: 'One o’clock in Washington',
      plannedAt: '1941-12-07T18:00:00Z',
      actualAt: '1941-12-07T19:20:00Z',
    },
  ],
  sources: [{ source: 'source:x' }],
};

describe('<ClockGauges> on a plan that names an hour (sand-lry.24)', () => {
  it('reads the slip in minutes and leans behind', () => {
    render(
      <ClockProvider
        range={{ start: Date.UTC(1941, 10, 26), end: Date.UTC(1941, 11, 8) }}
        initialNow={Date.UTC(1941, 11, 7, 20)}
      >
        <ClockGauges clocks={[washington]} />
      </ClockProvider>,
    );
    const gauge = screen.getByRole('button', {
      name: /The Washington clock: D\+11, 80 min behind on One o’clock in Washington/,
    });
    expect(gauge).toHaveAttribute('data-tone', 'behind');
    expect(document.querySelector('.clocks__tick--plan')).toHaveAttribute(
      'title',
      'D+11 18:00Z: One o’clock in Washington',
    );
  });
});
