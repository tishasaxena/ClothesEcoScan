import { describe, expect, it } from 'vitest';
import { badgesFor } from '../badges';
import type { Me } from '../types';

const me = (over: Partial<Me> = {}): Me => ({
  id: 'u',
  points: 0,
  lifetimePoints: 0,
  lifetimeSavedKgCO2e: 0,
  redemptions: [],
  scanCount: 0,
  itemsScanned: 0,
  recentScans: [],
  ...over,
});

const scan = (grade: 'A' | 'C', condition: 'new' | 'second-hand', claimed = true) => ({
  id: Math.random().toString(),
  createdAt: new Date().toISOString(),
  items: [{ name: 'x', category: 'shirt', condition, grade, kgCO2e: 1, savedKgCO2e: 1 }],
  totalKgCO2e: 1,
  totalPoints: 10,
  claimed,
});

describe('badgesFor', () => {
  it('starts with nothing earned and zero progress', () => {
    const badges = badgesFor(me());
    expect(badges).toHaveLength(6);
    expect(badges.every((b) => !b.earned && b.current === 0)).toBe(true);
  });

  it('counts only claimed scans and caps progress at the target', () => {
    const badges = badgesFor(
      me({
        itemsScanned: 7,
        lifetimeSavedKgCO2e: 12.4,
        recentScans: [scan('A', 'second-hand'), scan('A', 'new'), scan('C', 'new', false)],
      }),
    );
    const byId = Object.fromEntries(badges.map((b) => [b.id, b]));
    expect(byId.first.earned).toBe(true);
    expect(byId.thrift.earned).toBe(true);
    expect(byId.low).toMatchObject({ earned: false, current: 2, target: 3 });
    expect(byId.wardrobe).toMatchObject({ earned: true, current: 5 });
    expect(byId.saver).toMatchObject({ earned: true, current: 10 });
    expect(byId.reward.action.to).toBe('rewards');
  });
});
