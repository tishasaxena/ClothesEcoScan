import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Animate a number towards `target` (ease-out), starting from the last value shown. */
export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0);
  const from = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = origin + (target - origin) * eased;
      from.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const shown = useCountUp(value);
  return <>{shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

const CONFETTI_COLORS = ['var(--moss)', 'var(--accent)', 'var(--brand)', 'var(--g-B)', 'var(--coral)'];

/** A short burst of fabric-swatch confetti. Decorative; hidden from assistive tech. */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  const [bits] = useState(() =>
    Array.from({ length: pieces }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      drift: (Math.random() - 0.5) * 160,
      spin: (Math.random() - 0.5) * 720,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w: 6 + Math.random() * 6,
    })),
  );
  if (prefersReducedMotion()) return null;
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          style={
            {
              left: `${b.left}%`,
              width: b.w,
              background: b.color,
              animationDelay: `${b.delay}s`,
              '--drift': `${b.drift}px`,
              '--spin': `${b.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
