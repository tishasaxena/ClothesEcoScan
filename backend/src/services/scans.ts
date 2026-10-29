import { resolveMaterial } from '../data/materials.js';
import { OFFERS } from '../data/offers.js';
import type { DetectedItem, Offer, Scan, ScoredItem } from '../types.js';
import { scoreItem } from './carbon.js';

export const SCAN_BONUS = 5;

export function scoreItems(items: DetectedItem[]): ScoredItem[] {
  return items.map((item) => {
    const { materials, ...carbon } = scoreItem(item);
    return { ...item, materials, carbon };
  });
}

export function withTotals(scan: Omit<Scan, 'totalKgCO2e' | 'totalSavedKgCO2e' | 'totalPoints'>): Scan {
  const sum = (f: (i: ScoredItem) => number) => Math.round(scan.items.reduce((s, i) => s + f(i), 0) * 100) / 100;
  const earned = scan.items.length ? sum((i) => i.carbon.points) + SCAN_BONUS : 0;
  return {
    ...scan,
    totalKgCO2e: sum((i) => i.carbon.kgCO2e),
    totalSavedKgCO2e: sum((i) => i.carbon.savedKgCO2e),
    totalPoints: scan.duplicateOf ? 0 : earned,
  };
}

/** Tags describing a scan, used to recommend relevant offers. */
function tagsFor(items: ScoredItem[]): Set<string> {
  const tags = new Set<string>(['any']);
  for (const item of items) {
    tags.add(item.category);
    if (item.condition === 'second-hand') tags.add('second-hand');
    for (const m of item.materials) {
      const info = resolveMaterial(m.material);
      if (info.synthetic && m.percent >= 30) tags.add('synthetic');
      if (info.id.includes('cotton')) tags.add('cotton');
    }
  }
  return tags;
}

export function recommendOffers(items: ScoredItem[]): Offer[] {
  const tags = tagsFor(items);
  const score = (o: Offer) => o.tags.filter((t) => t !== 'any' && tags.has(t)).length;
  return OFFERS.filter((o) => o.tags.some((t) => tags.has(t)))
    .sort((a, b) => score(b) - score(a) || a.cost - b.cost)
    .slice(0, 3);
}
