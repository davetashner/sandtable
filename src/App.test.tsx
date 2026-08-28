import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { parseViewState } from './engine/url-state.js';

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
    // the index rests closed above the map (ADR 0013); open it, then pick the level
    fireEvent.click(screen.getByRole('button', { name: '12 chapters and zoom-ins' }));
    fireEvent.click(screen.getByRole('button', { name: /^Zoom in to First Battle of the Marne,/ }));
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

  it('gets from a footnote to the work, and from the work to the bibliography (sand-shn.5)', async () => {
    window.history.replaceState(null, '', '/?t=1914-08-10T00:00:00Z');
    render(<App />);
    // A citation under the beat is a link to the work it names.
    const cited = await screen.findAllByRole(
      'link',
      { name: /The First World War, Volume I: To Arms/ },
      { timeout: 8000 },
    );
    fireEvent.click(cited[0]!);
    expect(window.location.search).toContain('card=source:strachan-2001');
    expect(screen.getByText('Source · Modern study')).toBeInTheDocument();
    // …and the work is one control from the whole apparatus.
    fireEvent.click(screen.getByRole('link', { name: 'All works this pack cites' }));
    expect(window.location.search).toContain('card=bibliography');
    expect(screen.getByRole('heading', { level: 2, name: 'Works cited' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Official histories and their document annexes',
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to the narrative/ }));
    expect(window.location.search).not.toContain('card=');
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
      'button',
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
      screen.getByRole('button', { name: /The Russian clock: M\+15, 25 d ahead/ }),
    ).toBeInTheDocument();
  });

  it('shows the right-wing tally under the timeline and opens the ledger card', async () => {
    window.history.replaceState(null, '', '/?t=1914-09-05T12:00:00Z');
    render(<App />);
    const gauge = await screen.findByRole(
      'button',
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
    const line = screen.getByRole('button', { name: /Human cost to date/ });
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
      'button',
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
      'button',
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

  it('resumes after the reader takes over, putting the tour back on its own step (sand-pmz.25)', async () => {
    // A step that reveals no card of its own, so the only divergence is the
    // one the reader causes.
    window.history.replaceState(null, '', '/?tour=1914:tour-the-campaign&step=the-other-story');
    render(<App />);
    await screen.findByRole('region', { name: /Guided tour/ });

    // A deep link arrives paused; set it running so there is something to lose.
    fireEvent.click(await screen.findByRole('button', { name: 'Resume the tour' }));
    await screen.findByRole('button', { name: 'Pause the tour' });

    // The reader takes over: opening a card is not something this step did.
    const face = await screen.findByRole('button', { name: /Joseph Joffre — / }, { timeout: 8000 });
    fireEvent.click(face);
    await screen.findByRole('heading', { level: 2, name: 'Joseph Joffre' }, { timeout: 8000 });
    // Which is why the tour stops — that part was always right.
    const resume = await screen.findByRole('button', { name: 'Resume the tour' });

    // …and this is what was broken: the flag went true and the divergence check
    // put it straight back in the same tick, so the button did nothing however
    // often it was pressed. Resuming now restores the step's own view.
    fireEvent.click(resume);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pause the tour' })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 2, name: 'Joseph Joffre' }),
      ).not.toBeInTheDocument();
    });
    expect(window.location.search).toContain('step=the-other-story');
  });

  it('space resumes a taken-over tour too, not only the button (sand-pmz.25)', async () => {
    window.history.replaceState(null, '', '/?tour=1914:tour-the-campaign&step=the-other-story');
    render(<App />);
    await screen.findByRole('region', { name: /Guided tour/ });
    fireEvent.click(await screen.findByRole('button', { name: 'Resume the tour' }));
    await screen.findByRole('button', { name: 'Pause the tour' });
    const face = await screen.findByRole('button', { name: /Joseph Joffre — / }, { timeout: 8000 });
    fireEvent.click(face);
    await screen.findByRole('button', { name: 'Resume the tour' });
    // The keyboard has to take the same route the button does, or Space is dead
    // in exactly the same way.
    fireEvent.keyDown(document.body, { key: ' ' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pause the tour' })).toBeInTheDocument();
    });
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

  describe('the opening sequence (sand-1l0.26)', () => {
    // sessionStorage remembers the choice for the session, so each case starts clean.
    const fresh = () => {
      window.sessionStorage.clear();
      window.history.replaceState(null, '', '/');
    };

    it('states the premise on a cold arrival, over an inert app', () => {
      fresh();
      render(<App />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAccessibleName(/Germany has forty days/);
      expect(document.querySelector('.app')).toHaveAttribute('inert');
    });

    it('hands off into the guided tour', async () => {
      fresh();
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Play the campaign/ }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(window.location.search).toContain('tour=1914:tour-the-campaign');
      expect(await screen.findByRole('region', { name: /Guided tour/ })).toBeInTheDocument();
    });

    it('gets out of the way when the viewer explores, and does not come back', () => {
      fresh();
      const { unmount } = render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Explore the map/ }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.querySelector('.app')).not.toHaveAttribute('inert');
      unmount();
      // a reload in the same session goes straight to the map
      render(<App />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens the evidence behind the premise instead of asserting it', () => {
      fresh();
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Where does .forty days. come from\?/ }));
      expect(window.location.search).toContain('card=1914:clock-plan-timetable');
      expect(
        screen.getByRole('heading', { level: 2, name: /The plan's timetable/ }),
      ).toBeInTheDocument();
    });

    it('never interrupts a deep link', () => {
      fresh();
      window.history.replaceState(null, '', '/?t=1914-09-06T00:00:00Z');
      render(<App />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.querySelector('.app')).not.toHaveAttribute('inert');
    });
  });

  describe('deep links carry the layers too (sand-shn.3)', () => {
    it('restores the switches from a pasted URL', async () => {
      window.history.replaceState(
        null,
        '',
        '/?t=1914-09-06T06:00:00Z&layers=commanders,-meanwhile.physics',
      );
      render(<App />);
      expect(screen.getByRole('button', { name: 'Commanders on the map' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByRole('button', { name: 'Physics' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      // the hidden field's glyphs really are off the timeline
      expect(
        screen.queryByRole('button', { name: /Open The eclipse that did not test relativity/ }),
      ).not.toBeInTheDocument();
      // ideas & culture was never switched off, so its glyph is still there
      expect(
        screen.getByRole('button', { name: /Open The Manifesto of the Ninety-Three/ }),
      ).toBeInTheDocument();
    });

    it('keeps "Meanwhile" cards from outside the campaign off the strip, but reachable', () => {
      // sand-9u2.2: the physics cards run 1905–1919 and the strip only spans
      // August–November 1914, which clamps anything outside it to an edge.
      window.history.replaceState(null, '', '/?card=1914:science-noether-theorem-1918');
      render(<App />);
      expect(
        screen.getByRole('heading', { level: 2, name: /Noether's theorem, 1918/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Open Noether's theorem, 1918/ }),
      ).not.toBeInTheDocument();
      // and a field with nothing on the strip gets no filter chip to toggle
      expect(screen.queryByRole('button', { name: 'Mathematics' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Physics' })).toBeInTheDocument();
    });

    it('gives the out-of-window cards a strip in the epilogue chapter (sand-9u2.6)', () => {
      // The chapter keeps its own 1915–1919 window (ADR 0015), so the six cards
      // the campaign strip could not place are placed here — Noether among them,
      // which is the only mathematics card in the pack and gets a chip at last.
      window.history.replaceState(null, '', '/?focus=1914:meanwhile-epilogue');
      render(<App />);
      // the strip is the chapter's own window, on a deep link as on a click
      expect(
        screen.getByText(/1 January 1915/, { selector: '.timeline__date' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Open Noether's theorem, 1918/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Open The eclipse of 29 May 1919/ }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mathematics' })).toBeInTheDocument();
      // and the campaign's own cards are not on this strip
      expect(
        screen.queryByRole('button', { name: /Open The Manifesto of the Ninety-Three/ }),
      ).not.toBeInTheDocument();
      // leaving does not park the reader on the last day of the campaign
      fireEvent.click(screen.getByRole('button', { name: 'Back to the campaign' }));
      expect(window.location.search).not.toContain('focus=');
      expect(screen.getByText('Day 0')).toBeInTheDocument();
    });

    it('reopens a link copied from inside a chapter with its own window', () => {
      // `?t=` is applied while the clock still has the campaign's range, so
      // 1918 would have been clamped to 25 November 1914 and lost (ADR 0009).
      window.history.replaceState(
        null,
        '',
        '/?t=1918-07-26T00:00:00Z&focus=1914:meanwhile-epilogue',
      );
      render(<App />);
      expect(screen.getByText(/26 July 1918/, { selector: '.timeline__date' })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 2, name: /an exact solution at the Russian front/ }),
      ).toBeInTheDocument();
    });

    it('writes a switch into the URL, and takes it out again at its default', () => {
      window.history.replaceState(null, '', '/?t=1914-09-06T06:00:00Z');
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Commanders on the map' }));
      expect(window.location.search).toContain('layers=commanders');
      fireEvent.click(screen.getByRole('button', { name: 'Physics' }));
      expect(window.location.search).toContain('layers=commanders,-meanwhile.physics');
      expect(
        screen.queryByRole('button', { name: /Open The eclipse that did not test relativity/ }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Commanders on the map' }));
      fireEvent.click(screen.getByRole('button', { name: 'Physics' }));
      expect(window.location.search).not.toContain('layers=');
      expect(window.location.search).toBe('?t=1914-09-06T06:00:00Z');
    });

    it('copies the address of the view as the reader sees it', async () => {
      window.history.replaceState(null, '', '/?t=1914-09-06T06:00:00Z');
      const write = vi.fn((_text: string) => Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: write },
      });
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Commanders on the map' }));
      fireEvent.click(screen.getByRole('button', { name: 'Copy a link to this view' }));
      await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
      const copied = String(write.mock.calls[0]![0]);
      expect(copied).toBe(window.location.href);
      // and what was copied restores the same view
      expect(parseViewState(new URL(copied).search)).toEqual({
        t: Date.UTC(1914, 8, 6, 6),
        layers: ['commanders'],
      });
    });
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
