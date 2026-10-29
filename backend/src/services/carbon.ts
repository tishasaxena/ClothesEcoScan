import { CATEGORY_PROFILES } from '../data/categories.js';
import { getMaterial, resolveMaterial } from '../data/materials.js';
import type { Alternative, CarbonResult, Category, Condition, DetectedItem, Grade, MaterialBreakdown, MaterialShare } from '../types.js';

/** Shipping, warehousing and retail per item. */
export const TRANSPORT_KG_PER_ITEM = 0.4;
/**
 * Share of production emissions still attributed to a second-hand item.
 * Reuse displaces most of the production impact of a new purchase; the
 * remainder covers collection, sorting and cleaning.
 */
export const SECOND_HAND_ATTRIBUTION = 0.1;
export const POINTS_PER_KG_SAVED = 10;
export const SECOND_HAND_BONUS = 20;
export const PREFERRED_MATERIAL_BONUS = 10;

// Conversion factors for relatable equivalents.
const KG_PER_KM_DRIVEN = 0.17; // average petrol car
const KG_PER_PHONE_CHARGE = 0.0083;
const KG_ABSORBED_PER_TREE_DAY = 22 / 365; // a mature tree absorbs ~22 kg CO2/yr

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

/**
 * Map free-text materials onto known ids, merge duplicates and rescale so the
 * percentages add up to 100. Falls back to the category's typical mix when
 * nothing usable was supplied.
 */
