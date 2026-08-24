import { describe, expect, it } from 'vitest';
import type { RawContent } from './tree.js';
import { validateContent } from './validate.js';

/** A minimal, valid content tree: one pack, two branches, shared registries. */
function fixture(): RawContent {
  const pack = {
    id: '1914:test',
    idPrefix: '1914',
    title: 'Test pack',
    summary: 'A fixture.',
    timeRange: { start: '1914-08-01T00:00:00Z', end: '1914-09-30T00:00:00Z' },
    region: [0, 47, 9, 52],
    borderYear: 1914,
    camera: { center: [4.5, 49.5], zoom: 6 },
    sides: [
      { id: 'de', name: 'German Empire' },
      { id: 'fr', name: 'France' },
    ],
    branches: [
      { id: '1914:historical', title: 'What happened', kind: 'historical', summary: 'History.' },
      {
        id: '1914:concept',
        title: 'Concept',
        kind: 'counterfactual',
        divergesAt: '1914-08-25T00:00:00Z',
        summary: 'Hypothetical.',
      },
    ],
    defaultBranch: '1914:historical',
    status: 'draft',
  };
  const formations = [
    {
      id: '1914:army-de-1',
      name: 'German 1st Army',
      side: 'de',
      kind: 'army',
      commander: 'person:kluck',
    },
    { id: '1914:army-fr-6', name: 'French 6th Army', side: 'fr', kind: 'army' },
  ];
  const routes = [
    {
      id: '1914:route-de-1',
      formation: '1914:army-de-1',
      waypoints: [
        [6.08, 50.78, '1914-08-13T06:00:00Z'],
        [4.35, 50.85, '1914-08-20T12:00:00Z'],
        [3.4, 49.05, '1914-09-03T12:00:00Z'],
      ],
      sources: [{ source: 'source:herwig-2009' }],
    },
    {
      id: '1914:route-de-1-concept',
      formation: '1914:army-de-1',
      branch: '1914:concept',
      waypoints: [
        [2.3, 49.89, '1914-08-30T12:00:00Z'],
        [1.5, 48.45, '1914-09-07T12:00:00Z'],
      ],
      sources: [{ source: 'source:zuber-2002' }],
    },
    {
      id: '1914:route-fr-6',
      formation: '1914:army-fr-6',
      waypoints: [
        [2.3, 49.89, '1914-08-26T00:00:00Z'],
        [2.88, 48.96, '1914-09-05T06:00:00Z'],
      ],
      sources: [{ source: 'source:herwig-2009' }],
    },
  ];
  const events = [
    {
      id: '1914:event-marne',
      title: 'Battle of the Marne',
      timeRange: { start: '1914-09-05T00:00:00Z', end: '1914-09-12T00:00:00Z' },
      kind: 'battle',
      significance: 'major',
      place: 'place:meaux',
      summary: 'The counterstroke.',
      links: { formations: ['1914:army-de-1', '1914:army-fr-6'], people: ['person:kluck'] },
      sources: [{ source: 'source:herwig-2009', pages: '220–300' }],
    },
  ];
  const battles = [
    {
      id: '1914:marne',
      title: 'First Battle of the Marne',
      timeRange: { start: '1914-09-05T00:00:00Z', end: '1914-09-12T00:00:00Z' },
      region: [2.5, 48.5, 4.5, 49.5],
      camera: { center: [3.2, 48.95], zoom: 8 },
      summary: 'Zoom-in.',
      participants: ['1914:army-de-1', '1914:army-fr-6'],
      formations: [
        {
          id: '1914:marne-ii-korps',
          name: 'II. Armeekorps',
          side: 'de',
          kind: 'corps',
          parent: '1914:army-de-1',
        },
      ],
      routes: [
        {
          id: '1914:marne-route-ii-korps',
          formation: '1914:marne-ii-korps',
          waypoints: [
            [3.0, 48.9, '1914-09-05T06:00:00Z'],
            [3.0, 49.05, '1914-09-06T06:00:00Z'],
          ],
          sources: [{ source: 'source:herwig-2009' }],
        },
      ],
      sources: [{ source: 'source:herwig-2009' }],
    },
  ];
  const links = [
    {
      id: '1914:link-turn-to-marne',
      from: '1914:army-de-1',
      to: '1914:marne',
      relation: 'enabled',
      claim: 'The inward wheel exposed the flank.',
      confidence: 'high',
      evidence: [{ source: 'source:herwig-2009' }],
    },
  ];
  const beat = (id: string, from: string, to: string, branch?: string) =>
    `---\nid: ${id}\ntitle: ${id}\ndateLabel: label\nfrom: ${from}\nto: ${to}\n${branch ? `branch: ${branch}\n` : ''}sources:\n  - source: source:herwig-2009\n---\nBody text.[^herwig-2009]\n`;
  return {
    packs: [
      {
        dir: '1914-test',
        pack: { path: 'eras/1914-test/pack.json', data: pack },
        collections: {
          'formations.json': { path: 'eras/1914-test/formations.json', data: formations },
          'routes.json': { path: 'eras/1914-test/routes.json', data: routes },
          'events.json': { path: 'eras/1914-test/events.json', data: events },
          'battles.json': { path: 'eras/1914-test/battles.json', data: battles },
          'links.json': { path: 'eras/1914-test/links.json', data: links },
        },
        beats: [
          {
            path: 'eras/1914-test/beats/01.md',
            data: beat('1914:beat-1', '1914-08-01T00:00:00Z', '1914-08-25T00:00:00Z'),
          },
          {
            path: 'eras/1914-test/beats/02.md',
            data: beat(
              '1914:beat-2',
              '1914-08-25T00:00:00Z',
              '1914-09-30T00:00:00Z',
              '1914:historical',
            ),
          },
          {
            path: 'eras/1914-test/beats/03.md',
            data: beat(
              '1914:beat-3',
              '1914-08-25T00:00:00Z',
              '1914-09-30T00:00:00Z',
              '1914:concept',
            ),
          },
        ],
      },
    ],
    shared: {
      collections: {
        'people/people.json': {
          path: 'shared/people/people.json',
          data: [
            {
              id: 'person:kluck',
              name: 'Alexander von Kluck',
              summary: 'Commander of the 1st Army.',
            },
          ],
        },
        'places/places.json': {
          path: 'shared/places/places.json',
          data: [{ id: 'place:meaux', name: 'Meaux', kind: 'town', lngLat: [2.88, 48.96] }],
        },
        'sources/sources.json': {
          path: 'shared/sources/sources.json',
          data: [
            {
              id: 'source:herwig-2009',
              kind: 'book',
              title: 'The Marne, 1914',
              author: 'Herwig, Holger H.',
              year: 2009,
            },
            {
              id: 'source:zuber-2002',
              kind: 'book',
              title: 'Inventing the Schlieffen Plan',
              author: 'Zuber, Terence',
              year: 2002,
            },
          ],
        },
      },
      media: [],
      audio: [],
    },
    threads: [
      {
        path: 'threads/test/thread.json',
        data: {
          id: 'thread:test',
          title: 'Test thread',
          summary: 'Two steps.',
          steps: [
            { pack: '1914:test', beat: '1914:beat-1', note: 'Start.' },
            { pack: '1914:test', beat: '1914:beat-2', note: 'Then.' },
          ],
        },
      },
    ],
  };
}

