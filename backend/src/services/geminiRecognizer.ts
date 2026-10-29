import { CATEGORIES, CONDITIONS, type DetectedItem } from '../types.js';
import {
  RecognizerError,
  SYSTEM_PROMPT,
  responseSchema,
  toItem,
  userPrompt,
  type ImageInput,
  type Recognizer,
} from './recognition.js';

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Tried in order. Each model has its own free-tier daily quota, so when one runs out we move on to the next.
 * (gemini-2.x models are no longer available to new API keys.)
 */
export const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-flash-lite-latest'];

/** Gemini's OpenAPI-style schema for structured output. Range checks happen afterwards in responseSchema. */
const GEMINI_SCHEMA = {
  type: 'OBJECT',
  required: ['items'],
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['name', 'category', 'materials', 'condition', 'confidence'],
        properties: {
          name: { type: 'STRING', description: 'Short descriptive name, e.g. "Blue slim-fit jeans"' },
          category: { type: 'STRING', enum: [...CATEGORIES] },
          materials: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              required: ['material', 'percent'],
              properties: { material: { type: 'STRING' }, percent: { type: 'NUMBER' } },
            },
          },
          condition: { type: 'STRING', enum: [...CONDITIONS] },
          color: { type: 'STRING', nullable: true },
          brand: { type: 'STRING', nullable: true, description: 'Only if a logo or label is legible' },
          confidence: { type: 'NUMBER', description: '0 to 1' },
        },
      },
    },
  },
};

/** Spelled out for the plain-JSON retry, used if a model rejects the structured-output schema. */
const JSON_SHAPE = `Answer only with JSON of this shape:
{"items":[{"name":string,"category":one of ${JSON.stringify(CATEGORIES)},"materials":[{"material":string,"percent":number}],"condition":"new"|"second-hand","color":string|null,"brand":string|null,"confidence":number 0-1}]}`;

