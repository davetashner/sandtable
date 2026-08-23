/**
 * An image from the media index with everything ADR 0007 requires visible:
 * the caption, the credit line, a "colorized (AI-assisted)" label when it
 * applies (in the caption, never over the picture — sand-akw), and a link to
 * the unaltered original. Responsive via srcset from
 * the WebP derivatives; falls back to the original file.
 */
import { useState } from 'react';
import type { MediaIndexEntry } from '../packs/media-index.js';
import { MediaLightbox } from './MediaLightbox.js';
import './media.css';
import './prose.css';

export interface MediaFigureProps {
  entry: MediaIndexEntry;
  /** Base URL of the media bucket path, default /assets/media/. */
  base?: string;
  /** Target rendered width in CSS px (drives `sizes`). */
  width?: number;
  /** Crop to a portrait frame using the focal point (cards) or show whole (figures). */
  fit?: 'portrait' | 'contain';
  /** Who or what is pictured — revealed on hover and keyboard focus (sand-1l0.30). */
  name?: string | undefined;
  /**
   * Clicking the image opens it full size in a modal (sand-neh.10). Opt-in,
   * because most figures on the page are already as large as they get.
   */
  zoomable?: boolean;
  className?: string;
}

export function MediaFigure({
  entry,
  base = '/assets/media/',
  width = 320,
  fit = 'contain',
  name,
  zoomable = false,
  className,
}: MediaFigureProps) {
  const [zoomed, setZoomed] = useState(false);
  // The dialog is only mounted once it has been opened. A closed <dialog> is
  // display:none but still in the DOM, and browsers fetch images inside it —
  // so mounting eagerly would pull the full-size file for every portrait on
  // the page. It stays mounted after the first open so the platform can hand
  // focus back to the trigger on close.
  const [everZoomed, setEverZoomed] = useState(false);
  const srcSet = entry.variants.map((v) => `${base}${v.src} ${v.width}w`).join(', ');
  const src = entry.variants.length
    ? `${base}${(entry.variants.find((v) => v.width >= width) ?? entry.variants.at(-1)!).src}`
    : `${base}${entry.original.src}`;
  const position = entry.focalPoint
    ? `${Math.round(entry.focalPoint.x * 100)}% ${Math.round(entry.focalPoint.y * 100)}%`
    : '50% 30%';
  return (
    <figure
      className={`media media--${fit}${name ? ' media--named' : ''}${className ? ` ${className}` : ''}`}
    >
      {name && (
        <span className="portrait-name" aria-hidden="true">
          {name}
        </span>
      )}
      {(() => {
        const img = (
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
        );
        if (!zoomable) return img;
        return (
          <button
            type="button"
            className="media__zoom"
            // The alt text is the whole caption; as a button name that is a
            // paragraph. Say what the control does instead.
            aria-label={name ? `See ${name} at full size` : 'See this image at full size'}
            onClick={() => {
              setEverZoomed(true);
              setZoomed(true);
            }}
          >
            {img}
          </button>
        );
      })()}
      <figcaption className="media__caption">
        {entry.colorized && (
          <span
            className="media__label"
            title="Colour is an interpretation; only colour was changed"
          >
            Colorized (AI-assisted)
          </span>
        )}
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
      {zoomable && everZoomed && (
        <MediaLightbox
          entry={entry}
          base={base}
          name={name}
          open={zoomed}
          onClose={() => setZoomed(false)}
        />
      )}
    </figure>
  );
}
