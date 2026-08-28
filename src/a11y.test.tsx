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
 * Three surfaces cover the library: the app shell on the real pack — at rest
 * and in the states a click reaches — the gallery, which is every component in
 * `src/ui` in both themes, including the ones the app only shows on a phone,
 * and the pack-failure state, which is markup in `index.html` rather than a
 * component and would otherwise be the one screen nothing here can see
 * (`sand-shn.1.2`).
 */
import { readFileSync } from 'node:fs';
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

  /**
   * The bibliography is ninety works of links and headings inside one card
   * (sand-shn.5) — the longest list in the app, and the place where a skipped
   * heading level, a list that is not a list, or a wall of identically-named
   * links would matter most. It is opened by its own URL (ADR 0009) rather
   * than clicked into, because that is what a link in a footnote will do.
   */
  it('finds nothing in the bibliography, or in a work’s card', async () => {
    window.history.replaceState(null, '', '/?t=1914-08-24T12:00:00Z&card=bibliography');
    const { container, unmount } = render(<App />);
    await screen.findByRole('region', { name: /^Map/ }, { timeout: 8000 });
    await screen.findByRole('heading', { level: 2, name: 'Works cited' });
    expect(report(await violationsOf(container)), 'the bibliography').toBe('');
    unmount();

    window.history.replaceState(null, '', '/?t=1914-08-24T12:00:00Z&card=source:edmonds-1933');
    const work = render(<App />);
    await screen.findByRole('region', { name: /^Map/ }, { timeout: 8000 });
    expect(report(await violationsOf(work.container)), 'one work').toBe('');
  }, 30000);

  /**
   * A contested point (ADR 0017) is the card with the most structure per
   * pixel: an ordered list of positions, each with its own heading and its own
   * attribution, then two more headed asides. Opened by its own URL, because
   * the chip on the decision card and the link in a beat both land here.
   */
  it('finds nothing in a contested point’s card', async () => {
    window.history.replaceState(
      null,
      '',
      '/?t=1914-09-09T12:00:00Z&card=1914:historiography-hentsch-authority',
    );
    const { container } = render(<App />);
    await screen.findByRole('region', { name: /^Map/ }, { timeout: 8000 });
    await screen.findByRole('heading', { level: 3, name: 'The charge' });
    expect(report(await violationsOf(container))).toBe('');
  }, 30000);

  /**
   * The one screen in the app that React never renders (`sand-shn.1.2`): when
   * the pack fetch fails, the module graph never evaluates, and what the
   * reader gets is the static markup in `index.html`. axe would never reach it
   * through a component, so it is read off disk and checked as it ships — one
   * pass per case, because only one of the three is ever on screen.
   */
  it('finds nothing in the pack-failure state, in any of its three cases', async () => {
    const root = new DOMParser()
      .parseFromString(readFileSync('index.html', 'utf8'), 'text/html')
      .getElementById('root');
    const host = document.createElement('div');
    host.innerHTML = root?.innerHTML ?? '';
    document.body.appendChild(host);

    const box = host.querySelector<HTMLElement>('#boot-failure');
    expect(box, 'index.html no longer carries a failure state').not.toBeNull();
    host.querySelector<HTMLElement>('#boot-frame')!.hidden = true;
    box!.hidden = false;

    for (const kind of ['missing', 'offline', 'invalid']) {
      for (const c of box!.querySelectorAll<HTMLElement>('[data-failure]')) {
        c.hidden = c.dataset['failure'] !== kind;
      }
      expect(report(await violationsOf(box!)), kind).toBe('');
    }
    host.remove();
  });

  it('finds nothing in the component gallery — every component, both themes', async () => {
    const { container } = render(<Gallery />);
    const violations = await violationsOf(container, GALLERY_OPTIONS);
    expect(report(violations)).toBe('');
  }, 60000);
});
