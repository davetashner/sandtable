import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CausalLink, Source } from '../packs/schema/index.js';
import { CausalView } from './CausalView.js';

const link = (
  id: string,
  from: string,
  to: string,
  extra: Partial<CausalLink> = {},
): CausalLink => ({
  id,
  from,
  to,
  relation: 'enabled',
  claim: `Because ${from} happened, ${to} followed.`,
  confidence: 'high',
  evidence: [{ source: 'source:herwig-2009', pages: '220' }],
  ...extra,
});
const links = [
  link('1914:link-a', '1914:e-wheel', '1914:e-gap', { historiography: 'Argued by Herwig.' }),
  link('1914:link-b', '1914:e-gap', '1914:e-marne', { confidence: 'contested' }),
  link('1914:link-c', '1914:e-joffre', '1914:e-gap'),
];
const sources: Source[] = [
  {
    id: 'source:herwig-2009',
    kind: 'book',
    author: 'Herwig, Holger H.',
    title: 'The Marne, 1914',
    year: 2009,
  },
];
const names: Record<string, string> = {
  '1914:e-wheel': "Kluck's wheel",
  '1914:e-gap': 'The gap',
  '1914:e-marne': 'The Marne',
  '1914:e-joffre': "Joffre's redeployment",
};

describe('<CausalView> overview rail', () => {
  it('lists the whole chain when it runs past the depth shown in detail, and navigates by step', () => {
    // twelve links: longer than the nine chainAround() shows at its default depth
    const long = Array.from({ length: 12 }, (_, i) =>
      link(`1914:link-${i}`, `1914:e-${i}`, `1914:e-${i + 1}`),
    );
    const longNames = Object.fromEntries(
      Array.from({ length: 13 }, (_, i) => [`1914:e-${i}`, `Step ${i}`]),
    );
    const onOpenLink = vi.fn();
    render(
      <CausalView
        links={long}
        focal={long[5]!}
        sources={sources}
        label={(id) => longNames[id]}
        onOpenLink={onOpenLink}
      />,
    );
    const rail = screen.getByRole('navigation', { name: 'The whole chain' });
    expect(rail).toHaveTextContent('12 steps');
    // every link in the chain is listed, the focal one as static text
    expect(rail.querySelectorAll('li')).toHaveLength(12);
    expect(rail.querySelector('[aria-current="step"]')).toHaveTextContent('6. Step 5 → Step 6');
    fireEvent.click(screen.getByRole('button', { name: '1. Step 0 → Step 1' }));
    expect(onOpenLink).toHaveBeenCalledWith('1914:link-0');
  });

  it('is absent when the detailed chain already shows every step', () => {
    render(
      <CausalView
        links={links}
        focal={links[0]!}
        sources={sources}
        label={(id) => names[id]}
        onOpenLink={vi.fn()}
      />,
    );
    expect(screen.queryByRole('navigation', { name: 'The whole chain' })).not.toBeInTheDocument();
  });
});

describe('<CausalView>', () => {
  it('renders the chain around the focal link with evidence, debate, alternatives and navigation', () => {
    const onOpenLink = vi.fn();
    const seek = vi.fn();
    render(
      <CausalView
        links={links}
        focal={links[0]!}
        sources={sources}
        label={(id) => names[id]}
        onOpenLink={onOpenLink}
        onOpenEntity={(id) => (id === '1914:e-wheel' ? seek : undefined)}
      />,
    );
    expect(
      screen.getByRole('heading', { level: 2, name: "Kluck's wheel → The gap" }),
    ).toBeInTheDocument();
    const chain = screen.getByRole('list', { name: 'Chain' });
    const steps = chain.querySelectorAll('.causal__step');
    expect(steps.length).toBe(2); // focal + downstream (gap → Marne); wheel has no upstream
    expect(steps[0]).toHaveAttribute('data-focal');
    expect(steps[1]).toHaveAttribute('data-confidence', 'contested');
    expect(screen.getByText(/Because 1914:e-wheel happened/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Evidence' })).toHaveTextContent(/Herwig.*pp\. 220/);
    expect(screen.getByText('The debate')).toBeInTheDocument();
    // the focal step's "to" (the gap) has another cause — offered as an alternative
    expect(screen.getByText(/Also:/)).toHaveTextContent("Joffre's redeployment");
    fireEvent.click(screen.getByRole('button', { name: "Joffre's redeployment" }));
    expect(onOpenLink).toHaveBeenCalledWith('1914:link-c');
    // downstream step opens that link
    fireEvent.click(screen.getByRole('button', { name: /Because 1914:e-gap happened/ }));
    expect(onOpenLink).toHaveBeenCalledWith('1914:link-b');
    // entity with an action is a button
    fireEvent.click(screen.getAllByRole('button', { name: "Kluck's wheel" })[0]!);
    expect(seek).toHaveBeenCalled();
  });
});
