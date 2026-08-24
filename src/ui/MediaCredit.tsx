/**
 * The provenance line that travels with every photograph (ADR 0007, ADR 0012):
 * the "colorized (AI-assisted)" label when it applies, the credit exactly as
 * the archive asks for it, and the way to the unaltered original.
 *
 * One component rather than the same JSX in the figure and in the full-size
 * view, because "every image shows its credit" is a policy, and a policy kept
 * in two places is a policy kept in one and a half.
 *
 * "Show original" is a toggle in place when the project holds a copy of the
 * original (`entry.unaltered`) and a link out to the archive record when it
 * does not — the reader gets to the same picture either way.
 */
import type { MediaIndexEntry } from '../packs/media-index.js';
import './media.css';

/** Which of the pair is on screen. */
export type MediaShowing = 'colorized' | 'original';

export interface MediaCreditProps {
  entry: MediaIndexEntry;
  showing?: MediaShowing;
  /** Present only when the pair exists; without it the archive link is shown. */
  onShow?: ((which: MediaShowing) => void) | undefined;
}

export function MediaCredit({ entry, showing = 'colorized', onShow }: MediaCreditProps) {
  const pair = entry.unaltered?.length ? onShow : undefined;
  return (
    <span className="media__provenance">
      {entry.colorized && (
        <span
          className="media__label"
          data-showing={showing}
          title="Colour is an interpretation; only colour was changed"
        >
          {showing === 'original' ? 'The original, before colour' : 'Colorized (AI-assisted)'}
        </span>
      )}
      <span className="media__credit">{entry.credit}</span>
      {pair ? (
        <>
          {' · '}
          <button
            type="button"
            className="media__original"
            aria-pressed={showing === 'original'}
            onClick={() => pair(showing === 'original' ? 'colorized' : 'original')}
          >
            {showing === 'original' ? 'Show the colorization' : 'Show original'}
          </button>
        </>
      ) : entry.originalUrl ? (
        <>
          {' · '}
          <a
            className="media__original"
            href={entry.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Show original
            <span aria-hidden="true"> ↗</span>
          </a>
        </>
      ) : null}
    </span>
  );
}
