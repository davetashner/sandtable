import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClockProvider } from '../engine/ClockContext.js';
import { DAY } from '../engine/clock.js';
import { Timeline } from './Timeline.js';
import { OWNS_KEYS } from '../engine/shortcuts.js';

const START = Date.UTC(1914, 7, 4);
const END = START + 42 * DAY;

function mount() {
  return render(
    <ClockProvider range={{ start: START, end: END }} syncUrl={false}>
      <Timeline
        title="Test"
        phases={[
          { id: 'p1', title: 'Mobilization', from: START, to: START + 5 * DAY },
          {
            id: 'p2',
            title: 'The wide wheel',
            from: START + 20 * DAY,
            to: END,
            hypothetical: true,
          },
        ]}
        markers={[{ id: 'm1', title: 'Liège falls', at: START + 12 * DAY }]}
      />
    </ClockProvider>,
  );
}

describe('<Timeline>', () => {
  it('names the chapter once, in full, and leaves the bands unlabelled (sand-neh.28)', () => {
    mount();
    // The band is a chapter's span on the clock; its width comes from the
    // duration, so a name in it is ellipsed to nothing for short chapters.
    expect(document.querySelectorAll('.timeline__band-label')).toHaveLength(0);
    expect(document.querySelectorAll('.timeline__band').length).toBeGreaterThan(0);
    // The full title is printed once, where it fits, and it is real text.
    expect(screen.getByText('Mobilization', { selector: '.timeline__phase' })).toBeInTheDocument();
    // The hover survives for the mouse, and nothing depends on it.
    expect(document.querySelector('.timeline__band')).toHaveAttribute('title');
  });

  it('shows now, the active phase and the scrubber', () => {
    mount();
    expect(screen.getByText('Day 0')).toBeInTheDocument();
    expect(screen.getByText(/4 August 1914/)).toBeInTheDocument();
    expect(screen.getByText('Mobilization', { selector: '.timeline__phase' })).toBeInTheDocument();
    const slider = screen.getByRole('slider', { name: 'Time — Test' });
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('Day 0'));
  });

  it('aligns an edge tick label inwards so it cannot hang off the strip', () => {
    // A two-day window ticks every twelve hours, so the last tick lands exactly
    // on the end; centred, half the date would sit outside the page.
    const start = Date.UTC(1914, 7, 2);
    render(
      <ClockProvider range={{ start, end: start + 2 * DAY }} syncUrl={false}>
        <Timeline title="Chapter" />
      </ClockProvider>,
    );
    const ticks = [...document.querySelectorAll('.timeline__tick--major')];
    expect(ticks[0]).toHaveAttribute('data-edge', 'start');
    expect(ticks[ticks.length - 1]).toHaveAttribute('data-edge', 'end');
    expect(ticks.slice(1, -1).every((t) => !t.hasAttribute('data-edge'))).toBe(true);
  });

  it('seeks with the scrubber and a marker, steps with the keyboard', () => {
    mount();
    const slider = screen.getByRole('slider', { name: 'Time — Test' });
    fireEvent.change(slider, { target: { value: String(START + 3 * DAY) } });
    expect(screen.getByText('Day 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Jump to Liège falls' }));
    expect(screen.getByText('Day 12')).toBeInTheDocument();

    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
    expect(screen.getByText('Day 13')).toBeInTheDocument();
    fireEvent.keyDown(slider, { key: 'End' });
    expect(screen.getByText('Day 42')).toBeInTheDocument();
    expect(screen.getByText(/Hypothetical · The wide wheel/)).toBeInTheDocument();
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(screen.getByText('Day 0')).toBeInTheDocument();
  });

  // sand-pmz.4: the transport listens on `window`, which is right for a reader
  // whose focus is nowhere and wrong for one standing on the map, where the
  // same arrows are the only way to pan.
  it('keeps its global shortcuts off a surface that owns its keys', () => {
    mount();
    const map = document.createElement('div');
    map.setAttribute(OWNS_KEYS, '');
    const canvas = document.createElement('canvas');
    map.append(canvas);
    document.body.append(map);

    fireEvent.keyDown(canvas, { key: 'ArrowRight', shiftKey: true });
    expect(screen.getByText('Day 0')).toBeInTheDocument();
    // …and still answers to a key pressed with focus nowhere in particular.
    fireEvent.keyDown(document.body, { key: 'ArrowRight', shiftKey: true });
    expect(screen.getByText('Day 1')).toBeInTheDocument();
    map.remove();
  });

  // sand-pmz.12: the strip's own handler has to step around the markers row
  // for the same reason the global one steps around the map.
  describe('the markers row', () => {
    const MANY = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i}`,
      title: `Event ${i}`,
      at: START + i * 5 * DAY,
    }));
    const mountMany = () =>
      render(
        <ClockProvider range={{ start: START, end: END }} syncUrl={false}>
          <Timeline title="Test" markers={MANY} />
        </ClockProvider>,
      );
    const markers = () =>
      [...document.querySelectorAll<HTMLButtonElement>('.timeline__marker')] as HTMLButtonElement[];

    it('is one tab stop for fifty events, not fifty', () => {
      mountMany();
      expect(markers().map((b) => b.getAttribute('tabindex'))).toEqual([
        '0',
        '-1',
        '-1',
        '-1',
        '-1',
      ]);
    });

    it('enters at the event the clock has passed, not at the outbreak', () => {
      mountMany();
      fireEvent.keyDown(screen.getByRole('slider', { name: 'Time — Test' }), { key: 'End' });
      expect(markers().map((b) => b.getAttribute('tabindex'))).toEqual([
        '-1',
        '-1',
        '-1',
        '-1',
        '0',
      ]);
    });

    it('takes the arrows off the transport while the keyboard is inside it', () => {
      mountMany();
      const row = markers();
      fireEvent.keyDown(row[0]!, { key: 'ArrowRight' });
      // The clock did not move; the focus did.
      expect(screen.getByText('Day 0')).toBeInTheDocument();
      expect(document.activeElement).toBe(row[1]);
    });

    it("leaves the scrubber's arrows to the clock", () => {
      mountMany();
      const slider = screen.getByRole('slider', { name: 'Time — Test' });
      fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
      expect(screen.getByText('Day 1')).toBeInTheDocument();
    });
  });

  it('toggles play with the button and space, changes speed with the select', () => {
    mount();
    const play = screen.getByRole('button', { name: 'Play' });
    fireEvent.click(play);
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    const speed = screen.getByRole('combobox', { name: 'Playback speed' }) as HTMLSelectElement;
    fireEvent.change(speed, { target: { value: String(DAY) } });
    expect(speed.value).toBe(String(DAY));
  });
});
