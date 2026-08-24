import { describe, expect, it } from 'vitest';
import type {
  Branch,
  Confidence,
  Formation,
  MovementMode,
  Route,
  Side,
} from '../../packs/schema/index.js';
import {
  buildMovementLayers,
  buildMovementScene,
  composeRoutes,
  modeAt,
  positionAt,
} from './movement.js';

/** A one-leg composed route: the same points as the whole path and as its only leg. */
const oneLeg = (
  points: [number, number, number][],
  mode: MovementMode = 'march',
  confidence: Confidence = 'medium',
) => {
  const confidences = points.map(() => confidence);
  return { points, confidences, legs: [{ points, confidences, mode }] };
};

const sides: Side[] = [
  { id: 'de', name: 'German Empire', alliance: 'Central Powers' },
  { id: 'fr', name: 'France', alliance: 'Entente' },
];
const formations: Formation[] = [
  { id: '1914:army-de-1', name: 'German 1st Army', short: '1. Armee', side: 'de', kind: 'army' },
  { id: '1914:army-fr-6', name: 'French 6th Army', side: 'fr', kind: 'army' },
  { id: '1914:army-de-2', name: 'German 2nd Army', side: 'de', kind: 'army' }, // no route
];
const t = (d: string) => `1914-08-${d}T12:00:00Z`;
const routes: Route[] = [
  {
    id: '1914:route-de-1',
    formation: '1914:army-de-1',
    waypoints: [
      [6, 50, t('13')],
      [4, 50, t('20')],
      [3, 49, t('26')],
    ],
    confidence: 'low',
    sources: [{ source: 'source:x' }],
  },
  {
    id: '1914:route-de-1-concept',
    formation: '1914:army-de-1',
    branch: '1914:concept',
    waypoints: [
      [2, 49.5, t('28')],
      [1.5, 48.5, t('31')],
    ],
    confidence: 'low',
    sources: [{ source: 'source:x' }],
  },
  {
    id: '1914:route-fr-6',
    formation: '1914:army-fr-6',
    waypoints: [
      [2.3, 49.9, t('27')],
      [2.9, 49, t('31')],
    ],
    confidence: 'medium',
    sources: [{ source: 'source:x' }],
  },
];
const historical: Branch = { id: '1914:historical', title: 'H', kind: 'historical', summary: 's' };
const concept: Branch = {
  id: '1914:concept',
  title: 'C',
  kind: 'counterfactual',
  divergesAt: '1914-08-25T00:00:00Z',
  summary: 's',
};

describe('composeRoutes', () => {
  it('uses the base route in the historical branch and skips formations without one', () => {
    const out = composeRoutes(routes, formations, sides, historical);
    expect(out.map((r) => r.formation.id)).toEqual(['1914:army-de-1', '1914:army-fr-6']);
    expect(out[0]!.points.length).toBe(3);
    expect(out[0]!.hypothetical).toBe(false);
  });

  it('keeps the base prefix before divergence and appends the branch tail', () => {
    const out = composeRoutes(routes, formations, sides, concept);
    const de1 = out.find((r) => r.formation.id === '1914:army-de-1')!;
    expect(de1.points.map((p) => p[0])).toEqual([6, 4, 2, 1.5]); // 26 Aug point dropped
    expect(de1.hypothetical).toBe(true);
    const fr6 = out.find((r) => r.formation.id === '1914:army-fr-6')!;
    expect(fr6.hypothetical).toBe(false);
  });
});

describe('positionAt', () => {
  const pts: [number, number, number][] = [
    [0, 0, 0],
    [2, 0, 1000],
    [2, 2, 2000],
  ];
  it('parks at the ends and interpolates between', () => {
    expect(positionAt(pts, -5)).toMatchObject({ lngLat: [0, 0], phase: 'before' });
    expect(positionAt(pts, 500)).toMatchObject({ lngLat: [1, 0], phase: 'moving' });
    expect(positionAt(pts, 1500).lngLat).toEqual([2, 1]);
    expect(positionAt(pts, 9999)).toMatchObject({ lngLat: [2, 2], phase: 'after' });
  });
  it('reports a bearing along the current segment', () => {
    expect(Math.round(positionAt(pts, 500).bearing)).toBe(90); // east
    expect(Math.round(positionAt(pts, 1500).bearing)).toBe(0); // north
  });
});

