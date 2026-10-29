import type { DetectedItem } from '../types.js';

/** Sample garments used by the offline mock recognizer (backend and in-browser demo). */
export const MOCK_CATALOG: DetectedItem[] = [
  { name: 'White crew-neck T-shirt', category: 't-shirt', materials: [{ material: 'cotton', percent: 100 }], condition: 'new', color: 'white', confidence: 0.86 },
  { name: 'Organic cotton T-shirt', category: 't-shirt', materials: [{ material: 'organic cotton', percent: 100 }], condition: 'new', color: 'sage green', confidence: 0.74 },
  { name: 'Blue slim-fit jeans', category: 'jeans', materials: [{ material: 'cotton', percent: 98 }, { material: 'elastane', percent: 2 }], condition: 'new', color: 'indigo', confidence: 0.91 },
  { name: 'Vintage denim shirt', category: 'shirt', materials: [{ material: 'cotton', percent: 100 }], condition: 'second-hand', color: 'light blue', confidence: 0.8 },
  { name: 'Grey zip hoodie', category: 'hoodie', materials: [{ material: 'cotton', percent: 60 }, { material: 'polyester', percent: 40 }], condition: 'new', color: 'grey', confidence: 0.83 },
  { name: 'Merino wool sweater', category: 'sweater', materials: [{ material: 'wool', percent: 100 }], condition: 'new', color: 'rust orange', confidence: 0.77 },
  { name: 'Linen summer shirt', category: 'shirt', materials: [{ material: 'linen', percent: 100 }], condition: 'new', color: 'white', confidence: 0.79 },
  { name: 'Running leggings', category: 'activewear', materials: [{ material: 'recycled polyester', percent: 78 }, { material: 'elastane', percent: 22 }], condition: 'new', color: 'black', confidence: 0.82 },
  { name: 'Puffer jacket', category: 'jacket', materials: [{ material: 'nylon', percent: 60 }, { material: 'polyester', percent: 40 }], condition: 'new', color: 'blue', confidence: 0.88 },
  { name: 'Floral midi dress', category: 'dress', materials: [{ material: 'viscose', percent: 100 }], condition: 'new', color: 'multicolour', confidence: 0.72 },
  { name: 'Leather sneakers', category: 'shoes', materials: [{ material: 'leather', percent: 55 }, { material: 'rubber', percent: 45 }], condition: 'new', color: 'black', confidence: 0.85 },
  { name: 'Wool overcoat', category: 'coat', materials: [{ material: 'wool', percent: 70 }, { material: 'polyamide', percent: 30 }], condition: 'second-hand', color: 'camel', confidence: 0.76 },
];

/** Pick a sample garment, preferring ones named in the filename (e.g. "jeans.jpg"). */
export function pickMockItem(filename: string, seed: number): DetectedItem {
  const file = filename.toLowerCase();
  const hinted = MOCK_CATALOG.filter((item) =>
    [item.category, ...item.name.toLowerCase().split(/\s+/)].some((w) => w.length > 3 && file.includes(w)),
  );
  const pool = hinted.length ? hinted : MOCK_CATALOG;
  return structuredClone(pool[seed % pool.length]);
}
