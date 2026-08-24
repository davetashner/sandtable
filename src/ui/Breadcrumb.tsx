/**
 * Focus breadcrumb: "Campaign › First Battle of the Marne" with a way back,
 * plus the index of everything the pack can be focused on. Lives above the
 * map; the zoom-in mechanism itself is in src/engine/focus.ts and the App's
 * FocusController. The trail names the level you are on for what it is — a
 * chapter or a zoom-in, from the engine, not a fixed word (sand-neh.7).
 *
 * The trail also catches the keyboard when a level is entered from the index
 * (sand-pmz.4.2). Choosing a chapter closes the index, and closing it unmounts
 * the button that was pressed, which left focus on `<body>`: a reader who had
 * tabbed into the list was returned to the top of the document with no way of
 * knowing anything had happened. The level that was just entered takes focus
 * instead — it is the one thing on screen that answers "where am I now" — and
 * only when the index was the way in, so opening the same level from a
 * timeline glyph or a beat chip still leaves the keyboard where the reader
 * put it.
 */
import { useEffect, useRef } from 'react';
import type { Battle } from '../packs/schema/index.js';
import { ChapterIndex, kindLabel } from './ChapterIndex.js';
import './breadcrumb.css';

export interface BreadcrumbProps {
  campaignTitle: string;
  battles: Battle[];
  focus: Battle | undefined;
  onEnter: (battleId: string) => void;
  onExit: () => void;
}

export function Breadcrumb({ campaignTitle, battles, focus, onEnter, onExit }: BreadcrumbProps) {
  const level = useRef<HTMLSpanElement>(null);
  const fromIndex = useRef(false);
  useEffect(() => {
    if (!focus || !fromIndex.current) return;
    fromIndex.current = false;
    level.current?.focus();
  }, [focus]);

  return (
    <nav className="crumbs" aria-label="Focus">
      <ol className="crumbs__trail">
        <li>
          {focus ? (
            <button type="button" className="crumbs__link" onClick={onExit}>
              {campaignTitle}
            </button>
          ) : (
            <span className="crumbs__current" aria-current="page">
              {campaignTitle}
            </span>
          )}
        </li>
        {focus && (
          <li>
            <span className="crumbs__sep" aria-hidden="true">
              ›
            </span>
            {/* `tabIndex={-1}`: a destination for focus, never a tab stop. */}
            <span className="crumbs__current" aria-current="page" ref={level} tabIndex={-1}>
              {focus.title}
            </span>
            <span className="crumbs__kind">{kindLabel(focus)}</span>
            <button
              type="button"
              className="crumbs__exit"
              onClick={onExit}
              aria-label="Back to the campaign"
              title="Back to the campaign (restores the campaign clock)"
            >
              ✕
            </button>
          </li>
        )}
      </ol>
      {!focus && (
        <ChapterIndex
          battles={battles}
          onEnter={(id) => {
            fromIndex.current = true;
            onEnter(id);
          }}
        />
      )}
    </nav>
  );
}