describe('buildMovementLayers', () => {
  it('builds ghost, trail, tokens and labels with per-side colours', () => {
    const composed = composeRoutes(routes, formations, sides, historical);
    const start = Date.parse('1914-08-02T00:00:00Z');
    const layers = buildMovementLayers({
      routes: composed,
      now: Date.parse(t('22')),
      rangeStart: start,
      sides,
    });
    expect(layers.map((l) => l.id)).toEqual([
      'movement-ghost',
      'movement-trail',
      'movement-approx',
      'movement-tokens',
      'movement-labels',
    ]);
    const trail = layers[1]!.props as unknown as {
      currentTime: number;
      data: { timestamps: number[] }[];
    };
    expect(trail.currentTime).toBe((Date.parse(t('22')) - start) / 1000);
    expect(trail.data[0]!.timestamps[0]).toBe((Date.parse(t('13')) - start) / 1000);
    const tokens = layers[3]!.props as unknown as {
      data: { id: string; position: [number, number]; phase: string }[];
    };
    expect(tokens.data[0]).toMatchObject({ id: '1914:army-de-1', phase: 'moving' });
    expect(tokens.data[1]).toMatchObject({ id: '1914:army-fr-6', phase: 'before' });
  });

  it('hides the token of a formation whose concentration date is still to come; shows it from then on', () => {
    const fmt = (id: string, asOf?: string) =>
      ({
        id,
        name: id,
        side: 'de',
        kind: 'army',
        ...(asOf ? { concentration: { area: 'x', asOf } } : {}),
      }) as unknown as Parameters<typeof composeRoutes>[1][number];
    const sides = [{ id: 'de', name: 'DE', alliance: 'Central Powers' }];
    const mk = (f: ReturnType<typeof fmt>) => ({
      formation: f,
      side: sides[0]!,
      ...oneLeg([
        [6, 50, Date.UTC(1914, 7, 20)],
        [5, 50, Date.UTC(1914, 7, 25)],
      ]),
      hypothetical: false,
      confidence: 'medium' as const,
    });
    const now = Date.UTC(1914, 7, 15);
    const tokensOf = (layers: ReturnType<typeof buildMovementLayers>) =>
      (
        layers.find((l) => l.id === 'movement-tokens')!.props as unknown as {
          data: { id: string }[];
        }
      ).data.map((d) => d.id);
    const routes = [
      mk(fmt('later')),
      mk(fmt('deploying', '1914-08-10')),
      mk(fmt('notyet', '1914-08-18')),
    ];
    expect(
      tokensOf(buildMovementLayers({ routes, now, rangeStart: Date.UTC(1914, 7, 2), sides })),
    ).toEqual(['later', 'deploying']);
    // a dissolved formation disappears from its dissolved date, even mid-route
    const gone = mk({ ...fmt('gone', '1914-08-10'), dissolved: '1914-08-22' } as ReturnType<
      typeof fmt
    >);
    expect(
      tokensOf(
        buildMovementLayers({
          routes: [gone],
          now: Date.UTC(1914, 7, 21),
          rangeStart: Date.UTC(1914, 7, 2),
          sides,
        }),
      ),
    ).toEqual(['gone']);
    expect(
      tokensOf(
        buildMovementLayers({
          routes: [gone],
          now: Date.UTC(1914, 7, 23),
          rangeStart: Date.UTC(1914, 7, 2),
          sides,
        }),
      ),
    ).toEqual([]);
    // once moving, every formation shows
    expect(
      tokensOf(
        buildMovementLayers({
          routes,
          now: Date.UTC(1914, 7, 22),
          rangeStart: Date.UTC(1914, 7, 2),
          sides,
        }),
      ),
    ).toEqual(['later', 'deploying', 'notyet']);
  });

  it('lays token labels out against each other when given a projection and reports their boxes', () => {
    const project = (p: [number, number]): [number, number] => [p[0] * 100, -p[1] * 100];
    const sides = [{ id: 'de', name: 'DE', alliance: 'Central Powers' }];
    const f = (id: string, kind: string) =>
      ({ id, name: id, short: id, side: 'de', kind }) as unknown as Parameters<
        typeof composeRoutes
      >[1][number];
    const mk = (fm: ReturnType<typeof f>, lng: number) => ({
      formation: fm,
      side: sides[0]!,
      ...oneLeg([
        [lng, 50, Date.UTC(1914, 7, 20)],
        [lng, 50, Date.UTC(1914, 7, 25)],
      ]),
      hypothetical: false,
      confidence: 'medium' as const,
    });
    // an army and a corps 20 px apart: the army keeps the slot above, the corps takes another
    const routes = [mk(f('1. Armee', 'army'), 6.0), mk(f('II. AK', 'corps'), 6.2)];
    const opts = { routes, now: Date.UTC(1914, 7, 22), rangeStart: Date.UTC(1914, 7, 2), sides };
    const plain = buildMovementScene(opts);
    expect(plain.labelBoxes).toEqual([]);
    const scene = buildMovementScene({ ...opts, project });
    expect(scene.labelBoxes.length).toBeGreaterThanOrEqual(4); // two dots + two labels
    const labels = scene.layers.find((l) => l.id === 'movement-labels')!.props as unknown as {
      data: { id: string }[];
      getAlignmentBaseline: (d: { id: string }) => string;
      getTextAnchor: (d: { id: string }) => string;
    };
    expect(labels.data.map((d) => d.id)).toEqual(['1. Armee', 'II. AK']);
    expect(labels.getAlignmentBaseline({ id: '1. Armee' })).toBe('bottom');
    expect(
      labels.getAlignmentBaseline({ id: 'II. AK' }) + labels.getTextAnchor({ id: 'II. AK' }),
    ).not.toBe('bottommiddle');
  });

  it('shows a rail leg\u2019s token only while it is moving and flags its path as dashed', () => {
    const sides = [{ id: 'fr', name: 'FR', alliance: 'Entente' }];
    const f = {
      id: 'corps',
      name: 'corps',
      short: 'VII',
      side: 'fr',
      kind: 'corps',
    } as unknown as Parameters<typeof composeRoutes>[1][number];
    const rail = {
      formation: f,
      side: sides[0]!,
      ...oneLeg(
        [
          [7, 47.6, Date.UTC(1914, 7, 25, 12)],
          [2.3, 49.9, Date.UTC(1914, 7, 27, 12)],
        ],
        'rail',
      ),
      hypothetical: false,
      confidence: 'medium' as const,
    };
    const base = { routes: [rail], rangeStart: Date.UTC(1914, 7, 2), sides };
    const tokensOf = (layers: ReturnType<typeof buildMovementLayers>) =>
      (layers.find((l) => l.id === 'movement-tokens')!.props as unknown as { data: unknown[] }).data
        .length;
    expect(tokensOf(buildMovementLayers({ ...base, now: Date.UTC(1914, 7, 24) }))).toBe(0); // before: hidden
    expect(tokensOf(buildMovementLayers({ ...base, now: Date.UTC(1914, 7, 26) }))).toBe(1); // under way
    expect(tokensOf(buildMovementLayers({ ...base, now: Date.UTC(1914, 7, 30) }))).toBe(0); // arrived: absorbed
    const ghost = buildMovementLayers({ ...base, now: Date.UTC(1914, 7, 26) }).find(
      (l) => l.id === 'movement-ghost',
    )!.props as unknown as {
      data: { dashed: boolean }[];
      getDashArray: (d: { dashed: boolean }) => number[];
    };
    expect(ghost.data[0]!.dashed).toBe(true);
    expect(ghost.getDashArray(ghost.data[0]!)).toEqual([6, 4]);
  });
});

