/**
 * Field filter for the "Meanwhile" science glyphs — a dossier control per
 * ADR 0006 (filters never get their own bar). Toggle a field to hide or show
 * its ✦ glyphs on the timeline.
 */
import type { ScienceField } from '../packs/schema/index.js';
import { SCIENCE_FIELD_LABEL } from './ScienceCardView.js';

export interface MeanwhileFilterProps {
  /** Fields that have at least one card in this pack. */
  available: ScienceField[];
  /** Fields currently shown. */
  active: ReadonlySet<ScienceField>;
  onToggle: (field: ScienceField) => void;
}

export function MeanwhileFilter({ available, active, onToggle }: MeanwhileFilterProps) {
  if (available.length === 0) return null;
  return (
    <div
      className="meanwhile"
      role="group"
      aria-label="Meanwhile — science fields shown on the timeline"
    >
      <span className="meanwhile__label">✦ Meanwhile</span>
      {available.map((f) => (
        <button
          key={f}
          type="button"
          className="meanwhile__field"
          aria-pressed={active.has(f)}
          onClick={() => onToggle(f)}
        >
          {SCIENCE_FIELD_LABEL[f]}
        </button>
      ))}
    </div>
  );
}
