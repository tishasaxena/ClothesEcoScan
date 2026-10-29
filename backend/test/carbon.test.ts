import { describe, expect, it } from 'vitest';
import { normalizeMaterials, scoreItem } from '../src/services/carbon.js';

describe('normalizeMaterials', () => {
  it('resolves aliases, merges duplicates and rescales to 100%', () => {
    const result = normalizeMaterials(
      [
        { material: 'Spandex', percent: 5 },
        { material: 'lycra', percent: 5 },
        { material: 'Cotton', percent: 40 },
      ],
      't-shirt',
    );
    expect(result).toEqual([
      { material: 'cotton', percent: 80 },
      { material: 'elastane', percent: 20 },
    ]);
  });

  it('falls back to the typical mix when no materials are given', () => {
    expect(normalizeMaterials([], 'jeans')[0].material).toBe('cotton');
  });
});

describe('scoreItem', () => {
  it('scores a typical new cotton T-shirt at baseline (grade C, no savings)', () => {
    const r = scoreItem({ category: 't-shirt', condition: 'new', materials: [{ material: 'cotton', percent: 100 }] });
    expect(r.kgCO2e).toBeCloseTo(r.baselineKgCO2e);
    expect(r.kgCO2e).toBeGreaterThan(2);
    expect(r.kgCO2e).toBeLessThan(6);
    expect(r.grade).toBe('C');
    expect(r.savedKgCO2e).toBe(0);
  });

  it('rewards lower-impact fibres', () => {
    const conventional = scoreItem({ category: 'shirt', condition: 'new', materials: [{ material: 'cotton', percent: 100 }] });
    const linen = scoreItem({ category: 'shirt', condition: 'new', materials: [{ material: 'linen', percent: 100 }] });
    expect(linen.kgCO2e).toBeLessThan(conventional.kgCO2e);
    expect(linen.savedKgCO2e).toBeGreaterThan(0);
    expect(linen.points).toBeGreaterThan(conventional.points);
  });

  it('gives second-hand items an A and a bonus', () => {
    const r = scoreItem({ category: 'jeans', condition: 'second-hand', materials: [{ material: 'denim', percent: 100 }] });
    expect(r.grade).toBe('A');
    expect(r.breakdown.reuseDiscount).toBeGreaterThan(0);
    expect(r.points).toBeGreaterThanOrEqual(20 + Math.round(r.savedKgCO2e * 10));
  });

  it('penalises high-impact fibres', () => {
    const r = scoreItem({ category: 'sweater', condition: 'new', materials: [{ material: 'cashmere', percent: 100 }] });
    expect(r.grade).toBe('E');
    expect(r.points).toBe(0);
  });

  it('uses a supplied weight for both the item and its baseline', () => {
    const r = scoreItem({ category: 't-shirt', condition: 'new', weightKg: 0.36, materials: [{ material: 'cotton', percent: 100 }] });
    expect(r.weightKg).toBe(0.36);
    expect(r.grade).toBe('C');
  });

  it('suggests a better alternative for the dominant fibre', () => {
    const r = scoreItem({ category: 'dress', condition: 'new', materials: [{ material: 'polyester', percent: 100 }] });
    expect(r.tips.join(' ')).toMatch(/recycled polyester/);
  });

  it('offers second-hand and better-fibre alternatives, biggest saving first', () => {
    const r = scoreItem({ category: 'jeans', condition: 'new', materials: [{ material: 'cotton', percent: 100 }] });
    expect(r.alternatives.map((a) => a.kind)).toEqual(['second-hand', 'material']);
    expect(r.alternatives[1].label).toBe('Choose organic cotton');
    for (const a of r.alternatives) {
      expect(a.kgCO2e).toBeLessThan(r.kgCO2e);
      expect(a.points).toBeGreaterThan(r.points);
    }
  });

  it('has no alternatives for an item that is already the best choice', () => {
    const r = scoreItem({ category: 'shirt', condition: 'second-hand', materials: [{ material: 'linen', percent: 100 }] });
    expect(r.alternatives).toEqual([]);
  });
});
