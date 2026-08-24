/**
 * Focus breadcrumb: "Campaign › First Battle of the Marne" with a way back,
 * plus the index of everything the pack can be focused on. Lives above the
 * map; the zoom-in mechanism itself is in src/engine/focus.ts and the App's
 * FocusController. The trail names the level you are on for what it is — a
 * chapter or a zoom-in, from the engine, not a fixed word (sand-neh.7).
 */
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
      {!focus && <ChapterIndex battles={battles} onEnter={onEnter} />}
    </nav>
  );
}
