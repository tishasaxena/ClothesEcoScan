/**
 * In-browser replacement for the HTTP API, used by the demo build
 * (`npm run build:demo`). It runs the same scoring code as the server, with the
 * mock recognizer, and keeps state in localStorage (or memory if blocked).
 */
import { CATEGORY_PROFILES } from '../../../backend/src/data/categories.js';
import { MATERIALS } from '../../../backend/src/data/materials.js';
import { pickMockItem } from '../../../backend/src/data/mockCatalog.js';
import { OFFERS } from '../../../backend/src/data/offers.js';
import { SYSTEM_PROMPT, responseSchema, toItem, userPrompt } from '../../../backend/src/services/recognition.js';
import { recommendOffers, scoreItems, withTotals } from '../../../backend/src/services/scans.js';
import { CATEGORIES, CONDITIONS, type DetectedItem, type Scan as ServerScan, type User } from '../../../backend/src/types.js';
import type { Me, Offer, Redemption, Reference, Scan, ScanResponse, ScoredItem } from './types';

const STATE_KEY = 'ecoscan.demo.v1';

/** Filenames of the built-in sample photos; these skip AI and use the sample matcher. */
export const SAMPLE_PREFIX = 'sample-';

// The claude.ai viewer's `sample` capability: asks Claude on the viewer's own account.
interface SampleFn {
  json<T>(input: string, options?: { images?: Blob[]; modelTier?: 'quick' | 'default' | 'complex' }): Promise<T>;
  limits(): Promise<{ images?: unknown }>;
}
interface SampleError {
  code: string;
}

let samplePromise: Promise<SampleFn | null> | undefined;
function claudeSample(): Promise<SampleFn | null> {
  const host = (window as unknown as { claude?: { use(name: string): Promise<unknown> } }).claude;
  if (!host?.use) return Promise.resolve(null);
  return (samplePromise ??= host.use('sample').then(
    (s) => (s as SampleFn | null) ?? null,
    () => null,
  ));
}

const claudePrompt = (hasLabel: boolean) => `${SYSTEM_PROMPT}

The attached photos are from a user of a clothing carbon-footprint app. ${userPrompt(hasLabel)}
Reply with only JSON in exactly this shape:
{"items":[{"name":"Short descriptive name","category":"one of ${CATEGORIES.join(' | ')}","materials":[{"material":"fibre name","percent":100}],"condition":"new or second-hand","color":"colour or null","brand":"brand if a logo or label is legible, else null","confidence":0.8}]}`;

const SAMPLE_FAILURES: Record<string, string> = {
  not_granted:
    'Claude wasn’t allowed to look at the photo, so this is a sample match. Allow Claude when asked to get a real analysis.',
  rate_limited: 'Claude is busy right now, so this is a sample match. Try again in a minute.',
  image_rejected: 'Claude couldn’t read this image format, so this is a sample match. Try a JPEG or PNG photo.',
};

/** Identify clothing with Claude when the page runs in claude.ai; otherwise null (use the sample matcher). */
async function recognizeWithClaude(image: Blob, label?: Blob): Promise<{ items: DetectedItem[] } | { warning: string } | null> {
  const sample = await claudeSample();
  if (!sample) return null;
  const limits = await sample.limits().catch(() => null);
  if (!limits?.images) return null;
  try {
    const raw = await sample.json(claudePrompt(Boolean(label)), {
      images: label ? [image, label] : [image],
      modelTier: 'default',
    });
    return { items: responseSchema.parse(raw).items.map(toItem) };
  } catch (err) {
    const code = (err as SampleError).code;
    return {
      warning:
        SAMPLE_FAILURES[code] ?? 'Claude couldn’t analyse this photo, so this is a sample match. You can edit the details below.',
    };
  }
}
const USER_ID = 'demo-user';

interface State {
  user: User;
  scans: ServerScan[];
}

function freshState(): State {
  return {
    user: {
      id: USER_ID,
      points: 0,
      lifetimePoints: 0,
      lifetimeSavedKgCO2e: 0,
      redemptions: [],
      createdAt: new Date().toISOString(),
    },
    scans: [],
  };
}

let memory: State | undefined;
function load(): State {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    memory = raw ? (JSON.parse(raw) as State) : freshState();
  } catch {
    memory = freshState();
  }
  return memory;
}
function save(state: State) {
  memory = state;
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Storage blocked: keep the in-memory copy for this visit.
  }
}

// Short pause so the scanning animation reads like a real request.
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fail = (message: string): never => {
  throw new Error(message);
};

