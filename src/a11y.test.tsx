/**
 * The automated half of the accessibility pass (sand-pmz.4).
 *
 * axe-core against jsdom, not a browser. That is a deliberate trade: it costs
 * no new browser in CI, it runs on every push with the rest of the suite, and
 * it catches the whole class of defect this pass is about — a control with no
 * accessible name, a role used without the attributes it requires, a list that
 * is not a list, a heading that skips a level, an `aria-*` pointing at nothing.
 *
 * What it cannot see is anything that needs layout: contrast, tap-target size,
 * focus order on screen. Those belong to the other two instruments — the token
 * contrast test, which computes rather than samples, and the browser walk in
 * `scripts/visual-check.mjs` (ADR 0011), which gates tap-target size on every
 * pull request. `docs/accessibility.md` is where the three are set out.
 *
 * Two surfaces cover the library: the app shell on the real pack — at rest and
 * in the states a click reaches — and the gallery, which is every component in
 * `src/ui` in both themes, including the ones the app only shows on a phone.
 */
import axe, { type Result, type RunOptions } from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Gallery } from './gallery/Gallery.js';

// MapLibre needs WebGL; the map surface stands in as the region it renders.
vi.mock('./engine/map/MapView.js', () => ({
  MapView: ({ label }: { label?: string }) => <div role="region" aria-label={label ?? 'Map'} />,
}));

const { App } = await import('./App.tsx');

/**
 * Rules jsdom cannot answer honestly, switched off rather than left to report
 * a guess. `color-contrast` needs rendered pixels — the contrast that matters
 * is enforced instead by the AA test over the tokens (`src/styles`), which is
 * exact rather than sampled.
 */
const OPTIONS: RunOptions = {
  resultTypes: ['violations'],
  rules: { 'color-contrast': { enabled: false } },
};

/**
 * The gallery is a specimen sheet, not a page: it renders the whole library
 * twice — once per theme — on one document, which duplicates every landmark
 * the components carry and leaves the panes themselves outside any landmark.
 * Both are properties of the sheet, not of the components on it, so the two
 * page-shaped rules are off here and stay on for the app.
 */
const GALLERY_OPTIONS: RunOptions = {
  ...OPTIONS,
  rules: { ...OPTIONS.rules, region: { enabled: false }, 'landmark-unique': { enabled: false } },
};

const report = (violations: Result[]) =>
  violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n` +
        v.nodes.map((n) => `    ${n.target.join(' ')}\n      ${n.html.slice(0, 160)}`).join('\n'),
    )
    .join('\n');

async function violationsOf(el: Element, options: RunOptions = OPTIONS): Promise<Result[]> {
  const { violations } = await axe.run(el, options);
  return violations;
}

describe('accessibility (axe-core)', () => {
  it('finds nothing in the app shell', async () => {
    const { container } = render(<App />);
    await screen.findByRole('region', { name: /^Map/ }, { timeout: 8000 });
    const violations = await violationsOf(container);
    expect(report(violations)).toBe('');
  }, 30000);

  // The shell has more than one shape, and the states a click reaches are the
  // ones a static render never sees.
  it('finds nothing in the states the app is clicked into', async () => {
    window.history.replaceState(null, '', '/?t=1914-09-01T00:00:00Z');
    const { container } = render(<App />);
    await screen.findByRole('region', { name: /^Map/ }, { timeout: 8000 });

    fireEvent.click(screen.getByRole('button', { name: '12 chapters and zoom-ins' }));
    expect(report(await violationsOf(container)), 'index open').toBe('');

    fireEvent.click(screen.getByRole('button', { name: /^Zoom in to First Battle of the Marne,/ }));
    expect(report(await violationsOf(container)), 'inside a zoom-in').toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Back to the campaign' }));
    fireEvent.click(screen.getByRole('button', { name: /^The right wing bleeds/ }));
    expect(report(await violationsOf(container)), 'a card open').toBe('');
  }, 30000);

  it('finds nothing in the component gallery — every component, both themes', async () => {
    const { container } = render(<Gallery />);
    const violations = await violationsOf(container, GALLERY_OPTIONS);
    expect(report(violations)).toBe('');
  }, 60000);
});
