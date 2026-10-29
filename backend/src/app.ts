import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { CATEGORY_PROFILES } from './data/categories.js';
import { MATERIALS } from './data/materials.js';
import { OFFERS } from './data/offers.js';
import { recommendOffers, scoreItems, withTotals } from './services/scans.js';
import { RecognizerError } from './services/recognition.js';
import type { Recognizer } from './services/recognizer.js';
import type { Store } from './services/store.js';
import { CATEGORIES, CONDITIONS, type DetectedItem, type User } from './types.js';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const editedItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(CATEGORIES),
  condition: z.enum(CONDITIONS),
  materials: z.array(z.object({ material: z.string().min(1), percent: z.number().min(0).max(100) })).min(1).max(6),
  color: z.string().max(40).optional(),
  brand: z.string().max(60).optional(),
  weightKg: z.number().positive().max(5).optional(),
});
const editItemsSchema = z.object({ items: z.array(editedItemSchema).max(5) });
// Materials are optional here: when omitted, the category's typical mix is assumed.
const scoreRequestSchema = z.object({
  items: z
    .array(
      editedItemSchema.extend({
        name: editedItemSchema.shape.name.optional(),
        condition: z.enum(CONDITIONS).default('new'),
        materials: editedItemSchema.shape.materials.optional(),
      }),
    )
    .min(1)
    .max(20),
});

function publicUser(user: User, store: Store) {
  const scans = store.scansForUser(user.id);
  return {
    ...user,
    scanCount: scans.length,
    itemsScanned: scans.reduce((n, s) => n + s.items.length, 0),
    recentScans: scans.slice(0, 20).map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      items: s.items.map((i) => ({ name: i.name, category: i.category, condition: i.condition, grade: i.carbon.grade, kgCO2e: i.carbon.kgCO2e, savedKgCO2e: i.carbon.savedKgCO2e })),
      totalKgCO2e: s.totalKgCO2e,
      totalPoints: s.totalPoints,
      claimed: s.claimed,
    })),
  };
}

