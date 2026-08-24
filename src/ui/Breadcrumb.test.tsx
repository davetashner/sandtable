import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  // sand-pmz.4.2: the index unmounts when a level is entered, which used to
  // leave the keyboard on <body>.
  it('catches the keyboard when a level is entered from the index', () => {
    const battles = [battle('1914:liege', 'Liège', [{}])];
    const { rerender } = render(<Breadcrumb {...props} battles={battles} focus={undefined} />);
    fireEvent.click(screen.getByRole('button', { name: '1 zoom-in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in to Liège' }));
    rerender(<Breadcrumb {...props} battles={battles} focus={battles[0]} />);
    expect(screen.getByText('Liège')).toHaveFocus();
  });

  it('leaves the keyboard alone when a level is entered from anywhere else', () => {
    const battles = [battle('1914:liege', 'Liège', [{}])];
    const { rerender } = render(<Breadcrumb {...props} battles={battles} focus={undefined} />);
    rerender(<Breadcrumb {...props} battles={battles} focus={battles[0]} />);
    expect(screen.getByText('Liège')).not.toHaveFocus();
  });
});
