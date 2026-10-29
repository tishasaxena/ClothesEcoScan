// Mirrors backend/src/types.ts (kept separate so the two apps deploy independently).
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E';
export type Condition = 'new' | 'second-hand';

export interface MaterialShare {
  material: string;
  percent: number;
}

export interface CarbonResult {
  kgCO2e: number;
  baselineKgCO2e: number;
  savedKgCO2e: number;
  grade: Grade;
  weightKg: number;
  breakdown: {
    materials: { material: string; label: string; percent: number; kgCO2e: number }[];
    manufacturing: number;
    transport: number;
    reuseDiscount: number;
  };
  equivalents: { kmDriven: number; smartphoneCharges: number; treeDays: number };
  points: number;
  tips: string[];
  alternatives: Alternative[];
}

export interface Alternative {
  kind: 'second-hand' | 'material';
  label: string;
  kgCO2e: number;
  savesKgCO2e: number;
  points: number;
}

export interface ScoredItem {
  name: string;
  category: string;
  materials: MaterialShare[];
  condition: Condition;
  color?: string;
  brand?: string;
  weightKg?: number;
  confidence: number;
  carbon: CarbonResult;
}

export interface Scan {
  id: string;
  createdAt: string;
  recognizer: string;
  items: ScoredItem[];
  totalKgCO2e: number;
  totalSavedKgCO2e: number;
  totalPoints: number;
  claimed: boolean;
  duplicateOf?: string;
  hasLabel?: boolean;
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

export interface Me {
  id: string;
  points: number;
  lifetimePoints: number;
  lifetimeSavedKgCO2e: number;
  redemptions: Redemption[];
  scanCount: number;
  itemsScanned: number;
  recentScans: {
    id: string;
    createdAt: string;
    items: { name: string; category: string; condition: Condition; grade: Grade; kgCO2e: number; savedKgCO2e: number }[];
    totalKgCO2e: number;
    totalPoints: number;
    claimed: boolean;
  }[];
}

export interface Reference {
  categories: { id: string; label: string; weightKg: number }[];
  materials: { id: string; label: string; kgCO2ePerKg: number }[];
  conditions: Condition[];
}

export interface ScanResponse {
  scan: Scan;
  recommendedOffers: Offer[];
}
