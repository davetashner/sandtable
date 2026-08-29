import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Source, Timetable } from '../packs/schema/index.js';
import { ClockCardView } from './ClockCardView.js';

const clock: Timetable = {
  id: '1914:clock-x',
  title: 'The plan',
  subtitle: 'Plan vs reality',
  origin: '1914-08-02T00:00:00Z',
  assumption: 'Six weeks.[^x]',
  milestones: [
    { id: 'liege', label: 'Liège', plannedDay: 12, actualAt: '1914-08-16T00:00:00Z', note: 'late' },
    { id: 'decision', label: 'Decision', plannedDay: 39 },
    { id: 'tannenberg', label: 'Tannenberg', actualAt: '1914-08-30T00:00:00Z' },
  ],
  sources: [{ source: 'source:x' }],
};
const sources = [
  {
    id: 'source:x',
    kind: 'book',
    title: 'A Book',
    authors: ['A.'],
    year: 2000,
  } as unknown as Source,
];

describe('<ClockCardView>', () => {
  it('lists milestones with plan, actual, slip and notes, and footnotes the assumption', () => {
    render(<ClockCardView clock={clock} sources={sources} />);
    expect(screen.getByText('Plan against reality')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'The plan' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent(/Liège/);
    expect(rows[1]).toHaveTextContent(/M\+12/);
    expect(rows[1]).toHaveTextContent(/16 August 1914 \(M\+14\)/);
    expect(rows[1]).toHaveTextContent(/2 d behind/);
    expect(rows[1]).toHaveTextContent(/late/);
    expect(rows[2]).toHaveTextContent(/never/);
    expect(rows[2]).toHaveTextContent(/not reached/);
    expect(rows[3]).toHaveTextContent(/Tannenberg/);
    expect(screen.getByText(/Six weeks\./)).toBeInTheDocument();
    expect(document.querySelector('.footnotes')).toHaveTextContent(/A Book/);
  });
});

describe('<ClockCardView> on a plan that names an hour (sand-lry.24)', () => {
  it('gives the plan and the actual their hours, and the slip its minutes', () => {
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
        { id: 'outline', label: 'The outline', plannedDay: 0, actualAt: '1941-11-26T21:00:00Z' },
      ],
      sources: [{ source: 'source:x' }],
    };
    render(<ClockCardView clock={washington} sources={sources} />);
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent(/D\+11 18:00Z/);
    expect(rows[1]).toHaveTextContent(/7 December 1941 \(D\+11 19:20Z\)/);
    expect(rows[1]).toHaveTextContent(/80 min behind/);
    // the whole-day milestone beside it still reads in days
    expect(rows[2]).toHaveTextContent(/D\+0/);
    expect(rows[2]).toHaveTextContent(/26 November 1941 \(D\+0\)/);
    // rounded to whole days, as a whole-day plan always was — 21:00 on D+0 is "1 d behind"
    expect(rows[2]).toHaveTextContent(/1 d behind/);
  });
});
