import type { Category, MaterialShare } from '../types.js';

export interface CategoryProfile {
  label: string;
  /** Typical finished-garment weight. */
  weightKg: number;
  /** Typical material mix of a conventional new item — defines the baseline. */
  typicalMaterials: MaterialShare[];
  /**
   * Spinning, knitting/weaving, wet processing (dyeing, finishing) and cut & sew,
   * in kg CO2e per kg of garment. This is the largest share of most garments'
   * footprint because textile mills mostly run on coal-heavy grids.
   */
  manufacturingPerKg: number;
}

const APPAREL_MFG = 13;

export const CATEGORY_PROFILES: Record<Category, CategoryProfile> = {
  't-shirt': { label: 'T-shirt', weightKg: 0.18, manufacturingPerKg: APPAREL_MFG, typicalMaterials: [{ material: 'cotton', percent: 100 }] },
  shirt: { label: 'Shirt', weightKg: 0.25, manufacturingPerKg: APPAREL_MFG, typicalMaterials: [{ material: 'cotton', percent: 100 }] },
  sweater: {
    label: 'Sweater',
    weightKg: 0.45,
    manufacturingPerKg: APPAREL_MFG,
    typicalMaterials: [
      { material: 'acrylic', percent: 50 },
      { material: 'wool', percent: 30 },
      { material: 'polyester', percent: 20 },
    ],
  },
  hoodie: {
    label: 'Hoodie',
    weightKg: 0.6,
    manufacturingPerKg: APPAREL_MFG,
    typicalMaterials: [
      { material: 'cotton', percent: 80 },
      { material: 'polyester', percent: 20 },
    ],
  },
  jeans: {
    label: 'Jeans',
    weightKg: 0.65,
    manufacturingPerKg: 15, // denim washing & finishing is energy and water intensive
    typicalMaterials: [
      { material: 'cotton', percent: 98 },
      { material: 'elastane', percent: 2 },
    ],
  },
  trousers: {
    label: 'Trousers',
    weightKg: 0.5,
    manufacturingPerKg: APPAREL_MFG,
    typicalMaterials: [
      { material: 'polyester', percent: 65 },
      { material: 'viscose', percent: 33 },
      { material: 'elastane', percent: 2 },
    ],
  },
  shorts: { label: 'Shorts', weightKg: 0.3, manufacturingPerKg: APPAREL_MFG, typicalMaterials: [{ material: 'cotton', percent: 100 }] },
  dress: { label: 'Dress', weightKg: 0.35, manufacturingPerKg: APPAREL_MFG, typicalMaterials: [{ material: 'polyester', percent: 100 }] },
  skirt: { label: 'Skirt', weightKg: 0.3, manufacturingPerKg: APPAREL_MFG, typicalMaterials: [{ material: 'polyester', percent: 100 }] },
  jacket: {
    label: 'Jacket',
    weightKg: 0.9,
    manufacturingPerKg: APPAREL_MFG,
    typicalMaterials: [
      { material: 'polyester', percent: 85 },
      { material: 'nylon', percent: 15 },
    ],
  },
  coat: {
    label: 'Coat',
    weightKg: 1.4,
    manufacturingPerKg: APPAREL_MFG,
    typicalMaterials: [
      { material: 'wool', percent: 50 },
      { material: 'polyester', percent: 50 },
    ],
  },
  activewear: {
    label: 'Activewear',
    weightKg: 0.25,
    manufacturingPerKg: APPAREL_MFG,
    typicalMaterials: [
      { material: 'polyester', percent: 85 },
      { material: 'elastane', percent: 15 },
    ],
  },
  shoes: {
    label: 'Shoes',
    weightKg: 0.9,
    manufacturingPerKg: 10,
    typicalMaterials: [
      { material: 'leather', percent: 30 },
      { material: 'synthetic-leather', percent: 30 },
      { material: 'rubber', percent: 40 },
    ],
  },
  other: { label: 'Clothing item', weightKg: 0.4, manufacturingPerKg: APPAREL_MFG, typicalMaterials: [{ material: 'cotton', percent: 100 }] },
};
