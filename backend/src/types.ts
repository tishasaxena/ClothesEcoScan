export const CATEGORIES = [
  't-shirt',
  'shirt',
  'sweater',
  'hoodie',
  'jeans',
  'trousers',
  'shorts',
  'dress',
  'skirt',
  'jacket',
  'coat',
  'activewear',
  'shoes',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CONDITIONS = ['new', 'second-hand'] as const;
export type Condition = (typeof CONDITIONS)[number];

export interface MaterialShare {
  material: string;
  percent: number;
}

/** What the recognizer (or the user, after correcting it) says the garment is. */
export interface DetectedItem {
  name: string;
  category: Category;
  materials: MaterialShare[];
  condition: Condition;
  color?: string;
  brand?: string;
  /** Overrides the category's typical weight when known. */
  weightKg?: number;
  /** 0..1 — how sure the recognizer is. 1 for user-edited items. */
  confidence: number;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface MaterialBreakdown {
  material: string;
  label: string;
  percent: number;
  kgCO2e: number;
}

export interface CarbonResult {
  /** Total cradle-to-shelf footprint attributed to this item. */
  kgCO2e: number;
  /** Footprint of a typical brand-new item in the same category. */
  baselineKgCO2e: number;
  savedKgCO2e: number;
  grade: Grade;
  weightKg: number;
  breakdown: {
    materials: MaterialBreakdown[];
    manufacturing: number;
    transport: number;
    reuseDiscount: number;
  };
  equivalents: {
    kmDriven: number;
    smartphoneCharges: number;
    treeDays: number;
  };
  points: number;
  tips: string[];
  /** Lower-impact versions of the same item, best first. */
  alternatives: Alternative[];
}

export interface Alternative {
  kind: 'second-hand' | 'material';
  label: string;
  kgCO2e: number;
  /** CO2e avoided compared with this item. */
  savesKgCO2e: number;
  points: number;
}

export interface ScoredItem extends DetectedItem {
  carbon: CarbonResult;
}

export interface Scan {
  id: string;
  userId: string;
  createdAt: string;
  imageHash: string;
  recognizer: string;
  items: ScoredItem[];
  totalKgCO2e: number;
  totalSavedKgCO2e: number;
  totalPoints: number;
  claimed: boolean;
  /** Set when the same photo was already claimed — points are not paid twice. */
  duplicateOf?: string;
  /** True when a care-label photo was sent along with the garment photo. */
  hasLabel?: boolean;
  /** Non-fatal problem worth surfacing, e.g. the vision model was unavailable. */
  warning?: string;
}

export interface Offer {
  id: string;
  partner: string;
  title: string;
  description: string;
  cost: number;
  tags: string[];
  emoji: string;
}

export interface Redemption {
  id: string;
  offerId: string;
  code: string;
  cost: number;
  createdAt: string;
}

export interface User {
  id: string;
  points: number;
  lifetimePoints: number;
  lifetimeSavedKgCO2e: number;
  redemptions: Redemption[];
  createdAt: string;
}
