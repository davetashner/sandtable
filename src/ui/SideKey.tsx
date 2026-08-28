/**
 * The key to the map's colours — which side is which, and what the dashed
 * ring means (sand-neh.26).
 *
 * It used to be a footer inside the dossier, where ADR 0006's table put it.
 * That was the wrong home twice over: it is a key to the *map's* colours, and
 * it never changes, yet it sat in the reading rail as a fixed `auto` row above
 * the beat's `1fr` — spending 99px of desktop and 67px of phone on information
 * that has not moved since the page loaded, while the prose underneath was
 * squeezed to nothing. So it lives on the surface it explains, closed, and
 * opens in place.
 *
 * Closed by default on purpose: a reader who has met the two colours does not
 * need them named again on every beat, and a reader who has not is one press
 * away. The disclosure state is the announcement, so no `role` is set on the
 * summary — an explicit role replaces the one that makes it pressable
 * (the same trap `dossier__badge` documents).
 */
import { APPROX_MARK } from '../engine/confidence.js';
import { sideToken } from '../engine/layers/colors.js';
import type { Side } from '../packs/schema/index.js';
import './side-key.css';

export interface SideKeyProps {
  sides: Side[];
  /**
   * What a side opens, where the pack gives one answer (sand-y0u.29): a side
   * that put a single army in the field becomes a control, a side that put
   * nine stays a swatch and a name. The engine decides (`sideFormation`);
   * the key only asks.
   */
  openSide?: ((sideId: string) => { label: string; onClick: () => void } | undefined) | undefined;
  /** Open on mount — the gallery renders it that way so the states are visible. */
  defaultOpen?: boolean;
}

export function SideKey({ sides, openSide, defaultOpen }: SideKeyProps) {
  return (
    <details className="side-key" open={defaultOpen || undefined}>
      <summary className="side-key__summary">Key</summary>
      <div className="side-key__body" aria-label="Legend">
        {sides.map((s) => {
          const name = s.short ?? s.name;
          const swatch = (
            <span
              className="side-key__swatch"
              style={{ background: `var(${sideToken(s, sides)})` }}
              aria-hidden="true"
            />
          );
          const open = openSide?.(s.id);
          // The visible text stays the side's name and the accessible name
          // starts with it, so what a reader says is what the control is
          // called (WCAG 2.5.3) — and what it opens is said out loud, because
          // "Britain" alone does not tell anyone a card is on the other end.
          return open ? (
            <button
              key={s.id}
              type="button"
              className="side-key__side side-key__side--open"
              aria-label={`${name} — open ${open.label}`}
              onClick={open.onClick}
            >
              {swatch}
              {name}
            </button>
          ) : (
            <span key={s.id} className="side-key__side">
              {swatch}
              {name}
            </span>
          );
        })}
        {/*
          The key to the approximate treatment (sand-23b.4). A dashed, hollow
          swatch, because that is what the map draws; the words, because a
          shape on its own is not a footnote. Where the position came from is
          on the card the token opens.
        */}
        <span className="side-key__side side-key__approx">
          <span className="side-key__swatch side-key__swatch--approx" aria-hidden="true" />
          {APPROX_MARK} approximate — derived, not recorded
        </span>
      </div>
    </details>
  );
}
