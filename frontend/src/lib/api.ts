import type { Me, Offer, Redemption, Reference, Scan, ScanResponse, ScoredItem } from './types';

const USER_KEY = 'ecoscan.userId';
let memoryUserId: string | undefined;

/** Anonymous per-device identity; falls back to memory if storage is blocked. */
function userId(): string {
  try {
    let id = localStorage.getItem(USER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(USER_KEY, id);
    }
    return id;
  } catch {
    return (memoryUserId ??= crypto.randomUUID());
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-User-Id', userId());
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const res = await fetch(`/api${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

const serverApi = {
  health: () => call<{ recognizer: string }>('/health'),
  reference: () => call<Reference>('/reference'),
  me: () => call<Me>('/me'),
  offers: () => call<Offer[]>('/offers'),
  scan: (image: Blob, filename: string, label?: Blob) => {
    const form = new FormData();
    form.append('image', image, filename);
    if (label) form.append('label', label, 'care-label.jpg');
    return call<ScanResponse>('/scans', { method: 'POST', body: form });
  },
  getScan: (scanId: string) => call<ScanResponse>(`/scans/${scanId}`),
  updateItems: (scanId: string, items: Omit<ScoredItem, 'carbon' | 'confidence'>[]) =>
    call<ScanResponse>(`/scans/${scanId}/items`, { method: 'PUT', body: JSON.stringify({ items }) }),
  claim: (scanId: string) => call<{ scan: Scan; user: Me }>(`/scans/${scanId}/claim`, { method: 'POST' }),
  redeem: (offerId: string) => call<{ redemption: Redemption; user: Me }>(`/offers/${offerId}/redeem`, { method: 'POST' }),
};

type Api = typeof serverApi;
let impl: Api = serverApi;
let offline = false;

/** True once the app has switched to the in-browser fallback. */
export const isOffline = () => offline;

/**
 * Check the backend is reachable. If it isn't (not started, crashed, or only the frontend was deployed), switch to
 * the in-browser implementation, which runs the same scoring code and keeps data on this device.
 */
export async function connect(): Promise<{ recognizer: string; offline: boolean }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('/api/health', { signal: controller.signal, headers: { 'X-User-Id': userId() } });
    clearTimeout(timer);
    const body = (await res.json()) as { ok?: boolean; recognizer?: string };
    if (!res.ok || !body.ok || !body.recognizer) throw new Error('Unexpected health response');
    return { recognizer: body.recognizer, offline: false };
  } catch {
    const { api: local } = await import('./demoApi');
    impl = local as unknown as Api;
    offline = true;
    return { recognizer: 'offline', offline: true };
  }
}

/** Every call goes through the active implementation (the server, or the in-browser fallback). */
export const api: Api = new Proxy(serverApi, {
  get: (_target, key: keyof Api) => impl[key],
});
