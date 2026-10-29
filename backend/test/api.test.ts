import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { MockRecognizer } from '../src/services/recognizer.js';
import { Store } from '../src/services/store.js';

const USER = 'test-user-1234';
const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

describe('API', () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(() => {
    app = createApp({ store: new Store(), recognizer: new MockRecognizer() });
  });

  const scan = (file = 'jeans.png', body = png) =>
    request(app).post('/api/scans').set('X-User-Id', USER).attach('image', body, { filename: file, contentType: 'image/png' });

  it('requires a user id', async () => {
    await request(app).get('/api/me').expect(401);
  });

  it('rejects non-image uploads', async () => {
    await request(app)
      .post('/api/scans')
      .set('X-User-Id', USER)
      .attach('image', Buffer.from('hi'), { filename: 'a.txt', contentType: 'text/plain' })
      .expect(415);
  });

  it('scans, edits, claims and redeems', async () => {
    const created = await scan().expect(201);
    const s = created.body.scan;
    expect(s.items[0].category).toBe('jeans');
    expect(s.items[0].carbon.kgCO2e).toBeGreaterThan(0);
    expect(created.body.recommendedOffers.length).toBeGreaterThan(0);

    // User corrects the item: it was actually second-hand.
    const edited = await request(app)
      .put(`/api/scans/${s.id}/items`)
      .set('X-User-Id', USER)
      .send({ items: [{ ...s.items[0], condition: 'second-hand', carbon: undefined, confidence: undefined }] })
      .expect(200);
    expect(edited.body.scan.items[0].carbon.grade).toBe('A');
    const points = edited.body.scan.totalPoints;
    expect(points).toBeGreaterThan(s.totalPoints);

    const claimed = await request(app).post(`/api/scans/${s.id}/claim`).set('X-User-Id', USER).expect(200);
    expect(claimed.body.user.points).toBe(points);
    await request(app).post(`/api/scans/${s.id}/claim`).set('X-User-Id', USER).expect(409);

    // Same photo again earns nothing.
    const again = await scan().expect(201);
    expect(again.body.scan.duplicateOf).toBe(s.id);
    expect(again.body.scan.totalPoints).toBe(0);

    await request(app).post('/api/offers/tree/redeem').set('X-User-Id', USER).expect(400);
  });

  it('passes an optional care-label photo to the recognizer', async () => {
    const seen: (string | undefined)[] = [];
    const spy = {
      name: 'spy',
      recognize: async (_img: unknown, label?: { filename?: string }) => {
        seen.push(label?.filename);
        return [];
      },
    };
    const spyApp = createApp({ store: new Store(), recognizer: spy });
    const res = await request(spyApp)
      .post('/api/scans')
      .set('X-User-Id', USER)
      .attach('image', png, { filename: 'coat.png', contentType: 'image/png' })
      .attach('label', png, { filename: 'label.png', contentType: 'image/png' })
      .expect(201);
    expect(seen).toEqual(['label.png']);
    expect(res.body.scan.hasLabel).toBe(true);
  });

  it('hides other users’ scans', async () => {
    const { body } = await scan().expect(201);
    await request(app).get(`/api/scans/${body.scan.id}`).set('X-User-Id', 'someone-else-99').expect(404);
  });

  it('validates edits', async () => {
    const { body } = await scan().expect(201);
    await request(app)
      .put(`/api/scans/${body.scan.id}/items`)
      .set('X-User-Id', USER)
      .send({ items: [{ name: 'x', category: 'spaceship', condition: 'new', materials: [] }] })
      .expect(400);
  });

  it('returns 400 when no image is attached', async () => {
    const res = await request(app).post('/api/scans').set('X-User-Id', USER).field('note', 'no file').expect(400);
    expect(res.body.error).toMatch(/No image/);
  });

  it('rejects images over 10 MB', async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 1, 0);
    const res = await scan('big.png', big).expect(400);
    expect(res.body.error).toMatch(/too large/);
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await request(app)
      .post('/api/score')
      .set('Content-Type', 'application/json')
      .send('{"items": [')
      .expect(400);
    expect(res.body.error).toMatch(/not valid JSON/);
  });

  it('returns 404 for an unknown offer and 400 when points are short', async () => {
    await request(app).post('/api/offers/nope/redeem').set('X-User-Id', USER).expect(404);
    const res = await request(app).post('/api/offers/tree/redeem').set('X-User-Id', USER).expect(400);
    expect(res.body.error).toMatch(/more points/);
  });
});

describe('POST /api/score (eco-score calculation)', () => {
  const app = createApp({ store: new Store(), recognizer: new MockRecognizer() });

  it('scores items without an image, using typical materials when none are given', async () => {
    const { body } = await request(app)
      .post('/api/score')
      .send({ items: [{ category: 't-shirt' }, { category: 'jeans', condition: 'second-hand' }] })
      .expect(200);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].name).toBe('T-shirt');
    expect(body.items[0].materials).toEqual([{ material: 'cotton', percent: 100 }]);
    expect(body.items[0].carbon.grade).toBe('C');
    expect(body.items[1].carbon.grade).toBe('A');
    expect(body.totalKgCO2e).toBeCloseTo(body.items[0].carbon.kgCO2e + body.items[1].carbon.kgCO2e, 1);
    expect(body.totalPoints).toBe(body.items[0].carbon.points + body.items[1].carbon.points);
  });

  it('validates the request', async () => {
    await request(app).post('/api/score').send({ items: [] }).expect(400);
    await request(app).post('/api/score').send({ items: [{ category: 'spaceship' }] }).expect(400);
  });
});

describe('GET /api/offers (offers by points)', () => {
  it('marks which offers the user can afford and filters with ?affordable=true', async () => {
    const store = new Store();
    const user = store.getOrCreateUser(USER);
    user.points = 120;
    store.saveUser(user);
    const app = createApp({ store, recognizer: new MockRecognizer() });

    const all = await request(app).get('/api/offers').set('X-User-Id', USER).expect(200);
    const swap = all.body.find((o: { id: string }) => o.id === 'swap-ticket');
    const tree = all.body.find((o: { id: string }) => o.id === 'tree');
    expect(swap).toMatchObject({ cost: 100, affordable: true, pointsNeeded: 0 });
    expect(tree).toMatchObject({ cost: 150, affordable: false, pointsNeeded: 30 });

    const affordable = await request(app).get('/api/offers?affordable=true').set('X-User-Id', USER).expect(200);
    expect(affordable.body.map((o: { id: string }) => o.id)).toEqual(['swap-ticket']);

    await request(app).post('/api/offers/swap-ticket/redeem').set('X-User-Id', USER).expect(201);
    const after = await request(app).get('/api/me').set('X-User-Id', USER).expect(200);
    expect(after.body.points).toBe(20);
    expect(after.body.redemptions[0].code).toMatch(/^ECO-[0-9A-F]{8}$/);
  });

  it('needs a user to filter by affordability', async () => {
    const app = createApp({ store: new Store(), recognizer: new MockRecognizer() });
    const plain = await request(app).get('/api/offers').expect(200);
    expect(plain.body[0].affordable).toBeUndefined();
    await request(app).get('/api/offers?affordable=true').expect(401);
  });
});
