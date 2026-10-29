import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { GeminiRecognizer } from '../src/services/geminiRecognizer.js';
import { Store } from '../src/services/store.js';

// Local stand-in for the Gemini REST API: records requests, answers per model.
let server: Server;
let baseUrl: string;
let calls: { model: string; body: any }[];
let answer: (model: string, body: any) => { status?: number; json: unknown };

const ok = (obj: unknown) => ({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] } });
const fail = (status: number, message: string) => ({ status, json: { error: { message } } });
const QUOTA =
  'You exceeded your current quota.\n* Quota exceeded for metric: generate_content_free_tier_requests, limit: 20, description: Generate content requests per day limit exceeded on Free Tier.\nPlease retry in 8h49m56.9s.';
const HOODIE = {
  items: [
    { name: 'Grey hoodie', category: 'hoodie', materials: [{ material: 'cotton', percent: 100 }], condition: 'new', color: 'grey', brand: null, confidence: 0.9 },
  ],
};

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const model = decodeURIComponent(req.url!.match(/models\/(.*?):generateContent/)![1]);
      const body = JSON.parse(raw);
      calls.push({ model, body });
      const { status = 200, json } = answer(model, body);
      res.statusCode = status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(json));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => {
  calls = [];
});

const recognizer = (preferred?: string) => new GeminiRecognizer('test-key', preferred, baseUrl);
const image = { buffer: Buffer.from('fake-jpeg'), mimeType: 'image/jpeg', filename: 'x.jpg' };

describe('GeminiRecognizer', () => {
  it('sends the image with a response schema and parses the items', async () => {
    answer = () => ok(HOODIE);
    const r = recognizer();
    const items = await r.recognize(image);
    expect(calls).toHaveLength(1);
    const { body } = calls[0];
    expect(body.generationConfig.responseSchema.properties.items.type).toBe('ARRAY');
    expect(body.contents[0].parts[0]).toEqual({ inline_data: { mime_type: 'image/jpeg', data: Buffer.from('fake-jpeg').toString('base64') } });
    expect(body.systemInstruction.parts[0].text).toMatch(/screenshots/);
    expect(items[0]).toMatchObject({ name: 'Grey hoodie', category: 'hoodie', brand: undefined });
    expect(r.name).toBe('gemini:gemini-3.8-flash');
  });

  it('moves past retired models and models out of quota, then remembers the quota', async () => {
    answer = (model) =>
      model === 'gemini-3.5-flash-lite' ? ok(HOODIE) : model.startsWith('gemini-2') ? fail(404, 'no longer available') : fail(429, QUOTA);
    const r = recognizer('gemini-2.5-flash');
    await r.recognize(image);
    expect(calls.map((c) => c.model)).toEqual(['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite']);
    expect(r.name).toBe('gemini:gemini-3.5-flash-lite');

    calls = [];
    await r.recognize(image);
    expect(calls.map((c) => c.model)).toEqual(['gemini-3.5-flash-lite']);
  });

  it('reports a used-up free quota with the wait time', async () => {
    answer = () => fail(429, QUOTA);
    await expect(recognizer().recognize(image)).rejects.toMatchObject({ status: 429, message: expect.stringMatching(/free quota.*8h 5\dm/) });
  });

  it('reports a rejected key without trying other models', async () => {
    answer = () => fail(400, 'API key not valid. Please pass a valid API key.');
    await expect(recognizer().recognize(image)).rejects.toMatchObject({ status: 401, message: expect.stringMatching(/key was rejected/) });
    expect(calls).toHaveLength(1);
  });

  it('retries without the schema when a model rejects it', async () => {
    answer = (_m, body) => (body.generationConfig.responseSchema ? fail(400, 'Invalid JSON payload received.') : ok(HOODIE));
    const items = await recognizer().recognize(image);
    expect(items).toHaveLength(1);
    expect(calls[1].body.systemInstruction.parts[0].text).toMatch(/Answer only with JSON/);
  });

  it('turns a safety block into a clear message', async () => {
    answer = () => ({ json: { candidates: [{ finishReason: 'SAFETY' }] } });
    await expect(recognizer().recognize(image)).rejects.toMatchObject({ status: 422 });
  });
});

describe('POST /api/scans with Gemini', () => {
  const scan = (app: ReturnType<typeof createApp>) =>
    request(app).post('/api/scans').set('X-User-Id', 'test-user-1234').attach('image', Buffer.from('x'), { filename: 'code.png', contentType: 'image/png' });

  it('returns no items (not a made-up garment) for a photo without clothing', async () => {
    answer = () => ok({ items: [] });
    const res = await scan(createApp({ store: new Store(), recognizer: recognizer() })).expect(201);
    expect(res.body.scan.items).toEqual([]);
    expect(res.body.scan.totalPoints).toBe(0);
  });

  it('shows the real error instead of a rough guess when Gemini fails', async () => {
    answer = () => fail(429, QUOTA);
    const res = await scan(createApp({ store: new Store(), recognizer: recognizer() })).expect(429);
    expect(res.body.error).toMatch(/free quota/);
  });
});
