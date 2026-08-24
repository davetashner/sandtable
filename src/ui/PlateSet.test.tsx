import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MediaIndexEntry } from '../packs/media-index.js';
import { PlateSet, plateItems } from './PlateSet.js';

const entry = (slug: string): MediaIndexEntry => ({
  id: `media:scene/${slug}/photo`,
  dir: `scenes/${slug}`,
  original: { src: `scenes/${slug}/photo.png`, width: 900, height: 600, type: 'image/png' },
  variants: [
    { src: `scenes/${slug}/.derived/photo.w320.webp`, width: 320, height: 213, type: 'image/webp' },
  ],
  width: 900,
  height: 600,
  caption: `${slug} in August 1914.`,
  credit: 'Photographer not established; public domain.',
  licence: 'public domain',
  colorized: false,
  present: true,
});

const items = [
  { entry: entry('herstal'), label: 'Belgium' },
  { entry: entry('mons'), label: 'Britain' },
  { entry: entry('marne'), label: 'Germany' },
];

describe('<PlateSet> (ADR 0014)', () => {
  it('shows every plate at once, under one axis, with no way to page through them', () => {
    render(<PlateSet axis="In the field, August 1914" items={items} />);
    expect(screen.getByLabelText('In the field, August 1914')).toBeInTheDocument();
    expect(document.querySelectorAll('.plates__item').length).toBe(3);
    expect(screen.queryByRole('button', { name: /next|previous/i })).toBeNull();
  });

  it('labels each plate with its point on the axis, and its zoom control with the same', () => {
    const { container } = render(<PlateSet axis="In the field, August 1914" items={items} />);
    expect([...container.querySelectorAll('.plates__label')].map((n) => n.textContent)).toEqual(
      items.map((i) => i.label),
    );
    for (const { label } of items) {
      expect(screen.getByRole('button', { name: `See ${label} at full size` })).toBeInTheDocument();
    }
  });

  it('crops every plate the same way — a shared frame is the comparison', () => {
    const { container, rerender } = render(<PlateSet axis="Kit" items={items} />);
    expect(container.querySelectorAll('.media--band').length).toBe(3);
    rerender(<PlateSet axis="Kit" items={items} fit="portrait" />);
    expect(container.querySelectorAll('.media--portrait').length).toBe(3);
  });

  it('renders each plate as a MediaFigure, so the treatment comes from ADR 0012', () => {
    const { container } = render(<PlateSet axis="Kit" items={items} />);
    expect(container.querySelectorAll('.media--toned').length).toBe(3);
    expect(container.querySelectorAll('.media--band').length).toBe(3);
  });

  it('gathers the credits under the set rather than repeating one under each plate', () => {
    const { container } = render(<PlateSet axis="Kit" items={items} />);
    // Every plate still shows its provenance — in one block, keyed by label.
    expect(container.querySelectorAll('.media__caption').length).toBe(0);
    expect(container.querySelectorAll('.plates__credits > li').length).toBe(3);
    expect(container.querySelectorAll('.plates__credits .media__credit').length).toBe(3);
    expect(
      [...container.querySelectorAll('.plates__credit-for')].map((n) => n.textContent),
    ).toEqual(items.map((i) => i.label));
  });

  it('renders nothing below two plates — one picture under a heading is a plate', () => {
    const { container } = render(<PlateSet axis="Kit" items={items.slice(0, 1)} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('plateItems', () => {
  it('resolves manifest ids in the author’s order and drops what the index has never heard of', () => {
    const index = new Map(items.map((i) => [i.entry.id, i.entry]));
    const resolved = plateItems(
      [
        { media: 'media:scene/marne/photo', label: 'Germany' },
        { media: 'media:scene/nowhere/photo', label: 'Nowhere' },
        { media: 'media:scene/mons/photo', label: 'Britain' },
      ],
      (id) => index.get(id),
    );
    expect(resolved.map((r) => r.label)).toEqual(['Germany', 'Britain']);
  });
});
