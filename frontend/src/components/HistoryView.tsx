import { useState } from 'react';
import { badgesFor, type BadgeAction } from '../lib/badges';
import { BadgeSheet } from './BadgeSheet';
import { CountUp } from '../lib/motion';
import type { Grade as G, Me } from '../lib/types';
import { Grade } from './Grade';
import { Icon } from './Icon';
import { InfoList, InfoSheet } from './InfoSheet';
import { getThumb } from '../lib/thumbs';

const GRADES: G[] = ['A', 'B', 'C', 'D', 'E'];

interface Props {
  me?: Me;
  onOpen: (scanId: string) => void;
  onScan: () => void;
  onGo: (to: BadgeAction) => void;
}

export function HistoryView({ me, onOpen, onScan, onGo }: Props) {
  const [openBadge, setOpenBadge] = useState<string>();
  const [showStats, setShowStats] = useState(false);
  if (!me || me.recentScans.length === 0) {
    return (
      <section className="stack center">
        <div className="dropzone-icon" aria-hidden>
          <Icon name="hanger" size={34} />
        </div>
        <h1>No scans yet</h1>
        <p className="muted">Your scanned wardrobe will show up here.</p>
        <button className="btn primary" onClick={onScan}>
          Scan your first item
        </button>
      </section>
    );
  }

  const items = me.recentScans.flatMap((s) => s.items);
  const withScan = me.recentScans.flatMap((s) => s.items.map((item) => ({ ...item, scanId: s.id })));
  const highest = [...withScan].sort((a, b) => b.kgCO2e - a.kgCO2e)[0];
  const lowest = [...withScan].sort((a, b) => a.kgCO2e - b.kgCO2e)[0];
  const total = items.reduce((sum, i) => sum + i.kgCO2e, 0);
  const counts = GRADES.map((g) => ({ grade: g, n: items.filter((i) => i.grade === g).length }));
  const badges = badgesFor(me);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <section className="stack">
      <h1>Your wardrobe</h1>

      <div className="wardrobe-top">
        <button
          className="card stats tappable"
          onClick={() => setShowStats(true)}
          aria-label="Wardrobe footprint: see the breakdown"
        >
          <span className="tap-hint" aria-hidden>
            <Icon name="arrow" size={16} />
          </span>
          <div className="stat-row">
            <div>
              <strong>{items.length}</strong>
              <span>items</span>
            </div>
            <div>
              <strong>
                <CountUp value={total} decimals={1} /> kg
              </strong>
              <span>CO₂e footprint</span>
            </div>
            <div>
              <strong>
                <CountUp value={me.lifetimeSavedKgCO2e} decimals={1} /> kg
              </strong>
              <span>saved</span>
            </div>
          </div>
          <div className="grade-dist" role="img" aria-label={counts.map((c) => `${c.n} graded ${c.grade}`).join(', ')}>
            {counts.map((c) => c.n > 0 && <span key={c.grade} className={`grade-bg-${c.grade}`} style={{ flexGrow: c.n }} />)}
          </div>
          <ul className="grade-legend">
            {counts.map((c) => (
              <li key={c.grade}>
                <i className={`grade-bg-${c.grade}`} /> {c.grade} · {c.n}
              </li>
            ))}
          </ul>
        </button>

        <div className="stack-sm">
          <h3>
            Badges{' '}
            <span className="muted small">
              {earned} of {badges.length}
            </span>
          </h3>
          <ul className="badges">
            {badges.map((b) => (
              <li key={b.id}>
                <button
                  className={`badge-tile ${b.earned ? 'earned' : ''}`}
                  onClick={() => setOpenBadge(b.id)}
                  aria-label={`${b.title}: ${b.earned ? 'earned' : `${b.current} of ${b.target} ${b.unit}`}`}
                >
                  <span className="badge-emoji" aria-hidden>
                    {b.emoji}
                  </span>
                  <strong>{b.title}</strong>
                  <span className="small muted">{b.earned ? 'Earned' : b.description}</span>
                  {!b.earned && (
                    <span className="badge-mini-progress" aria-hidden>
                      <span style={{ width: `${(b.current / b.target) * 100}%` }} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3>Scans</h3>
      <ul className="list card">
        {me.recentScans.flatMap((s) =>
          s.items.map((item, i) => (
            <li key={`${s.id}-${i}`}>
              <button className="history-row" onClick={() => onOpen(s.id)}>
                <span className="history-thumb">
                  {getThumb(s.id) ? <img src={getThumb(s.id)} alt="" /> : <Grade grade={item.grade} size="sm" />}
                  {getThumb(s.id) && <span className={`garment-grade grade-${item.grade}`}>{item.grade}</span>}
                </span>
                <span className="grow">
                  {item.name}
                  <span className="muted small block">
                    {new Date(s.createdAt).toLocaleDateString()} · {item.kgCO2e.toFixed(1)} kg CO₂e
                    {item.condition === 'second-hand' && ' · second-hand'}
                  </span>
                </span>
                {s.claimed
                  ? s.totalPoints > 0 && i === 0 && <span className="points-chip">+{s.totalPoints}</span>
                  : i === 0 && <span className="pill">Unclaimed</span>}
              </button>
            </li>
          )),
        )}
      </ul>
      {openBadge && badges.find((b) => b.id === openBadge) && (
        <BadgeSheet
          badge={badges.find((b) => b.id === openBadge)!}
          onClose={() => setOpenBadge(undefined)}
          onGo={(to) => {
            setOpenBadge(undefined);
            onGo(to);
          }}
        />
      )}
      {showStats && highest && (
        <InfoSheet
          visual="👚"
          eyebrow="Wardrobe footprint"
          title={`${total.toFixed(1)} kg CO₂e across ${items.length} ${items.length === 1 ? 'item' : 'items'}`}
          onClose={() => setShowStats(false)}
          actions={
            <button
              className="btn primary grow"
              onClick={() => {
                setShowStats(false);
                onOpen(highest.scanId);
              }}
            >
              See {highest.name}
            </button>
          }
        >
          <InfoList
            rows={[
              ['Average per item', `${(total / items.length).toFixed(1)} kg`],
              ['Highest impact', `${highest.name} · ${highest.kgCO2e.toFixed(1)} kg`],
              ['Lowest impact', `${lowest.name} · ${lowest.kgCO2e.toFixed(1)} kg`],
              ['Saved vs. typical new', `${me.lifetimeSavedKgCO2e.toFixed(1)} kg`],
            ]}
          />
          <div className="grade-dist" aria-hidden>
            {counts.map((c) => c.n > 0 && <span key={c.grade} className={`grade-bg-${c.grade}`} style={{ flexGrow: c.n }} />)}
          </div>
          <p>
            <strong>{highest.name}</strong> is your biggest footprint. Wearing it for an extra 9 months cuts its yearly footprint
            by about a quarter, and choosing second-hand next time avoids around 90%.
          </p>
        </InfoSheet>
      )}
    </section>
  );
}
