import { useEffect, useRef } from 'react';
import { SAMPLES } from '../lib/samples';
import { Icon } from './Icon';

const SEEN_KEY = 'ecoscan.welcomed.v1';

export function shouldShowWelcome(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

/** First-visit screen: a drifting wall of garment photos and one clear way in. */
export function Welcome({ onDone }: { onDone: () => void }) {
  const startRef = useRef<HTMLButtonElement>(null);
  useEffect(() => startRef.current?.focus(), []);

  const done = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Storage blocked: the welcome shows again next visit, which is harmless.
    }
    onDone();
  };

  const columns = [SAMPLES.slice(0, 2), SAMPLES.slice(2, 4), SAMPLES.slice(4, 6)];

  return (
    <div className="welcome" role="dialog" aria-modal aria-labelledby="welcome-title">
      <div className="welcome-mosaic" aria-hidden>
        {columns.map((col, i) => (
          <div key={i} className={`welcome-col ${i % 2 ? 'down' : 'up'}`}>
            {[...col, ...col, ...col, ...col].map((s, j) => (
              <img key={j} src={s.src} alt="" />
            ))}
          </div>
        ))}
      </div>
      <div className="welcome-panel">
        <span className="brand-mark welcome-mark" aria-hidden>
          <Icon name="leaf" size={22} />
        </span>
        <p className="eyebrow light">EcoScan</p>
        <h1 id="welcome-title">Know the footprint of everything you wear.</h1>
        <p className="welcome-lede">
          Photograph a garment and its care label. Get an A–E carbon grade, greener options, and points you can spend on repairs,
          swaps and second-hand finds.
        </p>
        <ul className="welcome-points">
          <li>
            <Icon name="scan" size={18} /> Scan in seconds
          </li>
          <li>
            <Icon name="leaf" size={18} /> See greener options
          </li>
          <li>
            <Icon name="gift" size={18} /> Earn rewards
          </li>
        </ul>
        <button ref={startRef} className="btn accent welcome-cta" onClick={done}>
          Get started <Icon name="arrow" size={18} />
        </button>
      </div>
    </div>
  );
}
