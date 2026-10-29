import { useCallback, useEffect, useRef, useState } from 'react';

/** The app's screens. Each has its own URL hash, so the browser/phone back gesture moves between them. */
export type Route = { name: 'scan' } | { name: 'result'; id: string } | { name: 'rewards' } | { name: 'wardrobe' };

const HOME = '#scan';

export function routeToHash(route: Route): string {
  return route.name === 'result' ? `#result-${route.id}` : `#${route.name}`;
}

export function hashToRoute(hash: string): Route {
  const h = hash.replace(/^#/, '');
  if (h === 'rewards' || h === 'wardrobe') return { name: h };
  const m = /^result-([A-Za-z0-9-]{8,64})$/.exec(h);
  if (m) return { name: 'result', id: m[1] };
  return { name: 'scan' };
}

/**
 * Hash-based navigation with an in-app back stack. `navigate` adds a history entry; `back` returns to the previous
 * screen inside the app, or to the home screen when there's nothing earlier (instead of leaving the app).
 */
export function useHashRoute() {
  const current = () => window.location.hash || HOME;
  const [route, setRoute] = useState<Route>(() => hashToRoute(current()));
  const stack = useRef<string[]>([current()]);

  useEffect(() => {
    const onChange = () => {
      const h = current();
      const s = stack.current;
      if (s.length > 1 && s[s.length - 2] === h) s.pop();
      else if (s[s.length - 1] !== h) s.push(h);
      setRoute(hashToRoute(h));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route, { replace = false } = {}) => {
    const hash = routeToHash(next);
    if (hash === current()) {
      setRoute(next);
      window.scrollTo({ top: 0 });
      return;
    }
    if (replace) {
      stack.current[stack.current.length - 1] = hash;
      window.location.replace(hash);
    } else {
      window.location.hash = hash;
    }
  }, []);

  const back = useCallback(() => {
    if (stack.current.length > 1) window.history.back();
    else navigate({ name: 'scan' }, { replace: true });
  }, [navigate]);

  return { route, navigate, back };
}
