import Anthropic from '@anthropic-ai/sdk';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ClaudeRecognizer } from '../src/services/claudeRecognizer.js';
import { createRecognizer } from '../src/services/recognizer.js';

// Local stand-in for the Messages API: records the request, replies with a canned message.
let server: Server;
let baseURL: string;
let lastBody: any;
let reply: { text: string; stop_reason?: string };

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      lastBody = JSON.parse(raw);
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          model: lastBody.model,
          content: [{ type: 'text', text: reply.text }],
          stop_reason: reply.stop_reason ?? 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
      );
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const recognizer = () =>
  new ClaudeRecognizer('claude-opus-5-5', new Anthropic({ apiKey: 'test-key', baseURL, maxRetries: 0 }));
const image = { buffer: Buffer.from('fake-jpeg'), mimeType: 'image/jpeg', filename: 'x.jpg' };

describe('ClaudeRecognizer', () => {
  it('sends the image with structured outputs and parses the items', async () => {
    reply = {
      text: JSON.stringify({
        items: [
          {
            name: 'Grey hoodie',
            category: 'hoodie',
            materials: [{ material: 'cotton', percent: 80 }, { material: 'polyester', percent: 20 }],
            condition: 'new',
            color: 'grey',
            brand: null,
            confidence: 1.4,
          },
        ],
      }),
    };
    const items = await recognizer().recognize(image);

    expect(lastBody.model).toBe('claude-opus-5-5');
    expect(lastBody.fallbacks).toBe('default');
    expect(lastBody.output_config.format.type).toBe('json_schema');
    expect(lastBody.messages[0].content[0]).toMatchObject({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: Buffer.from('fake-jpeg').toString('base64') },
    });
    expect(items).toEqual([
      {
        name: 'Grey hoodie',
        category: 'hoodie',
        materials: [{ material: 'cotton', percent: 80 }, { material: 'polyester', percent: 20 }],
        condition: 'new',
        color: 'grey',
        brand: undefined,
        confidence: 0.5, // out-of-range confidence is clamped to the default
      },
    ]);
  });

  it('sends a care-label photo as a second image and asks Claude to read it', async () => {
    reply = { text: JSON.stringify({ items: [] }) };
    await recognizer().recognize(image, { buffer: Buffer.from('label'), mimeType: 'image/png', filename: 'label.png' });
    const content = lastBody.messages[0].content;
    expect(content.map((c: { type: string }) => c.type)).toEqual(['image', 'image', 'text']);
    expect(content[1].source.media_type).toBe('image/png');
    expect(content[2].text).toMatch(/care label/);
  });

  it('throws on a refusal so the app can fall back', async () => {
    reply = { text: '{"items":[]}', stop_reason: 'refusal' };
    await expect(recognizer().recognize(image)).rejects.toThrow(/declined/);
  });

  it('rejects image types Claude cannot read', async () => {
    await expect(recognizer().recognize({ ...image, mimeType: 'image/heic' })).rejects.toThrow(/Unsupported/);
  });
});

describe('createRecognizer', () => {
  it('prefers Claude, then Gemini, then OpenAI, then the mock', () => {
    expect(createRecognizer({ ANTHROPIC_API_KEY: 'a', OPENAI_API_KEY: 'o' }).name).toBe('claude:claude-opus-5-5');
    expect(createRecognizer({ GEMINI_API_KEY: ' "g" ', OPENAI_API_KEY: 'o' }).name).toBe('gemini:gemini-3.8-flash');
    expect(createRecognizer({ GEMINI_API_KEY: 'g', GEMINI_MODEL: 'gemini-3.5-flash-lite' }).name).toBe('gemini:gemini-3.5-flash-lite');
    expect(() => createRecognizer({ RECOGNIZER: 'gemini' })).toThrow(/GEMINI_API_KEY/);
    expect(createRecognizer({ OPENAI_API_KEY: 'o' }).name).toBe('openai:gpt-4o');
    expect(createRecognizer({}).name).toBe('mock');
    expect(createRecognizer({ RECOGNIZER: 'mock', ANTHROPIC_API_KEY: 'a' }).name).toBe('mock');
    expect(() => createRecognizer({ RECOGNIZER: 'claude' })).toThrow(/ANTHROPIC_API_KEY/);
  });
});