interface HttpFailure {
  status: number; // 0 = network error, timeout or unusable answer
  message: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** "Please retry in 8h49m56.9s." → milliseconds (defaults to a minute). */
function retryDelayMs(message: string): number {
  const m = message.match(/retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i);
  if (!m || !/\d/.test(m[0])) return 60_000;
  return ((Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0)) * 1000;
}

function formatWait(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`;
}

function describe(f: HttpFailure): string {
  if (f.status === 429) return /per day|daily/i.test(f.message) ? 'daily free quota used up' : 'rate limited';
  if (f.status === 404) return 'model not available';
  if (/location is not supported/i.test(f.message)) return "Gemini API isn't available in your region";
  if (f.status >= 500) return "Google's servers are overloaded";
  return f.message.split('\n')[0];
}

/** Identifies garments with Google Gemini vision over the REST API. */
export class GeminiRecognizer implements Recognizer {
  name: string;
  private models: string[];
  private workingModel?: string;
  /** Models whose quota ran out, mapped to when they can be tried again. */
  private exhaustedUntil = new Map<string, number>();

  constructor(
    private apiKey: string,
    preferredModel?: string,
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta',
  ) {
    this.models = [...new Set([preferredModel, ...GEMINI_MODELS].filter((m): m is string => Boolean(m)))];
    this.name = `gemini:${this.models[0]}`;
  }

  async recognize(image: ImageInput, label?: ImageInput): Promise<DetectedItem[]> {
    const photos = label ? [image, label] : [image];
    for (const photo of photos) {
      if (!SUPPORTED_TYPES.includes(photo.mimeType)) {
        throw new RecognizerError(`Gemini can't read ${photo.mimeType} images. Please use JPG, PNG or WebP.`, 415);
      }
    }

    const now = Date.now();
    const ordered = this.workingModel ? [this.workingModel, ...this.models.filter((m) => m !== this.workingModel)] : this.models;
    const failures: { model: string; failure: HttpFailure }[] = [];

    for (const model of ordered) {
      const until = this.exhaustedUntil.get(model);
      if (until && until > now) {
        failures.push({ model, failure: { status: 429, message: 'quota used up (cached)' } });
        continue;
      }
      try {
        const items = await this.callModel(model, photos, Boolean(label));
        this.workingModel = model;
        this.name = `gemini:${model}`;
        return items;
      } catch (err) {
        if (err instanceof RecognizerError) throw err;
        const failure = err as HttpFailure;
        if (failure.status === 400 && /api key/i.test(failure.message)) {
          throw new RecognizerError(
            'Your Gemini API key was rejected. Check GEMINI_API_KEY in backend/.env (no quotes or spaces), then restart the server.',
            401,
          );
        }
        if (failure.status === 401 || failure.status === 403) {
          throw new RecognizerError(`Your Gemini API key doesn't have access: ${failure.message.split('\n')[0]}`, 401);
        }
        if (failure.status === 429) this.exhaustedUntil.set(model, Date.now() + retryDelayMs(failure.message));
        console.warn(`[gemini] ${model} failed (${failure.status || 'no status'}): ${failure.message.split('\n')[0]}`);
        failures.push({ model, failure });
      }
    }

    const quotaOnly =
      failures.some((f) => f.failure.status === 429) && failures.every((f) => [404, 429].includes(f.failure.status));
    if (quotaOnly) {
      const waits = [...this.exhaustedUntil.values()].map((t) => t - Date.now()).filter((t) => t > 0);
      const wait = waits.length ? `Try again in about ${formatWait(Math.min(...waits))}` : 'Wait a minute and try again';
      throw new RecognizerError(
        `Your Gemini API key has used up its free quota for now (the free tier allows about 20 requests per model per day). ${wait}, or enable billing in Google AI Studio for higher limits.`,
        429,
      );
    }
    const details = failures.map((f) => `${f.model}: ${describe(f.failure)}`).join(' · ');
    throw new RecognizerError(`Gemini couldn't analyse the photo. Details — ${details}`, 502);
  }

  /** One model: strict schema first; if the model rejects the schema, or a request blips, retry. */
  private async callModel(model: string, photos: ImageInput[], hasLabel: boolean): Promise<DetectedItem[]> {
    let last: HttpFailure = { status: 0, message: 'no attempt' };
    for (let attempt = 0; attempt < 3; attempt++) {
      const structured = attempt === 0;
      try {
        return await this.request(model, photos, hasLabel, structured);
      } catch (err) {
        if (err instanceof RecognizerError) throw err;
        last = err as HttpFailure;
        const s = last.status;
        if ([401, 403, 404, 429].includes(s)) throw last;
        if (s === 400 && (!structured || /api key|input image/i.test(last.message))) throw last;
        if (s >= 500 || s === 0) await sleep(800 * (attempt + 1));
      }
    }
    throw last;
  }

  private async request(model: string, photos: ImageInput[], hasLabel: boolean, structured: boolean) {
    const generationConfig: Record<string, unknown> = { temperature: 0.2, responseMimeType: 'application/json' };
    if (structured) generationConfig.responseSchema = GEMINI_SCHEMA;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: structured ? SYSTEM_PROMPT : `${SYSTEM_PROMPT}\n\n${JSON_SHAPE}` }] },
          contents: [
            {
              role: 'user',
              parts: [
                ...photos.map((p) => ({ inline_data: { mime_type: p.mimeType, data: p.buffer.toString('base64') } })),
                { text: userPrompt(hasLabel) },
              ],
            },
          ],
          generationConfig,
        }),
      });
    } catch (err) {
      const e = err as Error & { cause?: { code?: string } };
      const timedOut = e.name === 'TimeoutError' || e.name === 'AbortError';
      throw { status: 0, message: timedOut ? 'timed out after 60s' : `network error: ${e.cause?.code ?? e.message}` } satisfies HttpFailure;
    }

    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      promptFeedback?: { blockReason?: string };
      candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
    };
    if (!res.ok) throw { status: res.status, message: body.error?.message ?? res.statusText } satisfies HttpFailure;

    const candidate = body.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .filter((p) => !p.thought)
      .map((p) => p.text ?? '')
      .join('')
      .trim();
    if (!text) {
      const reason = body.promptFeedback?.blockReason ?? candidate?.finishReason;
      if (reason && /SAFETY|BLOCK|PROHIBITED|OTHER/i.test(reason)) {
        throw new RecognizerError('Gemini declined to analyse this photo. Try a photo of just the garment.', 422);
      }
      throw { status: 0, message: `empty answer (finishReason: ${candidate?.finishReason ?? 'none'})` } satisfies HttpFailure;
    }

    let parsed: unknown;
    try {
      const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '');
      parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned);
    } catch {
      throw { status: 0, message: `answer was not valid JSON: ${text.slice(0, 120)}` } satisfies HttpFailure;
    }
    const result = responseSchema.safeParse(parsed);
    if (!result.success) throw { status: 0, message: 'answer did not match the expected shape' } satisfies HttpFailure;
    return result.data.items.map(toItem);
  }
}
