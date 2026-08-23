import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useMediaQuery } from '../engine/useMediaQuery.js';
import { BottomSheet, nextDetent } from './BottomSheet.js';

describe('nextDetent', () => {
  it('moves through peek → half → full and clamps', () => {
    expect(nextDetent('peek', 1)).toBe('half');
    expect(nextDetent('half', 1)).toBe('full');
    expect(nextDetent('full', 1)).toBe('full');
    expect(nextDetent('peek', -1)).toBe('peek');
  });
});

describe('<BottomSheet>', () => {
  it('cycles detents on tap, moves one detent on swipe, and with arrow keys', () => {
    const onDetent = vi.fn();
    render(
      <BottomSheet onDetent={onDetent}>
        <p>Body</p>
      </BottomSheet>,
    );
    const sheet = screen.getByRole('region', { name: 'Dossier sheet' });
    const handle = screen.getByRole('button', { name: /Dossier: peek/ });
    expect(sheet).toHaveAttribute('data-detent', 'peek');
    // jsdom lacks setPointerCapture
    (handle as HTMLElement & { setPointerCapture: () => void }).setPointerCapture = () => {};
    // tap → half
    fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 505, pointerId: 1 });
    expect(sheet).toHaveAttribute('data-detent', 'half');
    // swipe down → peek
    fireEvent.pointerDown(handle, { clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 380, pointerId: 1 });
    expect(sheet).toHaveAttribute('data-detent', 'peek');
    // swipe up twice → full
    fireEvent.pointerDown(handle, { clientY: 600, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 500, pointerId: 1 });
    fireEvent.pointerDown(handle, { clientY: 600, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 500, pointerId: 1 });
    expect(sheet).toHaveAttribute('data-detent', 'full');
    // tap at full → peek
    fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 100, pointerId: 1 });
    expect(sheet).toHaveAttribute('data-detent', 'peek');
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(sheet).toHaveAttribute('data-detent', 'half');
    expect(onDetent).toHaveBeenLastCalledWith('half');
  });
});

describe('<BottomSheet> raiseFor', () => {
  const sheet = () => document.querySelector('.sheet')!;

  it('lifts off peek when a card opens, where the body is clipped', () => {
    const { rerender } = render(<BottomSheet>body</BottomSheet>);
    expect(sheet().getAttribute('data-detent')).toBe('peek');
    rerender(<BottomSheet raiseFor="person:french-john">body</BottomSheet>);
    expect(sheet().getAttribute('data-detent')).toBe('half');
  });

  it('does not pull a sheet back down that is already higher', () => {
    const { rerender } = render(
      <BottomSheet initial="full" raiseFor="person:a">
        body
      </BottomSheet>,
    );
    rerender(
      <BottomSheet initial="full" raiseFor="person:b">
        body
      </BottomSheet>,
    );
    expect(sheet().getAttribute('data-detent')).toBe('full');
  });

  it('leaves a reader alone who pulls the sheet down with the same card open', () => {
    const { rerender } = render(<BottomSheet raiseFor="person:a">body</BottomSheet>);
    expect(sheet().getAttribute('data-detent')).toBe('half');
    // The reader drags it back to peek; the same card is still open.
    fireEvent.keyDown(screen.getByRole('button', { name: /dossier/i }), { key: 'ArrowDown' });
    expect(sheet().getAttribute('data-detent')).toBe('peek');
    rerender(<BottomSheet raiseFor="person:a">body</BottomSheet>);
    expect(sheet().getAttribute('data-detent')).toBe('peek');
  });

  it('stays put when no card is open', () => {
    render(<BottomSheet>body</BottomSheet>);
    expect(sheet().getAttribute('data-detent')).toBe('peek');
  });
});

describe('useMediaQuery', () => {
  it('reads matchMedia and follows changes', () => {
    const listeners = new Set<() => void>();
    let matches = false;
    vi.stubGlobal('matchMedia', (q: string) => ({
      media: q,
      get matches() {
        return matches;
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }));
    function Probe() {
      const phone = useMediaQuery('(max-width: 699.98px)');
      return <output>{phone ? 'phone' : 'desktop'}</output>;
    }
    render(<Probe />);
    expect(screen.getByRole('status')).toHaveTextContent('desktop');
    matches = true;
    act(() => {
      for (const fn of listeners) fn();
    });
    expect(screen.getByRole('status')).toHaveTextContent('phone');
    vi.unstubAllGlobals();
  });
});
