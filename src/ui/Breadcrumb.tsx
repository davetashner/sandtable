/**
 * Focus breadcrumb: "Campaign › First Battle of the Marne" with a way back,
 * plus the chips that enter a zoom-in. Lives above the map; the zoom-in
 * mechanism itself is in src/engine/focus.ts and the App's FocusController.
 */
import { useMemo } from 'react';
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
  // The chapters read in the order the campaign ran, not the order the pack
  // file happens to list them (sand-neh.12). The sort is stable, so the two
  // backstory chapters — which share the clamped window at the start of the
  // pack — keep the pack's order: the origins of the plan, then the crisis
  // that set it off.
  const chapters = useMemo(
    () =>
      [...battles].sort((a, b) => Date.parse(a.timeRange.start) - Date.parse(b.timeRange.start)),
    [battles],
  );
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
          {chapters.map((b) => (
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
