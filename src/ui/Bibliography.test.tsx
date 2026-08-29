import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { Source } from '../packs/schema/index.js';
import type { SourceUse } from '../engine/bibliography.js';
import { BibliographyView, SourceCardView } from './Bibliography.js';
import { citeView } from '../engine/cite.js';
import { Card } from './Card.js';

const sources: Source[] = [
  {
    id: 'source:edmonds-1933',
    kind: 'official-history',
    tier: 'official-history',
    author: 'Edmonds, J. E.',
    title: 'Military Operations: France and Belgium, 1914, I',
    year: 1933,
    publisher: 'Macmillan, London',
    edition: '3rd edn',
    url: 'https://example.org/edmonds',
    notes: 'The edition that is digitised, and therefore the one this pack cites for a page.',
  },
  {
    id: 'source:kluck-1920',
    kind: 'book',
    tier: 'memoir',
    author: 'Kluck, Alexander von',
    title: 'The March on Paris',
    year: 1920,
    notes: 'Self-serving on the wheel; prints the OHL directives.',
  },
  {
    id: 'source:unread-1999',
    kind: 'book',
    tier: 'general',
    author: 'Nobody, A.',
    title: 'A Book Nobody Opened',
    year: 1999,
  },
];

const use = new Map<string, SourceUse>([
  ['source:edmonds-1933', { citations: 46, withPages: 12 }],
  ['source:kluck-1920', { citations: 1, withPages: 0 }],
]);

const citation = citeView({
  title: 'The Schlieffen Plan and the march to the Marne',
  when: '24 August 1914, 12:00',
  accessed: new Date('2026-08-29T04:31:00Z'),
  url: 'https://sandtable.davetashner.com/?pack=1914-schlieffen-marne&t=1914-08-24T12:00:00Z',
});

describe('<BibliographyView> cite this view', () => {
  it('offers a citation naming the view’s own date and the date it was read', () => {
    render(<BibliographyView sources={sources} use={use} cite={citation} onBack={() => {}} />);
    const heading = screen.getByRole('heading', { level: 3, name: 'Cite this view' });
    const group = heading.closest('.bib__group') as HTMLElement;
    expect(within(group).getByText(/the view at 24 August 1914, 12:00/)).toBeInTheDocument();
    expect(within(group).getByText(/accessed 29 August 2026/)).toBeInTheDocument();
    // The title is italicised in the DOM the way every other reference is.
    expect(within(group).getByText('The Schlieffen Plan and the march to the Marne').tagName).toBe(
      'EM',
    );
  });

  it('gives the citation its own copy control, named for what it copies', () => {
    render(<BibliographyView sources={sources} use={use} cite={citation} onBack={() => {}} />);
    // Named for the citation rather than the link, so a screen reader reading
    // the card does not meet two controls both called "Copy a link to this
    // view". What it actually writes is CopyLink's test.
    expect(
      screen.getByRole('button', { name: 'Copy a citation for this view' }),
    ).toBeInTheDocument();
  });

  it('is absent when no citation is given, so the card stays a pure function of its props', () => {
    render(<BibliographyView sources={sources} use={use} onBack={() => {}} />);
    expect(screen.queryByRole('heading', { level: 3, name: 'Cite this view' })).toBeNull();
  });
});

describe('<BibliographyView>', () => {
  it('groups the works by the hierarchy of evidence and totals what is behind them', () => {
    render(<BibliographyView sources={sources} use={use} onBack={() => {}} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Works cited' })).toBeInTheDocument();
    expect(screen.getByText('2 works · 47 citations · 12 with pages')).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([
      'Official histories and their document annexes',
      'Memoirs and participants’ accounts',
      'Further reading',
    ]);
  });

  it('leaves out a work the pack does not cite', () => {
    render(<BibliographyView sources={sources} use={use} />);
    expect(screen.queryByText(/A Book Nobody Opened/)).not.toBeInTheDocument();
  });

  it('carries the registry note and the usage readout for each work', () => {
    render(<BibliographyView sources={sources} use={use} />);
    expect(screen.getByText(/The edition that is digitised/)).toBeInTheDocument();
    expect(screen.getByText('46 citations · 12 with pages')).toBeInTheDocument();
    expect(screen.getByText('1 citation')).toBeInTheDocument();
  });

  it('makes every title a link to that work’s own card', () => {
    render(<BibliographyView sources={sources} use={use} />);
    const link = screen.getByRole('link', {
      name: 'Military Operations: France and Belgium, 1914, I',
    });
    expect(link).toHaveAttribute('href', '?card=source:edmonds-1933');
  });

  it('answers the further-reading question rather than listing books nobody read', () => {
    render(<BibliographyView sources={sources} use={use} />);
    expect(screen.getByText(/There is no separate list/)).toBeInTheDocument();
  });
});

describe('<SourceCardView>', () => {
  it('says where the work stands, what it is good for, and how the pack uses it', () => {
    const onBack = vi.fn();
    render(
      <SourceCardView source={sources[0]!} use={use.get('source:edmonds-1933')} onBack={onBack} />,
    );
    expect(screen.getByText('Source · Official history')).toBeInTheDocument();
    expect(screen.getByText('Edmonds, J. E. · 1933')).toBeInTheDocument();
    expect(screen.getByText('3rd edn')).toBeInTheDocument();
    expect(screen.getByText(/read knowing that each one defends its own army/)).toBeInTheDocument();
    expect(screen.getByText('46 citations · 12 with pages in this pack')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Read it online/ })).toHaveAttribute(
      'href',
      'https://example.org/edmonds',
    );
  });

  it('says so when the loaded pack cites it nowhere', () => {
    render(<SourceCardView source={sources[2]!} />);
    expect(screen.getByText('In the registry; this pack cites it nowhere')).toBeInTheDocument();
  });

  it('offers the whole bibliography as the way on', () => {
    render(<SourceCardView source={sources[1]!} use={use.get('source:kluck-1920')} />);
    expect(screen.getByRole('link', { name: 'All works this pack cites' })).toHaveAttribute(
      'href',
      '?card=bibliography',
    );
  });
});

describe('a citation', () => {
  it('resolves to its work, shows its pages, and offers the bibliography', () => {
    render(
      <Card
        eyebrow="Technology"
        title="A card with a source"
        citations={[{ source: 'source:edmonds-1933', pages: '45' }]}
        sources={sources}
      />,
    );
    const block = screen.getByRole('region', { name: 'Sources' });
    // A single page reads `p.`, a range `pp.` — the registry's locators are
    // numeric, so the difference is worth getting right.
    expect(block).toHaveTextContent(/p\. 45\./);
    expect(
      within(block).getByRole('link', { name: 'Military Operations: France and Belgium, 1914, I' }),
    ).toHaveAttribute('href', '?card=source:edmonds-1933');
    expect(within(block).getByRole('link', { name: 'All works cited' })).toHaveAttribute(
      'href',
      '?card=bibliography',
    );
  });
});
