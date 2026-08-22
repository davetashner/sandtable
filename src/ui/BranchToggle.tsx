/**
 * Branch toggle — switch between the historical timeline and the authored
 * counterfactual branches (ADR 0005). Changing branch keeps time and camera:
 * only the `branch` slot in the URL changes, and every layer re-derives.
 * Counterfactual options are marked so the hypothetical treatment starts here.
 */
import { useViewState, useViewStateControls } from '../engine/ClockContext.js';
import type { Branch } from '../packs/schema/index.js';
import './branch-toggle.css';

export interface BranchToggleProps {
  branches: Branch[];
  defaultBranch: string;
  /** Override the URL-driven selection (tests, embedding). */
  value?: string;
  onChange?: (id: string) => void;
}

export function BranchToggle({ branches, defaultBranch, value, onChange }: BranchToggleProps) {
  const view = useViewState();
  const controls = useViewStateControls();
  const current =
    value ?? (branches.some((b) => b.id === view.branch) ? view.branch! : defaultBranch);
  const select = (id: string) => {
    onChange?.(id);
    controls?.setBranch(id === defaultBranch ? undefined : id);
  };
  if (branches.length < 2) return null;
  return (
    <div className="branch-toggle" role="radiogroup" aria-label="Timeline branch">
      {branches.map((b) => {
        const active = b.id === current;
        const hypothetical = b.kind === 'counterfactual';
        return (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={active}
            className="branch-toggle__option"
            data-active={active || undefined}
            data-hypothetical={hypothetical || undefined}
            title={b.summary}
            onClick={() => select(b.id)}
          >
            {hypothetical && (
              <span className="branch-toggle__mark" aria-hidden="true">
                ?
              </span>
            )}
            <span className="branch-toggle__label">{b.title}</span>
            {hypothetical && <span className="visually-hidden"> (hypothetical)</span>}
          </button>
        );
      })}
    </div>
  );
}