export function normalizeMaterials(materials: MaterialShare[], category: Category): MaterialShare[] {
  const merged = new Map<string, number>();
  for (const { material, percent } of materials) {
    if (!(percent > 0)) continue;
    const id = getMaterial(material)?.id ?? resolveMaterial(material).id;
    merged.set(id, (merged.get(id) ?? 0) + percent);
  }
  const total = [...merged.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return CATEGORY_PROFILES[category].typicalMaterials.map((m) => ({ ...m }));
  return [...merged.entries()]
    .map(([material, percent]) => ({ material, percent: round((percent / total) * 100, 1) }))
    .sort((a, b) => b.percent - a.percent);
}

function productionFootprint(materials: MaterialShare[], category: Category, weightKg: number) {
  const breakdown: MaterialBreakdown[] = materials.map(({ material, percent }) => {
    const m = resolveMaterial(material);
    return { material: m.id, label: m.label, percent, kgCO2e: (weightKg * percent * m.kgCO2ePerKg) / 100 };
  });
  const manufacturing = weightKg * CATEGORY_PROFILES[category].manufacturingPerKg;
  const fibres = breakdown.reduce((sum, b) => sum + b.kgCO2e, 0);
  return { breakdown, manufacturing, production: fibres + manufacturing };
}

export function gradeFor(kgCO2e: number, baselineKgCO2e: number): Grade {
  const ratio = kgCO2e / baselineKgCO2e;
  if (ratio <= 0.5) return 'A';
  if (ratio <= 0.8) return 'B';
  if (ratio <= 1.05) return 'C';
  if (ratio <= 1.4) return 'D';
  return 'E';
}

/** Footprint of a typical brand-new item of this category and weight. */
export function baselineFor(category: Category, weightKg: number): number {
  const typical = CATEGORY_PROFILES[category].typicalMaterials;
  return productionFootprint(typical, category, weightKg).production + TRANSPORT_KG_PER_ITEM;
}

function tipsFor(materials: MaterialShare[], category: Category, condition: Condition): string[] {
  const tips: string[] = [];
  const resolved = materials.map((m) => ({ ...m, info: resolveMaterial(m.material) }));
  const syntheticShare = resolved.filter((m) => m.info.synthetic).reduce((s, m) => s + m.percent, 0);

  const dominant = resolved[0];
  if (dominant?.info.betterAlternative) {
    const alt = getMaterial(dominant.info.betterAlternative)!;
    const cut = Math.round((1 - alt.kgCO2ePerKg / dominant.info.kgCO2ePerKg) * 100);
    tips.push(`Next time, look for ${alt.label.toLowerCase()} — its fibre emits ~${cut}% less CO₂e than ${dominant.info.label.toLowerCase()}.`);
  }
  if (syntheticShare >= 40) {
    tips.push('Synthetics shed microplastics: wash cold, use full loads and try a microfibre-catching wash bag.');
  }
  if (condition === 'new') {
    tips.push('Buying second-hand avoids ~90% of an item’s production emissions.');
  }
  if (['jeans', 'jacket', 'coat', 'shoes'].includes(category)) {
    tips.push('Repairing and wearing this for an extra 9 months cuts its yearly footprint by ~25%.');
  } else {
    tips.push('Air-drying instead of tumble-drying saves around 1 kg CO₂e per load.');
  }
  return tips.slice(0, 3);
}

type ScoreInput = Pick<DetectedItem, 'category' | 'materials' | 'condition' | 'weightKg'>;

/** What the same item would score as second-hand, or with each fibre swapped for its lower-impact alternative. */
function alternativesFor(item: ScoreInput, materials: MaterialShare[], kgCO2e: number): Alternative[] {
  const candidates: { kind: Alternative['kind']; label: string; input: ScoreInput }[] = [];
  if (item.condition === 'new') {
    candidates.push({ kind: 'second-hand', label: 'Buy it second-hand', input: { ...item, materials, condition: 'second-hand' } });
  }
  const swappable = materials.filter((m) => resolveMaterial(m.material).betterAlternative);
  if (swappable.length) {
    const swapped = materials.map((m) => ({ ...m, material: resolveMaterial(m.material).betterAlternative ?? m.material }));
    const names = [...new Set(swappable.map((m) => getMaterial(resolveMaterial(m.material).betterAlternative!)!.label.toLowerCase()))];
    candidates.push({ kind: 'material', label: `Choose ${names.join(' & ')}`, input: { ...item, materials: swapped } });
  }
  return candidates
    .map(({ kind, label, input }) => {
      const r = computeScore(input);
      return { kind, label, kgCO2e: r.kgCO2e, savesKgCO2e: round(kgCO2e - r.kgCO2e), points: r.points };
    })
    .filter((a) => a.savesKgCO2e > 0.05)
    .sort((a, b) => b.savesKgCO2e - a.savesKgCO2e);
}

export function scoreItem(item: ScoreInput): CarbonResult & { materials: MaterialShare[] } {
  const result = computeScore(item);
  return { ...result, alternatives: alternativesFor(item, result.materials, result.kgCO2e) };
}

function computeScore(item: ScoreInput): Omit<CarbonResult, 'alternatives'> & { materials: MaterialShare[] } {
  const profile = CATEGORY_PROFILES[item.category] ?? CATEGORY_PROFILES.other;
  const weightKg = item.weightKg && item.weightKg > 0 ? item.weightKg : profile.weightKg;
  const materials = normalizeMaterials(item.materials, item.category);

  const { breakdown, manufacturing, production } = productionFootprint(materials, item.category, weightKg);
  const reuseDiscount = item.condition === 'second-hand' ? production * (1 - SECOND_HAND_ATTRIBUTION) : 0;
  const kgCO2e = production - reuseDiscount + TRANSPORT_KG_PER_ITEM;
  const baselineKgCO2e = baselineFor(item.category, weightKg);
  const savedKgCO2e = Math.max(0, baselineKgCO2e - kgCO2e);

  const preferredShare = materials
    .filter((m) => resolveMaterial(m.material).preferred)
    .reduce((s, m) => s + m.percent, 0);
  const points =
    Math.round(savedKgCO2e * POINTS_PER_KG_SAVED) +
    (item.condition === 'second-hand' ? SECOND_HAND_BONUS : 0) +
    Math.round((PREFERRED_MATERIAL_BONUS * preferredShare) / 100);

  return {
    materials,
    kgCO2e: round(kgCO2e),
    baselineKgCO2e: round(baselineKgCO2e),
    savedKgCO2e: round(savedKgCO2e),
    grade: gradeFor(kgCO2e, baselineKgCO2e),
    weightKg: round(weightKg),
    breakdown: {
      materials: breakdown.map((b) => ({ ...b, kgCO2e: round(b.kgCO2e) })),
      manufacturing: round(manufacturing),
      transport: TRANSPORT_KG_PER_ITEM,
      reuseDiscount: round(reuseDiscount),
    },
    equivalents: {
      kmDriven: round(kgCO2e / KG_PER_KM_DRIVEN, 0),
      smartphoneCharges: round(kgCO2e / KG_PER_PHONE_CHARGE, 0),
      treeDays: round(kgCO2e / KG_ABSORBED_PER_TREE_DAY, 0),
    },
    points,
    tips: tipsFor(materials, item.category, item.condition),
  };
}
