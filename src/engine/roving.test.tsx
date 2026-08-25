/**
 * The roving-tabindex hook (sand-pmz.12): one tab stop for a set, the arrows
 * inside it. Driven through a real DOM because the whole point of the hook is
 * which element has `tabindex="0"` and which element has focus.
 */
import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { useRoving, type RovingOptions } from './roving.js';

function Row({ count, ...o }: { count: number } & RovingOptions) {
  const roving = useRoving<HTMLDivElement>(count, o);
  return (
    <div data-testid="row" ref={roving.ref} onKeyDown={roving.onKeyDown}>
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" {...roving.itemProps(i)}>
          {`item ${i}`}
        </button>
      ))}
    </div>
  );
}

const stops = (el: HTMLElement) =>
  [...el.querySelectorAll('button')].map((b) => b.getAttribute('tabindex'));

const press = (el: HTMLElement, key: string) =>
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });

describe('useRoving', () => {
  it('gives the set exactly one tab stop', () => {
    const { getByTestId } = render(<Row count={4} />);
    expect(stops(getByTestId('row'))).toEqual(['0', '-1', '-1', '-1']);
  });

  it('enters where the caller says, not at the start', () => {
    const { getByTestId } = render(<Row count={4} entry={2} />);
    expect(stops(getByTestId('row'))).toEqual(['-1', '-1', '0', '-1']);
  });

  it('moves the stop and the focus with the arrows', () => {
    const { getByTestId, getByText } = render(<Row count={4} />);
    press(getByText('item 0'), 'ArrowRight');
    expect(stops(getByTestId('row'))).toEqual(['-1', '0', '-1', '-1']);
    expect(document.activeElement).toBe(getByText('item 1'));
  });

  it('clamps at both ends rather than wrapping', () => {
    const { getByText } = render(<Row count={3} />);
    press(getByText('item 0'), 'ArrowLeft');
    expect(document.activeElement).toBe(getByText('item 0'));
    press(getByText('item 0'), 'End');
    expect(document.activeElement).toBe(getByText('item 2'));
    press(getByText('item 2'), 'ArrowRight');
    expect(document.activeElement).toBe(getByText('item 2'));
    press(getByText('item 2'), 'Home');
    expect(document.activeElement).toBe(getByText('item 0'));
  });

  it('leaves the other axis alone when it is horizontal', () => {
    const { getByText } = render(<Row count={3} entry={1} />);
    const e = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    act(() => {
      getByText('item 1').dispatchEvent(e);
    });
    // Not consumed, so the transport's global handler still gets it.
    expect(e.defaultPrevented).toBe(false);
  });

  it('takes both axes when asked', () => {
    const { getByText } = render(<Row count={3} orientation="both" />);
    press(getByText('item 0'), 'ArrowDown');
    expect(document.activeElement).toBe(getByText('item 1'));
  });

  it('holds the reader’s place once they have moved, whatever the entry becomes', () => {
    const { getByTestId, getByText, rerender } = render(<Row count={4} entry={0} />);
    press(getByText('item 0'), 'ArrowRight');
    rerender(<Row count={4} entry={3} />);
    expect(stops(getByTestId('row'))).toEqual(['-1', '0', '-1', '-1']);
  });

  it('survives the set getting shorter', () => {
    const { getByTestId, getByText, rerender } = render(<Row count={4} />);
    press(getByText('item 0'), 'End');
    rerender(<Row count={2} />);
    expect(stops(getByTestId('row'))).toEqual(['-1', '0']);
  });
});
