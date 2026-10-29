import { useState } from 'react';
import { CountUp } from '../lib/motion';
import type { Alternative, ScoredItem } from '../lib/types';
import { CareLabel } from './CareLabel';
import { GRADE_COPY, Grade, GradeScale } from './Grade';
import { Icon, type IconName } from './Icon';
import { CompareBars, InfoList, InfoSheet } from './InfoSheet';
import { WearPlanner } from './WearPlanner';

const SEGMENT_COLORS = ['var(--seg-1)', 'var(--seg-2)', 'var(--seg-3)', 'var(--seg-4)', 'var(--seg-5)', 'var(--seg-6)'];
const kg = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)} kg`;

type EquivalentId = 'kmDriven' | 'smartphoneCharges' | 'treeDays';
const EQUIVALENTS: { id: EquivalentId; icon: IconName; unit: string }[] = [
  { id: 'kmDriven', icon: 'car', unit: 'km driven' },
  { id: 'smartphoneCharges', icon: 'phone', unit: 'phone charges' },
  { id: 'treeDays', icon: 'tree', unit: 'tree-days to absorb' },
];

type Sheet = { kind: 'equivalent'; id: EquivalentId } | { kind: 'alternative'; alt: Alternative };

interface Props {
  item: ScoredItem;
  editable: boolean;
  onEdit: () => void;
}

export function ItemCard({ item, editable, onEdit }: Props) {
  const c = item.carbon;
  const [sheet, setSheet] = useState<Sheet>();
  const segments = [
    ...c.breakdown.materials.map((m) => ({ label: `${m.label} fibre`, value: m.kgCO2e })),
    { label: 'Manufacturing', value: c.breakdown.manufacturing },
    { label: 'Transport & retail', value: c.breakdown.transport },
  ];
  const max = Math.max(c.kgCO2e, c.baselineKgCO2e);

  return (
    <article className="card item">
      <header className="item-head">
        <div className="item-title">
          <p className="eyebrow">
            {item.category}
            {item.confidence < 1 && <> · {Math.round(item.confidence * 100)}% sure</>}
          </p>
          <h2>{item.name}</h2>
          <p className="muted small">{[item.color, item.brand].filter(Boolean).join(' · ')}</p>
        </div>
        <Grade grade={c.grade} size="lg" />
      </header>

      <div className="item-summary">
        <div className="headline">
          <div>
            <span className="big">
              <CountUp value={c.kgCO2e} decimals={1} />
            </span>{' '}
            <span className="unit">kg CO₂e</span>
            <p className="muted small">{GRADE_COPY[c.grade]} impact for this type of item</p>
          </div>
          {c.points > 0 && (
            <span className="points-chip">
              <Icon name="spark" size={14} />+{c.points} pts
            </span>
          )}
        </div>
        <CareLabel materials={item.materials} weightKg={c.weightKg} condition={item.condition} />
      </div>

      <GradeScale grade={c.grade} />

      <div className="compare">
        <div className="compare-row">
          <span>This item</span>
          <div className="bar">
            <div className={`fill grade-bg-${c.grade}`} style={{ width: `${(c.kgCO2e / max) * 100}%` }} />
          </div>
          <span className="num">{kg(c.kgCO2e)}</span>
        </div>
        <div className="compare-row">
          <span>Typical new</span>
          <div className="bar">
            <div className="fill baseline" style={{ width: `${(c.baselineKgCO2e / max) * 100}%` }} />
          </div>
          <span className="num">{kg(c.baselineKgCO2e)}</span>
        </div>
        {c.savedKgCO2e > 0 && (
          <p className="saved">
            <Icon name="leaf" size={16} /> You’re saving {kg(c.savedKgCO2e)} CO₂e versus a typical new one.
          </p>
        )}
      </div>

      <details className="breakdown">
        <summary>Where the emissions come from</summary>
        <div className="stacked" role="img" aria-label="Emissions breakdown">
          {segments.map((s, i) => (
            <span key={s.label} style={{ flexGrow: s.value, background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
          ))}
        </div>
        <ul className="legend">
          {segments.map((s, i) => (
            <li key={s.label}>
              <i style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
              {s.label}
              <span className="num">{kg(s.value)}</span>
            </li>
          ))}
          {c.breakdown.reuseDiscount > 0 && (
            <li className="reuse">
              <i />
              Avoided by buying second-hand
              <span className="num">−{kg(c.breakdown.reuseDiscount)}</span>
            </li>
          )}
        </ul>
      </details>

      <div className="equivalents">
        {EQUIVALENTS.map((e) => (
          <button
            key={e.id}
            className="tappable"
            onClick={() => setSheet({ kind: 'equivalent', id: e.id })}
            aria-label={`${c.equivalents[e.id]} ${e.unit}: how is this calculated?`}
          >
            <Icon name={e.icon} size={20} />
            <strong>
              <CountUp value={c.equivalents[e.id]} />
            </strong>
            <span>{e.unit}</span>
          </button>
        ))}
      </div>

      {c.alternatives.length > 0 && (
        <div className="alternatives">
          <h3>Greener options</h3>
          <ul>
            {c.alternatives.map((a) => (
              <li key={a.kind}>
                <button className="alt-row tappable" onClick={() => setSheet({ kind: 'alternative', alt: a })}>
                  <span className="alt-icon" aria-hidden>
                    <Icon name={a.kind === 'second-hand' ? 'cycle' : 'leaf'} size={18} />
                  </span>
                  <span className="grow">
                    {a.label}
                    <span className="muted small block">
                      {kg(a.kgCO2e)} instead of {kg(c.kgCO2e)}
                    </span>
                  </span>
                  <span className="alt-saving">
                    −{kg(a.savesKgCO2e)}
                    <span className="small block">{a.points} pts</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <WearPlanner kgCO2e={c.kgCO2e} />

      {c.tips.length > 0 && (
        <ul className="tips">
          {c.tips.map((t) => (
            <li key={t}>
              <Icon name="bulb" size={18} />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <button className="btn ghost small edit-btn" onClick={onEdit}>
          <Icon name="pencil" size={16} /> Not quite right? Edit details
        </button>
      )}
      {sheet?.kind === 'equivalent' && (
        <EquivalentSheet id={sheet.id} kgCO2e={c.kgCO2e} value={c.equivalents[sheet.id]} onClose={() => setSheet(undefined)} />
      )}
      {sheet?.kind === 'alternative' && (
        <InfoSheet
          visual={<Icon name={sheet.alt.kind === 'second-hand' ? 'cycle' : 'leaf'} size={40} />}
          eyebrow="Greener option"
          title={sheet.alt.label}
          onClose={() => setSheet(undefined)}
        >
          <CompareBars
            rows={[
              { label: 'This item', value: c.kgCO2e, tone: 'bad' },
              { label: 'Greener', value: sheet.alt.kgCO2e, tone: 'good' },
            ]}
          />
          <InfoList
            rows={[
              ['CO₂e saved', kg(sheet.alt.savesKgCO2e)],
              ['Lower by', `${Math.round((sheet.alt.savesKgCO2e / c.kgCO2e) * 100)}%`],
              ['Same as driving', `${Math.round(sheet.alt.savesKgCO2e / 0.17)} km`],
              ['Points it would earn', `${sheet.alt.points} pts (vs ${c.points})`],
            ]}
          />
          <p>
            {sheet.alt.kind === 'second-hand'
              ? 'Buying pre-loved avoids about 90% of an item’s production emissions. Only collection, sorting and cleaning remain.'
              : 'Fibre production is a large share of a garment’s footprint. Organic, recycled and plant-based fibres such as linen, hemp and lyocell need far less energy and fewer chemicals to make.'}
          </p>
        </InfoSheet>
      )}
    </article>
  );
}

const EQUIVALENT_COPY: Record<
  EquivalentId,
  { visual: string; title: (v: number) => string; body: (v: number, kg: number) => string; factor: string }
> = {
  kmDriven: {
    visual: '🚗',
    title: (v) => `${v.toLocaleString()} km of driving`,
    body: (v, kg) =>
      `Making this item emitted about ${kg.toFixed(1)} kg CO₂e, about the same as driving an average petrol car ${v.toLocaleString()} km.`,
    factor: '0.17 kg CO₂e per km (average petrol car)',
  },
  smartphoneCharges: {
    visual: '📱',
    title: (v) => `${v.toLocaleString()} phone charges`,
    body: (v, kg) =>
      `${kg.toFixed(1)} kg CO₂e is roughly the electricity-related emissions of charging a smartphone ${v.toLocaleString()} times.`,
    factor: '8.3 g CO₂e per full charge',
  },
  treeDays: {
    visual: '🌳',
    title: (v) => `${v.toLocaleString()} tree-days`,
    body: (v, kg) =>
      `A mature tree absorbs about 22 kg of CO₂ a year. One tree would need ${v.toLocaleString()} days (${(v / 365).toFixed(1)} years) to absorb this item’s ${kg.toFixed(1)} kg.`,
    factor: '22 kg CO₂ absorbed per tree per year',
  },
};

function EquivalentSheet({
  id,
  kgCO2e,
  value,
  onClose,
}: {
  id: EquivalentId;
  kgCO2e: number;
  value: number;
  onClose: () => void;
}) {
  const copy = EQUIVALENT_COPY[id];
  return (
    <InfoSheet visual={copy.visual} eyebrow="Put another way" title={copy.title(value)} onClose={onClose}>
      <p>{copy.body(value, kgCO2e)}</p>
      <InfoList rows={[['Conversion used', copy.factor]]} />
      <p className="small">Comparisons are rounded averages, meant to make the number easier to picture.</p>
    </InfoSheet>
  );
}