function me(state: State): Me {
  const scans = [...state.scans].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    ...state.user,
    scanCount: scans.length,
    itemsScanned: scans.reduce((n, s) => n + s.items.length, 0),
    recentScans: scans.slice(0, 20).map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      items: s.items.map((i) => ({
        name: i.name,
        category: i.category,
        condition: i.condition,
        grade: i.carbon.grade,
        kgCO2e: i.carbon.kgCO2e,
        savedKgCO2e: i.carbon.savedKgCO2e,
      })),
      totalKgCO2e: s.totalKgCO2e,
      totalPoints: s.totalPoints,
      claimed: s.claimed,
    })),
  };
}

const respond = (scan: ServerScan): ScanResponse => ({ scan: scan as Scan, recommendedOffers: recommendOffers(scan.items) });

function getScan(state: State, id: string) {
  return state.scans.find((s) => s.id === id) ?? fail('Scan not found');
}

function putScan(state: State, scan: ServerScan) {
  save({ ...state, scans: [...state.scans.filter((s) => s.id !== scan.id), scan] });
}

export const api = {
  health: async () => ({ recognizer: 'demo' }),
  reference: async (): Promise<Reference> => ({
    categories: CATEGORIES.map((id) => ({ id, label: CATEGORY_PROFILES[id].label, weightKg: CATEGORY_PROFILES[id].weightKg })),
    materials: MATERIALS.map(({ id, label, kgCO2ePerKg }) => ({ id, label, kgCO2ePerKg })),
    conditions: [...CONDITIONS],
  }),
  me: async () => me(load()),
  offers: async (): Promise<Offer[]> => OFFERS,

  scan: async (image: Blob, filename: string, label?: Blob): Promise<ScanResponse> => {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await image.arrayBuffer()));
    const imageHash = Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');

    let items: DetectedItem[] | undefined;
    let recognizer = 'mock';
    let warning: string | undefined;
    const ai = filename.startsWith(SAMPLE_PREFIX) ? null : await recognizeWithClaude(image, label);
    if (ai && 'items' in ai) {
      items = ai.items;
      recognizer = 'claude';
    } else {
      warning = ai?.warning;
      await delay(1400);
      items = [pickMockItem(filename, digest[0])];
    }

    const state = load();
    const duplicate = state.scans.find((s) => s.imageHash === imageHash && s.claimed);
    if (duplicate) warning = 'You already earned points for this photo, so this scan is for information only.';
    const scan = withTotals({
      id: crypto.randomUUID(),
      userId: USER_ID,
      createdAt: new Date().toISOString(),
      imageHash,
      recognizer,
      items: scoreItems(items),
      claimed: false,
      duplicateOf: duplicate?.id,
      hasLabel: Boolean(label),
      warning,
    });
    putScan(state, scan);
    return respond(scan);
  },

  getScan: async (id: string) => respond(getScan(load(), id)),

  updateItems: async (id: string, items: Omit<ScoredItem, 'carbon' | 'confidence'>[]): Promise<ScanResponse> => {
    await delay(300);
    const state = load();
    const scan = getScan(state, id);
    if (scan.claimed) fail('Points for this scan were already claimed');
    const updated = withTotals({ ...scan, items: scoreItems(items.map((i) => ({ ...i, confidence: 1 })) as never) });
    putScan(state, updated);
    return respond(updated);
  },

  claim: async (id: string) => {
    const state = load();
    const scan = getScan(state, id);
    if (scan.claimed) fail('Points for this scan were already claimed');
    const duplicate = state.scans.find((s) => s.imageHash === scan.imageHash && s.claimed);
    const claimed = withTotals({ ...scan, claimed: true, duplicateOf: scan.duplicateOf ?? duplicate?.id });
    const user = { ...state.user };
    user.points += claimed.totalPoints;
    user.lifetimePoints += claimed.totalPoints;
    if (!claimed.duplicateOf)
      user.lifetimeSavedKgCO2e = Math.round((user.lifetimeSavedKgCO2e + claimed.totalSavedKgCO2e) * 100) / 100;
    const next = { user, scans: [...state.scans.filter((s) => s.id !== id), claimed] };
    save(next);
    return { scan: claimed as Scan, user: me(next) };
  },

  redeem: async (offerId: string) => {
    const state = load();
    const offer = OFFERS.find((o) => o.id === offerId) ?? fail('Offer not found');
    if (state.user.points < offer.cost) fail(`You need ${offer.cost - state.user.points} more points for this offer`);
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    const redemption: Redemption = {
      id: crypto.randomUUID(),
      offerId,
      cost: offer.cost,
      code: `ECO-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
    const user = { ...state.user, points: state.user.points - offer.cost, redemptions: [redemption, ...state.user.redemptions] };
    const next = { ...state, user };
    save(next);
    return { redemption, user: me(next) };
  },
};

/** Same contract as the server client's connect(): this build always runs in the browser. */
export async function connect(): Promise<{ recognizer: string; offline: boolean }> {
  return { recognizer: 'demo', offline: false };
}
