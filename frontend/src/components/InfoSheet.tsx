import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** Large visual at the top: an emoji, icon or image. */
  visual?: ReactNode;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  /** Extra buttons shown before the close button (primary action first). */
  actions?: ReactNode;
  closeLabel?: string;
  onClose: () => void;
}

/** Bottom sheet (centred dialog on desktop) for card details. Portalled so it sits above the tab bar. */
export function InfoSheet({ visual, eyebrow, title, children, actions, closeLabel = 'Close', onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!actions) closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, actions]);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal card info-sheet"
        role="dialog"
        aria-modal
        aria-labelledby="info-title"
        onClick={(e) => e.stopPropagation()}
      >
        {visual && <div className="info-visual">{visual}</div>}
        {eyebrow && <p className="badge-status">{eyebrow}</p>}
        <h2 id="info-title">{title}</h2>
        <div className="info-body">{children}</div>
        <div className="row">
          <button ref={closeRef} className={actions ? 'btn' : 'btn primary grow'} onClick={onClose}>
            {closeLabel}
          </button>
          {actions}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Two labelled bars on one scale, for "this vs that" comparisons inside sheets. */
export function CompareBars({ rows }: { rows: { label: string; value: number; tone?: 'good' | 'muted' | 'bad' }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 0.001);
  return (
    <div className="info-bars">
      {rows.map((r) => (
        <div className="compare-row" key={r.label}>
          <span>{r.label}</span>
          <div className="bar">
            <div className={`fill tone-${r.tone ?? 'muted'}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="num">{r.value < 10 ? r.value.toFixed(1) : Math.round(r.value)} kg</span>
        </div>
      ))}
    </div>
  );
}

/** Label / value rows. */
export function InfoList({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="info-list">
      {rows.map(([k, v], i) => (
        <div key={i}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
