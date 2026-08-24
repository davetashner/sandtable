import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OpeningSequence } from './OpeningSequence.js';
import type { Opening, Source } from '../packs/schema/index.js';

const OPENING: Opening = {
  eyebrow: 'The plan and the clock',
  headline: ['August 1914.', 'Germany has forty days.'],
  lede: 'A bet about time.[^herwig-2009]',
  claim: { label: 'Where does “forty days” come from?', card: '1914:clock-plan-timetable' },
  sources: [{ source: 'source:herwig-2009' }],
};

const SOURCES: Source[] = [
  {
    id: 'source:herwig-2009',
    kind: 'book',
    author: 'Herwig, Holger',
    title: 'The Marne, 1914',
    year: 2009,
  } as Source,
];

function setup(props: Partial<Parameters<typeof OpeningSequence>[0]> = {}) {
  const onExplore = vi.fn();
  const onPlay = vi.fn();
  const onClaim = vi.fn();
  render(
    <OpeningSequence
      opening={OPENING}
      sources={SOURCES}
      onExplore={onExplore}
      onPlay={onPlay}
      onClaim={onClaim}
      {...props}
    />,
  );
  return { onExplore, onPlay, onClaim };
}

describe('OpeningSequence', () => {
  it('states the premise and offers the ways on', () => {
    setup({ reduced: true, tourMinutes: 12 });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName(/August 1914\..*Germany has forty days\./s);
    expect(screen.getByRole('button', { name: /Play the campaign/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore the map/ })).toBeInTheDocument();
    expect(screen.getByText(/about 12 min/)).toBeInTheDocument();
  });

  it('puts the whole premise in the DOM from the first frame, revealing it line by line', () => {
    setup();
    // Both lines are present immediately — the reveal is opacity, not mounting,
    // so a screen reader and a text search see the whole premise at once.
    expect(screen.getByText('August 1914.')).toBeInTheDocument();
    expect(screen.getByText('Germany has forty days.')).toBeInTheDocument();
    expect(screen.getByText('August 1914.')).toHaveAttribute('data-shown');
    expect(screen.getByText('Germany has forty days.')).not.toHaveAttribute('data-shown');
  });

  it('shows the whole premise at once under prefers-reduced-motion', () => {
    setup({ reduced: true });
    expect(screen.getByText('August 1914.')).toHaveAttribute('data-shown');
    expect(screen.getByText('Germany has forty days.')).toHaveAttribute('data-shown');
  });

  it('advances the reveal on a timer when motion is allowed', () => {
    vi.useFakeTimers();
    try {
      setup();
      expect(screen.getByText('Germany has forty days.')).not.toHaveAttribute('data-shown');
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('Germany has forty days.')).toHaveAttribute('data-shown');
    } finally {
      vi.useRealTimers();
    }
  });

  it('is skippable by button and by Escape, and starts focused on the way out', () => {
    const { onExplore } = setup({ reduced: true });
    const skip = screen.getByRole('button', { name: /Skip/ });
    expect(skip).toHaveFocus();
    fireEvent.click(skip);
    expect(onExplore).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onExplore).toHaveBeenCalledTimes(2);
  });

  it('traps Tab inside the dialog — a keyboard viewer cannot fall into the inert app', () => {
    setup({ reduced: true });
    const skip = screen.getByRole('button', { name: /Skip/ });
    const play = screen.getByRole('button', { name: /Play the campaign/ });
    const explore = screen.getByRole('button', { name: /Explore the map/ });
    expect(skip).toHaveFocus();

    // Shift+Tab off the front wraps to the last control, not out of the dialog.
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(explore).toHaveFocus();

    // Tab off the end wraps back to the first.
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(skip).toHaveFocus();

    // Focus that has escaped entirely is pulled back in.
    document.body.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(skip).toHaveFocus();
    expect(play).toBeInTheDocument();
  });

  it('hands off to the tour and to the evidence behind the claim', () => {
    const { onPlay, onClaim } = setup({ reduced: true });
    fireEvent.click(screen.getByRole('button', { name: /Play the campaign/ }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Where does .forty days. come from\?/ }));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it('names its sources in one quiet line, without a footnote apparatus', () => {
    setup({ reduced: true });
    // The prose reads clean: no [^slug] marker, no numbered reference.
    expect(screen.getByText(/A bet about time\./)).toBeInTheDocument();
    expect(screen.queryByText(/\[\^/)).not.toBeInTheDocument();
    // No bibliography — a thirty-second opening is not a dossier.
    expect(screen.queryByRole('heading', { name: /Footnotes/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Also drawing on/)).not.toBeInTheDocument();
    // But the claim is still attributed, and the working is one click away.
    expect(screen.getByText('Herwig 2009')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /come from/ })).toBeInTheDocument();
  });

  it('omits the actions a pack cannot offer', () => {
    render(<OpeningSequence opening={OPENING} sources={SOURCES} onExplore={vi.fn()} reduced />);
    expect(screen.queryByRole('button', { name: /Play the campaign/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /How did it start/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore the map/ })).toBeInTheDocument();
  });
});

describe('the backstory action (sand-1l0.32)', () => {
  it("uses the pack's own label and hint when it declares them", () => {
    const onChain = vi.fn();
    setup({ onChain, chainLabel: 'Where did it begin?', chainHint: 'thirty-seven days' });
    const button = screen.getByRole('button', { name: /Where did it begin\?/ });
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('thirty-seven days');
    fireEvent.click(button);
    expect(onChain).toHaveBeenCalledOnce();
  });

  it('falls back to a generic label for a pack that declares none', () => {
    setup({ onChain: vi.fn() });
    expect(screen.getByRole('button', { name: /How did it start\?/ })).toBeTruthy();
  });

  it('shows no backstory action when the pack has none', () => {
    setup();
    expect(screen.queryByRole('button', { name: /How did it start\?/ })).toBeNull();
  });
});
