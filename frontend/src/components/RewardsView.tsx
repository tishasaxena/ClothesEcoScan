import { useState } from 'react';
import { CountUp } from '../lib/motion';
import { rewardProgress } from '../lib/rewards';
import type { Me, Offer, Redemption } from '../lib/types';
import { Icon } from './Icon';
import { InfoList, InfoSheet } from './InfoSheet';
import { OfferCard } from './OfferCard';

interface Props {
  me?: Me;
  offers: Offer[];
  onRedeem: (offer: Offer) => void;
  onScan: () => void;
}

export function RewardsView({ me, offers, onRedeem, onScan }: Props) {
  const titles = new Map(offers.map((o) => [o.id, o]));
  const [showImpact, setShowImpact] = useState(false);
  const [voucher, setVoucher] = useState<Redemption>();
  const [copied, setCopied] = useState(false);
  const spent = (me?.redemptions ?? []).reduce((s, r) => s + r.cost, 0);
  const saved = me?.lifetimeSavedKgCO2e ?? 0;
  const progress = rewardProgress(me?.points ?? 0, offers);

  const copy = async (code: string, el: HTMLElement | null) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard refused: select the code so it can be copied by hand.
      if (el) window.getSelection()?.selectAllChildren(el);
    }
  };
  return (
    <section className="rewards-layout">
      <div className="rewards-side">
        <button className="wallet tappable" onClick={() => setShowImpact(true)} aria-label="Your impact: see the breakdown">
          <span className="tap-hint" aria-hidden>
            <Icon name="arrow" size={16} />
          </span>
          <p className="eyebrow light">Eco points</p>
          <p className="wallet-points">
            <CountUp value={me?.points ?? 0} />
          </p>
          <div className="wallet-stats">
            <div>
              <strong>
                <CountUp value={me?.lifetimeSavedKgCO2e ?? 0} decimals={1} /> kg
              </strong>
              <span>CO₂e saved</span>
            </div>
            <div>
              <strong>{me?.itemsScanned ?? 0}</strong>
              <span>items scanned</span>
            </div>
            <div>
              <strong>{me?.lifetimePoints ?? 0}</strong>
              <span>points earned</span>
            </div>
          </div>
          {progress.kind === 'next' && (
            <span className="wallet-next">
              <span className="wallet-next-label">
                <span>
                  {progress.offer.emoji} <strong>{progress.needed} pts</strong> to {progress.offer.title}
                </span>
                {progress.ready > 0 && <span className="wallet-ready">{progress.ready} ready to redeem</span>}
              </span>
              <span className="wallet-next-bar" aria-hidden>
                <span style={{ width: `${Math.max(3, progress.ratio * 100)}%` }} />
              </span>
            </span>
          )}
          {progress.kind === 'all' && (
            <span className="wallet-next">
              <span className="wallet-next-label">
                <span>
                  🎉 You can redeem <strong>every reward</strong> ({progress.ready})
                </span>
              </span>
            </span>
          )}
        </button>

        <details className="card how" open={!me?.lifetimePoints}>
          <summary>How you earn points</summary>
          <ul>
            <li>
              <strong>10 pts</strong> per kg CO₂e your item saves versus a typical new one
            </li>
            <li>
              <strong>+20 pts</strong> for second-hand finds
            </li>
            <li>
              <strong>up to +10 pts</strong> for lower-impact fibres (organic, recycled, linen, hemp, lyocell)
            </li>
            <li>
              <strong>+5 pts</strong> for every scan — knowing your footprint is the first step
            </li>
          </ul>
        </details>
      </div>

      <div className="rewards-main">
        <h3>Spend your points</h3>
        <div className="offers">
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} balance={me?.points ?? 0} onOpen={() => onRedeem(o)} />
          ))}
        </div>

        {me && me.redemptions.length > 0 && (
          <>
            <h3>Your vouchers</h3>
            <ul className="list card">
              {me.redemptions.map((r) => (
                <li key={r.id}>
                  <button
                    className="history-row voucher-row"
                    onClick={() => {
                      setCopied(false);
                      setVoucher(r);
                    }}
                  >
                    <span className="grow">
                      {titles.get(r.offerId)?.emoji} {titles.get(r.offerId)?.title ?? r.offerId}
                      <span className="muted small block">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </span>
                    <code>{r.code}</code>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {showImpact && (
        <InfoSheet
          visual="🌍"
          eyebrow="Your impact"
          title={`${saved.toFixed(1)} kg CO₂e saved`}
          onClose={() => setShowImpact(false)}
          actions={
            <button
              className="btn primary grow"
              onClick={() => {
                setShowImpact(false);
                onScan();
              }}
            >
              <Icon name="scan" size={18} /> Scan to save more
            </button>
          }
        >
          {saved > 0 ? (
            <p>
              Compared with buying typical new versions, your choices have avoided the same emissions as{' '}
              <strong>{Math.round(saved / 0.17)} km</strong> of driving, or <strong>{Math.round(saved / (22 / 365))} days</strong>{' '}
              of a tree absorbing CO₂.
            </p>
          ) : (
            <p>
              Nothing saved yet. Savings come from items with a lower footprint than a typical new one, so scanning a{' '}
              <strong>second-hand</strong> find or something made from <strong>linen, hemp or recycled fibres</strong> is the
              quickest way to start.
            </p>
          )}
          <InfoList
            rows={[
              ['Points available', `${me?.points ?? 0} pts`],
              ['Points earned in total', `${me?.lifetimePoints ?? 0} pts`],
              ['Points spent on rewards', `${spent} pts`],
              ['Items scanned', me?.itemsScanned ?? 0],
              ['Rewards redeemed', me?.redemptions.length ?? 0],
            ]}
          />
        </InfoSheet>
      )}

      {voucher && (
        <InfoSheet
          visual={titles.get(voucher.offerId)?.emoji ?? '🎁'}
          eyebrow={titles.get(voucher.offerId)?.partner ?? 'Voucher'}
          title={titles.get(voucher.offerId)?.title ?? 'Voucher'}
          onClose={() => setVoucher(undefined)}
          actions={
            <button
              className="btn accent grow"
              onClick={(e) => copy(voucher.code, e.currentTarget.closest('.info-sheet')?.querySelector('.voucher') ?? null)}
            >
              {copied ? 'Copied' : 'Copy code'}
            </button>
          }
        >
          <p className="center-text">Show this code at {titles.get(voucher.offerId)?.partner ?? 'the partner'}:</p>
          <code className="voucher center-text">{voucher.code}</code>
          <p className="small center-text">
            Redeemed on {new Date(voucher.createdAt).toLocaleDateString()} for {voucher.cost} pts.
          </p>
        </InfoSheet>
      )}
    </section>
  );
}
