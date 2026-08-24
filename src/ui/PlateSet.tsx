/**
 * A comparison set of photographs on one card (ADR 0014): four armies'
 * headgear, one army's four weapons — a fixed few plates under one declared
 * axis, all of them on screen at once.
 *
 * It is not a gallery, and the difference is structural rather than a matter
 * of restraint. The set is bounded by the schema (two plates at least, four
 * at most), every plate is visible without a control being touched, there is
 * no "next", and the order is a claim the author made rather than the order
 * the files arrived in. What the reader compares is one variable across a
 * shared frame, which is why the whole set takes a single `fit`.
 *
 * Each plate is a `MediaFigure` — the tone, the missing-file frame, the
 * full-size view and the loading rules all come from ADR 0012 unchanged.
 * Nothing here renders a picture itself. The one thing a set does differently
 * is gather the provenance: four small plates with a credit block under each
 * are mostly credit, so the credits sit together under the set, one line per
 * plate and keyed by its label — the same `MediaCredit`, in one place instead
 * of four.
 */
/* eslint-disable react-refresh/only-export-components -- the set and the resolver that feeds it live together; every card family uses the pair */
import type { MediaIndexEntry } from '../packs/media-index.js';
import { MediaCredit } from './MediaCredit.js';
import { MediaFigure } from './MediaFigure.js';
import './plate-set.css';

export interface PlateSetItem {
  /** Resolved from the manifest id by the caller; an id that does not resolve is a validator error. */
  entry: MediaIndexEntry;
  /** This plate's point on the axis — the visible caption, where the manifest's own caption is the alt text. */
  label: string;
}

export interface PlateSetProps {
  /** What is being compared, in one line, over the set. */
  axis: string;
  items: PlateSetItem[];
  /** One crop for every plate; a shared frame is what makes it a comparison. */
  fit?: 'band' | 'portrait';
  /** Base URL of the media bucket path, default /assets/media/. */
  base?: string;
  /** Target rendered width of one plate in CSS px (drives `sizes`). */
  width?: number;
}

/**
 * Resolves a set's manifest ids against the media index, in the author's
 * order, dropping any the index does not know. Every card family that grows a
 * set resolves it this way rather than reaching for the index itself.
 */
export function plateItems(
  items: readonly { media: string; label: string }[],
  resolve: (id: string) => MediaIndexEntry | undefined,
): PlateSetItem[] {
  return items.flatMap((item) => {
    const entry = resolve(item.media);
    return entry ? [{ entry, label: item.label }] : [];
  });
}

export function PlateSet({ axis, items, fit = 'band', base, width = 200 }: PlateSetProps) {
  // Two is the floor in the schema, and it is the floor here too: one picture
  // under an axis is a plate that has been given a heading.
  if (items.length < 2) return null;
  return (
    <figure className={`plates plates--${fit}`} aria-label={axis}>
      <figcaption className="plates__axis">{axis}</figcaption>
      <div className="plates__grid">
        {items.map((item) => (
          <div className="plates__item" key={item.entry.id}>
            <MediaFigure
              entry={item.entry}
              {...(base ? { base } : {})}
              width={width}
              fit={fit}
              name={item.label}
              zoomable
              credit={false}
              className="plates__plate"
            />
            <p className="plates__label">{item.label}</p>
          </div>
        ))}
      </div>
      <ul className="plates__credits">
        {items.map((item) => (
          <li key={item.entry.id}>
            <span className="plates__credit-for">{item.label}</span>
            <MediaCredit entry={item.entry} />
          </li>
        ))}
      </ul>
    </figure>
  );
}
