import { describe, expect, it } from 'vitest';
import { rewardProgress } from '../rewards';
import type { Offer } from '../types';

const offer = (id: string, cost: number): Offer => ({ id, cost, partner: 'P', title: id, description: '', tags: [], emoji: '🎁' });
const offers = [offer('tree', 150), offer('swap', 100), offer('repair', 400)];

describe('rewardProgress', () => {
  it('points to the cheapest reward still out of reach', () => {
    expect(rewardProgress(120, offers)).toMatchObject({ kind: 'next', needed: 30, ready: 1, offer: { id: 'tree' } });
    expect(rewardProgress(0, offers)).toMatchObject({ kind: 'next', needed: 100, ratio: 0, ready: 0 });
  });

  it('reports when everything is affordable or there are no offers', () => {
    expect(rewardProgress(500, offers)).toEqual({ kind: 'all', ready: 3 });
    expect(rewardProgress(10, [])).toEqual({ kind: 'none' });
  });
});
