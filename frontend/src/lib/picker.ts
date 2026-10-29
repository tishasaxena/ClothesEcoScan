import { useCallback, useEffect, useRef, useState } from 'react';

export type PickerKind = 'camera' | 'photos';

/**
 * Open a file input's picker from the current tap. `showPicker()` is allowed for file inputs even inside
 * cross-origin frames (like the claude.ai viewer) and avoids relying on a <label> forwarding the tap.
 */
export function openPicker(inputId: string) {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  if (!input) return;
  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
  } catch {
    // Not allowed here or already open: fall back to a plain click.
  }
  input.click();
}

/**
 * Tracks a picker being opened. While it opens (cameras can take a second or two to start) `opening` is set so
 * the UI can show feedback, and repeat taps are ignored. When a picker opens, the page loses focus or is hidden;
 * some in-app viewers (such as the Claude mobile app's) open nothing at all, so if the page keeps focus for 2.5s,
 * `blocked` turns true so the UI can explain what to do instead.
 */
export function usePickerWatch() {
  const [blocked, setBlocked] = useState(false);
  const [opening, setOpening] = useState<PickerKind>();
  const openingRef = useRef(false);
  const timer = useRef<number>(undefined);
  const cleanup = useRef<() => void>(undefined);

  const clear = useCallback(() => {
    window.clearTimeout(timer.current);
    cleanup.current?.();
    openingRef.current = false;
    setOpening(undefined);
    setBlocked(false);
  }, []);

  /** Call on the tap that opens a picker. Returns false if one is already opening (ignore the repeat tap). */
  const watch = useCallback(
    (kind: PickerKind = 'camera') => {
      if (openingRef.current) return false;
      clear();
      openingRef.current = true;
      setOpening(kind);
      const opened = () => clear();
      window.addEventListener('blur', opened, { once: true });
      document.addEventListener('visibilitychange', opened, { once: true });
      cleanup.current = () => {
        window.removeEventListener('blur', opened);
        document.removeEventListener('visibilitychange', opened);
      };
      timer.current = window.setTimeout(() => {
        cleanup.current?.();
        openingRef.current = false;
        setOpening(undefined);
        setBlocked(true);
      }, 2500);
      return true;
    },
    [clear],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { blocked, opening, watch, clear };
}

/** True on phones and tablets, where a capture file input opens the device camera directly. */
export function useIsTouchDevice(): boolean {
  const query = '(pointer: coarse) and (max-width: 959px)';
  const [match, setMatch] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return;
    const onChange = () => setMatch(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return match;
}
