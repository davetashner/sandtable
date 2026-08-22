import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CastStrip, type CastMember } from './CastStrip.js';
import type { Side } from '../packs/schema/index.js';

const sides: Side[] = [
  { id: 'de', name: 'German Empire', short: 'Germany', alliance: 'Central Powers' },
  { id: 'fr', name: 'French Republic', short: 'France', alliance: 'Entente' },
];
const portrait = {
  id: 'media:person/joffre-joseph/portrait-colorized',
  dir: 'people/joffre-joseph',
  original: { src: 'people/joffre-joseph/p.png', width: 1070, height: 1470, type: 'image/png' },
  variants: [
    {
      src: 'people/joffre-joseph/.derived/p.w320.webp',
      width: 320,
      height: 440,
      type: 'image/webp',
    },
  ],
  width: 1070,
  height: 1470,
  caption: 'Joffre',
  credit: 'BnF',
  licence: 'public domain',
  colorized: true,
  focalPoint: { x: 0.5, y: 0.3 },
  person: 'person:joffre-joseph',
  present: true,
};
const members: CastMember[] = [
  {
    id: '1914:cast-joffre',
    person: 'person:joffre-joseph',
    name: 'Joseph Joffre',
    role: 'C-in-C',
    side: 'fr',
    portrait,
  },
  {
    id: '1914:cast-moltke',
    person: 'person:moltke',
    name: 'Helmuth von Moltke',
    role: 'Chief of Staff',
    side: 'de',
  },
  { id: '1914:cast-x', person: 'person:x', name: 'Someone Else', role: 'Observer' },
];

describe('<CastStrip>', () => {
  it('groups faces by side in pack order, rings them, marks the open profile and toggles selection', () => {
    const onSelect = vi.fn();
    render(
      <CastStrip
        members={members}
        sides={sides}
        selected="person:joffre-joseph"
        onSelect={onSelect}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Cast' });
    const groups = nav.querySelectorAll('ul.cast__group');
    expect([...groups].map((g) => g.getAttribute('aria-label'))).toEqual([
      'Germany',
      'France',
      'Others',
    ]);
    expect((groups[0] as HTMLElement).style.getPropertyValue('--cast-ring')).toMatch(/^var\(--/);
    const joffre = screen.getByRole('button', { name: 'Joseph Joffre — C-in-C' });
    expect(joffre).toHaveAttribute('aria-pressed', 'true');
    expect(joffre.querySelector('img')).toHaveAttribute(
      'src',
      '/assets/media/people/joffre-joseph/.derived/p.w320.webp',
    );
    expect(joffre.querySelector('img')).toHaveStyle({ objectPosition: '50% 30%' });
    const moltke = screen.getByRole('button', { name: 'Helmuth von Moltke — Chief of Staff' });
    expect(moltke).toHaveAttribute('aria-pressed', 'false');
    expect(moltke).toHaveTextContent('HM'); // initials when no portrait
    fireEvent.click(moltke);
    expect(onSelect).toHaveBeenCalledWith('person:moltke');
  });
  it('renders nothing without members', () => {
    const { container } = render(<CastStrip members={[]} sides={sides} onSelect={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