export function createApp({ store, recognizer }: { store: Store; recognizer: Recognizer }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 2 },
    fileFilter: (_req, file, cb) =>
      file.mimetype.startsWith('image/') ? cb(null, true) : cb(new HttpError(415, 'Please upload an image file')),
  });

  // Anonymous identity: the client generates an id and sends it on every request.
  const userId = (req: Request) => {
    const id = req.header('x-user-id') ?? '';
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) throw new HttpError(401, 'Missing or invalid X-User-Id header');
    return id;
  };

  const ownScan = (req: Request) => {
    const scan = store.getScan(req.params.id as string);
    if (!scan || scan.userId !== userId(req)) throw new HttpError(404, 'Scan not found');
    return scan;
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, recognizer: recognizer.name });
  });

  /**
   * Eco-score calculation on its own: send garment descriptions (no image) and get each item's carbon footprint,
   * grade and eco-reward points, plus totals. Nothing is stored.
   */
  app.post('/api/score', (req, res) => {
    const { items } = scoreRequestSchema.parse(req.body);
    const scored = scoreItems(
      items.map((i) => ({ ...i, name: i.name ?? CATEGORY_PROFILES[i.category].label, materials: i.materials ?? [], confidence: 1 })),
    );
    const sum = (f: (i: (typeof scored)[number]) => number) => Math.round(scored.reduce((s, i) => s + f(i), 0) * 100) / 100;
    res.json({
      items: scored,
      totalKgCO2e: sum((i) => i.carbon.kgCO2e),
      totalSavedKgCO2e: sum((i) => i.carbon.savedKgCO2e),
      totalPoints: scored.reduce((s, i) => s + i.carbon.points, 0),
    });
  });

  app.get('/api/reference', (_req, res) => {
    res.json({
      categories: CATEGORIES.map((id) => ({ id, label: CATEGORY_PROFILES[id].label, weightKg: CATEGORY_PROFILES[id].weightKg })),
      materials: MATERIALS.map(({ id, label, kgCO2ePerKg }) => ({ id, label, kgCO2ePerKg })),
      conditions: CONDITIONS,
    });
  });

  const scanUpload = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'label', maxCount: 1 },
  ]);

  app.post('/api/scans', scanUpload, async (req, res) => {
    const uid = userId(req);
    store.getOrCreateUser(uid);
    const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
    const [garment] = files.image ?? [];
    const [labelFile] = files.label ?? [];
    if (!garment) throw new HttpError(400, 'No image provided (expected multipart field "image")');

    const toInput = (f: Express.Multer.File) => ({ buffer: f.buffer, mimeType: f.mimetype, filename: f.originalname });
    const image = toInput(garment);
    const label = labelFile && toInput(labelFile);
    // The garment photo identifies the scan; a care-label photo only refines it.
    const imageHash = createHash('sha256').update(garment.buffer).digest('hex');

    let detected: DetectedItem[];
    let warning: string | undefined;
    try {
      detected = await recognizer.recognize(image, label);
    } catch (err) {
      // Never invent a garment: a made-up result for the wrong photo is worse than an honest error.
      console.error('[recognizer]', err);
      if (err instanceof RecognizerError) throw new HttpError(err.status, err.message);
      throw new HttpError(502, `Image recognition failed: ${(err as Error).message}`);
    }
    const recognizerName = recognizer.name;

    const duplicate = store.findClaimedScanByHash(uid, imageHash);
    if (duplicate) warning = 'You already earned points for this photo, so this scan is for information only.';

    const scan = withTotals({
      id: randomUUID(),
      userId: uid,
      createdAt: new Date().toISOString(),
      imageHash,
      recognizer: recognizerName,
      items: scoreItems(detected),
      claimed: false,
      duplicateOf: duplicate?.id,
      hasLabel: Boolean(label),
      warning,
    });
    store.saveScan(scan);
    res.status(201).json({ scan, recommendedOffers: recommendOffers(scan.items) });
  });

  app.get('/api/scans/:id', (req, res) => {
    const scan = ownScan(req);
    res.json({ scan, recommendedOffers: recommendOffers(scan.items) });
  });

  /** Let the user correct what the model detected (e.g. read the care label) and re-score. */
  app.put('/api/scans/:id/items', (req, res) => {
    const scan = ownScan(req);
    if (scan.claimed) throw new HttpError(409, 'Points for this scan were already claimed');
    const { items } = editItemsSchema.parse(req.body);
    const updated = withTotals({ ...scan, items: scoreItems(items.map((i) => ({ ...i, confidence: 1 }))) });
    store.saveScan(updated);
    res.json({ scan: updated, recommendedOffers: recommendOffers(updated.items) });
  });

  app.post('/api/scans/:id/claim', (req, res) => {
    const scan = ownScan(req);
    if (scan.claimed) throw new HttpError(409, 'Points for this scan were already claimed');
    const user = store.getOrCreateUser(scan.userId);
    // Re-check at claim time: another scan of the same photo may have been claimed meanwhile.
    const duplicate = store.findClaimedScanByHash(user.id, scan.imageHash);
    const claimed = withTotals({ ...scan, claimed: true, duplicateOf: scan.duplicateOf ?? duplicate?.id });
    user.points += claimed.totalPoints;
    user.lifetimePoints += claimed.totalPoints;
    if (!claimed.duplicateOf) {
      user.lifetimeSavedKgCO2e = Math.round((user.lifetimeSavedKgCO2e + claimed.totalSavedKgCO2e) * 100) / 100;
    }
    store.saveScan(claimed);
    store.saveUser(user);
    res.json({ scan: claimed, user: publicUser(user, store) });
  });

  app.get('/api/me', (req, res) => {
    res.json(publicUser(store.getOrCreateUser(userId(req)), store));
  });

  /**
   * Offers, annotated with whether the caller can redeem each one. Without an X-User-Id header every offer is
   * returned as-is. `?affordable=true` returns only the offers the user has enough points for.
   */
  app.get('/api/offers', (req, res) => {
    const id = req.header('x-user-id');
    const points = id && /^[A-Za-z0-9_-]{8,64}$/.test(id) ? store.getOrCreateUser(id).points : undefined;
    let offers = OFFERS.map((o) =>
      points === undefined ? o : { ...o, affordable: points >= o.cost, pointsNeeded: Math.max(0, o.cost - points) },
    );
    if (req.query.affordable === 'true') {
      if (points === undefined) throw new HttpError(401, 'X-User-Id header is required to filter by affordability');
      offers = offers.filter((o) => 'affordable' in o && o.affordable);
    }
    res.json(offers);
  });

  app.post('/api/offers/:id/redeem', (req, res) => {
    const user = store.getOrCreateUser(userId(req));
    const offer = OFFERS.find((o) => o.id === req.params.id);
    if (!offer) throw new HttpError(404, 'Offer not found');
    if (user.points < offer.cost) throw new HttpError(400, `You need ${offer.cost - user.points} more points for this offer`);
    const redemption = {
      id: randomUUID(),
      offerId: offer.id,
      cost: offer.cost,
      code: `ECO-${randomBytes(4).toString('hex').toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
    user.points -= offer.cost;
    user.redemptions.unshift(redemption);
    store.saveUser(user);
    res.status(201).json({ redemption, user: publicUser(user, store) });
  });

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));

  // In production, serve the built frontend from the same origin.
  const webDist = fileURLToPath(new URL('../../frontend/dist', import.meta.url));
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(`${webDist}/index.html`));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.issues });
    }
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 10 MB)' : err.message;
      return res.status(400).json({ error: message });
    }
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    // Malformed JSON bodies and other client errors raised by Express' body parser.
    const status = (err as { status?: number }).status;
    if (status && status >= 400 && status < 500) {
      const parseFailed = (err as { type?: string }).type === 'entity.parse.failed';
      return res.status(status).json({ error: parseFailed ? 'Request body is not valid JSON' : (err as Error).message });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}
