/**
 * An image from the media index with everything ADR 0007 requires visible:
 * the caption, the credit line, a "colorized (AI-assisted)" label when it
 * applies, and a link to the unaltered original. Responsive via srcset from
 * the WebP derivatives; falls back to the original file.
 */
import type { MediaIndexEntry } from '../packs/media-index.js';
import './media.css';

export interface MediaFigureProps {
  entry: MediaIndexEntry;
  /** Base URL of the media bucket path, default /assets/media/. */
  base?: string;
  /** Target rendered width in CSS px (drives `sizes`). */
  width?: number;
  /** Crop to a portrait frame using the focal point (cards) or show whole (figures). */
  fit?: 'portrait' | 'contain';
  className?: string;
}

export function MediaFigure({
  entry,
  base = '/assets/media/',
  width = 320,
  fit = 'contain',
  className,
}: MediaFigureProps) {
  const srcSet = entry.variants.map((v) => `${base}${v.src} ${v.width}w`).join(', ');
  const src = entry.variants.length
    ? `${base}${(entry.variants.find((v) => v.width >= width) ?? entry.variants.at(-1)!).src}`
    : `${base}${entry.original.src}`;
  const position = entry.focalPoint
    ? `${Math.round(entry.focalPoint.x * 100)}% ${Math.round(entry.focalPoint.y * 100)}%`
    : '50% 30%';
  return (
    <figure className={`media media--${fit}${className ? ` ${className}` : ''}`}>
      <img
        className="media__img"
        src={src}
        {...(srcSet ? { srcSet, sizes: `${width}px` } : {})}
        width={entry.width}
        height={entry.height}
        alt={entry.caption}
        loading="lazy"
        decoding="async"
        style={{ objectPosition: position }}
      />
      {entry.colorized && (
        <span className="media__label" title="Colour is an interpretation; only colour was changed">
          Colorized (AI-assisted)
        </span>
      )}
      <figcaption className="media__caption">
        <span className="media__credit">{entry.credit}</span>
        {entry.originalUrl && (
          <>
            {' · '}
            <a
              className="media__original"
              href={entry.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Show original
            </a>
          </>
        )}
      </figcaption>
    </figure>
  );
}
