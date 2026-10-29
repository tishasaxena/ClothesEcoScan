/**
 * Emission factors for fibre production, in kg CO2e per kg of fibre.
 *
 * Values are rounded averages drawn from publicly available LCA data
 * (Textile Exchange Material Change Insights, Higg MSI summaries, WRAP's
 * Textiles Tracker, Quantis "Measuring Fashion" 2018). They are indicative —
 * good enough to rank choices, not to certify a product.
 */
export interface Material {
  id: string;
  label: string;
  kgCO2ePerKg: number;
  /** Lower-impact alternative, if one exists, used to generate tips. */
  betterAlternative?: string;
  synthetic?: boolean;
  preferred?: boolean;
}

export const MATERIALS: Material[] = [
  { id: 'cotton', label: 'Cotton', kgCO2ePerKg: 5.9, betterAlternative: 'organic-cotton' },
  { id: 'organic-cotton', label: 'Organic cotton', kgCO2ePerKg: 3.8, preferred: true },
  { id: 'recycled-cotton', label: 'Recycled cotton', kgCO2ePerKg: 1.6, preferred: true },
  { id: 'polyester', label: 'Polyester', kgCO2ePerKg: 5.5, betterAlternative: 'recycled-polyester', synthetic: true },
  { id: 'recycled-polyester', label: 'Recycled polyester', kgCO2ePerKg: 3.2, synthetic: true, preferred: true },
  { id: 'nylon', label: 'Nylon', kgCO2ePerKg: 7.3, betterAlternative: 'recycled-nylon', synthetic: true },
  { id: 'recycled-nylon', label: 'Recycled nylon', kgCO2ePerKg: 3.5, synthetic: true, preferred: true },
  { id: 'acrylic', label: 'Acrylic', kgCO2ePerKg: 6.4, synthetic: true },
  { id: 'elastane', label: 'Elastane', kgCO2ePerKg: 9.0, synthetic: true },
  { id: 'wool', label: 'Wool', kgCO2ePerKg: 23.0, betterAlternative: 'recycled-wool' },
  { id: 'recycled-wool', label: 'Recycled wool', kgCO2ePerKg: 2.0, preferred: true },
  { id: 'cashmere', label: 'Cashmere', kgCO2ePerKg: 38.0, betterAlternative: 'recycled-wool' },
  { id: 'silk', label: 'Silk', kgCO2ePerKg: 25.0 },
  { id: 'viscose', label: 'Viscose', kgCO2ePerKg: 4.0, betterAlternative: 'lyocell' },
  { id: 'modal', label: 'Modal', kgCO2ePerKg: 4.1 },
  { id: 'lyocell', label: 'Lyocell (Tencel)', kgCO2ePerKg: 2.4, preferred: true },
  { id: 'linen', label: 'Linen', kgCO2ePerKg: 1.7, preferred: true },
  { id: 'hemp', label: 'Hemp', kgCO2ePerKg: 1.6, preferred: true },
  { id: 'leather', label: 'Leather', kgCO2ePerKg: 30.0 },
  { id: 'synthetic-leather', label: 'Synthetic leather (PU)', kgCO2ePerKg: 7.0, synthetic: true },
  { id: 'rubber', label: 'Rubber', kgCO2ePerKg: 3.0 },
  { id: 'down', label: 'Down', kgCO2ePerKg: 10.0 },
  { id: 'other', label: 'Other / unknown', kgCO2ePerKg: 6.0 },
];

const BY_ID = new Map(MATERIALS.map((m) => [m.id, m]));

const ALIASES: Record<string, string> = {
  denim: 'cotton',
  'conventional cotton': 'cotton',
  'bci cotton': 'cotton',
  'organic': 'organic-cotton',
  'gots cotton': 'organic-cotton',
  'rpet': 'recycled-polyester',
  'recycled pet': 'recycled-polyester',
  'repreve': 'recycled-polyester',
  'econyl': 'recycled-nylon',
  'polyamide': 'nylon',
  'recycled polyamide': 'recycled-nylon',
  'spandex': 'elastane',
  'lycra': 'elastane',
  'rayon': 'viscose',
  'tencel': 'lyocell',
  'merino': 'wool',
  'merino wool': 'wool',
  'flax': 'linen',
  'pu': 'synthetic-leather',
  'faux leather': 'synthetic-leather',
  'vegan leather': 'synthetic-leather',
  'polyurethane': 'synthetic-leather',
  'suede': 'leather',
  'fleece': 'polyester',
  'unknown': 'other',
};

/** Normalise a free-text material name ("Recycled Polyester", "spandex") to a known id. */
export function resolveMaterial(name: string): Material {
  const key = name.trim().toLowerCase().replace(/_/g, ' ');
  const slug = key.replace(/\s+/g, '-');
  return BY_ID.get(slug) ?? BY_ID.get(ALIASES[key] ?? '') ?? BY_ID.get('other')!;
}

export function getMaterial(id: string): Material | undefined {
  return BY_ID.get(id);
}
