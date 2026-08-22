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
