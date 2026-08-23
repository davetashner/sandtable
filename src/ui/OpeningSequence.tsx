/**
 * The opening sequence (sand-1l0.26): the first thirty seconds.
 *
 * A pack states its premise before the map is interactive, then hands off —
 * into the guided tour, into free exploration, or into the chain of events
 * that produced the war. The heavy map surface loads underneath while this is
 * on screen, so the pause costs nothing.
 *
 * Three rules it must not break:
 *   1. It is skippable at any moment, by pointer, by Escape, or by tabbing to
 *      the skip control. A cinematic that cannot be left is a trap.
 *   2. `prefers-reduced-motion` gets no staged reveal — the whole premise is
 *      on screen at once, with the same choices.
 *   3. It knows nothing about 1914: every word comes from `pack.opening`.
 *
 * Presentational; the controller in App.tsx owns when it shows and what the
 * choices do.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Citation, Opening, Source } from '../packs/schema/index.js';
import './opening.css';

/** ms between headline lines when motion is allowed. */
const LINE_MS = 900;

/**
 * The premise cites its sources, but not the way a beat does: a numbered
 * apparatus and a bibliography would be half the panel and nobody reads a
 * footnote in the first thirty seconds. The markers come out of the prose and
 * the sources are named once, quietly — with the real working one click away
 * behind `claim`.
 */
function stripFootnotes(md: string): string {
  return md.replace(/\[\^[^\]\s]+\]/g, '').replace(/\s+([.,;:])/g, '$1');
}

/** "Herwig 2009 · Tuchman 1962" — surname and year, in pack order. */
function shortCite(citations: Citation[] | undefined, sources: Source[]): string {
  const byId = new Map(sources.map((s) => [s.id, s]));
  return (citations ?? [])
    .map((c) => {
      const s = byId.get(c.source);
      if (!s) return c.source.split(':')[1] ?? c.source;
      const surname = (s.author ?? '').split(',')[0]?.trim();
      return [surname || s.title, s.year].filter(Boolean).join(' ');
    })
    .filter(Boolean)
    .join(' · ');
}

export interface OpeningSequenceProps {
  opening: Opening;
  sources: Source[];
  /** No staged reveal, no fades — everything at once. */
  reduced?: boolean;
  /** Start the guided tour. Absent when the pack has no tour. */
  onPlay?: (() => void) | undefined;
  /** Dismiss and leave the viewer on the map. */
  onExplore: () => void;
  /** Open the causal chain the war came out of. Absent when the pack has none. */
  onChain?: (() => void) | undefined;
  /** Show the evidence behind the premise (pack.opening.claim). */
  onClaim?: (() => void) | undefined;
  /** How long the tour takes, for the primary action's hint. */
  tourMinutes?: number | undefined;
}

export function OpeningSequence({
  opening,
  sources,
  reduced = false,
  onPlay,
  onExplore,
  onChain,
  onClaim,
  tourMinutes,
}: OpeningSequenceProps) {
  const total = opening.headline.length;
  // Reduced motion shows the whole premise immediately; so does any viewer who
  // skips ahead by pressing on before the reveal has finished.
  const [shown, setShown] = useState(() => (reduced ? total : 1));
  const done = shown >= total;
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reduced || done) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), LINE_MS);
    return () => window.clearTimeout(id);
  }, [shown, done, reduced]);

  // Escape leaves at any point — before the premise has finished reading, too.
  // Tab stays inside: this is a modal, and a keyboard viewer who tabs off the
  // end of it would land in an inert app with no way back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExplore();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      // Links count too: the lede's footnote marker is focusable, and a trap
      // that only knew about buttons would let Tab past it and out.
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExplore]);

  // Focus starts on Skip: the first Tab lands on a way out, and a screen
  // reader hears the dialog's premise from its label.
  useEffect(() => {
    skipRef.current?.focus();
  }, []);

  const lede = useMemo(() => stripFootnotes(opening.lede), [opening.lede]);
  const cite = useMemo(() => shortCite(opening.sources, sources), [opening.sources, sources]);

  return (
    <div className="opening" role="dialog" aria-modal="true" aria-labelledby="opening-headline">
      <div className="opening__panel" ref={panelRef}>
        <button ref={skipRef} type="button" className="opening__skip" onClick={onExplore}>
          Skip
          <span className="opening__skip-key" aria-hidden="true">
            Esc
          </span>
        </button>

        {opening.eyebrow && <p className="eyebrow opening__eyebrow">{opening.eyebrow}</p>}

        {/*
          The premise is in the DOM in full from the first frame — the staged
          reveal is opacity only. A screen reader gets the whole thing at once
          through the dialog's label rather than a line at a time.
        */}
        <h2 className="opening__headline" id="opening-headline">
          {opening.headline.map((line, i) => (
            <span key={line} className="opening__line" data-shown={i < shown || undefined}>
              {line}
            </span>
          ))}
        </h2>

        <div className="opening__lede" data-shown={done || undefined}>
          <Markdown remarkPlugins={[remarkGfm]}>{lede}</Markdown>
          {cite && <p className="opening__cite">{cite}</p>}
        </div>

        {onClaim && opening.claim && (
          <p className="opening__claim" data-shown={done || undefined}>
            <button type="button" className="opening__claim-link" onClick={onClaim}>
              {opening.claim.label}
            </button>
          </p>
        )}

        <div className="opening__actions" data-shown={done || undefined}>
          {onPlay && (
            <button
              type="button"
              className="opening__action opening__action--primary"
              onClick={onPlay}
            >
              Play the campaign
              {tourMinutes ? <span className="opening__hint">about {tourMinutes} min</span> : null}
            </button>
          )}
          <button type="button" className="opening__action" onClick={onExplore}>
            Explore the map
            <span className="opening__hint">go at your own pace</span>
          </button>
          {onChain && (
            <button type="button" className="opening__action" onClick={onChain}>
              How did it start?
              <span className="opening__hint">the chain of events</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
