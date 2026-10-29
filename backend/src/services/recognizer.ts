import { createHash } from 'node:crypto';
import { pickMockItem } from '../data/mockCatalog.js';
import { CATEGORIES, CONDITIONS, type DetectedItem } from '../types.js';
import { ClaudeRecognizer } from './claudeRecognizer.js';
import { GeminiRecognizer } from './geminiRecognizer.js';
import { SYSTEM_PROMPT, responseSchema, toItem, userPrompt, type ImageInput, type Recognizer } from './recognition.js';

export type { ImageInput, Recognizer };

/** JSON schema for OpenAI structured outputs (strict mode needs every key required). */
const OPENAI_JSON_SCHEMA = {
  name: 'clothing_scan',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'category', 'materials', 'condition', 'color', 'brand', 'confidence'],
          properties: {
            name: { type: 'string', description: 'Short descriptive name, e.g. "Blue slim-fit jeans"' },
            category: { type: 'string', enum: [...CATEGORIES] },
            materials: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['material', 'percent'],
                properties: { material: { type: 'string' }, percent: { type: 'number' } },
              },
            },
            condition: { type: 'string', enum: [...CONDITIONS] },
            color: { type: ['string', 'null'] },
            brand: { type: ['string', 'null'], description: 'Only if a logo or label is legible' },
            confidence: { type: 'number', description: '0 to 1' },
          },
        },
      },
    },
  },
};

export class OpenAIRecognizer implements Recognizer {
  name: string;
  constructor(
    private apiKey: string,
    private model = 'gpt-4o',
    private baseUrl = 'https://api.openai.com/v1',
  ) {
    this.name = `openai:${model}`;
  }

  async recognize(image: ImageInput, label?: ImageInput): Promise<DetectedItem[]> {
    const toDataUrl = (photo: ImageInput) => `data:${photo.mimeType};base64,${photo.buffer.toString('base64')}`;
    const photos = label ? [image, label] : [image];
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: 'json_schema', json_schema: OPENAI_JSON_SCHEMA },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt(Boolean(label)) },
              ...photos.map((photo) => ({ type: 'image_url', image_url: { url: toDataUrl(photo), detail: 'high' } })),
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }
    const body = (await res.json()) as { choices: { message: { content: string | null; refusal?: string } }[] };
    const content = body.choices[0]?.message.content;
    if (!content) throw new Error(body.choices[0]?.message.refusal ?? 'Empty response from vision model');
    return responseSchema.parse(JSON.parse(content)).items.map(toItem);
  }
}


/**
 * Offline stand-in for a vision model. Deterministic per image so repeated
 * scans of the same photo agree; a category word in the filename
 * (e.g. "jeans.jpg") steers the pick, which makes demos predictable.
 */
export class MockRecognizer implements Recognizer {
  name = 'mock';

  async recognize(image: ImageInput): Promise<DetectedItem[]> {
    const hash = createHash('sha256').update(image.buffer).digest();
    return [pickMockItem(image.filename ?? '', hash[0])];
  }
}

/** Strip the quotes and spaces people often paste around API keys. */
const cleanKey = (value?: string) => value?.trim().replace(/^["']|["']$/g, '').trim() || undefined;

/**
 * Pick the image recognizer from the environment. RECOGNIZER=auto (the default)
 * prefers Claude, then Gemini, then OpenAI, then the offline mock, depending on which key is set.
 */
export function createRecognizer(env = process.env): Recognizer {
  const mode = (env.RECOGNIZER || 'auto').trim().toLowerCase();
  const geminiKey = cleanKey(env.GEMINI_API_KEY) ?? cleanKey(env.GOOGLE_API_KEY);
  const claude = () => new ClaudeRecognizer(env.ANTHROPIC_MODEL || undefined);
  const gemini = () => new GeminiRecognizer(geminiKey!, env.GEMINI_MODEL?.trim() || undefined);
  const openai = () => new OpenAIRecognizer(env.OPENAI_API_KEY!, env.OPENAI_MODEL || 'gpt-4o', env.OPENAI_BASE_URL || undefined);

  if (mode === 'gemini') {
    if (!geminiKey) throw new Error('RECOGNIZER=gemini requires GEMINI_API_KEY');
    return gemini();
  }
  if (mode === 'claude') {
    if (!env.ANTHROPIC_API_KEY) throw new Error('RECOGNIZER=claude requires ANTHROPIC_API_KEY');
    return claude();
  }
  if (mode === 'openai') {
    if (!env.OPENAI_API_KEY) throw new Error('RECOGNIZER=openai requires OPENAI_API_KEY');
    return openai();
  }
  if (mode === 'auto' && env.ANTHROPIC_API_KEY) return claude();
  if (mode === 'auto' && geminiKey) return gemini();
  if (mode === 'auto' && env.OPENAI_API_KEY) return openai();
  return new MockRecognizer();
}
