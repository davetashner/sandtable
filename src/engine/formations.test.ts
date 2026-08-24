import { describe, expect, it } from 'vitest';
import type { Battle, Formation } from '../packs/schema/index.js';
import { allFormations, sideFormation, subordinatesOf } from './formations.js';

const f = (id: string, over: Partial<Formation> = {}): Formation => ({
  id,
  name: id,
  side: 'de',
  kind: 'corps',
  ...over,
});

const campaign: Formation[] = [
  f('1914:army-de-1', { kind: 'army' }),
  f('1914:army-de-2', { kind: 'army' }),
  f('1914:corps-de-ii', { parent: '1914:army-de-1' }),
  f('1914:corps-de-iii', { parent: '1914:army-de-1' }),
  f('1914:bef', { side: 'gb', kind: 'army' }),
  f('1914:corps-gb-i', { side: 'gb', parent: '1914:bef' }),
  f('1914:belgian-field-army', { side: 'be', kind: 'army' }),
  f('1914:fortress-liege', { side: 'be', kind: 'garrison' }),
  f('1914:fortress-namur', { side: 'be', kind: 'garrison' }),
];

const battles = [
  {
    id: '1914:marne',
    formations: [f('1914:div-de-5', { kind: 'division' }), f('1914:bef', { side: 'gb' })],
  },
] as unknown as Battle[];

describe('allFormations', () => {
  it('adds the formations a zoom-in brings with it', () => {
    const all = allFormations(campaign, battles);
    expect(all.map((x) => x.id)).toContain('1914:div-de-5');
    expect(all).toHaveLength(campaign.length + 1);
  });

  it('lets the campaign win when a battle repeats an id', () => {
    const all = allFormations(campaign, battles);
    expect(all.find((x) => x.id === '1914:bef')?.kind).toBe('army');
  });

  it('is the campaign alone when there are no battles', () => {
    expect(allFormations(campaign)).toHaveLength(campaign.length);
  });
});

describe('sideFormation', () => {
  it('answers where a side put one army in the field', () => {
    expect(sideFormation(campaign, 'gb')?.id).toBe('1914:bef');
  });

  it('does not count garrisons as the army a side put in the field', () => {
    expect(sideFormation(campaign, 'be')?.id).toBe('1914:belgian-field-army');
  });

  it('refuses to pick one of several — two armies is no answer', () => {
    expect(sideFormation(campaign, 'de')).toBeUndefined();
  });

  it('is undefined for a side with nothing', () => {
    expect(sideFormation(campaign, 'ru')).toBeUndefined();
  });

  it('ignores a formation that has something over it', () => {
    const withGroup: Formation[] = [
      f('1914:group', { side: 'xx', kind: 'army-group' }),
      f('1914:under', { side: 'xx', kind: 'army', parent: '1914:group' }),
    ];
    expect(sideFormation(withGroup, 'xx')?.id).toBe('1914:group');
  });
});

describe('subordinatesOf', () => {
  it('gives the formations immediately under one, in pack order', () => {
    expect(subordinatesOf(campaign, '1914:army-de-1').map((x) => x.id)).toEqual([
      '1914:corps-de-ii',
      '1914:corps-de-iii',
    ]);
  });

  it('is empty for a formation nothing hangs off', () => {
    expect(subordinatesOf(campaign, '1914:corps-de-ii')).toEqual([]);
  });
});
