import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Confetti, CountUp } from '../lib/motion';
import { recognizerLabel } from '../lib/recognizer';
import type { Me, Offer, Reference, Scan, ScanResponse } from '../lib/types';
import { Icon } from './Icon';
import { ItemCard } from './ItemCard';
import { ItemEditor, type EditableItem } from './ItemEditor';
import { OfferCard } from './OfferCard';
import { PhotoCarousel } from './PhotoCarousel';

interface Props {
  result: ScanResponse;
  photos: string[];
  reference?: Reference;
  me?: Me;
  onChange: (result: ScanResponse) => void;
  onClaimed: (scan: Scan, me: Me) => void;
  onRedeem: (offer: Offer) => void;
  onScanAgain: () => void;
}

export function ResultView({ result, photos, reference, me, onChange, onClaimed, onRedeem, onScanAgain }: Props) {
  const { scan, recommendedOffers } = result;
  const [editing, setEditing] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const successRef = useRef<HTMLDivElement>(null);
  const wasClaimed = useRef(scan.claimed);

  // After claiming, bring the confirmation into view (on phones it sits below the item cards).
  useEffect(() => {
    if (scan.claimed && !wasClaimed.current) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      successRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }
    wasClaimed.current = scan.claimed;
  }, [scan.claimed]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveItem = (index: number, edited: EditableItem) =>
    run(async () => {
      const items = scan.items.map(({ carbon: _c, confidence: _f, ...rest }, i) => (i === index ? edited : rest));
      onChange(await api.updateItems(scan.id, items));
      setEditing(undefined);
    });

  const claim = () =>
    run(async () => {
      const { scan: claimed, user } = await api.claim(scan.id);
      onClaimed(claimed, user);
    });

  if (scan.items.length === 0) {
    return (
      <section className="stack center">
        {photos[0] && <img className="thumb" src={photos[0]} alt="" />}
        <h1>No clothing spotted</h1>
        <p className="muted">Try a closer photo with the garment filling most of the frame, or snap its care label.</p>
        <button className="btn primary" onClick={onScanAgain}>
          <Icon name="scan" size={18} /> Scan again
        </button>
      </section>
    );
  }

  return (
    <section className="result-layout">
      <aside className="result-aside">
        <div className="result-head card">
          <PhotoCarousel photos={photos} />
          <div>
            <p className="eyebrow">Scan result</p>
            <p className="result-total">
              <CountUp value={scan.totalKgCO2e} decimals={1} /> <span>kg CO₂e</span>
            </p>
            <p className="muted small">
              {scan.items.length === 1 ? '1 item' : `${scan.items.length} items`} · identified by{' '}
              {recognizerLabel(scan.recognizer)}
              {scan.hasLabel && ' · care label included'}
            </p>
          </div>
        </div>

        {scan.warning && <p className="banner">{scan.warning}</p>}
        {error && <p className="error">{error}</p>}

        {scan.claimed ? (
          <div className="card success" ref={successRef}>
            {scan.totalPoints > 0 && <Confetti />}
            <div className="success-badge" aria-hidden>
              <Icon name="check" size={30} />
            </div>
            <h2>{scan.totalPoints > 0 ? `+${scan.totalPoints} eco points added` : 'Scan saved'}</h2>
            <p className="muted">
              {scan.totalSavedKgCO2e > 0 ? `That’s ${scan.totalSavedKgCO2e.toFixed(1)} kg CO₂e saved. ` : ''}
              Balance: <strong>{me?.points ?? '—'} pts</strong>
            </p>
            <button className="btn primary" onClick={onScanAgain}>
              <Icon name="scan" size={18} /> Scan another item
            </button>
          </div>
        ) : (
          <div className="claim-bar">
            <div>
              <strong>
                <CountUp value={scan.totalPoints} /> pts
              </strong>
              <span className="small">{scan.duplicateOf ? 'Already claimed for this photo' : 'includes +5 for scanning'}</span>
            </div>
            <button className="btn accent" onClick={claim} disabled={busy || editing !== undefined}>
              {scan.totalPoints > 0 ? `Claim ${scan.totalPoints} points` : 'Save to history'}
            </button>
          </div>
        )}

        {recommendedOffers.length > 0 && (
          <div className="result-offers">
            <h3>Rewards picked for you</h3>
            <div className="offers">
              {recommendedOffers.map((o) => (
                <OfferCard key={o.id} offer={o} balance={me?.points ?? 0} onOpen={() => onRedeem(o)} />
              ))}
            </div>
          </div>
        )}
      </aside>

      <div className="result-main">
        {scan.items.map((item, i) =>
          editing === i && reference ? (
            <ItemEditor
              key={i}
              item={item}
              reference={reference}
              saving={busy}
              onSave={(edited) => saveItem(i, edited)}
              onCancel={() => setEditing(undefined)}
            />
          ) : (
            <ItemCard key={i} item={item} editable={!scan.claimed && editing === undefined} onEdit={() => setEditing(i)} />
          ),
        )}
      </div>
    </section>
  );
}
