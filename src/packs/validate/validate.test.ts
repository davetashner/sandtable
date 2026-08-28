import { describe, expect, it } from 'vitest';
import { registryFileName, type SharedRegistryDir } from '../schema/files.js';
import type { RawContent, RawFile } from './tree.js';
import { validateContent } from './validate.js';

/**
 * One shared entity in its own file, the way `content/shared/` holds them
 * (ADR 0022) — the file is named for the id, which is a rule the validator
 * checks, so a fixture that made one up would be testing the wrong thing.
 */
function entity(dir: SharedRegistryDir, data: { id: string } & Record<string, unknown>): RawFile {
  return { path: `shared/${dir}/${registryFileName(data.id)}`, data };
}

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
      registries: {
        people: [
          entity('people', {
            id: 'person:kluck',
            name: 'Alexander von Kluck',
            summary: 'Commander of the 1st Army.',
          }),
        ],
        places: [
          entity('places', {
            id: 'place:meaux',
            name: 'Meaux',
            kind: 'town',
            lngLat: [2.88, 48.96],
          }),
        ],
        sources: [
          entity('sources', {
            id: 'source:herwig-2009',
            kind: 'book',
            tier: 'study',
            title: 'The Marne, 1914',
            author: 'Herwig, Holger H.',
            year: 2009,
          }),
          entity('sources', {
            id: 'source:zuber-2002',
            kind: 'book',
            tier: 'study',
            title: 'Inventing the Schlieffen Plan',
            author: 'Zuber, Terence',
            year: 2002,
          }),
        ],
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
      expect.stringMatching(
        /opening\.lede footnote \[\^nobody\] is not one of the entity's sources/,
      ),
    );
    expect(report.warnings.map((w) => w.message)).toContainEqual(
      expect.stringMatching(/opening\.camera\.center is outside the pack region/),
    );
  });

  // sand-lry.22: `[west, south, east, north]` with west > east is how a box
  // says it crosses the antimeridian. The check that used to enforce
  // `west < east` made every Pacific zoom-in unwritable.
  describe('a region that crosses the antimeridian', () => {
    /** The fixture moved into the central Pacific, pack and zoom-in together. */
    const inThePacific = (battleRegion: unknown) => {
      const raw = fixture();
      const pack = raw.packs[0]!.pack.data as Record<string, unknown>;
      pack['region'] = [99, -12, -155, 52];
      pack['camera'] = { center: [-175, 30], zoom: 2.6 };
      pack['opening'] = {
        headline: ['Sunday, 7 December 1941.'],
        lede: 'Two clocks.',
        camera: { center: [-157.96, 21.4], zoom: 7 },
      };
      const battles = raw.packs[0]!.collections['battles.json']!.data as Record<string, unknown>[];
      battles[0]!['region'] = battleRegion;
      battles[0]!['camera'] = { center: [180, 28.2], zoom: 11 };
      const formations = raw.packs[0]!.collections['formations.json']!.data as Record<
        string,
        unknown
      >[];
      formations[0]!['concentration'] = {
        area: 'Hitokappu Bay',
        position: [147.672, 44.965],
        asOf: '1914-08-02T00:00:00Z',
        sources: [{ source: 'source:herwig-2009' }],
      };
      return raw;
    };

    it('accepts a zoom-in a fifth of a degree wide that straddles 180°', () => {
      const report = validateContent(inThePacific([179.95, 28.1, -179.95, 28.3]));
      expect(messages(report)).toEqual([]);
      expect(report.ok).toBe(true);
    });

    it('still rejects a region with no width or no height', () => {
      expect(
        validateContent(inThePacific([180, 28.1, 180, 28.3])).errors.map((e) => e.message),
      ).toContainEqual(expect.stringMatching(/region must be \[west, south, east, north\]/));
      expect(
        validateContent(inThePacific([179.95, 28.3, -179.95, 28.1])).errors.map((e) => e.message),
      ).toContainEqual(expect.stringMatching(/region must be \[west, south, east, north\]/));
    });

    it('reads a position on either side of the date line as inside the region', () => {
      const report = validateContent(inThePacific([179.95, 28.1, -179.95, 28.3]));
      expect(report.warnings.map((w) => w.message)).not.toContainEqual(
        expect.stringMatching(/is outside the pack region/),
      );
    });

    it('still notices a position that really is outside a crossing region', () => {
      const raw = inThePacific([179.95, 28.1, -179.95, 28.3]);
      const formations = raw.packs[0]!.collections['formations.json']!.data as Record<
        string,
        unknown
      >[];
      // Berlin: on the far side of the world, and inside the box only if you
      // read [99, -155] as a minimum and a maximum.
      (formations[0]!['concentration'] as Record<string, unknown>)['position'] = [13.4, 52.5];
      expect(validateContent(raw).warnings.map((w) => w.message)).toContainEqual(
        expect.stringMatching(
          /concentration\.position \[13\.4, 52\.5\] is outside the pack region/,
        ),
      );
    });
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

  it('lets a pack declare the pace its own technology made (ADR 0020)', () => {
    const raw = fixture();
    const routes = raw.packs[0]!.collections['routes.json']!.data as Record<string, unknown>[];
    // an ocean crossing of 1,000 km in a day: past the 1914 sea limit, well
    // inside a 1942 task force's
    routes[2]!['mode'] = 'sea';
    routes[2]!['waypoints'] = [
      [2.3, 49.89, '1914-08-26T00:00:00Z'],
      [16.26, 49.89, '1914-08-27T00:00:00Z'],
    ];
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/beyond sea at the default 1914 pace.*declare pack\.json#pace\.sea/s),
    );

    const pack = raw.packs[0]!.pack.data as Record<string, unknown>;
    pack['pace'] = {
      sea: {
        sustained: 46,
        limit: 61,
        note: 'Fast carrier task force, 25–33 knots.',
        sources: [{ source: 'source:herwig-2009' }],
      },
    };
    const report = validateContent(raw);
    expect(messages(report)).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('holds a declared band to its citations, its own order and the ceiling (ADR 0020)', () => {
    const raw = fixture();
    const pack = raw.packs[0]!.pack.data as Record<string, unknown>;
    pack['pace'] = {
      sea: {
        sustained: 46,
        limit: 61,
        note: 'Fast carrier task force.',
        sources: [{ source: 'source:missing' }],
      },
      march: {
        sustained: 40,
        limit: 80,
        note: 'Makes the teleporting army validate.',
        sources: [{ source: 'source:herwig-2009' }],
      },
      rail: {
        sustained: 60,
        limit: 30,
        note: 'The bars the wrong way round.',
        sources: [{ source: 'source:herwig-2009' }],
      },
    };
    const report = validateContent(raw);
    const errs = report.errors.map((e) => e.message);
    expect(errs).toContainEqual(
      expect.stringMatching(/pace\.sea\.sources: citation source:missing does not exist/),
    );
    // the declaration is not an off switch for the check it belongs to
    expect(errs).toContainEqual(
      expect.stringMatching(/pace\.march\.sustained of 40 km\/h is beyond what march has ever/),
    );
    expect(errs).toContainEqual(
      expect.stringMatching(/pace\.march\.limit of 80 km\/h is beyond what march has ever/),
    );
    expect(errs).toContainEqual(
      expect.stringMatching(/pace\.rail: sustained must not exceed limit/),
    );
    // nothing in this pack goes to sea, so the band judges nothing
    expect(report.warnings.map((w) => w.message)).toContainEqual(
      expect.stringMatching(
        /pace\.sea is declared but no route or track in this pack moves by sea/,
      ),
    );
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

  it('tells an author what a missing source tier means, in the standard’s own terms', () => {
    // A source is added by whoever is writing content, in the PR that first
    // cites it, and every PR after this one will add sources. The message they
    // see has to ask the question `docs/sources.md` asks (sand-shn.5).
    const raw = fixture();
    const first = raw.shared.registries.sources[0]!;
    delete (first.data as Record<string, unknown>).tier;
    const report = validateContent(raw);
    expect(report.ok).toBe(false);
    // The problem names the work's own file, which is the one the author opens.
    expect(report.errors[0]?.path).toBe('shared/sources/herwig-2009.json');
    expect(report.errors[0]?.message).toMatch(/tier: a source must say where it stands/);
    expect(report.errors[0]?.message).toMatch(/docs\/sources\.md/);
  });

  it('refuses a registry file that does not hold the entity its name promises', () => {
    // The file name is the id (ADR 0022), and that is what makes a directory
    // listing and an id index the same thing. A half-finished rename would
    // otherwise leave a registry nobody could look anything up in by hand.
    const raw = fixture();
    raw.shared.registries.sources[0]!.path = 'shared/sources/herwig-2010.json';
    const report = validateContent(raw);
    expect(report.ok).toBe(false);
    expect(messages(report)).toContainEqual(
      'source:herwig-2009: source:herwig-2009 belongs in shared/sources/herwig-2009.json',
    );
  });

  it('warns about a source in the registry that nothing cites', () => {
    // The bibliography is generated from the citations, so such an entry is
    // not a spare row on a list — it is a work no reader will ever see.
    const raw = fixture();
    raw.shared.registries.sources.push(
      entity('sources', {
        id: 'source:unread-1999',
        kind: 'book',
        tier: 'general',
        title: 'A Book Nobody Opened',
      }),
    );
    const report = validateContent(raw);
    expect(report.ok).toBe(true);
    expect(report.warnings.map((w) => `${w.id}: ${w.message}`)).toContainEqual(
      expect.stringMatching(/source:unread-1999: nothing cites this source/),
    );
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

  it('holds every route leg to the pace of its mode, and takes the mode at its word', () => {
    const withRoute = (over: Record<string, unknown>) => {
      const raw = fixture();
      const r = raw.packs[0]!.collections['routes.json']!.data as Record<string, unknown>[];
      Object.assign(r[2]!, over);
      return validateContent(raw);
    };
    // Nancy to Picardy in four days: no army walked that, whatever the route says
    const acrossFrance = [
      [6.4, 48.78, '1914-09-17T12:00:00Z'],
      [2.3, 49.9, '1914-09-21T12:00:00Z'],
    ];
    expect(messages(withRoute({ waypoints: acrossFrance }))).toContainEqual(
      expect.stringMatching(/waypoints\[1\] covers 322 km in 96 h \(81 km\/day\) — beyond march/),
    );
    // …and by train it is unremarkable
    const byRail = withRoute({ waypoints: acrossFrance, mode: 'rail' });
    expect(messages(byRail)).toEqual([]);
    expect(byRail.warnings.filter((w) => /km\/day/.test(w.message))).toHaveLength(0);

    // A staff car covers in two hours what a corps needs two days for
    const drive = [
      [6.13, 49.61, '1914-09-08T11:00:00Z'],
      [5.04, 49.23, '1914-09-08T13:00:00Z'],
    ];
    expect(messages(withRoute({ waypoints: drive }))).toContainEqual(
      expect.stringMatching(/beyond march/),
    );
    expect(messages(withRoute({ waypoints: drive, mode: 'motor' }))).toEqual([]);

    // Between the two bars: a hard march is a warning, not an error — the
    // IX Reserve Corps really did run for the Ourcq.
    const forced = withRoute({
      waypoints: [
        [4.3, 50.95, '1914-09-05T12:00:00Z'],
        [3.55, 50.5, '1914-09-06T12:00:00Z'],
      ],
    });
    expect(messages(forced)).toEqual([]);
    expect(forced.warnings.map((w) => w.message)).toContainEqual(
      expect.stringMatching(/faster than march sustained/),
    );
  });

  it('requires a formation’s route legs to meet, and reads an unmarked track as road travel', () => {
    const raw = fixture();
    const r = raw.packs[0]!.collections['routes.json']!.data as Record<string, unknown>[];
    const secondLeg = {
      id: '1914:route-fr-6-later',
      formation: '1914:army-fr-6',
      waypoints: [
        [3.5, 48.5, '1914-09-08T06:00:00Z'],
        [3.6, 48.6, '1914-09-10T06:00:00Z'],
      ],
      sources: [{ source: 'source:herwig-2009' }],
    };
    r.push(secondLeg);
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/does not join 1914:route-fr-6, the previous leg/),
    );
    // joined to where and when the first leg ended, the two are one route
    secondLeg.waypoints[0] = [2.88, 48.96, '1914-09-05T06:00:00Z'];
    expect(messages(validateContent(raw))).toEqual([]);

    // A commander's track is never a march: unmarked, it is read as a car.
    const withTrack = (over: Record<string, unknown>) => {
      const tree = fixture();
      tree.packs[0]!.collections['tracks.json'] = {
        path: 'eras/1914-test/tracks.json',
        data: [
          {
            id: '1914:track-joffre-melun',
            person: 'person:kluck',
            kind: 'journey',
            waypoints: [
              [4.71, 48.23, '1914-09-05T09:00:00Z'],
              [2.66, 48.54, '1914-09-05T14:00:00Z'],
            ],
            derivation: 'The drive to Melun.',
            sources: [{ source: 'source:herwig-2009' }],
            ...over,
          },
        ],
      };
      return validateContent(tree);
    };
    expect(messages(withTrack({}))).toEqual([]);
    expect(messages(withTrack({ mode: 'march' }))).toContainEqual(
      expect.stringMatching(/beyond march/),
    );
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
    raw.shared.registries.sources.push(
      entity('sources', {
        id: 'source:wikipedia-en',
        kind: 'web',
        title: 'Wikipedia (English)',
        author: 'Wikipedia contributors',
        year: 2026,
      }),
    );
    const routes = raw.packs[0]!.collections['routes.json']!.data as { sources: unknown[] }[];
    routes[0]!.sources = [{ source: 'source:wikipedia-en' }];
    const person = raw.shared.registries.people[0]!.data as { sources?: unknown[] };
    person.sources = [{ source: 'source:wikipedia-en', note: 'dates' }];
    const place = raw.shared.registries.places[0]!.data as { sources?: unknown[] };
    place.sources = [{ source: 'source:wikipedia-en', note: 'coordinates' }];

    const report = validateContent(raw);
    const warned = report.warnings.filter((w) => w.message.includes('reference data only'));
    expect(warned).toHaveLength(1);
    expect(warned[0]!.path).toMatch(/routes\.json$/);
    // …and it is a warning, not an error: the standard admits the pointer
    // until a better reference replaces it.
    expect(report.errors.filter((e) => e.message.includes('reference data only'))).toHaveLength(0);
  });

  it('checks a beat diagram: the file is in the pack, and it is a drawing not a program', () => {
    // The SVG is inlined so it can use the design tokens (sand-1l0.33), which
    // means anything in it runs. That is caught here, not in review.
    const withDiagram = (file: string) => {
      const raw = fixture();
      const beat = raw.packs[0]!.beats[0]!;
      beat.data = (beat.data as string).replace(
        /^sources:/m,
        `diagram:\n  file: ${file}\n  caption: What it shows.\n  alt: A schematic.\nsources:`,
      );
      return raw;
    };

    const missing = messages(validateContent(withDiagram('nope')));
    expect(missing).toContainEqual(
      expect.stringMatching(/diagram\.file "nope\.svg" is not in the pack's diagrams\//),
    );

    const withScript = withDiagram('plan');
    withScript.packs[0]!.diagrams = [
      {
        path: 'eras/1914-test/diagrams/plan.svg',
        data: '<svg viewBox="0 0 10 10"><script>fetch("//evil")</script></svg>',
      },
    ];
    expect(messages(validateContent(withScript))).toContainEqual(
      expect.stringMatching(/carries a script or an inline event handler/),
    );

    const withHandler = withDiagram('plan');
    withHandler.packs[0]!.diagrams = [
      {
        path: 'eras/1914-test/diagrams/plan.svg',
        data: '<svg viewBox="0 0 10 10"><rect onclick="steal()" /></svg>',
      },
    ];
    expect(messages(validateContent(withHandler))).toContainEqual(
      expect.stringMatching(/carries a script or an inline event handler/),
    );

    const good = withDiagram('plan');
    good.packs[0]!.diagrams = [
      {
        path: 'eras/1914-test/diagrams/plan.svg',
        data: '<svg viewBox="0 0 10 10"><rect fill="var(--army-1)" /></svg>',
      },
    ];
    const report = validateContent(good);
    expect(report.errors.filter((e) => e.message.includes('diagram'))).toHaveLength(0);

    // …and one that cannot scale is worth saying, without blocking.
    const noViewBox = withDiagram('plan');
    noViewBox.packs[0]!.diagrams = [
      { path: 'eras/1914-test/diagrams/plan.svg', data: '<svg><rect /></svg>' },
    ];
    expect(validateContent(noViewBox).warnings.map((w) => w.message)).toContainEqual(
      expect.stringMatching(/has no viewBox/),
    );
  });

  it('checks commander tracks: one headquarters per man, ordered waypoints, in range', () => {
    const track = (over: Record<string, unknown> = {}) => ({
      id: '1914:track-kluck-hq',
      person: 'person:kluck',
      kind: 'hq',
      post: '1. Armee',
      postShort: '1. Armee',
      waypoints: [
        [4.0, 50.0, '1914-08-10T00:00:00Z'],
        [4.5, 49.5, '1914-08-20T00:00:00Z'],
      ],
      confidence: 'medium',
      derivation: 'Army headquarters day by day.',
      sources: [{ source: 'source:herwig-2009' }],
      ...over,
    });
    const withTracks = (data: unknown[]) => {
      const raw = fixture();
      raw.packs[0]!.collections['tracks.json'] = {
        path: 'eras/1914-test/tracks.json',
        data,
      };
      return raw;
    };

    expect(messages(validateContent(withTracks([track()])))).not.toContainEqual(
      expect.stringMatching(/track/),
    );

    // A commander runs one headquarters at a time.
    const twoHq = messages(
      validateContent(withTracks([track(), track({ id: '1914:track-kluck-hq-2' })])),
    );
    expect(twoHq).toContainEqual(expect.stringMatching(/already has an hq track/));

    // …but as many documented journeys as the sources give.
    const hqAndJourney = validateContent(
      withTracks([
        track(),
        track({
          id: '1914:track-kluck-drive',
          kind: 'journey',
          post: undefined,
          postShort: undefined,
        }),
      ]),
    );
    expect(hqAndJourney.errors.filter((e) => e.message.includes('hq track'))).toHaveLength(0);

    // An hq has to say which headquarters it is.
    expect(
      messages(validateContent(withTracks([track({ post: undefined, postShort: undefined })]))),
    ).toContainEqual(expect.stringMatching(/hq track must name the post/));

    // Waypoints run forward, and inside the pack.
    expect(
      messages(
        validateContent(
          withTracks([
            track({
              waypoints: [
                [4.0, 50.0, '1914-08-20T00:00:00Z'],
                [4.5, 49.5, '1914-08-10T00:00:00Z'],
              ],
            }),
          ]),
        ),
      ),
    ).toContainEqual(expect.stringMatching(/waypoints\[1\] is not later/));
    expect(
      messages(
        validateContent(
          withTracks([
            track({
              waypoints: [
                [4.0, 50.0, '1913-08-10T00:00:00Z'],
                [4.5, 49.5, '1914-08-20T00:00:00Z'],
              ],
            }),
          ]),
        ),
      ),
    ).toContainEqual(expect.stringMatching(/outside the pack timeRange/));

    // The man has to exist.
    expect(
      messages(validateContent(withTracks([track({ person: 'person:nobody' })]))),
    ).toContainEqual(expect.stringMatching(/person:nobody/));
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
    // A used_by that resolves to nothing is an error, not a backlog item: it is
    // the one way a picture claims a beat from outside, so a stale entry hides
    // a double claim (ADR 0012, ADR 0014).
    expect(report.errors.map((e) => e.message)).toContainEqual(
      expect.stringMatching(/used_by 1914:beat-missing does not exist/),
    );
    expect(report.warnings.map((w) => w.message)).not.toContainEqual(
      expect.stringMatching(/used_by 1914:beat-missing/),
    );
  });

  it('holds a beat to one picture: no second claim on it, and none dropped into the prose', () => {
    const raw = fixture();
    const manifest = (slug: string) => ({
      path: `shared/media/scenes/${slug}/media.json`,
      data: {
        id: `media:scene/${slug}/photo`,
        file: 'photo.png',
        width: 100,
        height: 100,
        colorized: false,
        original: { licence: 'public domain', archive_url: 'https://example.org/item' },
        content_policy: 'ok',
        caption: 'A photograph.',
        credit: 'Somebody; public domain.',
        used_by: ['1914:beat-1'],
      },
    });
    raw.shared.media.push(manifest('a'), manifest('b'));
    const msgs = messages(validateContent(raw));
    expect(msgs).toContainEqual(
      expect.stringMatching(/2 images claim this beat as a placement .* one hero image/),
    );

    // …and the other way a second picture arrives: straight into the Markdown,
    // where it would carry neither caption nor credit (ADR 0007, ADR 0012).
    const clean = fixture();
    const first = clean.packs[0]!.beats[0]!;
    first.data = `${first.data as string}\n![A photograph](/assets/media/x.png)\n`;
    expect(messages(validateContent(clean))).toContainEqual(
      expect.stringMatching(/body embeds an image/),
    );
  });

  // A card may hold a bounded comparison — four armies' kit, one army's four
  // weapons — where a beat still holds one picture (ADR 0014).
  describe('what a level’s window means (ADR 0015)', () => {
    /** A routeless chapter, and the beat that lives in it. */
    const withChapter = (
      chapter: Record<string, unknown>,
      beatFrom = '1915-11-25T00:00:00Z',
      beatTo = '1915-11-26T00:00:00Z',
    ) => {
      const raw = fixture();
      const battles = raw.packs[0]!.collections['battles.json']!.data as Record<string, unknown>[];
      battles.push({
        id: '1914:epilogue',
        title: 'Meanwhile, 1915–1919',
        region: [2, 47, 8, 51],
        camera: { center: [4.5, 49.5], zoom: 6 },
        summary: 'An epilogue.',
        sources: [{ source: 'source:herwig-2009' }],
        ...chapter,
      });
      raw.packs[0]!.beats.push({
        path: 'eras/1914-test/beats/90.md',
        data:
          `---\nid: 1914:beat-epilogue\ntitle: Epilogue\ndateLabel: '1915'\n` +
          `from: ${beatFrom}\nto: ${beatTo}\nfocus: 1914:epilogue\n` +
          `sources:\n  - source: source:herwig-2009\n---\nBody text.[^herwig-2009]\n`,
      });
      return raw;
    };
    const errs = (raw: RawContent) => validateContent(raw).errors.map((e) => e.message);

    it('accepts a chapter that declares its window is outside the campaign, and its beats with it', () => {
      const report = validateContent(
        withChapter({
          timeRange: { start: '1915-01-01T00:00:00Z', end: '1919-12-31T00:00:00Z' },
          window: 'outside',
        }),
      );
      expect(messages(report)).toEqual([]);
      expect(report.ok).toBe(true);
    });

    it('still refuses a window outside the pack that says nothing about itself', () => {
      expect(
        errs(
          withChapter({
            timeRange: { start: '1915-01-01T00:00:00Z', end: '1919-12-31T00:00:00Z' },
          }),
        ),
      ).toContainEqual(expect.stringMatching(/battle timeRange is outside the pack timeRange/));
    });

    it('refuses "outside" when the window is inside the campaign after all', () => {
      expect(
        errs(
          withChapter(
            {
              timeRange: { start: '1914-09-05T00:00:00Z', end: '1914-09-12T00:00:00Z' },
              window: 'outside',
            },
            '1914-09-06T00:00:00Z',
            '1914-09-07T00:00:00Z',
          ),
        ),
      ).toContainEqual(expect.stringMatching(/window "outside" but the timeRange is inside/));
    });

    it('refuses "outside" on a level that brings routes: it is for chapters', () => {
      expect(
        errs(
          withChapter({
            timeRange: { start: '1915-01-01T00:00:00Z', end: '1919-12-31T00:00:00Z' },
            window: 'outside',
            formations: [{ id: '1914:epi-corps', name: 'A corps', side: 'de', kind: 'corps' }],
            routes: [
              {
                id: '1914:epi-route',
                formation: '1914:epi-corps',
                waypoints: [
                  [4, 49, '1915-01-02T00:00:00Z'],
                  [4.1, 49.1, '1915-01-03T00:00:00Z'],
                ],
                sources: [{ source: 'source:herwig-2009' }],
              },
            ],
          }),
        ),
      ).toContainEqual(expect.stringMatching(/window "outside" is for chapters/));
    });

    it('holds an "outside" chapter’s beats to that chapter’s window, not the pack’s', () => {
      expect(
        errs(
          withChapter(
            {
              timeRange: { start: '1915-01-01T00:00:00Z', end: '1919-12-31T00:00:00Z' },
              window: 'outside',
            },
            '1922-01-01T00:00:00Z',
            '1922-01-02T00:00:00Z',
          ),
        ),
      ).toContainEqual(
        expect.stringMatching(/beat from\/to is outside the timeRange of 1914:epilogue/),
      );
    });

    it('accepts "placed": a chapter parked on the campaign strip', () => {
      const report = validateContent(
        withChapter(
          {
            timeRange: { start: '1914-08-01T00:00:00Z', end: '1914-08-02T00:00:00Z' },
            window: 'placed',
          },
          '1914-08-01T00:00:00Z',
          '1914-08-01T06:00:00Z',
        ),
      );
      expect(messages(report)).toEqual([]);
    });
  });

  describe('plate sets', () => {
    /** A content tree with four usable manifests and a tech card to hang them on. */
    const withPlates = (plates: unknown) => {
      const raw = fixture();
      for (const slug of ['helmet', 'rifle', 'machine-gun', 'field-gun', 'spare']) {
        raw.shared.media.push({
          path: `shared/media/kit/${slug}/media.json`,
          data: {
            id: `media:kit/${slug}/photo`,
            file: 'photo.png',
            width: 900,
            height: 600,
            colorized: false,
            original: { licence: 'public domain', archive_url: 'https://example.org/item' },
            content_policy: 'ok',
            caption: 'A photograph.',
            credit: 'Somebody; public domain.',
          },
        });
      }
      raw.packs[0]!.collections['tech.json'] = {
        path: 'eras/1914-test/tech.json',
        data: [
          {
            id: '1914:tech-kit',
            title: 'What the German soldier carried',
            field: 'small-arms',
            introduced: { label: 'August 1914' },
            summary: 'Headgear, rifle, machine gun, field gun.',
            plates,
            sources: [{ source: 'source:herwig-2009' }],
          },
        ],
      };
      return raw;
    };

    const item = (slug: string, label: string) => ({ media: `media:kit/${slug}/photo`, label });
    const four = [
      item('helmet', 'Pickelhaube'),
      item('rifle', 'Gewehr 98'),
      item('machine-gun', 'MG 08'),
      item('field-gun', '7.7 cm FK 96'),
    ];

    it('accepts a set at the cap: four plates, one axis, one crop', () => {
      const report = validateContent(
        withPlates({ axis: 'German kit, August 1914', fit: 'portrait', items: four }),
      );
      expect(messages(report)).toEqual([]);
    });

    it('holds the set to between two and four pictures', () => {
      const tooMany = messages(
        validateContent(withPlates({ axis: 'Kit', items: [...four, item('spare', 'Bayonet')] })),
      );
      expect(tooMany).toContainEqual(expect.stringMatching(/at most 4 pictures/));

      const tooFew = messages(
        validateContent(withPlates({ axis: 'Kit', items: [item('helmet', 'Pickelhaube')] })),
      );
      expect(tooFew).toContainEqual(expect.stringMatching(/a set of one is a plate/));
    });

    it('refuses the two ways a set stops comparing: one picture twice, one label twice', () => {
      const twice = messages(
        validateContent(
          withPlates({
            axis: 'Kit',
            items: [item('helmet', 'Pickelhaube'), item('helmet', 'Helmet')],
          }),
        ),
      );
      expect(twice).toContainEqual(expect.stringMatching(/media:kit\/helmet\/photo appears twice/));

      const sameLabel = messages(
        validateContent(
          withPlates({
            axis: 'Kit',
            items: [item('helmet', 'Pickelhaube'), item('rifle', ' pickelhaube ')],
          }),
        ),
      );
      expect(sameLabel).toContainEqual(expect.stringMatching(/two plates are labelled/));
    });

    it('resolves every plate against the media registry', () => {
      const msgs = messages(
        validateContent(
          withPlates({
            axis: 'Kit',
            items: [
              item('helmet', 'Pickelhaube'),
              { media: 'media:kit/nothing/photo', label: 'Ghost' },
            ],
          }),
        ),
      );
      expect(msgs).toContainEqual(
        expect.stringMatching(/plates\.items\[1\]\.media media:kit\/nothing\/photo does not exist/),
      );
    });

    it('offers only the two cropped fits — a shared frame is the comparison', () => {
      const msgs = messages(
        validateContent(withPlates({ axis: 'Kit', fit: 'contain', items: four })),
      );
      expect(msgs).toContainEqual(expect.stringMatching(/plates\.fit/));
    });

    it('applies the same rule to a formation, which is where the kit cards will hang', () => {
      const raw = withPlates({ axis: 'German kit, August 1914', items: four });
      delete raw.packs[0]!.collections['tech.json'];
      const formations = raw.packs[0]!.collections['formations.json']!.data as Record<
        string,
        unknown
      >[];
      formations[0]!['plates'] = { axis: 'Kit', items: [item('helmet', 'A'), item('helmet', 'B')] };
      expect(messages(validateContent(raw))).toContainEqual(
        expect.stringMatching(/1914:army-de-1: plates: media:kit\/helmet\/photo appears twice/),
      );
    });
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
  /**
   * A contested point carried as an entity (ADR 0017). The schema holds the
   * floor of two positions; the validator holds the part a schema cannot say —
   * that the two are actually two.
   */
  describe('contested points', () => {
    const point = (positions: unknown, rest: Record<string, unknown> = {}) => {
      const raw = fixture();
      raw.packs[0]!.collections['historiography.json'] = {
        path: 'eras/1914-test/historiography.json',
        data: [
          {
            id: '1914:historiography-hentsch-authority',
            title: 'What authority did he carry?',
            question: 'A question, and it stays one.',
            positions,
            sources: [{ source: 'source:herwig-2009', pages: '270' }],
            ...rest,
          },
        ],
      };
      return raw;
    };
    const charge = { label: 'The charge', who: 'The First Army', summary: 'He had no power.' };
    const defence = {
      label: 'The defence',
      who: 'The 1917 inquiry',
      summary: 'He did not exceed it.',
    };

    it('accepts a point with two positions, and indexes it as its own kind', () => {
      const report = validateContent(point([charge, defence]));
      expect(messages(report)).toEqual([]);
      expect(report.counts).toMatchObject({ historiography: 1 });
    });

    it('refuses a point that carries only one position', () => {
      const msgs = messages(validateContent(point([charge])));
      expect(msgs).toContainEqual(expect.stringMatching(/a verdict in costume/));
    });

    it('refuses two positions with the same label, or the same holder', () => {
      expect(
        messages(validateContent(point([charge, { ...defence, label: 'The charge' }]))),
      ).toContainEqual(expect.stringMatching(/two positions are labelled "The charge"/));
      expect(
        messages(validateContent(point([charge, { ...defence, who: 'The First Army' }]))),
      ).toContainEqual(expect.stringMatching(/not one side twice/));
    });

    it('holds a position’s footnotes and entity links to the point’s own sources', () => {
      const msgs = messages(
        validateContent(
          point([
            { ...charge, summary: 'He had no power.[^nobody] See [this](1914:no-such-thing).' },
            defence,
          ]),
        ),
      );
      expect(msgs).toContainEqual(
        expect.stringMatching(/positions\[0\]\.summary footnote \[\^nobody\]/),
      );
      expect(msgs).toContainEqual(
        expect.stringMatching(/positions\[0\]\.summary link 1914:no-such-thing does not exist/),
      );
    });

    /** The loop this bead closes: a `used_by` that names a card that now exists. */
    it('lets a media manifest name a contested point in used_by', () => {
      const raw = point([charge, defence]);
      raw.shared.media.push({
        path: 'shared/media/people/hentsch/media.json',
        data: {
          id: 'media:person/hentsch/portrait',
          file: 'portrait.png',
          width: 900,
          height: 1200,
          colorized: false,
          original: { licence: 'public domain', archive_url: 'https://example.org/item' },
          content_policy: 'ok',
          caption: 'A portrait.',
          credit: 'Somebody; public domain.',
          used_by: ['1914:historiography-hentsch-authority'],
        },
      });
      expect(messages(validateContent(raw))).toEqual([]);
    });

    it('lets any entity point at one through links.historiography, and refuses a dangling one', () => {
      const raw = point([charge, defence]);
      const events = raw.packs[0]!.collections['events.json']!.data as Record<string, unknown>[];
      (events[0]!['links'] as Record<string, unknown>)['historiography'] = [
        '1914:historiography-hentsch-authority',
      ];
      expect(messages(validateContent(raw))).toEqual([]);

      (events[0]!['links'] as Record<string, unknown>)['historiography'] = [
        '1914:historiography-nope',
      ];
      expect(messages(validateContent(raw))).toContainEqual(
        expect.stringMatching(/links\.historiography 1914:historiography-nope does not exist/),
      );
    });
  });
});

/**
 * ADR 0021. The gate is one field wide, so these tests are mostly about the
 * receipt itself — and about the two rules the incidents of 27–28 August 2026
 * paid for: a context that does not contain the quotation is not evidence, and
 * a retrieval that would not repeat itself buys no page number.
 */
describe('quotation receipts', () => {
  const CONTEXT =
    'Order to: Carrier Striking Task Force. The Carrier Striking Task Force will immediately ' +
    'complete taking on supplies and depart with utmost secrecy from Hitokappu Bay on ' +
    '26 November and advance to the standby point (42 N, 170 W) by the evening of 3 December.';
  const EXCERPT = '… depart with utmost secrecy from Hitokappu Bay on 26 November …';

  /** A pack with one document, and whatever receipts the test wants. */
  function withDocument(receipts: unknown[], backlog?: string, excerpt = EXCERPT): RawContent {
    const raw = fixture();
    raw.packs[0]!.collections['documents.json'] = {
      path: 'eras/1914-test/documents.json',
      data: [
        {
          id: '1914:document-order',
          title: 'Operations Order No. 5',
          date: '1914-08-20',
          author: 'Yamamoto, Isoroku',
          kind: 'order',
          excerpt,
          sources: [{ source: 'source:herwig-2009' }],
        },
      ],
    };
    if (receipts.length) raw.receipts = [{ path: 'receipts/1914-test.json', data: receipts }];
    if (backlog !== undefined) raw.receiptBacklog = { path: 'receipts/backlog.txt', data: backlog };
    return raw;
  }

  const receipt = (over: Record<string, unknown> = {}) => ({
    id: 'receipt:order-secrecy',
    quote: EXCERPT,
    source: 'source:herwig-2009',
    usedIn: ['1914:document-order'],
    how: 'fetch',
    url: 'https://example.test/monograph.html',
    checkedAt: '2026-08-28',
    checkedBy: 'A reviewer',
    context: CONTEXT,
    repeat: 'agreed',
    ...over,
  });

  it('demands a receipt for every document excerpt, and takes one', () => {
    expect(messages(validateContent(withDocument([])))).toContainEqual(
      expect.stringMatching(/the excerpt is a quotation and needs a verification receipt/),
    );
    expect(messages(validateContent(withDocument([receipt()])))).toEqual([]);
  });

  it('refuses a receipt whose retrieved text does not contain the quotation', () => {
    const raw = withDocument([receipt({ quote: 'depart at once for the Marshall Islands' })]);
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/context does not contain the quotation/),
    );
  });

  it('refuses a page number taken from a retrieval that would not repeat itself', () => {
    const raw = withDocument([
      receipt({
        repeat: 'differed',
        note: 'the page marker moved 196/197 → 195/196',
        pages: '196',
      }),
    ]);
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/repeat: "differed" and a page number cannot both be true/),
    );
  });

  it('makes a read receipt name the copy nothing else can open', () => {
    const raw = withDocument([receipt({ how: 'read', url: undefined })]);
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/how: "read" needs `copy`/),
    );
  });

  it('notices when the content drifts away from the receipt', () => {
    // The receipt still shows the passage in the source; the document no longer
    // carries it. That is the case a re-fetch would never catch.
    const raw = withDocument([receipt()], undefined, '… sail for the Marshall Islands …');
    expect(messages(validateContent(raw))).toContainEqual(
      expect.stringMatching(/no longer carries this quotation/),
    );
  });

  it('takes several receipts for passages pages apart, in the order of the operation', () => {
    const raw = withDocument(
      [
        receipt({ id: 'receipt:a', quote: 'advance to the standby point (42 N, 170 W)' }),
        receipt({ id: 'receipt:b', quote: 'depart with utmost secrecy from Hitokappu Bay' }),
      ],
      undefined,
      'advance to the standby point (42 N, 170 W) … depart with utmost secrecy from Hitokappu Bay',
    );
    expect(messages(validateContent(raw))).toEqual([]);
  });

  it('lets the backlog stand in for a receipt, and refuses to let it outlive one', () => {
    expect(messages(validateContent(withDocument([], '1914:document-order\n')))).toEqual([]);

    const both = withDocument([receipt()], '1914:document-order\n');
    expect(messages(validateContent(both))).toContainEqual(
      expect.stringMatching(/now has a receipt — delete its line/),
    );

    const rot = withDocument([receipt()], '1914:document-gone\n');
    expect(messages(validateContent(rot))).toContainEqual(
      expect.stringMatching(/is not a document in any pack — delete the line/),
    );
  });
});
