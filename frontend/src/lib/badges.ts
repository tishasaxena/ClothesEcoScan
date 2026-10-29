import type { Me } from './types';

export type BadgeAction = 'scan' | 'rewards';

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** How to earn it, in one or two sentences. */
  how: string;
  /** Shown once earned. */
  earnedNote: string;
  current: number;
  target: number;
  /** Unit shown with progress, e.g. "items" or "kg". */
  unit: string;
  earned: boolean;
  action: { label: string; to: BadgeAction };
}

/** Achievements derived from the user's scan history and rewards. */
export function badgesFor(me: Me): Badge[] {
  const items = me.recentScans.filter((s) => s.claimed).flatMap((s) => s.items);
  const lowImpact = items.filter((i) => i.grade === 'A' || i.grade === 'B').length;
  const secondHand = items.filter((i) => i.condition === 'second-hand').length;

  const make = (b: Omit<Badge, 'earned'>): Badge => ({
    ...b,
    current: Math.min(b.current, b.target),
    earned: b.current >= b.target,
  });
  return [
    make({
      id: 'first',
      emoji: '🔍',
      title: 'First scan',
      description: 'Claim points for your first scan',
      how: 'Scan any garment and tap “Claim points” on the result.',
      earnedNote: 'You’ve started measuring your wardrobe’s footprint.',
      current: items.length,
      target: 1,
      unit: 'scan',
      action: { label: 'Scan an item', to: 'scan' },
    }),
    make({
      id: 'thrift',
      emoji: '♻️',
      title: 'Thrift hero',
      description: 'Claim a second-hand find',
      how: 'Scan something you bought second-hand and mark it “Second-hand”. Reuse avoids about 90% of an item’s production emissions.',
      earnedNote: 'Pre-loved clothes are one of the biggest wins for your footprint.',
      current: secondHand,
      target: 1,
      unit: 'second-hand item',
      action: { label: 'Scan a second-hand item', to: 'scan' },
    }),
    make({
      id: 'low',
      emoji: '🌿',
      title: 'Low-impact trio',
      description: 'Claim 3 items graded A or B',
      how: 'Items made from linen, hemp, lyocell or recycled fibres, or bought second-hand, usually grade A or B.',
      earnedNote: 'Three low-impact pieces. Your wardrobe is getting greener.',
      current: lowImpact,
      target: 3,
      unit: 'A/B items',
      action: { label: 'Scan an item', to: 'scan' },
    }),
    make({
      id: 'wardrobe',
      emoji: '👚',
      title: 'Wardrobe audit',
      description: 'Scan 5 items',
      how: 'Scan five pieces from your wardrobe to see where its footprint really comes from.',
      earnedNote: 'You know your wardrobe’s footprint better than most people.',
      current: me.itemsScanned,
      target: 5,
      unit: 'items',
      action: { label: 'Scan an item', to: 'scan' },
    }),
    make({
      id: 'saver',
      emoji: '🌍',
      title: '10 kg saved',
      description: 'Save 10 kg CO₂e in total',
      how: 'Savings come from choosing items with a lower footprint than a typical new one. A single second-hand jacket can save over 10 kg.',
      earnedNote: 'That’s about 60 km of driving avoided.',
      current: Math.round(me.lifetimeSavedKgCO2e * 10) / 10,
      target: 10,
      unit: 'kg CO₂e',
      action: { label: 'Scan an item', to: 'scan' },
    }),
    make({
      id: 'reward',
      emoji: '🎁',
      title: 'Treat yourself',
      description: 'Redeem your first reward',
      how: 'Spend your points on a reward, such as a tree planted, a repair or a second-hand voucher.',
      earnedNote: 'Your greener choices paid off.',
      current: me.redemptions.length,
      target: 1,
      unit: 'reward',
      action: { label: 'See rewards', to: 'rewards' },
    }),
  ];
}
