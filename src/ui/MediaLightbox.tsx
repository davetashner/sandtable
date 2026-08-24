/**
 * A portrait at full size (sand-neh.10). The card shows a 132px crop, which
 * is not enough to see a colorization; clicking it opens the whole image.
 *
 * Built on the native <dialog> with showModal(), which gives focus trapping,
 * Escape, an inert background and focus restored to the trigger — all of it
 * behaviour the OpeningSequence had to hand-roll, and all of it easy to get
 * subtly wrong. ADR 0007 travels with the picture: the credit, the colorized
 * label and the way to the unaltered original appear here too.
 *
 * This is where a photograph is always in full colour (ADR 0012). The panel
 * tones pictures at rest; the full-size view is the reveal, so nothing here
 * is toned and no input device is asked to hover for it.
 */
import { useCallback, useEffect, useRef, type MouseEvent } from 'react';
import { largestSrc, type MediaIndexEntry } from '../packs/media-index.js';
import { MediaCredit, type MediaShowing } from './MediaCredit.js';
import './lightbox.css';

export interface MediaLightboxProps {
  entry: MediaIndexEntry;
  /**
   * Who or what is pictured. Shown above the credit and used as the dialog's
   * accessible name: at full size the reader is looking at a face, and the
   * credit line is provenance, not an answer to "who is this?" (sand-y0u.18).
   */
  name?: string | undefined;
  base?: string;
  /**
   * Which of the colorized/original pair the figure behind is showing, so the
   * modal opens on the same picture and the toggle drives both (ADR 0012).
   */
  showing?: MediaShowing;
  onShow?: ((which: MediaShowing) => void) | undefined;
  open: boolean;
  onClose: () => void;
}

export function MediaLightbox({
  entry,
  name,
  base = '/assets/media/',
  showing = 'colorized',
  onShow,
  open,
  onClose,
}: MediaLightboxProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // jsdom implements <dialog> without showModal in some versions; a plain
    // open attribute still renders, so the tests can see it.
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    }
    if (!open && el.open) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
  }, [open]);

  // Escape and the backdrop both fire the dialog's own close event.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCancelOrClose = () => onClose();
    el.addEventListener('close', onCancelOrClose);
    return () => el.removeEventListener('close', onCancelOrClose);
  }, [onClose]);

  // A click that lands on the dialog itself is a click on the backdrop: the
  // image and its caption are inside a child element.
  const onBackdrop = useCallback(
    (e: MouseEvent<HTMLDialogElement>) => {
      if (e.target === ref.current) onClose();
    },
    [onClose],
  );

  const label = name ? `${name} — full size` : 'Image at full size';
  const pair = entry.unaltered?.length ? entry.unaltered : undefined;

  return (
    <dialog ref={ref} className="lightbox" aria-label={label} onClick={onBackdrop}>
      <div className="lightbox__inner">
        <button type="button" className="lightbox__close" onClick={onClose} autoFocus>
          Close
        </button>
        <img
          className="lightbox__img"
          src={largestSrc(
            showing === 'original' && pair ? { ...entry, variants: pair } : entry,
            base,
          )}
          alt={entry.caption}
          width={entry.width}
          height={entry.height}
          decoding="async"
        />
        <figcaption className="lightbox__caption">
          {name && <span className="lightbox__subject">{name}</span>}
          <MediaCredit entry={entry} showing={showing} {...(pair && onShow ? { onShow } : {})} />
        </figcaption>
      </div>
    </dialog>
  );
}
