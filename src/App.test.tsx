import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// MapLibre needs WebGL; the map surface has its own tests (src/engine/map).
vi.mock('./engine/map/MapView.js', () => ({
  MapView: ({ label }: { label?: string }) => <div role="region" aria-label={label ?? 'Map'} />,
}));

const { App } = await import('./App.tsx');

describe('App shell', () => {
  it('renders the title and the three surfaces', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sandtable' })).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: /^Map/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Dossier' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: 'Timeline' })).toBeInTheDocument();
  });

  it('drives the dossier and the map from the seed pack clock', async () => {
    render(<App />);
    // URL has no ?t — the clock starts at the pack start (2 Aug 1914), before the first beat.
    expect(screen.getByText('Day 0')).toBeInTheDocument();
    const slider = screen.getByRole('slider', { name: /^Time — / });
    fireEvent.change(slider, { target: { value: String(Date.UTC(1914, 7, 10)) } });
    expect(screen.getByRole('heading', { level: 2, name: /Liège holds/ })).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: /^Map — .*10 August 1914/ }),
    ).toBeInTheDocument();
  });

  it('zooms into a battle and back, swapping the clock range and restoring the campaign time', async () => {
    window.history.replaceState(null, '', '/?t=1914-09-01T00:00:00Z');
    render(<App />);
    expect(screen.getByText('Day 30')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'First Battle of the Marne' }));
    expect(window.location.search).toContain('focus=1914:marne');
    expect(screen.getByRole('navigation', { name: 'Focus' })).toHaveTextContent(
      'First Battle of the Marne',
    );
    // the clock now runs on the battle's own range: day 0 of the battle = 5 September
    expect(screen.getByText('Day 0')).toBeInTheDocument();
    expect(screen.getByText(/5 September 1914/)).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: /Inside the Marne/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the campaign' }));
    expect(window.location.search).not.toContain('focus=');
    // the viewer moved past 1 Sep inside the battle (5 Sep), so time does not jump back
    expect(screen.getByText('Day 34')).toBeInTheDocument();
  });

  it('opens a technology card from a timeline glyph and from a beat chip, and returns to the beat', async () => {
    window.history.replaceState(null, '', '/?t=1914-08-10T00:00:00Z');
    render(<App />);
    // the Liège beat links the siege-artillery card as a chip
    fireEvent.click(
      await screen.findByRole(
        'button',
        { name: "Heavy siege artillery — Krupp's 42 cm and Škoda's 30.5 cm" },
        { timeout: 8000 },
      ),
    );
    expect(window.location.search).toContain('card=1914:tech-heavy-siege-artillery');
    expect(screen.getByText('Technology · Artillery')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toHaveTextContent(/Herwig/);
    fireEvent.click(screen.getByRole('button', { name: /Back to the narrative/ }));
    expect(window.location.search).not.toContain('card=');
    expect(screen.getByRole('heading', { level: 2, name: /Liège holds/ })).toBeInTheDocument();
    // the ⚙ glyph on the timeline opens the railways card and seeks to its moment
    fireEvent.click(
      screen.getByRole('button', { name: 'Open Railways and the mobilization timetable' }),
    );
    expect(window.location.search).toContain('card=1914:tech-railways-mobilization');
    expect(screen.getByText('Day 0')).toBeInTheDocument(); // 2 Aug 1914 = pack start
  }, 15000);
});
