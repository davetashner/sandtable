/**
 * The map's keyboard roster (sand-pmz.11).
 *
 * This is the one place in the app where the automated accessibility gate is
 * blind by construction — axe reads the DOM and the thing this component
 * stands in for is a WebGL canvas — so what the roster promises is asserted
 * here instead: one tab stop, a name for every object, the arrows inside it,
 * `Enter` doing what a click on the token does, and `Escape` handing the
 * keyboard back to the control that opened it.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapObjects, type MapObject } from './MapObjects.js';

const object = (id: string, over: Partial<MapObject> = {}): MapObject => ({
  id,
  kind: 'Army',
  name: `${id} Army`,
  detail: 'Germany',
  where: 'near Aachen',
  open: () => {},
  ...over,
});

const three = [object('1st'), object('2nd'), object('3rd')];

describe('MapObjects', () => {
  it('is one tab stop that says how many things are on the map', () => {
    render(<MapObjects objects={three} when="22 August 1914" />);
    const enter = screen.getByRole('button', { name: /what is on the map/i });
    expect(enter).toHaveTextContent('What is on the map (3)');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('says nothing at all when the map is empty', () => {
    const { container } = render(<MapObjects objects={[]} when="22 August 1914" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens a list with a name for every object, and the keyboard on the first', () => {
    render(<MapObjects objects={three} when="22 August 1914" />);
    fireEvent.click(screen.getByRole('button', { name: /what is on the map/i }));
    const items = screen.getAllByRole('button');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAccessibleName('Army 1st Army Germany · near Aachen');
    expect(document.activeElement).toBe(items[0]);
    // One stop for the row, not one per object.
    expect(items.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('walks the objects with the arrows', () => {
    render(<MapObjects objects={three} when="22 August 1914" defaultOpen />);
    const items = screen.getAllByRole('button');
    fireEvent.keyDown(items[0]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1]!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(items[2]);
  });

  it('opens what a click on the token opens', () => {
    const open = vi.fn();
    render(<MapObjects objects={[object('1st', { open })]} when="22 August 1914" defaultOpen />);
    fireEvent.click(screen.getByRole('button'));
    expect(open).toHaveBeenCalledOnce();
  });

  it('gives the keyboard back to the control that opened it', () => {
    render(<MapObjects objects={three} when="22 August 1914" />);
    const enter = screen.getByRole('button', { name: /what is on the map/i });
    fireEvent.click(enter);
    fireEvent.keyDown(screen.getAllByRole('button')[0]!, { key: 'Escape' });
    expect(screen.queryByRole('list')).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /what is on the map/i }),
    );
  });

  it('closes when the keyboard leaves it, and does not chase it', () => {
    render(<MapObjects objects={three} when="22 August 1914" defaultOpen />);
    const elsewhere = document.createElement('button');
    document.body.append(elsewhere);
    fireEvent.blur(screen.getAllByRole('button')[2]!, { relatedTarget: elsewhere });
    expect(screen.queryByRole('list')).toBeNull();
    expect(document.activeElement).not.toBe(
      screen.getByRole('button', { name: /what is on the map/i }),
    );
  });
});
