/**
 * Focus breadcrumb: "Campaign › First Battle of the Marne" with a way back,
 * plus the chips that enter a zoom-in. Lives above the map; the zoom-in
 * mechanism itself is in src/engine/focus.ts and the App's FocusController.
 */
import type { Battle } from '../packs/schema/index.js';
import './breadcrumb.css';

export interface BreadcrumbProps {
  campaignTitle: string;
  battles: Battle[];
  focus: Battle | undefined;
  onEnter: (battleId: string) => void;
  onExit: () => void;
}

export function Breadcrumb({ campaignTitle, battles, focus, onEnter, onExit }: BreadcrumbProps) {
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
            <span className="crumbs__current" aria-current="page">
              {focus.title}
            </span>
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
      {!focus && battles.length > 0 && (
        <div className="crumbs__battles" role="group" aria-label="Zoom in to a battle">
          <span className="crumbs__label">Zoom in:</span>
          {battles.map((b) => (
            <button
              type="button"
              key={b.id}
              className="crumbs__chip"
              onClick={() => onEnter(b.id)}
              title={b.summary}
            >
              {b.title}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
