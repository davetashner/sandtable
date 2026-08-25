/**
 * Roving `tabindex` (sand-pmz.12) — a row of controls that is one tab stop.
 *
 * The pattern is ARIA's and there is nothing clever in it: exactly one item in
 * the set is `tabindex="0"` and the rest are `tabindex="-1"`, so `Tab` reaches
 * the set once; inside it the arrows move, `Home`/`End` jump, and focus
 * follows. Two rows in this app need it for the same reason — they are long.
 * The timeline's markers are one button per event, about fifty of them on the
 * campaign, and the map's roster is one entry per thing drawn on the map.
 *
 * The part that is this app's rather than the pattern's is who gets the
 * arrows. The transport listens on `window` for ←/→ and steps the clock, and
 * the tour listens for ←/→ as well; a row that takes them for itself has to
 * say so, which is `data-owns-keys` in `shortcuts.ts`. The caller puts that on
 * the same element it puts `ref` and `onKeyDown` on.
 *
 * Where the keyboard enters the set is `entry`: the caller's idea of which
 * item is the interesting one — the marker at "now", the first thing on the
 * map — and it holds only until the reader moves, after which the set
 * remembers where they left it.
 */
import { useCallback, useRef, useState, type KeyboardEvent, type RefObject } from 'react';

export type RovingOrientation = 'horizontal' | 'vertical' | 'both';

/** The attribute that marks a member of the set; the hook finds items by it. */
export const ROVING_ITEM = 'data-roving-item';

export interface RovingItemProps {
  tabIndex: number;
  onFocus: () => void;
  [ROVING_ITEM]: string;
}

export interface Roving<T extends HTMLElement = HTMLElement> {
  /** Put on the element that wraps the items, with `data-owns-keys`. */
  ref: RefObject<T | null>;
  /** Put on the same element. */
  onKeyDown: (e: KeyboardEvent) => void;
  /** Which item is the tab stop right now. */
  index: number;
  /** Spread on item `i`. */
  itemProps: (i: number) => RovingItemProps;
  /** Move focus to item `i` (clamped). */
  focusAt: (i: number) => void;
}

export interface RovingOptions {
  /** Which arrows move within the set; the others are left alone. */
  orientation?: RovingOrientation;
  /** Where `Tab` lands before the reader has moved. Default 0. */
  entry?: number;
}

export function useRoving<T extends HTMLElement = HTMLElement>(
  count: number,
  o: RovingOptions = {},
): Roving<T> {
  const { orientation = 'horizontal', entry = 0 } = o;
  const ref = useRef<T | null>(null);
  // `null` while the reader has not moved: the entry point is the caller's
  // until then, and theirs afterwards.
  const [moved, setMoved] = useState<number | null>(null);
  const last = Math.max(0, count - 1);
  const index = Math.min(last, Math.max(0, moved ?? entry));

  const focusAt = useCallback((i: number) => {
    setMoved(i);
    const items = ref.current?.querySelectorAll<HTMLElement>(`[${ROVING_ITEM}]`);
    items?.[i]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const across = orientation !== 'vertical';
      const down = orientation !== 'horizontal';
      let next: number | undefined;
      switch (e.key) {
        case 'ArrowRight':
          if (across) next = index + 1;
          break;
        case 'ArrowLeft':
          if (across) next = index - 1;
          break;
        case 'ArrowDown':
          if (down) next = index + 1;
          break;
        case 'ArrowUp':
          if (down) next = index - 1;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = last;
          break;
        default:
          return;
      }
      if (next === undefined) return;
      // Clamped rather than wrapped: a row of dates in order has a first and a
      // last, and arriving back at August by pressing → is not a thing the
      // strip should do. Home and End are the way to the ends.
      e.preventDefault();
      focusAt(Math.min(last, Math.max(0, next)));
    },
    [orientation, index, last, focusAt],
  );

  const itemProps = useCallback(
    (i: number): RovingItemProps => ({
      tabIndex: i === index ? 0 : -1,
      onFocus: () => setMoved(i),
      [ROVING_ITEM]: '',
    }),
    [index],
  );

  return { ref, onKeyDown, index, itemProps, focusAt };
}
