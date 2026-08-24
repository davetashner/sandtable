import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiagramFigure } from './DiagramFigure.js';

const SVG = '<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="var(--army-1)"/></svg>';

describe('<DiagramFigure>', () => {
  it('inlines the drawing so it can use the design tokens, and labels it as one image', () => {
    render(<DiagramFigure svg={SVG} caption="What it shows." alt="A red square." />);
    const frame = screen.getByRole('img', { name: 'A red square.' });
    // Inlined, not an <img src>: behind an <img> the SVG is a separate
    // document and var(--army-1) resolves to nothing (sand-1l0.33).
    const svg = frame.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelector('rect')?.getAttribute('fill')).toBe('var(--army-1)');
    expect(frame.querySelector('img')).toBeNull();
    // role="img" makes it a leaf, so the labels inside are not read out one by one
    expect(frame.getAttribute('role')).toBe('img');
    expect(screen.getByText('What it shows.')).toBeInTheDocument();
  });
});
