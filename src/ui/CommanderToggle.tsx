/**
 * Turns the commander portraits on the map on and off (sand-1l0.27).
 *
 * Off by default: the tracks are a second population on a map that already
 * carries every army, and most of the time the reader wants the armies. The
 * control sits with the other on/off affordance in the header rather than
 * getting a bar of its own (ADR 0006).
 */
import './commander-toggle.css';

export interface CommanderToggleProps {
  on: boolean;
  onToggle: () => void;
  /** Hidden when the pack has no tracks. */
  available: boolean;
}

export function CommanderToggle({ on, onToggle, available }: CommanderToggleProps) {
  if (!available) return null;
  return (
    <button
      type="button"
      className="commanders__toggle"
      // The name says what the control is; the state is aria-pressed. A name
      // that flipped to "Commanders off" would rename itself under a screen
      // reader every time it was pressed (the same reasoning as the score).
      aria-label="Commanders on the map"
      aria-pressed={on}
      onClick={onToggle}
      title={
        on
          ? 'Hide the commanders'
          : 'Show where the commanders were — headquarters day by day, journeys at the hour'
      }
    >
      <span aria-hidden="true" className="commanders__glyph">
        ◉
      </span>
      <span aria-hidden="true" className="commanders__label">
        {on ? 'Commanders' : 'Commanders off'}
      </span>
    </button>
  );
}
