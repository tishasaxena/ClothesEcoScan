import type { Offer } from './types';

export type RewardProgress =
  | { kind: 'next'; offer: Offer; needed: number; ratio: number; ready: number }
  | { kind: 'all'; ready: number }
  | { kind: 'none' };

/** The cheapest reward the user can't afford yet, and how many they can already redeem. */
export function rewardProgress(points: number, offers: Offer[]): RewardProgress {
  if (offers.length === 0) return { kind: 'none' };
  const ready = offers.filter((o) => o.cost <= points).length;
  const next = [...offers].filter((o) => o.cost > points).sort((a, b) => a.cost - b.cost)[0];
  if (!next) return { kind: 'all', ready };
  return { kind: 'next', offer: next, needed: next.cost - points, ratio: points / next.cost, ready };
}
