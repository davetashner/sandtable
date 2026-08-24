/**
 * Copy a link to exactly this view (sand-shn.3, ADR 0009).
 *
 * The whole view lives in the query string — time, branch, focus, card, tour
 * step, layers — so the affordance is one glyph in the header beside the other
 * switches rather than a share panel (ADR 0006: everything else is a glyph or
 * a mode). What it copies is `window.location.href` as the reader sees it, so
 * the URL bar and the clipboard can never disagree.
 *
 * `navigator.clipboard` is not everywhere: it is absent over plain http, and a
 * browser may refuse the write. When it does, the button falls back to showing
 * the URL in a selected, read-only field — the reader copies by hand rather
 * than being told nothing happened.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import './copy-link.css';

/** Long enough to be read, short enough not to linger over the next click. */
const CONFIRM_MS = 2400;

export interface CopyLinkProps {
  /** Defaults to the address bar; injected in tests. */
  href?: () => string;
  /** Defaults to `navigator.clipboard.writeText`. */
  write?: (text: string) => Promise<void>;
}

type State = 'idle' | 'copied' | 'manual';

export function CopyLink({ href, write }: CopyLinkProps) {
  const [state, setState] = useState<State>('idle');
  const [url, setUrl] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    const link = href ? href() : window.location.href;
    setUrl(link);
    const writer = write ?? navigator.clipboard?.writeText.bind(navigator.clipboard);
    if (!writer) {
      setState('manual');
      return;
    }
    try {
      await writer(link);
    } catch {
      setState('manual'); // refused (no permission, not a user gesture, insecure origin)
      return;
    }
    setState('copied');
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), CONFIRM_MS);
  }, [href, write]);

  // The fallback field is only useful selected; it appears on a click, so
  // moving focus into it is following the reader rather than stealing from them.
  useEffect(() => {
    if (state === 'manual') field.current?.select();
  }, [state]);

  return (
    <div className="copy-link">
      <button
        type="button"
        className="copy-link__button"
        // The name says what the control does; the outcome goes to the live
        // region below, so the button is not renamed under a screen reader
        // between one press and the next (the same reasoning as the score).
        aria-label="Copy a link to this view"
        title="Copy a link to this view — the time, branch, focus, card and layers you are looking at"
        onClick={() => void copy()}
      >
        <span aria-hidden="true" className="copy-link__glyph">
          ⧉
        </span>
        <span aria-hidden="true" className="copy-link__label">
          {state === 'copied' ? 'Link copied' : 'Copy link'}
        </span>
      </button>
      <p className="copy-link__status" role="status">
        <span className="copy-link__status-text">
          {state === 'copied'
            ? 'Link to this view copied to the clipboard'
            : state === 'manual'
              ? 'Copying is unavailable in this browser — the link is selected below, copy it by hand'
              : ''}
        </span>
      </p>
      {state === 'manual' && (
        <input
          ref={field}
          className="copy-link__field"
          type="text"
          readOnly
          value={url}
          aria-label="Link to this view"
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
    </div>
  );
}
