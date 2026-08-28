/**
 * The key to the map's colours (sand-neh.26). It used to be a footer in the
 * dossier; these are the legend's tests, moved with it, plus the disclosure
 * behaviour it gained by going onto the map.
 */
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Side } from '../packs/schema/index.js';
import { SideKey } from './SideKey.js';

const sides: Side[] = [
  { id: 'de', name: 'German Empire', short: 'Germany', alliance: 'Central Powers' },
  { id: 'fr', name: 'France', alliance: 'Entente' },
];

describe('<SideKey>', () => {
  it('names every side and the approximate treatment once opened', () => {
    render(<SideKey sides={sides} defaultOpen />);
    const key = screen.getByLabelText('Legend');
    expect(key).toHaveTextContent('Germany');
    expect(key).toHaveTextContent('France');
    // the key to the map's approximate positions (sand-23b.4)
    expect(key).toHaveTextContent('≈ approximate — derived, not recorded');
  });

  it('is closed by default, so it costs the map a pill and not a panel', () => {
    const { container } = render(<SideKey sides={sides} />);
    expect(container.querySelector('details')).not.toHaveAttribute('open');
    // The summary is the control; its name is what a reader would say.
    expect(screen.getByText('Key')).toBeInTheDocument();
  });

  it('opens a side where the pack gives one answer, and leaves the rest alone', () => {
    const opened: string[] = [];
    render(
      <SideKey
        sides={sides}
        defaultOpen
        openSide={(id) =>
          id === 'fr' ? { label: 'French 5th Army', onClick: () => opened.push(id) } : undefined
        }
      />,
    );
    // A key of sides can only open a card where the side is one army; the
    // accessible name still starts with the visible text (WCAG 2.5.3).
    const button = screen.getByRole('button', { name: 'France — open French 5th Army' });
    fireEvent.click(button);
    expect(opened).toEqual(['fr']);
    expect(screen.getByLabelText('Legend')).toHaveTextContent('Germany');
    expect(screen.queryByRole('button', { name: /^Germany/ })).not.toBeInTheDocument();
  });
});
