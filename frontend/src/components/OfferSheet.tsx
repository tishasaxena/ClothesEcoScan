import { useEffect, useRef } from 'react';
import { Confetti } from '../lib/motion';
import type { Offer, Redemption } from '../lib/types';
import { Icon } from './Icon';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  offer: Offer;
  balance: number;
  redemption?: Redemption;
  error?: string;
  busy?: boolean;
  onClose: () => void;
  onRedeem: () => void;
  onEarnMore: () => void;
}

/** Reward detail: progress towards it, then redeem and show the voucher code. */
export function OfferSheet({ offer, balance, redemption, error, busy, onClose, onRedeem, onEarnMore }: Props) {
  const focusRef = useRef<HTMLButtonElement>(null);
  const short = offer.cost - balance;
  const affordable = short <= 0;
  const ratio = Math.min(1, balance / offer.cost);

  useEffect(() => {
    focusRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy, redemption]);

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div
        className={`modal card offer-sheet ${affordable || redemption ? 'earned' : ''}`}
        role="dialog"
        aria-modal
        aria-labelledby="offer-title"
        onClick={(e) => e.stopPropagation()}
      >
        {redemption && <Confetti />}
        <div className="badge-ring">
          <svg viewBox="0 0 120 120" aria-hidden>
            <circle className="ring-track" cx="60" cy="60" r={RADIUS} />
            <circle
              className="ring-fill"
              cx="60"
              cy="60"
              r={RADIUS}
              style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: CIRCUMFERENCE * (1 - (redemption ? 1 : ratio)) }}
            />
          </svg>
          <span className="badge-ring-emoji" aria-hidden>
            {offer.emoji}
          </span>
        </div>

        {redemption ? (
          <>
            <p className="badge-status done">Redeemed</p>
            <h2 id="offer-title">Enjoy!</h2>
            <p className="muted">Show this code at {offer.partner}:</p>
            <code className="voucher">{redemption.code}</code>
            <div className="row">
              <button ref={focusRef} className="btn primary grow" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={`badge-status ${affordable ? 'done' : ''}`}>
              {affordable ? 'Ready to redeem' : `${balance} of ${offer.cost} pts · ${short} to go`}
            </p>
            <p className="eyebrow">{offer.partner}</p>
            <h2 id="offer-title">{offer.title}</h2>
            <p className="muted">{offer.description}</p>
            {affordable ? (
              <p className="small">
                Spend <strong>{offer.cost} pts</strong>. You’ll have {balance - offer.cost} left.
              </p>
            ) : (
              <>
                <div className="badge-progress" aria-hidden>
                  <div style={{ width: `${Math.max(4, ratio * 100)}%` }} />
                </div>
                <p className="small muted">Earn points by scanning lower-impact clothes. Second-hand finds earn the most.</p>
              </>
            )}
            {error && <p className="error">{error}</p>}
            <div className="row">
              <button className="btn" onClick={onClose} disabled={busy}>
                {affordable ? 'Cancel' : 'Close'}
              </button>
              {affordable ? (
                <button ref={focusRef} className="btn accent grow" onClick={onRedeem} disabled={busy}>
                  {busy ? 'Redeeming…' : `Redeem for ${offer.cost} pts`}
                </button>
              ) : (
                <button ref={focusRef} className="btn primary grow" onClick={onEarnMore}>
                  <Icon name="scan" size={18} /> Scan to earn more
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
