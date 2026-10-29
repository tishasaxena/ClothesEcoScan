import { useState } from 'react';

// A UK survey (Barnardo's, 2015) found the average garment is worn about 7 times before it's discarded.
const TYPICAL_WEARS = 7;
const STOPS = [7, 15, 30, 50, 100, 150];

/** Footprint per wear: the more often something is worn, the lower its impact each time. */
export function WearPlanner({ kgCO2e }: { kgCO2e: number }) {
  const [index, setIndex] = useState(2);
  const wears = STOPS[index];
  const perWear = kgCO2e / wears;
  const vsTypical = Math.round((1 - TYPICAL_WEARS / wears) * 100);

  return (
    <div className="planner">
      <label htmlFor={`wears-${kgCO2e}`} className="planner-head">
        <span>How often will you wear it?</span>
        <strong>{wears} times</strong>
      </label>
      <input
        id={`wears-${kgCO2e}`}
        type="range"
        min={0}
        max={STOPS.length - 1}
        step={1}
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
      />
      <p className="small">
        <strong>{perWear < 0.1 ? `${Math.round(perWear * 1000)} g` : `${perWear.toFixed(2)} kg`} CO₂e per wear.</strong>{' '}
        {wears > TYPICAL_WEARS ? (
          <span className="muted">
            That’s {vsTypical}% less per wear than the typical {TYPICAL_WEARS} wears before a garment is thrown away.
          </span>
        ) : (
          <span className="muted">
            The typical garment is worn only {TYPICAL_WEARS} times. Every extra wear lowers its footprint per wear.
          </span>
        )}
      </p>
    </div>
  );
}
