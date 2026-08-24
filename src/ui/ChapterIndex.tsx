/**
 * The pack's index of chapters and zoom-ins (sand-neh.7, ADR 0013).
 *
 * It was a row of chips labelled "Zoom in:" — eleven of them, wrapping to
 * three rows above the map, and calling a chapter a zoom-in on the way past.
 * It is a table of contents, so it behaves like one: closed it is a single
 * control that says how much the pack holds, open it is one orderly list in
 * campaign order, and every entry is named for what it actually is — the
 * engine's own answer (`isChapter`), never a second hard-coded string.
 *
 * Lives in the focus breadcrumb row, which is the shell chrome ADR 0006
 * allows; entering an entry is `setFocus`, so the `focus` slot in the URL
 * stays the source of truth and deep links are unaffected (ADR 0009).
 */
import { useMemo, useRef, useState } from 'react';
import { isChapter } from '../engine/focus.js';
import type { Battle } from '../packs/schema/index.js';
import './chapter-index.css';

/** What a battle is called, from what it carries. Shared with the trail. */
// eslint-disable-next-line react-refresh/only-export-components -- one word about a Battle, wanted by the breadcrumb beside it
export const kindLabel = (b: Battle): string => (isChapter(b) ? 'Chapter' : 'Zoom-in');

/** "Open the chapter Liège" / "Zoom in to Liège" — the accessible name. */
const openLabel = (b: Battle): string =>
  isChapter(b) ? `Open the chapter ${b.title}` : `Zoom in to ${b.title}`;

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;

/**
 * What the closed control says. A pack of one kind is named by that kind; a
 * pack of both — which 1914 is, five chapters and six zoom-ins — has to name
 * both, and the count is the part that tells you there is something here.
 */
function summaryLabel(battles: Battle[]): string {
  const chapters = battles.filter(isChapter).length;
  const zoomIns = battles.length - chapters;
  if (!zoomIns) return plural(chapters, 'chapter');
  if (!chapters) return plural(zoomIns, 'zoom-in');
  return `${battles.length} chapters and zoom-ins`;
}

export interface ChapterIndexProps {
  battles: Battle[];
  onEnter: (battleId: string) => void;
  /** Open on mount. The app starts closed; the gallery shows the list. */
  defaultOpen?: boolean;
}

export function ChapterIndex({ battles, onEnter, defaultOpen = false }: ChapterIndexProps) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useRef<HTMLButtonElement>(null);
  // The list unmounts when it closes, so the keyboard has to be put back on
  // the control that closed it rather than dropped on the document.
  const close = () => {
    setOpen(false);
    toggle.current?.focus();
  };
  // The index reads in the order the campaign ran, not the order the pack file
  // happens to list them (sand-neh.12). The sort is stable, so the two
  // backstory chapters — which share the clamped window at the start of the
  // pack — keep the pack's order: the origins of the plan, then the crisis
  // that set it off.
  const ordered = useMemo(
    () =>
      [...battles].sort((a, b) => Date.parse(a.timeRange.start) - Date.parse(b.timeRange.start)),
    [battles],
  );
  if (battles.length === 0) return null;
  return (
    <>
      <button
        type="button"
        ref={toggle}
        className="chapter-index__toggle"
        aria-expanded={open}
        aria-controls="chapter-index"
        onClick={() => setOpen((v) => !v)}
        title="The chapters and zoom-ins this pack carries"
      >
        <span aria-hidden="true" className="chapter-index__caret">
          {open ? '▾' : '▸'}
        </span>
        {summaryLabel(battles)}
      </button>
      {open && (
        <ul
          id="chapter-index"
          className="chapter-index__list"
          aria-label="Chapters and zoom-ins"
          // Escape closes the index the way it closes every other disclosure,
          // from wherever the keyboard has reached inside it.
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
        >
          {ordered.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className="chapter-index__entry"
                aria-label={openLabel(b)}
                title={b.summary}
                onClick={() => {
                  setOpen(false);
                  onEnter(b.id);
                }}
              >
                <span className="chapter-index__title">{b.title}</span>
                <span aria-hidden="true" className="chapter-index__kind">
                  {kindLabel(b)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
