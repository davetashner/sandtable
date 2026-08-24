import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Battle } from '../packs/schema/index.js';
import { Breadcrumb } from './Breadcrumb.js';

/** Only the fields the breadcrumb reads. */
const battle = (id: string, title: string, start: string, end: string) =>
  ({
    id,
    title,
    timeRange: { start, end },
    region: [0, 47, 9, 52],
    camera: { center: [4.5, 49.5], zoom: 8 },
    sources: [{ source: 'source:herwig-2009' }],
  }) as unknown as Battle;

describe('<Breadcrumb>', () => {
  it('lists the chapters in the order the campaign ran, not pack-file order', () => {
    // The pack lists the Marne first and the July Crisis last (sand-neh.12).
    const battles = [
      battle(
        '1914:marne',
        'First Battle of the Marne',
        '1914-09-05T00:00:00Z',
        '1914-09-12T00:00:00Z',
      ),
      battle('1914:liege', 'Liège', '1914-08-04T00:00:00Z', '1914-08-16T00:00:00Z'),
      battle('1914:guise', 'Guise', '1914-08-28T00:00:00Z', '1914-08-30T00:00:00Z'),
      battle('1914:origins', 'Origins of the plan', '1914-08-02T00:00:00Z', '1914-08-04T00:00:00Z'),
      battle('1914:july-crisis', 'The July Crisis', '1914-08-02T00:00:00Z', '1914-08-04T00:00:00Z'),
    ];
    render(
      <Breadcrumb
        campaignTitle="The campaign"
        battles={battles}
        focus={undefined}
        onEnter={() => {}}
        onExit={() => {}}
      />,
    );
    const chips = screen
      .getByRole('group', { name: 'Zoom in to a battle' })
      .querySelectorAll('.crumbs__chip');
    expect([...chips].map((c) => c.textContent)).toEqual([
      // the two backstory chapters share a window; the stable sort keeps the
      // pack's order, so the plan's origins come before the crisis
      'Origins of the plan',
      'The July Crisis',
      'Liège',
      'Guise',
      'First Battle of the Marne',
    ]);
  });

  it('hides the chapter chips while a zoom-in is open', () => {
    const battles = [battle('1914:liege', 'Liège', '1914-08-04T00:00:00Z', '1914-08-16T00:00:00Z')];
    render(
      <Breadcrumb
        campaignTitle="The campaign"
        battles={battles}
        focus={battles[0]}
        onEnter={() => {}}
        onExit={() => {}}
      />,
    );
    expect(screen.queryByRole('group', { name: 'Zoom in to a battle' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Back to the campaign' })).toBeInTheDocument();
  });
});
