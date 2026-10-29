import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Badge, BadgeAction } from '../lib/badges';
import { Confetti } from '../lib/motion';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Detail sheet for one badge: progress ring, how to earn it, and a way to go and do it. */
export function BadgeSheet({ badge, onClose, onGo }: { badge: Badge; onClose: () => void; onGo: (to: BadgeAction) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const ratio = badge.target ? badge.current / badge.target : 0;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Portal to <body>: the animated page container would otherwise trap the sheet beneath the tab bar.
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal card badge-sheet ${badge.earned ? 'earned' : ''}`}
        role="dialog"
        aria-modal
        aria-labelledby="badge-title"
        onClick={(e) => e.stopPropagation()}
      >
        {badge.earned && <Confetti />}
        <div className="badge-ring">
          <svg viewBox="0 0 120 120" aria-hidden>
            <circle className="ring-track" cx="60" cy="60" r={RADIUS} />
            <circle
              className="ring-fill"
              cx="60"
              cy="60"
              r={RADIUS}
              style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: CIRCUMFERENCE * (1 - ratio) }}
            />
          </svg>
          <span className="badge-ring-emoji" aria-hidden>
            {badge.emoji}
          </span>
        </div>

        <p className={`badge-status ${badge.earned ? 'done' : ''}`}>
          {badge.earned ? 'Badge earned' : `${badge.current} of ${badge.target} ${badge.unit}`}
        </p>
        <h2 id="badge-title">{badge.title}</h2>
        <p className="muted">{badge.earned ? badge.earnedNote : badge.how}</p>

        {!badge.earned && (
          <div className="badge-progress" aria-hidden>
            <div style={{ width: `${Math.max(4, ratio * 100)}%` }} />
          </div>
        )}

        <div className="row">
          <button ref={closeRef} className={badge.earned ? 'btn primary grow' : 'btn'} onClick={onClose}>
            {badge.earned ? 'Done' : 'Close'}
          </button>
          {!badge.earned && (
            <button className="btn primary grow" onClick={() => onGo(badge.action.to)}>
              {badge.action.label}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
