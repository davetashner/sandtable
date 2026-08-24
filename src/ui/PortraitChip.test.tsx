import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClockProvider } from '../engine/ClockContext.js';
import { DAY } from '../engine/clock.js';
import type { MediaIndexEntry } from '../packs/media-index.js';
import { PortraitChip, initialsOf } from './PortraitChip.js';

const range = { start: Date.UTC(1914, 7, 2), end: Date.UTC(1914, 7, 2) + 40 * DAY };

const portrait: MediaIndexEntry = {
  id: 'media:person/joffre-joseph/portrait-colorized',
  dir: 'people/joffre-joseph',
  original: { src: 'people/joffre-joseph/p.png', width: 1070, height: 1470, type: 'image/png' },
  variants: [
    {
      src: 'people/joffre-joseph/.derived/p.w320.webp',
      width: 320,
      height: 440,
      type: 'image/webp',
    },
    {
      src: 'people/joffre-joseph/.derived/p.w640.webp',
      width: 640,
      height: 879,
      type: 'image/webp',
    },
  ],
  width: 1070,
  height: 1470,
  caption: 'Joseph Joffre. Colorized (AI-assisted).',
  credit: 'BnF; public domain.',
  licence: 'public domain',
  colorized: true,
  focalPoint: { x: 0.5, y: 0.3 },
  person: 'person:joffre-joseph',
  present: true,
};

describe('<PortraitChip>', () => {
  it('is a pressable face with the name and role as its accessible name', () => {
    const onSelect = vi.fn();
    render(
      <PortraitChip
        entry={portrait}
        name="Joseph Joffre"
        role="Commander-in-Chief"
        pressed
        onSelect={onSelect}
      />,
    );
    const face = screen.getByRole('button', { name: 'Joseph Joffre — Commander-in-Chief' });
    expect(face).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(face);
    expect(onSelect).toHaveBeenCalled();
    // The visible label is decorative; the button already carries the name.
    const label = face.parentElement?.querySelector('.portrait-name');
    expect(label).toHaveTextContent('Joseph Joffre');
    expect(label).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws a derivative comfortably wider than the circle, and reserves its box', () => {
    render(<PortraitChip entry={portrait} name="Joseph Joffre" size={44} />);
    const img = document.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/assets/media/people/joffre-joseph/.derived/p.w320.webp');
    expect(img).toHaveAttribute('width', '44');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveStyle({ objectPosition: '50% 30%' });
    const chip = document.querySelector('.portrait-chip') as HTMLElement;
    expect(chip.style.getPropertyValue('--chip-size')).toBe('44px');
  });

  it('falls back to initials rather than an empty circle', () => {
    render(<PortraitChip name="Helmuth von Moltke" />);
    expect(screen.getByRole('img', { name: 'Helmuth von Moltke' })).toHaveTextContent('HM');
    expect(initialsOf('Alexander von Kluck')).toBe('AK');
  });

  it('links to a person card when the chip stands for one', () => {
    render(
      <ClockProvider range={range}>
        <PortraitChip entry={portrait} name="Joseph Joffre" entity="person:joffre-joseph" />
      </ClockProvider>,
    );
    const link = screen.getByRole('link', { name: 'Joseph Joffre' });
    expect(link.getAttribute('href')).toContain('card=person:joffre-joseph');
    expect(link.querySelector('img')).toBeTruthy();
  });
});