describe('a route written in legs', () => {
  const leg = (id: string, waypoints: Route['waypoints'], mode?: Route['mode']): Route => ({
    id,
    formation: '1914:army-fr-6',
    waypoints,
    confidence: 'medium',
    ...(mode ? { mode } : {}),
    sources: [{ source: 'source:x' }],
  });
  // Castelnau in miniature: the Grand Couronné, the train west, Picardy.
  const legs = [
    leg('1914:route-fr-2', [
      [6.4, 48.76, '1914-09-13T12:00:00Z'],
      [6.4, 48.78, '1914-09-17T12:00:00Z'],
    ]),
    leg(
      '1914:route-fr-2-by-rail',
      [
        [6.4, 48.78, '1914-09-17T12:00:00Z'],
        [2.3, 49.9, '1914-09-21T12:00:00Z'],
      ],
      'rail',
    ),
    leg('1914:route-fr-2-picardy', [
      [2.3, 49.9, '1914-09-21T12:00:00Z'],
      [2.72, 49.66, '1914-09-25T12:00:00Z'],
    ]),
  ];
  const rangeStart = Date.parse('1914-08-02T00:00:00Z');

  it('joins the legs into one path, in time order, keeping each shared waypoint once', () => {
    const out = composeRoutes(legs, formations, sides, historical);
    expect(out).toHaveLength(1);
    expect(out[0]!.legs.map((l) => l.mode)).toEqual(['march', 'rail', 'march']);
    expect(out[0]!.points.map((p) => p[0])).toEqual([6.4, 6.4, 2.3, 2.72]);
    expect(modeAt(out[0]!.legs, Date.parse('1914-09-19T12:00:00Z'))).toBe('rail');
    expect(modeAt(out[0]!.legs, Date.parse('1914-09-23T12:00:00Z'))).toBe('march');
  });

  it('draws each leg the way it was covered: the train dashed between two solid marches', () => {
    const composed = composeRoutes([...legs].reverse(), formations, sides, historical);
    const ghost = buildMovementLayers({
      routes: composed,
      now: Date.parse('1914-09-19T12:00:00Z'),
      rangeStart,
      sides,
    }).find((l) => l.id === 'movement-ghost')!.props as unknown as {
      data: { mode: string; path: [number, number][] }[];
      getDashArray: (d: { mode: string }) => number[];
    };
    expect(ghost.data.map((d) => d.mode)).toEqual(['march', 'rail', 'march']);
    expect(ghost.data.map((d) => ghost.getDashArray(d))).toEqual([
      [0, 0],
      [6, 4],
      [0, 0],
    ]);
  });

  it('leaves a motor column on the map when it is not driving, where a train takes its token away', () => {
    const drive = (mode: Route['mode']) =>
      composeRoutes(
        [
          leg(
            '1914:route-drive',
            [
              [6.13, 49.61, '1914-09-08T11:00:00Z'],
              [3.08, 49.14, '1914-09-09T11:00:00Z'],
            ],
            mode,
          ),
        ],
        formations,
        sides,
        historical,
      );
    const tokensAt = (mode: Route['mode'], at: string) =>
      (
        buildMovementLayers({
          routes: drive(mode),
          now: Date.parse(at),
          rangeStart,
          sides,
        }).find((l) => l.id === 'movement-tokens')!.props as unknown as { data: unknown[] }
      ).data.length;
    expect(tokensAt('motor', '1914-09-07T12:00:00Z')).toBe(1);
    expect(tokensAt('motor', '1914-09-08T18:00:00Z')).toBe(1);
    expect(tokensAt('motor', '1914-09-10T12:00:00Z')).toBe(1);
    expect(tokensAt('rail', '1914-09-07T12:00:00Z')).toBe(0);
    expect(tokensAt('rail', '1914-09-08T18:00:00Z')).toBe(1);
    expect(tokensAt('rail', '1914-09-10T12:00:00Z')).toBe(0);
    const ghost = buildMovementLayers({
      routes: drive('motor'),
      now: Date.parse('1914-09-08T18:00:00Z'),
      rangeStart,
      sides,
    }).find((l) => l.id === 'movement-ghost')!.props as unknown as {
      data: { dashed: boolean; mode: string }[];
      getDashArray: (d: { mode: string }) => number[];
    };
    expect(ghost.data[0]!.dashed).toBe(true);
    expect(ghost.getDashArray(ghost.data[0]!)).toEqual([2, 3]); // the road, not the railway
  });
});

