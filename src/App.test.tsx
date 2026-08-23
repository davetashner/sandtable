import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// MapLibre needs WebGL; the map surface has its own tests (src/engine/map).
vi.mock('./engine/map/MapView.js', () => ({
  MapView: ({ label }: { label?: string }) => <div role="region" aria-label={label ?? 'Map'} />,
}));

const { App } = await import('./App.tsx');

describe('App shell', () => {
  it('renders the title and the three surfaces', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sandtable' })).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: /^Map/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Dossier' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: 'Timeline' })).toBeInTheDocument();
  });

  it('drives the dossier and the map from the seed pack clock', async () => {
    render(<App />);
    // URL has no ?t — the clock starts at the pack start (2 Aug 1914), before the first beat.
    expect(screen.getByText('Day 0')).toBeInTheDocument();
    const slider = screen.getByRole('slider', { name: /^Time — / });
    fireEvent.change(slider, { target: { value: String(Date.UTC(1914, 7, 10)) } });
    expect(screen.getByRole('heading', { level: 2, name: /Liège holds/ })).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: /^Map — .*10 August 1914/ }),
    ).toBeInTheDocument();
  });

  it('zooms into a battle and back, swapping the clock range and restoring the campaign time', async () => {
    window.history.replaceState(null, '', '/?t=1914-09-01T00:00:00Z');
    render(<App />);
    expect(screen.getByText('Day 30')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'First Battle of the Marne' }));
    expect(window.location.search).toContain('focus=1914:marne');
    expect(screen.getByRole('navigation', { name: 'Focus' })).toHaveTextContent(
      'First Battle of the Marne',
    );
    // the clock now runs on the battle's own range: day 0 of the battle = 5 September
    expect(screen.getByText('Day 0')).toBeInTheDocument();
    expect(
      screen.getByText(/5 September 1914/, { selector: '.timeline__date' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: /The flank: Gronau meets Maunoury on the Ourcq/,
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the campaign' }));
    expect(window.location.search).not.toContain('focus=');
    // the viewer moved past 1 Sep inside the battle (5 Sep), so time does not jump back
    expect(screen.getByText('Day 34')).toBeInTheDocument();
  });

  it('opens a technology card from a timeline glyph and from a beat chip, and returns to the beat', async () => {
    window.history.replaceState(null, '', '/?t=1914-08-10T00:00:00Z');
    render(<App />);
    // the Liège beat links the siege-artillery card as a chip
    fireEvent.click(
      await screen.findByRole(
        'button',
        { name: "Heavy siege artillery — Krupp's 42 cm and Škoda's 30.5 cm" },
        { timeout: 8000 },
      ),
    );
    expect(window.location.search).toContain('card=1914:tech-heavy-siege-artillery');
    expect(screen.getByText('Technology · Artillery')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sources' })).toHaveTextContent(/Herwig/);
    fireEvent.click(screen.getByRole('button', { name: /Back to the narrative/ }));
    expect(window.location.search).not.toContain('card=');
    expect(screen.getByRole('heading', { level: 2, name: /Liège holds/ })).toBeInTheDocument();
    // the ⚙ glyph on the timeline opens the railways card and seeks to its moment
    fireEvent.click(
      screen.getByRole('button', { name: 'Open Railways and the mobilization timetable' }),
    );
    expect(window.location.search).toContain('card=1914:tech-railways-mobilization');
    expect(screen.getByText('Day 0')).toBeInTheDocument(); // 2 Aug 1914 = pack start
  }, 15000);

  it('opens a person profile from the cast strip and toggles back to the narrative', async () => {
    render(<App />);
    const strip = screen.getByRole('navigation', { name: 'Cast' });
    const face = await screen.findByRole('button', { name: /Joseph Joffre — / }, { timeout: 8000 });
    expect(strip).toContainElement(face);
    fireEvent.click(face);
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Joseph Joffre' }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(face).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'In brief' })).toBeInTheDocument();
    fireEvent.click(face);
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Joseph Joffre' }),
    ).not.toBeInTheDocument();
    expect(face).toHaveAttribute('aria-pressed', 'false');
  });

  it('opens a decision point from its ◇ glyph, records the pick in the URL and reveals the verdict', async () => {
    window.history.replaceState(null, '', '/?t=1914-08-20T00:00:00Z');
    render(<App />);
    fireEvent.click(
      await screen.findByRole(
        'button',
        { name: 'Open Two corps for East Prussia?' },
        { timeout: 8000 },
      ),
    );
    expect(window.location.search).toContain('card=1914:decision-1914-08-25-two-corps-east');
    expect(screen.getByText('Decision point ◇')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Keep every corps on the right wing/ }));
    expect(window.location.search).toContain('pick=keep');
    expect(screen.getByText('What was known at the time')).toBeInTheDocument();
    expect(screen.getByText('what happened')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to the narrative/ }));
    expect(window.location.search).not.toContain('card=');
    expect(window.location.search).not.toContain('pick=');
  });

  it('shows the plan-vs-reality gauges under the timeline and opens the timetable card', async () => {
    window.history.replaceState(null, '', '/?t=1914-08-17T12:00:00Z');
    render(<App />);
    const gauge = await screen.findByRole(
      'listitem',
      { name: /The plan's timetable: M\+15/ },
      { timeout: 8000 },
    );
    expect(gauge).toHaveTextContent(/behind/);
    fireEvent.click(gauge);
    expect(window.location.search).toContain('card=1914:clock-plan-timetable');
    expect(screen.getByText('Plan against reality')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: "The plan's timetable" }),
    ).toBeInTheDocument();
    // the Russian clock reads ahead: the armies crossed on M+15 against an assumption of M+40
    expect(
      screen.getByRole('listitem', { name: /The Russian clock: M\+15, 25 d ahead/ }),
    ).toBeInTheDocument();
  });

  it('shows the right-wing tally under the timeline and opens the ledger card', async () => {
    window.history.replaceState(null, '', '/?t=1914-09-05T12:00:00Z');
    render(<App />);
    const gauge = await screen.findByRole(
      'listitem',
      { name: /The right wing bleeds: 13 of 16 corps, 3 gone/ },
      { timeout: 8000 },
    );
    fireEvent.click(gauge);
    expect(window.location.search).toContain('card=1914:tally-right-wing');
    expect(screen.getByText('Strength ledger')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Comparisons' })).toHaveTextContent(
      /Moltke's August 1914 deployment/,
    );
  });

  it('shows the human-cost line, the 22 August beat with its vignette, and opens the casualty card', async () => {
    window.history.replaceState(null, '', '/?t=1914-08-22T18:00:00Z');
    render(<App />);
    // the beat of the day carries the Rossignol vignette once the clock has passed noon
    expect(
      await screen.findByRole(
        'heading',
        { name: '22 August: the bloodiest day' },
        { timeout: 8000 },
      ),
    ).toBeInTheDocument();
    const voices = screen.getByRole('region', { name: 'Voices' });
    expect(voices).toHaveTextContent('Rossignol: the colonial division in the fog');
    expect(voices).toHaveTextContent('Reconstruction');
    // the day has not ended: the line is still quiet
    const line = screen.getByRole('listitem', { name: /Human cost to date/ });
    expect(line).toHaveAccessibleName(/No recorded losses yet/);
    // the beat's chip opens the record
    fireEvent.click(screen.getByRole('button', { name: /22 August 1914 — the bloodiest day/ }));
    expect(window.location.search).toContain('card=1914:casualties-22-august');
    expect(screen.getByText('Human cost', { selector: '.card__eyebrow' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('French Republic');
    expect(rows[1]).toHaveTextContent('27,000');
    expect(rows[1]).toHaveTextContent('inferred');
  });

  it('sums the recorded periods on the human-cost line by the Marne', async () => {
    window.history.replaceState(null, '', '/?t=1914-09-13T00:00:00Z');
    render(<App />);
    const line = await screen.findByRole(
      'listitem',
      {
        name: /Human cost to date: Germany 200,000–250,000 killed, wounded and missing · France 406,515–456,515 killed, wounded and missing · France 27,000 killed/,
      },
      { timeout: 8000 },
    );
    expect(line).toHaveAccessibleName(/Britain 11,113–22,412 killed, wounded and missing/);
    expect(line).toHaveTextContent('5 recorded periods');
    fireEvent.click(line);
    expect(window.location.search).toContain('card=1914:casualties-marne');
  });

  it('shows the rail-against-feet gauges and opens the supply card', async () => {
    window.history.replaceState(null, '', '/?t=1914-09-05T12:00:00Z');
    render(<App />);
    const gauge = await screen.findByRole(
      'listitem',
      { name: /1\. Armee: marched \d+ km, railhead \d+ km behind/ },
      { timeout: 8000 },
    );
    expect(gauge).toHaveAttribute('data-tone', 'behind');
    fireEvent.click(gauge);
    expect(window.location.search).toContain('card=1914:supply-de-1');
    expect(screen.getByText('Rail against feet')).toBeInTheDocument();
  });

  it('plays the story: the launcher starts the tour and the panel drives the view', async () => {
    window.history.replaceState(null, '', '/');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^Play the story/ }));
    expect(window.location.search).toContain('tour=1914:tour-the-campaign');
    expect(window.location.search).toContain('step=a-bet-about-time');
    const panel = screen.getByRole('region', { name: /Guided tour/ });
    expect(panel).toHaveTextContent('Step 1 of 15');
    expect(
      screen.getByRole('heading', { level: 2, name: 'A plan is a bet about time' }),
    ).toBeInTheDocument();
    // the way out is on screen from the first step
    expect(screen.getByRole('button', { name: 'Exit tour' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(window.location.search).toContain('step=the-two-clocks');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Two clocks start together' }),
    ).toBeInTheDocument();
  });

  it('deep-links to a tour step, rebuilding its clock and card', async () => {
    window.history.replaceState(null, '', '/?tour=1914:tour-the-campaign&step=two-corps-east');
    render(<App />);
    expect(await screen.findByRole('region', { name: /Guided tour/ })).toHaveTextContent(
      'Step 7 of 15',
    );
    // the step's own instant (25 August, day 23) and its decision card
    expect(screen.getByText('Day 23')).toBeInTheDocument();
    expect(window.location.search).toContain('card=1914:decision-1914-08-25-two-corps-east');
    expect(
      screen.getByRole('heading', { name: /Two corps for East Prussia\?/ }),
    ).toBeInTheDocument();
    // arrives stopped on the card it reveals, going nowhere until asked
    expect(
      screen.getByRole('button', { name: /Continue past a card to read/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/continue when you are ready/)).toBeInTheDocument();
  });

  it('drives the tour from the keyboard alone (sand-1l0.28)', async () => {
    window.history.replaceState(null, '', '/?tour=1914:tour-the-campaign&step=two-corps-east');
    render(<App />);
    await screen.findByRole('region', { name: /Guided tour/ });
    expect(screen.getByText(/Step 7 of 15/)).toBeInTheDocument();
    // ← steps back, without a pointer ever touching a control
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(window.location.search).toContain('step=charleroi-mons');
    // → goes on
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(screen.getByText(/Step 7 of 15/)).toBeInTheDocument();
    // Escape leaves
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(window.location.search).not.toContain('tour=');
  });

  it('leaves the tour without yanking the viewer back', async () => {
    window.history.replaceState(null, '', '/?tour=1914:tour-the-campaign&step=the-marne');
    render(<App />);
    await screen.findByRole('region', { name: /Guided tour/ });
    // the step zooms into the Marne
    expect(window.location.search).toContain('focus=1914:marne');
    fireEvent.click(screen.getByRole('button', { name: 'Exit tour' }));
    expect(window.location.search).not.toContain('tour=');
    expect(window.location.search).not.toContain('step=');
    expect(screen.queryByRole('region', { name: /Guided tour/ })).not.toBeInTheDocument();
    // still where the tour left us
    expect(window.location.search).toContain('focus=1914:marne');
    expect(screen.getByRole('button', { name: /^Play the story/ })).toBeInTheDocument();
  });
});
