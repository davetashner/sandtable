import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { MediaIndexEntry } from '../packs/media-index.js';
import { MediaFigure } from './MediaFigure.js';

const entry: MediaIndexEntry = {
  id: 'media:scene/liege/photo-colorized',
  dir: 'scenes/liege',
  original: {
    src: 'scenes/liege/photo-colorized.png',
    width: 1688,
    height: 932,
    type: 'image/png',
  },
  variants: [
    { src: 'scenes/liege/.derived/photo.w320.webp', width: 320, height: 177, type: 'image/webp' },
    { src: 'scenes/liege/.derived/photo.w640.webp', width: 640, height: 353, type: 'image/webp' },
    { src: 'scenes/liege/.derived/photo.w1024.webp', width: 1024, height: 565, type: 'image/webp' },
  ],
  width: 1688,
  height: 932,
  caption: 'Belgian infantry at Herstal, August 1914. Colorized (AI-assisted).',
  credit: 'Original: photographer not established; public domain. Colorization: Sandtable.',
  licence: 'public domain',
  colorized: true,
  originalUrl: 'https://example.org/archive-item',
  focalPoint: { x: 0.35, y: 0.5 },
  present: true,
};

describe('<MediaFigure> treatment (ADR 0012)', () => {
  it('is toned at rest unless the caller says otherwise', () => {
    const { container, rerender } = render(<MediaFigure entry={entry} />);
    expect(container.querySelector('figure')).toHaveClass('media--toned');
    rerender(<MediaFigure entry={entry} toned={false} />);
    expect(container.querySelector('figure')).not.toHaveClass('media--toned');
  });

  it('crops to the hero band on the focal point', () => {
    const { container } = render(<MediaFigure entry={entry} fit="band" />);
    expect(container.querySelector('figure')).toHaveClass('media--band');
    expect(container.querySelector('img')).toHaveStyle({ objectPosition: '35% 50%' });
  });

  it('loads lazily, decodes off the main thread and reserves its space', () => {
    const { container } = render(<MediaFigure entry={entry} />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    // Intrinsic dimensions, so the caption does not jump when the file lands.
    expect(img).toHaveAttribute('width', '1688');
    expect(img).toHaveAttribute('height', '932');
  });

  it('can hand its credit to a plate set, which shows one block for the whole set (ADR 0014)', () => {
    const { container, rerender } = render(<MediaFigure entry={entry} />);
    expect(container.querySelector('.media__caption')).toBeInTheDocument();
    rerender(<MediaFigure entry={entry} credit={false} />);
    expect(container.querySelector('.media__caption')).toBeNull();
  });

  it('offers the narrowest derivative to a reader who has asked to spend less data', () => {
    const { container } = render(<MediaFigure entry={entry} width={640} />);
    const source = container.querySelector('picture > source')!;
    expect(source).toHaveAttribute('media', '(prefers-reduced-data: reduce)');
    expect(source.getAttribute('srcset')).toBe(
      '/assets/media/scenes/liege/.derived/photo.w320.webp',
    );
  });
});

describe('<MediaFigure> when the picture is missing', () => {
  it('keeps the frame, the caption and the credit, and offers nothing to zoom', () => {
    render(<MediaFigure entry={{ ...entry, present: false }} zoomable name="Herstal" />);
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: entry.caption })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /full size/i })).toBeNull();
    expect(document.body.textContent).toContain('Colorized (AI-assisted)');
    expect(document.body.textContent).toContain('Colorization: Sandtable.');
  });

  it('falls back to the same frame when the bucket is short of the file at run time', () => {
    const { container } = render(<MediaFigure entry={entry} />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: entry.caption })).toBeInTheDocument();
  });
});

describe('show original (ADR 0007)', () => {
  it('links out to the archive record when the project holds no original', () => {
    render(<MediaFigure entry={entry} />);
    expect(screen.getByRole('link', { name: 'Show original' })).toHaveAttribute(
      'href',
      'https://example.org/archive-item',
    );
  });

  it('swaps the picture in place when it does, and says which one is showing', () => {
    const unaltered = [
      {
        src: 'scenes/liege/.derived/photo-original.w640.webp',
        width: 640,
        height: 353,
        type: 'image/webp',
      },
    ];
    render(<MediaFigure entry={{ ...entry, unaltered }} width={640} />);
    const toggle = screen.getByRole('button', { name: 'Show original' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(document.querySelector('img')!.getAttribute('src')).toBe(
      '/assets/media/scenes/liege/.derived/photo-original.w640.webp',
    );
    expect(document.body.textContent).toContain('The original, before colour');
    fireEvent.click(screen.getByRole('button', { name: 'Show the colorization' }));
    expect(document.querySelector('img')!.getAttribute('src')).toContain('photo.w640.webp');
  });
});
