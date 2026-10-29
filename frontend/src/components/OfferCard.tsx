import type { Offer } from '../lib/types';
import { Icon } from './Icon';

/** A reward. The whole card is tappable and opens the reward sheet, whether or not it's affordable yet. */
export function OfferCard({ offer, balance, onOpen }: { offer: Offer; balance: number; onOpen: () => void }) {
  const short = offer.cost - balance;
  const affordable = short <= 0;
  return (
    <button
      className={`card offer ${affordable ? 'affordable' : 'locked'}`}
      onClick={onOpen}
      aria-label={`${offer.title} from ${offer.partner}, ${offer.cost} points${affordable ? ', ready to redeem' : `, ${short} more points needed`}`}
    >
      <span className="offer-emoji" aria-hidden>
        {offer.emoji}
      </span>
      <span className="grow offer-body">
        <span className="eyebrow block">{offer.partner}</span>
        <span className="offer-title block">{offer.title}</span>
        <span className="muted small block">{offer.description}</span>
        {!affordable && (
          <span className="progress block" aria-hidden>
            <span style={{ width: `${Math.min(100, (balance / offer.cost) * 100)}%` }} />
          </span>
        )}
      </span>
      <span className={`offer-cta ${affordable ? 'ready' : ''}`} aria-hidden>
        {affordable ? (
          <>
            Redeem · {offer.cost} pts <Icon name="arrow" size={16} />
          </>
        ) : (
          <>
            {offer.cost} pts <span className="offer-short">· {short} to go</span>
          </>
        )}
      </span>
    </button>
  );
}
