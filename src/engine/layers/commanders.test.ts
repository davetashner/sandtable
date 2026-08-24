import { describe, expect, it } from 'vitest';
import type { PersonTrack, Side } from '../../packs/schema/index.js';
import { buildCommanderLayers, commanderLabelCandidates, commandersAt } from './commanders.js';

const sides: Side[] = [
  { id: 'de', name: 'German Empire' },
  { id: 'fr', name: 'France' },
];

const hq: PersonTrack = {
  id: '1914:track-moltke-ohl',
  person: 'person:moltke',
  kind: 'hq',
  post: 'OHL — the German supreme headquarters',
  postShort: 'OHL',
  side: 'de',
  waypoints: [
    [7.59, 50.36, '1914-08-17T00:00:00Z'],
    [7.59, 50.36, '1914-08-29T23:00:00Z'],
    [6.13, 49.61, '1914-08-30T12:00:00Z'],
    [6.13, 49.61, '1914-09-14T12:00:00Z'],
  ],
  confidence: 'medium',
  derivation: 'Towns and the dates it moved.',
  sources: [{ source: 'source:herwig-2009' }],
};

const journey: PersonTrack = {
  id: '1914:track-joffre-melun',
  person: 'person:joffre',
  kind: 'journey',
  side: 'fr',
  waypoints: [
    [4.71, 48.23, '1914-09-05T09:00:00Z'],
    [2.66, 48.54, '1914-09-05T14:00:00Z'],
  ],
  confidence: 'medium',
  derivation: 'The drive to Melun.',
  sources: [{ source: 'source:herwig-2009' }],
};

const opts = (now: string, tracks: PersonTrack[]) => ({
  tracks,
  now: Date.parse(now),
  sides,
  label: (id: string) => ({ 'person:moltke': 'Moltke', 'person:joffre': 'Joffre' })[id],
  icon: () => undefined,
});

describe('commandersAt', () => {
  it('shows a commander only inside his own track', () => {
    // before OHL reaches Koblenz, and after Falkenhayn replaces him
    expect(commandersAt(opts('1914-08-10T00:00:00Z', [hq]))).toHaveLength(0);
    expect(commandersAt(opts('1914-09-20T00:00:00Z', [hq]))).toHaveLength(0);
    expect(commandersAt(opts('1914-08-20T00:00:00Z', [hq]))).toHaveLength(1);
  });

  it('moves the headquarters when it moved, not before', () => {
    const koblenz = commandersAt(opts('1914-08-20T00:00:00Z', [hq]))[0]!;
    expect(koblenz.position[0]).toBeCloseTo(7.59, 2);
    const luxembourg = commandersAt(opts('1914-09-01T00:00:00Z', [hq]))[0]!;
    expect(luxembourg.position[0]).toBeCloseTo(6.13, 2);
  });

  it('says which headquarters an hq token is, and leaves a journey the man', () => {
    // An hq pin is a place, not a person standing there (sand-1l0.27); the
    // token has to say so or the reader will read it as the man.
    expect(commandersAt(opts('1914-08-20T00:00:00Z', [hq]))[0]!.tokenLabel).toBe('Moltke · OHL');
    expect(commandersAt(opts('1914-09-05T12:00:00Z', [journey]))[0]!.tokenLabel).toBe('Joffre');
  });

  it('puts the headquarters and the man on the map at the same time', () => {
    // 5 September: GQG is at Bar-sur-Aube and Joffre is driving to Melun.
    const gqg: PersonTrack = {
      ...hq,
      id: '1914:track-joffre-gqg',
      person: 'person:joffre',
      side: 'fr',
      postShort: 'GQG',
    };
    const both = commandersAt(opts('1914-09-05T12:00:00Z', [gqg, journey]));
    expect(both.map((d) => d.tokenLabel)).toEqual(['Joffre · GQG', 'Joffre']);
    expect(both.map((d) => d.kind)).toEqual(['hq', 'journey']);
  });

  it('still places a commander whose track names no side', () => {
    // The ring falls back to brass; which colour it resolves to is
    // sideColor's business and is tested there — under jsdom every design
    // token resolves to the same grey, so asserting on the RGBA here would
    // prove nothing.
    const { side: _side, ...noSide } = journey;
    const [d] = commandersAt(opts('1914-09-05T12:00:00Z', [noSide as typeof journey]));
    expect(d).toBeDefined();
    expect(d!.person).toBe('person:joffre');
    expect(d!.color).toHaveLength(4);
  });
});

describe('buildCommanderLayers', () => {
  it('draws a disc for a commander with no portrait, and an icon for one with', () => {
    const noIcon = buildCommanderLayers(opts('1914-08-20T00:00:00Z', [hq]));
    const fallback = noIcon.find((l) => l.id === 'commander-fallback')!;
    const portraits = noIcon.find((l) => l.id === 'commander-portraits')!;
    expect((fallback.props as { data: unknown[] }).data).toHaveLength(1);
    expect((portraits.props as { data: unknown[] }).data).toHaveLength(0);

    const withIcon = buildCommanderLayers({
      ...opts('1914-08-20T00:00:00Z', [hq]),
      icon: () => 'data:image/png;base64,x',
    });
    expect(
      (withIcon.find((l) => l.id === 'commander-fallback')!.props as { data: unknown[] }).data,
    ).toHaveLength(0);
    expect(
      (withIcon.find((l) => l.id === 'commander-portraits')!.props as { data: unknown[] }).data,
    ).toHaveLength(1);
  });

  it('drops a label the placement pass could not fit', () => {
    const placement = new Map([
      [
        hq.id,
        {
          anchor: 'start' as const,
          baseline: 'center' as const,
          offset: [0, 0] as [number, number],
          visible: false,
        },
      ],
    ]);
    const layers = buildCommanderLayers({ ...opts('1914-08-20T00:00:00Z', [hq]), placement });
    const labels = layers.find((l) => l.id === 'commander-labels')!;
    expect((labels.props as { data: unknown[] }).data).toHaveLength(0);
  });
});

describe('commanderLabelCandidates', () => {
  it('offers the token label to the placement pass', () => {
    const data = commandersAt(opts('1914-08-20T00:00:00Z', [hq]));
    expect(commanderLabelCandidates(data).map((c) => c.text)).toEqual(['Moltke · OHL']);
  });
});
