import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { colors, contrast, GROUND_TOKENS, renderTokensCss, TEXT_TOKENS } from './tokens.js';

describe('design tokens', () => {
  it('every text token meets WCAG AA (4.5:1) on every ground, in both themes', () => {
    const failures: string[] = [];
    for (const theme of ['light', 'dark'] as const) {
      for (const text of TEXT_TOKENS) {
        for (const ground of GROUND_TOKENS) {
          const ratio = contrast(colors[theme][text], colors[theme][ground]);
          if (ratio < 4.5)
            failures.push(`${theme}: --${text} on --${ground} = ${ratio.toFixed(2)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('panel text stays readable on a brass fill (buttons, active states)', () => {
    expect(contrast(colors.light.panel, colors.light.brass)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.dark.panel, colors.dark.brass)).toBeGreaterThanOrEqual(4.5);
  });

  it('src/styles/tokens.css is generated from tokens.ts (run `npm run tokens`)', () => {
    expect(readFileSync('src/styles/tokens.css', 'utf8')).toBe(renderTokensCss());
  });

  it('both themes define the same token names', () => {
    expect(Object.keys(colors.dark).sort()).toEqual(Object.keys(colors.light).sort());
  });
});