describe('approximate positions (sand-23b.4)', () => {
  const formation: Formation = {
    id: '1914:army-de-6',
    name: 'German 6th Army',
    short: '6. Armee',
    side: 'de',
    kind: 'army',
  };
  const mk = (confidence: Confidence, fourth?: Confidence) => {
    const points: [number, number, number][] = [
      [6, 49, Date.UTC(1914, 7, 10)],
      [6.5, 48.8, Date.UTC(1914, 7, 20)],
    ];
    const confidences: Confidence[] = [confidence, fourth ?? confidence];
    return {
      formation,
      side: sides[0]!,
      points,
      confidences,
      legs: [{ points, confidences, mode: 'march' as const }],
      hypothetical: false,
      confidence,
    };
  };
  const scene = (confidence: Confidence, fourth?: Confidence) =>
    buildMovementLayers({
      routes: [mk(confidence, fourth)],
      now: Date.UTC(1914, 7, 15),
      rangeStart: Date.UTC(1914, 7, 2),
      sides,
    });
  const dataOf = (layers: ReturnType<typeof buildMovementLayers>, id: string) =>
    (layers.find((l) => l.id === id)!.props as unknown as { data: { label?: string }[] }).data;

  it('opens the token, halos it and marks the label when the position is low', () => {
    const layers = scene('low');
    expect(dataOf(layers, 'movement-approx')).toHaveLength(1);
    expect(dataOf(layers, 'movement-tokens')[0]!.label).toBe('≈ 6. Armee');
  });

  it('leaves a medium position as a closed disc with its own name', () => {
    const layers = scene('medium');
    expect(dataOf(layers, 'movement-approx')).toHaveLength(0);
    expect(dataOf(layers, 'movement-tokens')[0]!.label).toBe('6. Armee');
  });

  it('reads the weaker of the two waypoints the clock is between', () => {
    const layers = scene('high', 'contested');
    expect(dataOf(layers, 'movement-approx')).toHaveLength(1);
  });

  it('lets a waypoint inherit its route, and composeRoutes carries it', () => {
    const composed = composeRoutes(routes, formations, sides, historical);
    const de1 = composed.find((r) => r.formation.id === '1914:army-de-1')!;
    expect(de1.confidences).toEqual(de1.points.map(() => 'low'));
  });
});
