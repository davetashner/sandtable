import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MediaFigure } from './MediaFigure.js';
import { largestSrc, type MediaIndexEntry } from '../packs/media-index.js';

const entry: MediaIndexEntry = {
  id: 'media:person/x/portrait',
  dir: 'person/x',
  original: { src: 'person/x/portrait.png', width: 1070, height: 1470, type: 'image/png' },
  variants: [
    { src: 'person/x/.derived/portrait.w320.webp', width: 320, height: 440, type: 'image/webp' },
    { src: 'person/x/.derived/portrait.w1024.webp', width: 1024, height: 1407, type: 'image/webp' },
    { src: 'person/x/.derived/portrait.w640.webp', width: 640, height: 879, type: 'image/webp' },
  ],
  width: 1070,
  height: 1470,
  caption: 'A very long caption that would make a poor button name indeed.',
  credit: 'Original photograph: nobody. Colorization: Sandtable.',
  licence: 'public domain',
  colorized: true,
  originalUrl: 'https://example.org/original',
  present: true,
};

describe('largestSrc', () => {
  it('takes the widest derivative regardless of order', () => {
    expect(largestSrc(entry)).toBe('/assets/media/person/x/.derived/portrait.w1024.webp');
  });

  it('falls back to the original when nothing was derived', () => {
    expect(largestSrc({ ...entry, variants: [] })).toBe('/assets/media/person/x/portrait.png');
  });
});

describe('<MediaFigure zoomable>', () => {
  it('is not a button unless asked', () => {
    render(<MediaFigure entry={entry} name="Sir John French" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('names the control by what it does, not by the caption', () => {
    render(<MediaFigure entry={entry} name="Sir John French" zoomable />);
    // The caption is a sentence; as a button name it would be unusable.
    expect(
      screen.getByRole('button', { name: 'See Sir John French at full size' }),
    ).toBeInTheDocument();
  });

  it('opens the dialog on click, showing the picture at full size', () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.showModal = showModal as unknown as () => void;
    render(<MediaFigure entry={entry} name="Sir John French" zoomable />);
    fireEvent.click(screen.getByRole('button', { name: /full size/i }));
    expect(showModal).toHaveBeenCalled();
    const dialog = document.querySelector('dialog')!;
    expect(dialog.getAttribute('aria-label')).toBe('Sir John French — full size');
    const img = dialog.querySelector('img')!;
    expect(img.getAttribute('src')).toContain('w1024');
  });

  it('keeps the credit, the colorized label and the original link in the modal', () => {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    } as unknown as () => void;
    render(<MediaFigure entry={entry} name="Sir John French" zoomable />);
    fireEvent.click(screen.getByRole('button', { name: /full size/i }));
    const dialog = document.querySelector('dialog')!;
    // ADR 0007 travels with the picture wherever it is shown.
    expect(dialog.textContent).toContain('Colorized (AI-assisted)');
    expect(dialog.textContent).toContain('Original photograph: nobody.');
    expect(dialog.querySelector('a.media__original')?.getAttribute('href')).toBe(
      'https://example.org/original',
    );
  });
});
