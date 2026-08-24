import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Gallery } from './Gallery.js';
import { NOT_IN_GALLERY, SECTIONS } from './specimens.js';

const components = readdirSync('src/ui')
  .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
  .map((f) => f.replace(/\.tsx$/, ''));

const covered = new Set(SECTIONS.flatMap((s) => s.specimens).flatMap((sp) => sp.covers));

describe('component gallery', () => {
  it('shows every component in src/ui, or says in writing why it does not', () => {
    const missing = components.filter((c) => !covered.has(c) && !(c in NOT_IN_GALLERY));
    expect(missing).toEqual([]);
  });

  it('claims no component that is not there', () => {
    const stale = [...covered, ...Object.keys(NOT_IN_GALLERY)].filter(
      (c) => !components.includes(c),
    );
    expect(stale).toEqual([]);
  });

  it('gives every specimen a unique id', () => {
    const ids = SECTIONS.flatMap((s) => s.specimens).map((sp) => sp.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders every specimen in both themes', () => {
    render(<Gallery />);
    for (const spec of SECTIONS.flatMap((s) => s.specimens)) {
      expect(screen.getAllByLabelText(spec.title).length).toBeGreaterThan(0);
    }
    // One pane per theme, plus the token sheet's pair.
    expect(document.querySelectorAll('.pane[data-theme="light"]').length).toBe(
      document.querySelectorAll('.pane[data-theme="dark"]').length,
    );
  });
});
