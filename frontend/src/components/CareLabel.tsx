import type { MaterialShare } from '../lib/types';

/** The item's composition, set like the woven care label sewn into a garment. */
export function CareLabel({
  materials,
  weightKg,
  condition,
}: {
  materials: MaterialShare[];
  weightKg: number;
  condition: string;
}) {
  return (
    <div className="care-label" aria-label="Material composition">
      <span className="care-label-head">Composition</span>
      <ul>
        {materials.map((m) => (
          <li key={m.material}>
            <span className="care-pct">{Math.round(m.percent)}%</span> {m.material.replace(/-/g, ' ')}
          </li>
        ))}
      </ul>
      <span className="care-label-foot">
        ≈ {Math.round(weightKg * 1000)} g · {condition === 'second-hand' ? 'pre-loved' : 'new'}
      </span>
    </div>
  );
}
