/**
 * What is on the map, for a reader who is not holding a mouse (sand-pmz.11).
 *
 * The map draws its armies, its commanders and its losses as deck.gl geometry
 * on a WebGL canvas. There is nothing there to focus: no element, no role, no
 * name — a click is the only way in, and axe cannot see it to say so. Each of
 * those things has an equivalent elsewhere (a commander is on the cast strip,
 * a tally is a gauge under the timeline), but an equivalent is not the map,
 * and the map is the surface this app is about.
 *
 * So the map gets a **mode** rather than a fourth panel (ADR 0006): one stop
 * in the tab order that says how many things are on the map, and opens a
 * roster of them — the same objects, the same labels, in the order they are
 * drawn — as a roving list (sand-pmz.12's hook, so it is one tab stop and not
 * forty). `Enter` on an entry does exactly what a click on its token does;
 * `Escape` closes the roster and puts the keyboard back on the control that
 * opened it, which is what the chapter index does and what a `<dialog>` does.
 *
 * The entry control is off-screen until it has focus, the way a skip link is:
 * a reader who never presses `Tab` never sees it, and one who does sees where
 * they are. It renders nothing when the map is empty.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useRoving } from '../engine/roving.js';
import './map-objects.css';

export interface MapObject {
  /** Unique in the list. */
  id: string;
  /** What it is, in a word or two: "Army", "Commander", "Headquarters". */
  kind: string;
  /** What the token reads on the map. */
  name: string;
  /** Whose it is, or what it counts — the side, the post, the ledger. */
  detail?: string | undefined;
  /** Where it is, in the map's own vocabulary: "near Liège". */
  where?: string | undefined;
  /** What a click on the token does. */
  open: () => void;
}

export interface MapObjectsProps {
  objects: MapObject[];
  /** The date the clock reads, for the line above the list. */
  when: string;
  /** Open on mount (the gallery specimen, and the tests). */
  defaultOpen?: boolean;
}

export function MapObjects({ objects, when, defaultOpen = false }: MapObjectsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const enterRef = useRef<HTMLButtonElement>(null);
  const roving = useRoving<HTMLUListElement>(objects.length, { orientation: 'both' });
  const { focusAt, index } = roving;

  // Opening the roster puts the keyboard on the first object. Closing it with
  // `Escape` puts the keyboard back on the control that opened it; closing it
  // by tabbing off the end does not, because the reader is already somewhere
  // else and dragging them back is a trap rather than a courtesy.
  const returning = useRef(false);
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) focusAt(index);
    if (!open && wasOpen.current && returning.current) enterRef.current?.focus();
    returning.current = false;
    wasOpen.current = open;
  }, [open, focusAt, index]);

  if (objects.length === 0) return null;

  if (!open) {
    return (
      <div className="map-objects">
        <button
          type="button"
          ref={enterRef}
          className="map-objects__enter"
          onClick={() => setOpen(true)}
          aria-label={`What is on the map — ${objects.length} objects; open to walk them with the arrow keys`}
        >
          What is on the map ({objects.length})
        </button>
      </div>
    );
  }

  return (
    <div
      className="map-objects map-objects--open"
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        returning.current = true;
        setOpen(false);
      }}
      onBlur={(e) => {
        // Tabbing off the end leaves the mode rather than leaving a panel open
        // over the map behind the reader.
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <div className="map-objects__panel">
        <p className="map-objects__when">
          {objects.length} on the map · {when}
        </p>
        <ul
          className="map-objects__list"
          aria-label={`On the map — ${when}`}
          ref={roving.ref}
          onKeyDown={roving.onKeyDown}
        >
          {objects.map((o, i) => (
            <li key={o.id}>
              <button
                type="button"
                className="map-objects__item"
                {...roving.itemProps(i)}
                onClick={o.open}
              >
                {/* The spaces are load-bearing: two adjacent spans with
                    nothing between them are read as one word (`Army1st`), and
                    flexbox drops whitespace-only text rather than laying it
                    out, so the name gains a space and the row does not. */}
                <span className="map-objects__kind">{o.kind}</span>{' '}
                <span className="map-objects__name">{o.name}</span>{' '}
                {(o.detail || o.where) && (
                  <span className="map-objects__where">
                    {[o.detail, o.where].filter(Boolean).join(' · ')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <p className="map-objects__hint">Arrows to walk · Enter to open · Esc to close</p>
      </div>
    </div>
  );
}

export default MapObjects;
