import { describe, expect, it } from 'vitest';
import type { Branch, Formation, Route, Side } from '../../packs/schema/index.js';
import { buildMovementLayers, buildMovementScene, composeRoutes, positionAt } from './movement.js';

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
      'movement-tokens',
      'movement-labels',
    ]);
    const trail = layers[1]!.props as unknown as {
      currentTime: number;
      data: { timestamps: number[] }[];
    };
    expect(trail.currentTime).toBe((Date.parse(t('22')) - start) / 1000);
    expect(trail.data[0]!.timestamps[0]).toBe((Date.parse(t('13')) - start) / 1000);
    const tokens = layers[2]!.props as unknown as {
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
      points: [
        [6, 50, Date.UTC(1914, 7, 20)],
        [5, 50, Date.UTC(1914, 7, 25)],
      ] as [number, number, number][],
      hypothetical: false,
      confidence: 'medium' as const,
      mode: 'march' as const,
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
      points: [
        [lng, 50, Date.UTC(1914, 7, 20)],
        [lng, 50, Date.UTC(1914, 7, 25)],
      ] as [number, number, number][],
      hypothetical: false,
      confidence: 'medium' as const,
      mode: 'march' as const,
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
      points: [
        [7, 47.6, Date.UTC(1914, 7, 25, 12)],
        [2.3, 49.9, Date.UTC(1914, 7, 27, 12)],
      ] as [number, number, number][],
      hypothetical: false,
      confidence: 'medium' as const,
      mode: 'rail' as const,
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
