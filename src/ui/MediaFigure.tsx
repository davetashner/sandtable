/**
 * An image from the media index with everything ADR 0007 requires visible:
 * the caption, the credit line, a "colorized (AI-assisted)" label when it
 * applies (in the caption, never over the picture — sand-akw), and a way to
 * the unaltered original. Responsive via srcset from the WebP derivatives;
 * falls back to the original file.
 *
 * ADR 0012 adds the treatment: a photograph is toned towards brass at rest
 * and comes to full colour when the reader attends to it — hover, keyboard
 * focus, or open at full size, where it is never toned. The tone is CSS on
 * the placement, not a second file, so the picture that is fetched, cited and
 * opened is always the picture itself.
 *
 * The three fits are the three ways a photograph is allowed to appear:
 * `band` is the hero slot at the top of a beat (a fixed 3:2 crop on the focal
 * point, so every beat opens the same way and the prose stays in view),
 * `portrait` is a card's headshot, `contain` is the whole picture.
 */
import { useState } from 'react';
import { srcSetOf, variantFor, type MediaIndexEntry } from '../packs/media-index.js';
import { MediaCredit, type MediaShowing } from './MediaCredit.js';
import { MediaLightbox } from './MediaLightbox.js';
import './media.css';
import './prose.css';

export interface MediaFigureProps {
  entry: MediaIndexEntry;
  /** Base URL of the media bucket path, default /assets/media/. */
  base?: string;
  /** Target rendered width in CSS px (drives `sizes`). */
  width?: number;
  /** The hero band, a card's headshot, or the whole picture. */
  fit?: 'band' | 'portrait' | 'contain';
  /** Who or what is pictured — revealed on hover and keyboard focus (sand-1l0.30). */
  name?: string | undefined;
  /**
   * Clicking the image opens it full size in a modal (sand-neh.10). Opt-in,
   * because most figures on the page are already as large as they get.
   */
  zoomable?: boolean;
  /**
   * Tone the picture at rest (ADR 0012). On by default for every figure; off
   * where the picture is the subject rather than an illustration of one.
   */
  toned?: boolean;
  /**
   * Render the provenance line under the picture. A plate set turns this off
   * and renders one block for the whole set instead (ADR 0014) — the same
   * `MediaCredit`, gathered rather than repeated, because four small pictures
   * with four blocks of grey under them are mostly grey. Nothing else does.
   */
  credit?: boolean;
  className?: string;
}

export function MediaFigure({
  entry,
  base = '/assets/media/',
  width = 320,
  fit = 'contain',
  name,
  zoomable = false,
  toned = true,
  credit = true,
  className,
}: MediaFigureProps) {
  const [zoomed, setZoomed] = useState(false);
  // The dialog is only mounted once it has been opened. A closed <dialog> is
  // display:none but still in the DOM, and browsers fetch images inside it —
  // so mounting eagerly would pull the full-size file for every portrait on
  // the page. It stays mounted after the first open so the platform can hand
  // focus back to the trigger on close.
  const [everZoomed, setEverZoomed] = useState(false);
  const [showing, setShowing] = useState<MediaShowing>('colorized');
  // `present` is what the pipeline saw when the index was written; the assets
  // bucket is what the reader gets. Either can be short a file, and a broken
  // image icon over a credit line is the worst of both — so the same frame
  // answers for both, and the caption still says what is missing.
  const [failed, setFailed] = useState(false);

  const pair = entry.unaltered?.length ? entry.unaltered : undefined;
  const variants = showing === 'original' && pair ? pair : entry.variants;
  const srcSet = srcSetOf(variants, base);
  const chosen = variantFor(variants, width);
  const src = chosen ? `${base}${chosen.src}` : `${base}${entry.original.src}`;
  // The narrowest derivative for a reader who has asked the browser to spend
  // less: `<picture>` decides before the fetch, which no CSS can do.
  const thrifty = variants[0];
  const position = entry.focalPoint
    ? `${Math.round(entry.focalPoint.x * 100)}% ${Math.round(entry.focalPoint.y * 100)}%`
    : '50% 30%';
  const absent = !entry.present || failed;

  const picture = absent ? (
    <span className="media__absent" role="img" aria-label={entry.caption}>
      <span className="media__absent-mark" aria-hidden="true">
        ▢
      </span>
      <span className="media__absent-note">Picture not in this build</span>
    </span>
  ) : (
    <picture>
      {thrifty && (
        <source media="(prefers-reduced-data: reduce)" srcSet={`${base}${thrifty.src}`} />
      )}
      <img
        className="media__img"
        src={src}
        {...(srcSet ? { srcSet, sizes: `${width}px` } : {})}
        width={entry.width}
        height={entry.height}
        alt={entry.caption}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        style={{ objectPosition: position }}
      />
    </picture>
  );

  return (
    <figure
      className={`media media--${fit}${toned ? ' media--toned' : ''}${name ? ' media--named' : ''}${className ? ` ${className}` : ''}`}
    >
      {name && (
        <span className="portrait-name" aria-hidden="true">
          {name}
        </span>
      )}
      {zoomable && !absent ? (
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
          {picture}
        </button>
      ) : (
        picture
      )}
      {credit && (
        <figcaption className="media__caption">
          <MediaCredit
            entry={entry}
            showing={showing}
            {...(pair && !absent ? { onShow: setShowing } : {})}
          />
        </figcaption>
      )}
      {zoomable && everZoomed && (
        <MediaLightbox
          entry={entry}
          base={base}
          name={name}
          showing={showing}
          {...(pair ? { onShow: setShowing } : {})}
          open={zoomed}
          onClose={() => setZoomed(false)}
        />
      )}
    </figure>
  );
}
