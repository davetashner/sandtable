/**
 * Bottom sheet for the dossier on phones (ADR 0006): three detents — peek
 * (title only), half, full. A grab handle toggles through them; swiping the
 * handle up/down moves one detent. The sheet owns its vertical drags; the map
 * behind keeps pinch-zoom and pan.
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import './bottom-sheet.css';

export type Detent = 'peek' | 'half' | 'full';
const ORDER: Detent[] = ['peek', 'half', 'full'];

export interface BottomSheetProps {
  children: ReactNode;
  initial?: Detent;
  /**
   * Raise the sheet to at least this detent whenever the value changes to a
   * new non-empty key — a card opening, say. At peek the body is clipped to
   * 112px, so content asked for while the sheet is down would otherwise be
   * invisible and unscrollable (sand-neh.9).
   */
  raiseFor?: string | undefined;
  raiseTo?: Detent;
  label?: string;
  /** Tests/embedding can observe detent changes. */
  onDetent?: (d: Detent) => void;
}

// eslint-disable-next-line react-refresh/only-export-components -- detent helper belongs with the sheet
export function nextDetent(d: Detent, dir: 1 | -1): Detent {
  const i = Math.min(ORDER.length - 1, Math.max(0, ORDER.indexOf(d) + dir));
  return ORDER[i]!;
}

export function BottomSheet({
  children,
  initial = 'peek',
  raiseFor,
  raiseTo = 'half',
  label = 'Dossier sheet',
  onDetent,
}: BottomSheetProps) {
  const [detent, setDetentState] = useState<Detent>(initial);
  const startY = useRef<number | null>(null);
  const setDetent = useCallback(
    (d: Detent) => {
      setDetentState(d);
      onDetent?.(d);
    },
    [onDetent],
  );

  // Only ever raises, and only when the key changes: a reader who pulls the
  // sheet back down while a card is open is left alone.
  const lastRaise = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!raiseFor || raiseFor === lastRaise.current) {
      lastRaise.current = raiseFor;
      return;
    }
    lastRaise.current = raiseFor;
    setDetentState((d) => (ORDER.indexOf(d) < ORDER.indexOf(raiseTo) ? raiseTo : d));
  }, [raiseFor, raiseTo]);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current;
    startY.current = null;
    if (dy < -40) setDetent(nextDetent(detent, 1));
    else if (dy > 40) setDetent(nextDetent(detent, -1));
    else setDetent(detent === 'full' ? 'peek' : nextDetent(detent, 1)); // tap cycles
  };

  return (
    <section className="sheet" data-detent={detent} aria-label={label}>
      <button
        type="button"
        className="sheet__handle"
        aria-label={`Dossier: ${detent} — tap or swipe to resize`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') setDetent(nextDetent(detent, 1));
          else if (e.key === 'ArrowDown') setDetent(nextDetent(detent, -1));
          else return;
          e.preventDefault();
        }}
      >
        <span className="sheet__grip" aria-hidden="true" />
      </button>
      <div className="sheet__body">{children}</div>
    </section>
  );
}