const messages = (r: ReturnType<typeof validateContent>) =>
  r.errors.map((e) => `${e.id ?? e.path}: ${e.message}`);

describe('validateContent', () => {
  it('accepts the valid fixture', () => {
    const report = validateContent(fixture());
    expect(messages(report)).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.counts).toMatchObject({
      pack: 1,
      branch: 2,
      formation: 3,
      route: 4,
      beat: 3,
      person: 1,
      thread: 1,
    });
    expect(report.content.packs[0]?.beats[0]?.body).toBe('Body text.[^herwig-2009]');
  });

  it('checks the opening sequence: the claim card resolves, footnotes cite its own sources, camera inside the region', () => {
    const raw = fixture();
    const pack = raw.packs[0]!.pack.data as Record<string, unknown>;
    pack['opening'] = {
      headline: ['August 1914.', 'Germany has forty days.'],
      lede: 'A bet about time.[^nobody]',
      camera: { center: [40, 60], zoom: 6 },
      claim: { label: 'Where does that come from?', card: '1914:no-such-clock' },
      sources: [{ source: 'source:missing' }],
    };
    const report = validateContent(raw);
    const errs = report.errors.map((e) => e.message);
    expect(errs).toContainEqual(expect.stringMatching(/opening\.claim\.card/));
    expect(errs).toContainEqual(expect.stringMatching(/opening\.sources: citation/));
    expect(errs).toContainEqual(
      expect.stringMatching(/opening\.lede footnote \[\^nobody\] is not one of the entity's sources/),
    );
    expect(report.warnings.map((w) => w.message)).toContainEqual(
      expect.stringMatching(/opening\.camera\.center is outside the pack region/),
    );
  });

  it('checks the backstory: chain.focus must be a battle, chain.card must resolve', () => {
    const raw = fixture();
    const pack = raw.packs[0]!.pack.data as Record<string, unknown>;
    pack['opening'] = {
      headline: ['August 1914.'],
      lede: 'A bet about time.',
      chain: { focus: '1914:no-such-chapter', card: '1914:no-such-link' },
    };
    const errs = validateContent(raw).errors.map((e) => e.message);
    expect(errs).toContainEqual(expect.stringMatching(/opening\.chain\.focus/));
    expect(errs).toContainEqual(expect.stringMatching(/opening\.chain\.card/));
  });

  it('warns about a backstory that goes nowhere', () => {
    const raw = fixture();
    const pack = raw.packs[0]!.pack.data as Record<string, unknown>;
    pack['opening'] = {
      headline: ['August 1914.'],
      lede: 'A bet about time.',
      chain: { label: 'How did it start?' },
    };
    expect(validateContent(raw).warnings.map((w) => w.message)).toContainEqual(
      expect.stringMatching(/opening\.chain has neither card nor focus/),
    );
  });

  it('accepts an opening whose claim and citations resolve', () => {
    const raw = fixture();
    const pack = raw.packs[0]!.pack.data as Record<string, unknown>;
    pack['opening'] = {
      eyebrow: 'The plan and the clock',
      headline: ['August 1914.'],
      lede: 'A bet about time.[^herwig-2009]',
      camera: { center: [4.9, 50.6], zoom: 6.8 },
      sources: [{ source: 'source:herwig-2009' }],
    };
    const report = validateContent(raw);
    expect(messages(report)).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('checks a formation concentration: asOf inside the pack range (error), position inside the region (warning), sources resolve', () => {
    const raw = fixture();
    const c = raw.packs[0]!.collections;
    const forms = c['formations.json']!.data as Record<string, unknown>[];
    forms[0]!['concentration'] = {
      area: 'Aachen',
      position: [20, 60],
      asOf: '1914-10-15',
      sources: [{ source: 'source:missing' }],
    };
    const report = validateContent(raw);
    const errs = report.errors.map((e) => e.message);
    const warns = report.warnings.map((w) => w.message);
    expect(errs).toContainEqual(
      expect.stringMatching(/concentration\.asOf \(1914-10-15\) is outside the pack timeRange/),
    );
    expect(errs).toContainEqual(
      expect.stringMatching(/concentration\.sources: citation source:missing does not exist/),
    );
    expect(warns).toContainEqual(
      expect.stringMatching(/concentration\.position \[20, 60\] is outside the pack region/),
    );
    forms[0]!['concentration'] = { area: 'Aachen', position: [6, 50.8], asOf: '1914-08-17' };
    expect(messages(validateContent(raw)).filter((m) => /concentration/.test(m))).toEqual([]);
    forms[0]!['dissolved'] = '1914-08-10';
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/dissolved must be later than concentration\.asOf/),
    );
    forms[0]!['dissolved'] = '1914-12-01';
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/dissolved \(1914-12-01\) is outside the pack timeRange/),
    );
    forms[0]!['dissolved'] = '1914-08-26';
    expect(messages(validateContent(raw)).filter((m) => /dissolved/.test(m))).toEqual([]);
  });

  it('checks guided tours: unique steps, instants inside the right range, ids resolve, footnotes cite the tour', () => {
    const raw = fixture();
    const c = raw.packs[0]!.collections;
    const tour = (steps: Record<string, unknown>[]) => ({
      id: '1914:tour-campaign',
      title: 'The campaign',
      summary: 'A pass over the campaign.',
      sources: [{ source: 'source:herwig-2009' }],
      steps,
    });
    const step = (over: Record<string, unknown> = {}) => ({
      id: 'opening',
      title: 'Opening',
      narration: 'The bet.[^herwig-2009]',
      at: '1914-08-04T00:00:00Z',
      ...over,
    });
    c['tours.json'] = {
      path: 'eras/1914-test/tours.json',
      data: [
        tour([
          step({}),
          step({
            id: 'marne',
            at: '1914-09-06T00:00:00Z',
            playUntil: '1914-09-10T00:00:00Z',
            focus: '1914:marne',
            branch: '1914:concept',
            card: '1914:link-turn-to-marne',
          }),
        ]),
      ],
    };
    expect(messages(validateContent(raw)).filter((m) => /tour/.test(m))).toEqual([]);

    // a step's instant must sit inside the battle's range once it names a focus
    c['tours.json']!.data = [
      tour([step({}), step({ id: 'marne', at: '1914-08-20T00:00:00Z', focus: '1914:marne' })]),
    ];
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/steps\[1\] \(marne\): at is outside the battle's timeRange/),
    );

    // …and inside the pack's when it does not
    c['tours.json']!.data = [tour([step({}), step({ id: 'late', at: '1915-01-01T00:00:00Z' })])];
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/steps\[1\] \(late\): at is outside the pack timeRange/),
    );

    // playUntil must follow at
    c['tours.json']!.data = [
      tour([step({ playUntil: '1914-08-03T00:00:00Z' }), step({ id: 'b' })]),
    ];
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/steps\[0\] \(opening\): playUntil must be after at/),
    );

    // duplicate step ids, dangling card and branch, uncited footnote
    c['tours.json']!.data = [
      tour([
        step({}),
        step({ card: '1914:card-missing', branch: '1914:nope', narration: 'X.[^nobody]' }),
      ]),
    ];
    const errs = messages(validateContent(raw));
    expect(errs).toContainEqual(expect.stringMatching(/steps\[1\] \(opening\): duplicate step id/));
    expect(errs).toContainEqual(
      expect.stringMatching(/steps\[1\] \(opening\): card 1914:card-missing does not exist/),
    );
    expect(errs).toContainEqual(
      expect.stringMatching(/branch 1914:nope is not defined in pack\.json/),
    );
    expect(errs).toContainEqual(
      expect.stringMatching(/steps\[1\] \(opening\) narration footnote \[\^nobody\]/),
    );

    // running backwards is legal but warned about
    c['tours.json']!.data = [
      tour([
        step({ at: '1914-09-01T00:00:00Z' }),
        step({ id: 'back', at: '1914-08-05T00:00:00Z' }),
      ]),
    ];
    const report = validateContent(raw);
    expect(messages(report).filter((m) => /tour/.test(m))).toEqual([]);
    expect(report.warnings.map((w) => w.message)).toContainEqual(
      expect.stringMatching(/steps\[1\] \(back\): at runs backwards from the previous step/),
    );
  });

  it('checks supply lines: army and railhead must exist and have historical routes; footnotes and citations', () => {
    const raw = fixture();
    const c = raw.packs[0]!.collections;
    const line = (over: Record<string, unknown>) => ({
      id: '1914:supply-1',
      title: 'Feet against rail',
      army: '1914:army-de-1',
      railhead: '1914:army-fr-6',
      summary: 'Horses.[^herwig-2009]',
      sources: [{ source: 'source:herwig-2009' }],
      ...over,
    });
    c['supply.json'] = { path: 'eras/1914-test/supply.json', data: [line({})] };
    expect(messages(validateContent(raw)).filter((m) => /supply/.test(m))).toEqual([]);
    // strip the railhead's route → flagged
    const routes = c['routes.json']!.data as { formation: string }[];
    c['routes.json']!.data = routes.filter((r) => r.formation !== '1914:army-fr-6');
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/railhead 1914:army-fr-6 has no historical route to measure/),
    );
    c['routes.json']!.data = routes;
    c['supply.json'] = {
      path: 'eras/1914-test/supply.json',
      data: [line({ railhead: '1914:ghost', summary: 'Text.[^nope]' })],
    };
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(expect.stringMatching(/railhead 1914:ghost does not exist/));
    expect(msgs).toContainEqual(
      expect.stringMatching(/summary footnote \[\^nope\] is not one of the supply line's sources/),
    );
  });

  it('checks casualty records: range, side ids, battle/event refs, value-or-range, footnotes', () => {
    const raw = fixture();
    const c = raw.packs[0]!.collections;
    const rec = (over: Record<string, unknown>) => ({
      id: '1914:casualties-marne',
      title: 'The Marne',
      timeRange: { start: '1914-09-05T00:00:00Z', end: '1914-09-12T00:00:00Z' },
      battle: '1914:marne',
      event: '1914:event-marne',
      figures: [
        { side: 'fr', category: 'casualties', low: 200000, high: 250000, confidence: 'contested' },
        {
          side: 'de',
          category: 'killed',
          value: 1000,
          confidence: 'low',
          sources: [{ source: 'source:herwig-2009' }],
        },
      ],
      summary: 'A week.[^herwig-2009]',
      historiography: 'Never known.[^herwig-2009]',
      links: { people: ['person:kluck'] },
      sources: [{ source: 'source:herwig-2009' }],
      ...over,
    });
    c['casualties.json'] = { path: 'eras/1914-test/casualties.json', data: [rec({})] };
    expect(messages(validateContent(raw)).filter((m) => /casualties/.test(m))).toEqual([]);
    c['casualties.json'] = {
      path: 'eras/1914-test/casualties.json',
      data: [
        rec({
          timeRange: { start: '1914-09-05T00:00:00Z', end: '1914-10-12T00:00:00Z' },
          battle: '1914:ghost',
          figures: [{ side: 'ru', category: 'killed', value: 1, confidence: 'high' }],
          historiography: 'Text.[^nope]',
        }),
      ],
    };
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(expect.stringMatching(/timeRange is outside the pack timeRange/));
    expect(msgs).toContainEqual(expect.stringMatching(/battle 1914:ghost does not exist/));
    expect(msgs).toContainEqual(expect.stringMatching(/figures\[0\]: side ru is not a pack side/));
    expect(msgs).toContainEqual(
      expect.stringMatching(
        /historiography footnote \[\^nope\] is not one of the entity's sources/,
      ),
    );
    // schema: a figure needs a value or a range, and low <= high
    c['casualties.json'] = {
      path: 'eras/1914-test/casualties.json',
      data: [rec({ figures: [{ side: 'fr', category: 'killed', confidence: 'high' }] })],
    };
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/a figure needs a value or both low and high/),
    );
    c['casualties.json'] = {
      path: 'eras/1914-test/casualties.json',
      data: [
        rec({ figures: [{ side: 'fr', category: 'killed', low: 9, high: 1, confidence: 'high' }] }),
      ],
    };
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/low must be <= high/),
    );
  });

  it('checks vignettes: at in range, branch, place and people refs, footnotes and citations', () => {
    const raw = fixture();
    const c = raw.packs[0]!.collections;
    const v = (over: Record<string, unknown>) => ({
      id: '1914:vignette-taxis',
      title: 'The taxis',
      at: '1914-09-07T20:00:00Z',
      place: 'place:meaux',
      voice: 'Paris',
      kind: 'reconstruction',
      text: 'Meters running.[^herwig-2009]',
      people: ['person:kluck'],
      links: { battles: ['1914:marne'] },
      sources: [{ source: 'source:herwig-2009' }],
      ...over,
    });
    c['vignettes.json'] = { path: 'eras/1914-test/vignettes.json', data: [v({})] };
    expect(messages(validateContent(raw)).filter((m) => /vignette/.test(m))).toEqual([]);
    c['vignettes.json'] = {
      path: 'eras/1914-test/vignettes.json',
      data: [
        v({
          at: '1914-10-07T20:00:00Z',
          branch: '1914:nope',
          place: 'place:ghost',
          people: ['person:ghost'],
          text: 'Text.[^nope]',
        }),
      ],
    };
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(expect.stringMatching(/at is outside the pack timeRange/));
    expect(msgs).toContainEqual(expect.stringMatching(/branch 1914:nope is not defined/));
    expect(msgs).toContainEqual(expect.stringMatching(/place place:ghost does not exist/));
    expect(msgs).toContainEqual(expect.stringMatching(/people person:ghost does not exist/));
    expect(msgs).toContainEqual(
      expect.stringMatching(/text footnote \[\^nope\] is not one of the entity's sources/),
    );
    // a beat may link a casualty record; a causal link may point at a vignette
    c['casualties.json'] = {
      path: 'eras/1914-test/casualties.json',
      data: [
        {
          id: '1914:casualties-x',
          title: 'X',
          timeRange: { start: '1914-09-05T00:00:00Z', end: '1914-09-12T00:00:00Z' },
          figures: [{ side: 'fr', category: 'killed', value: 1, confidence: 'high' }],
          sources: [{ source: 'source:herwig-2009' }],
        },
      ],
    };
    c['vignettes.json'] = { path: 'eras/1914-test/vignettes.json', data: [v({})] };
    (c['events.json']!.data as Record<string, unknown>[])[0]!['links'] = {
      casualties: ['1914:casualties-x', '1914:casualties-ghost'],
    };
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/links.casualties 1914:casualties-ghost does not exist/),
    );
  });

  it('checks tallies: entries ordered and in range, formation/place refs, footnotes and citations', () => {
    const raw = fixture();
    const c = raw.packs[0]!.collections;
    const tally = (over: Record<string, unknown>) => ({
      id: '1914:tally-rw',
      title: 'Right wing',
      unit: 'corps',
      start: { value: 16, asOf: '1914-08-17T00:00:00Z' },
      entries: [
        {
          id: 'a',
          at: '1914-08-20T00:00:00Z',
          delta: -1,
          label: 'A',
          formations: ['1914:army-de-1'],
        },
      ],
      summary: 'Weight.[^herwig-2009]',
      sources: [{ source: 'source:herwig-2009' }],
      ...over,
    });
    c['tallies.json'] = { path: 'eras/1914-test/tallies.json', data: [tally({})] };
    expect(messages(validateContent(raw)).filter((m) => /tally/.test(m))).toEqual([]);
    c['tallies.json'] = {
      path: 'eras/1914-test/tallies.json',
      data: [
        tally({
          summary: 'Text.[^nope]',
          entries: [
            {
              id: 'b',
              at: '1914-08-25T00:00:00Z',
              delta: -2,
              label: 'B',
              formations: ['1914:ghost'],
              place: 'place:nowhere',
            },
            { id: 'b', at: '1914-08-20T00:00:00Z', delta: 1, label: 'Earlier' },
            { id: 'c', at: '1914-12-01T00:00:00Z', delta: 1, label: 'Late' },
          ],
          comparisons: [{ id: 'x', label: 'X', a: -1, b: 2 }],
        }),
      ],
    };
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(
      expect.stringMatching(/entry b formations 1914:ghost does not exist/),
    );
    expect(msgs).toContainEqual(
      expect.stringMatching(/entry b place place:nowhere does not exist/),
    );
    expect(msgs).toContainEqual(expect.stringMatching(/duplicate entry id b/));
    expect(msgs).toContainEqual(
      expect.stringMatching(/entry b is earlier than the previous entry/),
    );
    expect(msgs).toContainEqual(expect.stringMatching(/entry c: at is outside the pack timeRange/));
    expect(msgs).toContainEqual(expect.stringMatching(/comparison x: quantities must be >= 0/));
    expect(msgs).toContainEqual(
      expect.stringMatching(/summary footnote \[\^nope\] is not one of the tally's sources/),
    );
  });

  it('checks timetables: milestone ids unique, planned or actual, actual after origin, footnotes resolve, citations required', () => {
    const raw = fixture();
    const c = raw.packs[0]!.collections;
    const clock = (over: Record<string, unknown>) => ({
      id: '1914:clock-plan',
      title: 'Plan',
      origin: '1914-08-02T00:00:00Z',
      assumption: 'Six weeks.[^herwig-2009]',
      milestones: [
        { id: 'liege', label: 'Liège', plannedDay: 12, actualAt: '1914-08-16T00:00:00Z' },
      ],
      sources: [{ source: 'source:herwig-2009' }],
      ...over,
    });
    c['clocks.json'] = { path: 'eras/1914-test/clocks.json', data: [clock({})] };
    expect(messages(validateContent(raw)).filter((m) => /clock/.test(m))).toEqual([]);
    c['clocks.json'] = {
      path: 'eras/1914-test/clocks.json',
      data: [
        clock({
          assumption: 'Text.[^nope]',
          milestones: [
            { id: 'a', label: 'A' },
            { id: 'a', label: 'A again', plannedDay: 3 },
            { id: 'b', label: 'B', actualAt: '1914-07-30T00:00:00Z', place: 'place:nowhere' },
          ],
        }),
      ],
    };
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(
      expect.stringMatching(/milestone a needs a plannedDay or an actualAt/),
    );
    expect(msgs).toContainEqual(expect.stringMatching(/duplicate milestone id a/));
    expect(msgs).toContainEqual(
      expect.stringMatching(/milestone b: actualAt is before the timetable origin/),
    );
    expect(msgs).toContainEqual(
      expect.stringMatching(/milestone b place place:nowhere does not exist/),
    );
    expect(msgs).toContainEqual(
      expect.stringMatching(/assumption footnote \[\^nope\] is not one of the timetable's sources/),
    );
  });

  it('checks cast entries: person and side must exist, citations required, bio footnotes must name a source, one entry per person', () => {
    const raw = fixture();
    const c = raw.packs[0]!.collections;
    const entry = (over: Record<string, unknown>) => ({
      id: '1914:cast-kluck',
      person: 'person:kluck',
      side: 'de',
      role: 'Commander, 1st Army',
      bio: 'Marched on the outer edge.[^herwig-2009]',
      sources: [{ source: 'source:herwig-2009' }],
      ...over,
    });
    c['cast.json'] = { path: 'eras/1914-test/cast.json', data: [entry({})] };
    expect(messages(validateContent(raw)).filter((m) => /cast/.test(m))).toEqual([]);
    c['cast.json'] = {
      path: 'eras/1914-test/cast.json',
      data: [
        entry({ person: 'person:nobody', side: 'xx', bio: 'Text.[^nope]' }),
        entry({ id: '1914:cast-kluck-2', sources: [] }),
        entry({ id: '1914:cast-kluck-3' }),
      ],
    };
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(expect.stringMatching(/person person:nobody does not exist/));
    expect(msgs).toContainEqual(expect.stringMatching(/side xx is not a pack side/));
    expect(msgs).toContainEqual(
      expect.stringMatching(/footnote \[\^nope\] is not one of the entry's sources/),
    );
    expect(msgs).toContainEqual(
      expect.stringMatching(/sources: at least one citation is required/),
    );
    expect(msgs).toContainEqual(
      expect.stringMatching(/person person:kluck appears twice in the cast/),
    );
  });

  it('rejects schema violations with file and path', () => {
    const raw = fixture();
    (raw.packs[0]!.pack.data as { camera: unknown }).camera = { center: [200, 0], zoom: 6 };
    const report = validateContent(raw);
    expect(report.ok).toBe(false);
    expect(report.errors[0]?.path).toBe('eras/1914-test/pack.json');
    expect(report.errors[0]?.message).toMatch(/camera\.center\.0/);
  });

  it('rejects dangling references of every kind', () => {
    const raw = fixture();
    const c = raw.packs[0]!.collections;
    (c['formations.json']!.data as { commander: string }[])[0]!.commander = 'person:nobody';
    (c['events.json']!.data as { place: string; sources: { source: string }[] }[])[0]!.place =
      'place:nowhere';
    (c['events.json']!.data as { sources: { source: string }[] }[])[0]!.sources = [
      { source: 'source:missing' },
    ];
    (c['links.json']!.data as { to: string }[])[0]!.to = '1914:ghost';
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(expect.stringMatching(/commander person:nobody does not exist/));
    expect(msgs).toContainEqual(expect.stringMatching(/place place:nowhere does not exist/));
    expect(msgs).toContainEqual(expect.stringMatching(/citation source:missing does not exist/));
    expect(msgs).toContainEqual(expect.stringMatching(/to 1914:ghost does not exist/));
  });

  it('enforces id prefixes and uniqueness', () => {
    const raw = fixture();
    const f = raw.packs[0]!.collections['formations.json']!.data as { id: string }[];
    f[1]!.id = '1870:army-fr-6';
    f.push({ ...f[0]!, id: '1914:army-de-1' });
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(
      expect.stringMatching(/1870:army-fr-6: id must start with "1914:"/),
    );
    expect(msgs).toContainEqual(expect.stringMatching(/duplicate id 1914:army-de-1/));
  });

  it('checks time ordering, containment and branch divergence on routes', () => {
    const raw = fixture();
    const r = raw.packs[0]!.collections['routes.json']!.data as {
      waypoints: [number, number, string][];
    }[];
    r[0]!.waypoints[1]![2] = '1914-08-12T00:00:00Z'; // earlier than waypoint 0
    r[0]!.waypoints[2]![2] = '1914-10-03T12:00:00Z'; // after the pack ends
    r[1]!.waypoints[0]![2] = '1914-08-20T12:00:00Z'; // before divergesAt
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(expect.stringMatching(/waypoints\[1\] is not later/));
    expect(msgs).toContainEqual(
      expect.stringMatching(/waypoints\[2\].*outside the pack timeRange/),
    );
    expect(msgs).toContainEqual(expect.stringMatching(/starts before the branch diverges/));
  });

  it('requires citations on routes, events, battles, beats and links', () => {
    const raw = fixture();
    const c = raw.packs[0]!.collections;
    (c['routes.json']!.data as { sources: unknown[] }[])[2]!.sources = [];
    (c['battles.json']!.data as { sources: unknown[] }[])[0]!.sources = [];
    raw.packs[0]!.beats[0]!.data = (raw.packs[0]!.beats[0]!.data as string).replace(
      /sources:[\s\S]*?---\n/,
      'sources: []\n---\n',
    );
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(
      expect.stringMatching(/1914:route-fr-6: sources: at least one citation/),
    );
    expect(msgs).toContainEqual(
      expect.stringMatching(/1914:marne: sources: at least one citation/),
    );
    expect(msgs).toContainEqual(
      expect.stringMatching(/beats\/01\.md: front matter: sources: Too small/),
    );
  });

  it('warns when Wikipedia stands behind an operational claim, but not in the registries', () => {
    // docs/sources.md §8. The shared registries are where reference data lives
    // — a person's dates, a place's coordinates — so a citation there is in
    // order; on a route it is standing in front of a position (sand-1l0.16).
    const raw = fixture();
    const sources = raw.shared.collections['sources/sources.json']!.data as { id: string }[];
    sources.push({
      id: 'source:wikipedia-en',
      kind: 'web',
      title: 'Wikipedia (English)',
      author: 'Wikipedia contributors',
      year: 2026,
    } as never);
    const routes = raw.packs[0]!.collections['routes.json']!.data as { sources: unknown[] }[];
    routes[0]!.sources = [{ source: 'source:wikipedia-en' }];
    const people = raw.shared.collections['people/people.json']!.data as { sources?: unknown[] }[];
    people[0]!.sources = [{ source: 'source:wikipedia-en', note: 'dates' }];
    const places = raw.shared.collections['places/places.json']!.data as { sources?: unknown[] }[];
    places[0]!.sources = [{ source: 'source:wikipedia-en', note: 'coordinates' }];

    const report = validateContent(raw);
    const warned = report.warnings.filter((w) => w.message.includes('reference data only'));
    expect(warned).toHaveLength(1);
    expect(warned[0]!.path).toMatch(/routes\.json$/);
    // …and it is a warning, not an error: the standard admits the pointer
    // until a better reference replaces it.
    expect(report.errors.filter((e) => e.message.includes('reference data only'))).toHaveLength(0);
  });

  it('rejects overlapping beats within a branch and unknown footnotes', () => {
    const raw = fixture();
    const beats = raw.packs[0]!.beats;
    beats[1]!.data = (beats[1]!.data as string).replace(
      'from: 1914-08-25T00:00:00Z',
      'from: 1914-08-20T00:00:00Z',
    );
    beats[2]!.data = (beats[2]!.data as string).replace('[^herwig-2009]', '[^tuchman-1962]');
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(
      expect.stringMatching(/1914:beat-2: overlaps 1914:beat-1 .* in branch 1914:historical/),
    );
    expect(msgs).toContainEqual(
      expect.stringMatching(/footnote \[\^tuchman-1962\] is not one of this beat's sources/),
    );
  });

  it('validates pack-level branch rules', () => {
    const raw = fixture();
    const pack = raw.packs[0]!.pack.data as {
      defaultBranch: string;
      branches: { kind: string; divergesAt?: string }[];
    };
    pack.defaultBranch = '1914:nope';
    delete pack.branches[1]!.divergesAt;
    pack.branches[0]!.kind = 'counterfactual';
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(
      expect.stringMatching(/defaultBranch 1914:nope is not one of branches/),
    );
    expect(msgs).toContainEqual(
      expect.stringMatching(/exactly one historical branch is required \(found 0\)/),
    );
    expect(msgs).toContainEqual(
      expect.stringMatching(/1914:concept: counterfactual branch needs divergesAt/),
    );
  });

  it('applies the imagery policy to media manifests', () => {
    const raw = fixture();
    raw.shared.media.push({
      path: 'shared/media/people/x/media.json',
      data: {
        id: 'media:person/x/portrait-colorized',
        file: 'portrait-colorized.png',
        width: 10,
        height: 10,
        colorized: true,
        original: { licence: 'UNVERIFIED', archive: 'Bundesarchiv, Bild 183-X' },
        colorization: { status: 'ok' },
        content_policy: 'ok',
        caption: 'A portrait.',
        credit: 'Somebody',
        used_by: ['1914:beat-1', '1914:beat-missing'],
      },
    });
    const report = validateContent(raw);
    const msgs = messages(report);
    expect(msgs).toContainEqual(expect.stringMatching(/flagged BLOCKED\/UNVERIFIED/));
    expect(msgs).toContainEqual(expect.stringMatching(/caption does not say so/));
    expect(msgs).toContainEqual(expect.stringMatching(/Bundesarchiv, Bild/));
    expect(report.warnings.map((w) => w.message)).toContainEqual(
      expect.stringMatching(/used_by 1914:beat-missing does not exist yet/),
    );
  });

  it('validates threads across packs', () => {
    const raw = fixture();
    (raw.threads[0]!.data as { steps: { beat: string }[] }).steps[1]!.beat = '1914:beat-x';
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(
      expect.stringMatching(/thread:test: step.beat 1914:beat-x does not exist/),
    );
  });

  it('resolves cross-pack causal links and threads through the shared registries (cross-era identity)', () => {
    const raw = fixture();
    // a second pack: 1870, referencing the same shared person
    const pack1870 = {
      id: '1870:sedan-campaign',
      idPrefix: '1870',
      title: 'Franco-Prussian War',
      summary: 'Fixture.',
      timeRange: { start: '1870-07-19T00:00:00Z', end: '1871-01-28T00:00:00Z' },
      region: [0, 47, 9, 52],
      borderYear: 1870,
      camera: { center: [4.9, 49.7], zoom: 7 },
      sides: [{ id: 'pr', name: 'Prussia' }],
      branches: [
        { id: '1870:historical', title: 'What happened', kind: 'historical', summary: 'History.' },
      ],
      defaultBranch: '1870:historical',
      status: 'seed',
    };
    const events1870 = [
      {
        id: '1870:event-sedan',
        title: 'Sedan',
        at: '1870-09-01T12:00:00Z',
        kind: 'battle',
        significance: 'major',
        place: 'place:meaux',
        summary: 'Encirclement.',
        links: { people: ['person:kluck'] },
        sources: [{ source: 'source:herwig-2009' }],
      },
    ];
    const links1870 = [
      {
        id: '1870:link-sedan-to-1914',
        from: '1870:event-sedan',
        to: '1914:marne',
        relation: 'shaped',
        claim: 'The encirclement at Sedan became the model the 1914 plan tried to repeat.',
        confidence: 'medium',
        evidence: [{ source: 'source:zuber-2002' }],
      },
    ];
    raw.packs.push({
      dir: '1870-sedan-campaign',
      pack: { path: 'eras/1870-sedan-campaign/pack.json', data: pack1870 },
      collections: {
        'events.json': { path: 'eras/1870-sedan-campaign/events.json', data: events1870 },
        'links.json': { path: 'eras/1870-sedan-campaign/links.json', data: links1870 },
      },
      beats: [],
    });
    (raw.threads[0]!.data as { steps: unknown[] }).steps.push({
      pack: '1870:sedan-campaign',
      at: '1870-09-01T12:00:00Z',
      note: 'Back to the model.',
    });
    const ok = validateContent(raw);
    expect(messages(ok)).toEqual([]);
    expect(ok.counts['pack']).toBe(2);

    // a dangling cross-pack target fails, as does a duplicate idPrefix
    (links1870[0] as { to: string }).to = '1914:ghost';
    (pack1870 as { idPrefix: string }).idPrefix = '1914';
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(expect.stringMatching(/to 1914:ghost does not exist/));
    expect(msgs).toContainEqual(expect.stringMatching(/idPrefix "1914" is also used by/));
  });

  it('accepts a colorized image that points at its original and refuses one without licence or credit', () => {
    const raw = fixture();
    raw.shared.media.push({
      path: 'shared/media/people/kluck/media.json',
      data: {
        id: 'media:person/kluck/portrait-colorized',
        person: 'person:kluck',
        file: 'portrait-colorized.png',
        width: 1070,
        height: 1470,
        colorized: true,
        original: {
          photographer: 'unknown',
          date: 'c. 1914',
          archive: 'Library of Congress, Bain News Service',
          archive_url: 'https://www.loc.gov/item/2014697553/',
          licence: 'public domain (no known restrictions)',
        },
        colorization: {
          author: 'Sandtable',
          method: 'AI-assisted colorization from the public-domain original, 2026',
          licence: 'Sandtable project licence; underlying photograph public domain',
          status: 'ok — label colorized (AI-assisted)',
        },
        content_policy: 'ok — portrait, no gore',
        caption:
          'Alexander von Kluck, c. 1914. Colorized (AI-assisted) from a public-domain photograph.',
        credit:
          'Original: Library of Congress, Bain News Service; public domain. Colorization: Sandtable, AI-assisted, 2026.',
        focal_point: { x: 0.5, y: 0.3 },
      },
    });
    const ok = validateContent(raw);
    expect(messages(ok)).toEqual([]);
    expect(ok.content.shared.media.at(-1)?.original.archive_url).toBe(
      'https://www.loc.gov/item/2014697553/',
    );

    (
      raw.shared.media.at(-1)!.data as { original: { licence?: string }; credit?: string }
    ).original.licence = '';
    delete (raw.shared.media.at(-1)!.data as { credit?: string }).credit;
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(expect.stringMatching(/original\.licence/));
    expect(msgs).toContainEqual(expect.stringMatching(/credit/));
  });
});
