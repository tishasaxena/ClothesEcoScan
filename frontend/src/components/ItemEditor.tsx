import { useState } from 'react';
import type { Condition, MaterialShare, Reference, ScoredItem } from '../lib/types';

export type EditableItem = Omit<ScoredItem, 'carbon' | 'confidence'>;

interface Props {
  item: ScoredItem;
  reference: Reference;
  saving: boolean;
  onSave: (item: EditableItem) => void;
  onCancel: () => void;
}

/** Correct the detected garment — e.g. copy the fibre split from the care label. */
export function ItemEditor({ item, reference, saving, onSave, onCancel }: Props) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [condition, setCondition] = useState<Condition>(item.condition);
  const [materials, setMaterials] = useState<MaterialShare[]>(item.materials.map((m) => ({ ...m })));
  const total = materials.reduce((s, m) => s + (Number(m.percent) || 0), 0);

  const setMaterial = (i: number, patch: Partial<MaterialShare>) =>
    setMaterials((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  return (
    <form
      className="editor"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          name,
          category,
          condition,
          color: item.color,
          brand: item.brand,
          materials: materials.filter((m) => m.percent > 0),
        });
      }}
    >
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
      </label>
      <div className="row">
        <label className="grow">
          Type
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {reference.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="segmented">
          <legend>Condition</legend>
          {reference.conditions.map((c) => (
            <button type="button" key={c} className={c === condition ? 'on' : ''} onClick={() => setCondition(c)}>
              {c === 'new' ? 'New' : 'Second-hand'}
            </button>
          ))}
        </fieldset>
      </div>

      <fieldset className="materials">
        <legend>
          Materials{' '}
          <span className={`muted ${Math.round(total) !== 100 ? 'warn' : ''}`}>({Math.round(total)}% — we’ll scale to 100%)</span>
        </legend>
        {materials.map((m, i) => (
          <div className="row material-row" key={i}>
            <select value={m.material} onChange={(e) => setMaterial(i, { material: e.target.value })} aria-label="Material">
              {!reference.materials.some((r) => r.id === m.material) && <option value={m.material}>{m.material}</option>}
              {reference.materials.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={100}
              value={m.percent}
              onChange={(e) => setMaterial(i, { percent: Number(e.target.value) })}
              aria-label="Percent"
            />
            <span>%</span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setMaterials((ms) => ms.filter((_, j) => j !== i))}
              aria-label="Remove material"
              disabled={materials.length === 1}
            >
              ✕
            </button>
          </div>
        ))}
        {materials.length < 6 && (
          <button
            type="button"
            className="btn ghost small"
            onClick={() => setMaterials((ms) => [...ms, { material: 'cotton', percent: 0 }])}
          >
            + Add material
          </button>
        )}
      </fieldset>

      <div className="row">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="btn primary grow" disabled={saving || total <= 0}>
          {saving ? 'Re-scoring…' : 'Update score'}
        </button>
      </div>
    </form>
  );
}
