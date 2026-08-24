import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Battle } from '../packs/schema/index.js';
import { ChapterIndex } from './ChapterIndex.js';

/** Only the fields the index reads. Routes of its own make it a zoom-in. */
const battle = (id: string, title: string, start: string, routes?: unknown[]) =>
  ({
    id,
    title,
    timeRange: { start, end: '1914-09-12T00:00:00Z' },
    routes,
    sources: [{ source: 'source:herwig-2009' }],
  }) as unknown as Battle;

// The pack lists the Marne first and the July Crisis last (sand-neh.12).
const battles = [
  battle('1914:marne', 'First Battle of the Marne', '1914-09-05T00:00:00Z', [{}]),
  battle('1914:liege', 'Liège', '1914-08-04T00:00:00Z', [{}]),
  battle('1914:ardennes', 'The Ardennes', '1914-08-21T00:00:00Z'),
  battle('1914:origins', 'Origins of the plan', '1914-08-02T00:00:00Z'),
  battle('1914:july-crisis', 'The July Crisis', '1914-08-02T00:00:00Z'),
];

/** Render and open the index; returns the control that opened it. */
const open = (onEnter: (id: string) => void = () => {}) => {
  render(<ChapterIndex battles={battles} onEnter={onEnter} />);
  const toggle = screen.getByRole('button', { expanded: false });
  fireEvent.click(toggle);
  return toggle;
};

describe('<ChapterIndex>', () => {
  it('says what the pack holds without being opened', () => {
    render(<ChapterIndex battles={battles} onEnter={() => {}} />);
    expect(screen.getByRole('button', { name: '5 chapters and zoom-ins' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('names the one kind when a pack has only one', () => {
    render(<ChapterIndex battles={battles.slice(2)} onEnter={() => {}} />);
    expect(screen.getByRole('button', { name: '3 chapters' })).toBeInTheDocument();
  });

  it('reads in the order the campaign ran, not pack-file order', () => {
    open();
    const titles = screen.getByRole('list').querySelectorAll('.chapter-index__title');
    expect([...titles].map((t) => t.textContent)).toEqual([
      // the two backstory chapters share a window; the stable sort keeps the
      // pack's order, so the plan's origins come before the crisis
      'Origins of the plan',
      'The July Crisis',
      'Liège',
      'The Ardennes',
      'First Battle of the Marne',
    ]);
  });

  it('labels every entry from what the battle carries, not from one fixed word', () => {
    open();
    expect(
      screen.getByRole('button', { name: 'Open the chapter The Ardennes' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in to Liège' })).toBeInTheDocument();
  });

  it('enters the battle an entry names, and closes behind itself', () => {
    const onEnter = vi.fn();
    open(onEnter);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in to Liège' }));
    expect(onEnter).toHaveBeenCalledWith('1914:liege');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('closes on Escape and gives the keyboard back to the control', () => {
    const toggle = open();
    fireEvent.keyDown(screen.getByRole('list'), { key: 'Escape' });
    expect(screen.queryByRole('list')).toBeNull();
    expect(toggle).toHaveFocus();
  });
});
