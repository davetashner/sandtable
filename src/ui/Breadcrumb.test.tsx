import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Battle } from '../packs/schema/index.js';
import { Breadcrumb } from './Breadcrumb.js';

/** Only the fields the breadcrumb reads. A route makes it a zoom-in. */
const battle = (id: string, title: string, routes?: unknown[]) =>
  ({
    id,
    title,
    timeRange: { start: '1914-08-04T00:00:00Z', end: '1914-08-16T00:00:00Z' },
    region: [0, 47, 9, 52],
    camera: { center: [4.5, 49.5], zoom: 8 },
    routes,
    sources: [{ source: 'source:herwig-2009' }],
  }) as unknown as Battle;

const props = { campaignTitle: 'The campaign', onEnter: () => {}, onExit: () => {} };

describe('<Breadcrumb>', () => {
  it('hides the index while a level is open', () => {
    const battles = [battle('1914:liege', 'Liège', [{}])];
    render(<Breadcrumb {...props} battles={battles} focus={battles[0]} />);
    expect(screen.queryByRole('button', { name: '1 zoom-in' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Back to the campaign' })).toBeInTheDocument();
  });

  it('names the focused level for what it is', () => {
    const zoomIn = battle('1914:liege', 'Liège', [{}]);
    const chapter = battle('1914:ardennes', 'The Ardennes');
    const { rerender } = render(<Breadcrumb {...props} battles={[zoomIn]} focus={zoomIn} />);
    expect(screen.getByText('Zoom-in')).toBeInTheDocument();
    rerender(<Breadcrumb {...props} battles={[chapter]} focus={chapter} />);
    expect(screen.getByText('Chapter')).toBeInTheDocument();
  });
});
