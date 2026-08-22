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
    expect(await screen.findByRole('region', { name: /^Map/ })).toBeInTheDocument();
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
});
