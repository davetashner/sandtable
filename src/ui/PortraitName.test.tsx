import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClockProvider } from '../engine/ClockContext.js';
import { DAY } from '../engine/clock.js';
import type { Side, Source, Vignette } from '../packs/schema/index.js';
import type { MediaIndexEntry } from '../packs/media-index.js';
import { CastStrip } from './CastStrip.js';
import { VignetteView } from './VignetteView.js';

const range = { start: Date.UTC(1914, 7, 2), end: Date.UTC(1914, 7, 2) + 40 * DAY };
const sides: Side[] = [{ id: 'fr', name: 'France', alliance: 'Entente' }];
const portrait: MediaIndexEntry = {
  id: 'media:person/joffre-joseph/portrait',
  dir: 'people/joffre-joseph',
  original: { src: 'people/joffre-joseph/p.png', width: 400, height: 500, type: 'image/png' },
  variants: [
    {
      src: 'people/joffre-joseph/.derived/p.w320.webp',
      width: 320,
      height: 400,
      type: 'image/webp',
    },
  ],
  width: 400,
  height: 500,
  caption: 'Joffre',
  credit: 'Public domain',
  licence: 'public domain',
  colorized: false,
  present: true,
};

describe('portrait names (sand-1l0.30)', () => {
  it('gives a cast face a name label as well as an accessible name', () => {
    render(
      <CastStrip
        members={[
          {
            id: 'cast-1',
            person: 'person:joffre-joseph',
            name: 'Joseph Joffre',
            role: 'Commander-in-Chief',
            side: 'fr',
            portrait,
          },
        ]}
        sides={sides}
        onSelect={() => {}}
      />,
    );
    const face = screen.getByRole('button', { name: 'Joseph Joffre — Commander-in-Chief' });
    // The visible label is decorative — the button already carries the name.
    expect(face).not.toHaveAttribute('title');
    const label = face.parentElement?.querySelector('.portrait-name');
    expect(label).toHaveTextContent('Joseph Joffre');
    expect(label).toHaveAttribute('aria-hidden', 'true');
  });

  it("makes a vignette's face a focusable link to that person", () => {
    const vignettes: Vignette[] = [
      {
        id: '1914:vignette-taxis',
        title: 'The taxis',
        at: '1914-09-07T00:00:00Z',
        voice: 'Joseph Gallieni',
        kind: 'memoir',
        text: 'The taxis went out at dusk.',
        people: ['person:joffre-joseph'],
        sources: [],
      } as Vignette,
    ];
    const sources: Source[] = [];
    render(
      <ClockProvider range={range}>
        <VignetteView
          vignettes={vignettes}
          sources={sources}
          label={(id) => (id === 'person:joffre-joseph' ? 'Joseph Joffre' : undefined)}
          portrait={() => portrait}
        />
      </ClockProvider>,
    );
    const link = screen.getByRole('link', { name: 'Joseph Joffre' });
    expect(link.getAttribute('href')).toContain('card=person:joffre-joseph');
    expect(link.querySelector('img')).toBeTruthy();
  });
});
