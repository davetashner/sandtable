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
 *
 * It prints dates now (`sand-neh.23`). ADR 0013 shipped without them because
 * two of the pack's chapters sit in a window that is not when they happened
 * and nothing in the data said so; ADR 0015's `window` says it, so the index
 * can date the levels whose windows are real and say something else — not
 * nothing — for the ones that are placed.
 */
import { useMemo, useRef, useState } from 'react';
import { battleRange, isChapter } from '../engine/focus.js';
import { labelSpan } from '../engine/ticks.js';
import type { Battle } from '../packs/schema/index.js';
import './chapter-index.css';

/** What a battle is called, from what it carries. Shared with the trail. */
// eslint-disable-next-line react-refresh/only-export-components -- one word about a Battle, wanted by the breadcrumb beside it
export const kindLabel = (b: Battle): string => (isChapter(b) ? 'Chapter' : 'Zoom-in');

/** "Open the chapter Liège" / "Zoom in to Liège" — the accessible name. */
const openLabel = (b: Battle): string =>
  isChapter(b) ? `Open the chapter ${b.title}` : `Zoom in to ${b.title}`;

/**
 * The words a `placed` level shows where every other level shows a date.
 *
 * A `placed` window is where a chapter sits on the campaign strip, not when it
 * happened (ADR 0015), so printing it would be printing a date the pack knows
 * to be false — which is the whole reason ADR 0013 printed none at all. The
 * blank that leaves is worse than it looks: in a column where ten of twelve
 * entries carry a date, an empty one reads as data that failed to load rather
 * than as a silence anybody chose. So the slot says why it is empty, and where
 * the answer is: the chapter's own beats, each of which carries its real date.
 */
const PLACED = 'dates inside';

/** What an entry shows for "when": a real span, or why there isn't one. */
const whenLabel = (b: Battle): string =>
  b.window === 'placed' ? PLACED : labelSpan(battleRange(b));

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
                aria-label={`${openLabel(b)}, ${whenLabel(b)}`}
                title={b.summary}
                onClick={() => {
                  setOpen(false);
                  onEnter(b.id);
                }}
              >
                <span className="chapter-index__title">{b.title}</span>
                {/* The kind and the when read as one eyebrow under the title.
                    On one line beside it the longest span — "18 Aug – 14 Sep
                    1914" — takes half the column and shreds the long titles
                    into four lines; under it, both are whole. */}
                <span aria-hidden="true" className="chapter-index__meta">
                  <span className="chapter-index__kind">{kindLabel(b)}</span>
                  <span className="chapter-index__sep">·</span>
                  <span className="chapter-index__when">{whenLabel(b)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
