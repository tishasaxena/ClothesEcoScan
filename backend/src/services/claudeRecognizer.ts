import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { CATEGORIES, CONDITIONS, type DetectedItem } from '../types.js';
import { SYSTEM_PROMPT, responseSchema, toItem, userPrompt, type ImageInput, type Recognizer } from './recognition.js';

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

// Shape Claude must answer in (structured outputs). Range checks happen afterwards in responseSchema.
const OutputSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      category: z.enum(CATEGORIES),
      materials: z.array(z.object({ material: z.string(), percent: z.number() })),
      condition: z.enum(CONDITIONS),
      color: z.string().nullable(),
      brand: z.string().nullable(),
      confidence: z.number(),
    }),
  ),
});

/** Identifies garments with Claude vision. Reads ANTHROPIC_API_KEY from the environment. */
export class ClaudeRecognizer implements Recognizer {
  name: string;

  constructor(
    private model = 'claude-opus-5-5',
    private client = new Anthropic(),
  ) {
    this.name = `claude:${model}`;
  }

  async recognize(image: ImageInput, label?: ImageInput): Promise<DetectedItem[]> {
    const photos = label ? [image, label] : [image];
    for (const photo of photos) {
      if (!SUPPORTED_TYPES.includes(photo.mimeType as SupportedType)) {
        throw new Error(`Unsupported image type for Claude: ${photo.mimeType}`);
      }
    }
    const response = await this.client.beta.messages.parse(
      {
        model: this.model,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        // If a safety classifier declines, the API re-runs the request on a suitable fallback model.
        fallbacks: 'default',
        output_config: { effort: 'medium', format: betaZodOutputFormat(OutputSchema) },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              ...photos.map((photo) => ({
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: photo.mimeType as SupportedType,
                  data: photo.buffer.toString('base64'),
                },
              })),
              { type: 'text', text: userPrompt(Boolean(label)) },
            ],
          },
        ],
      },
      { timeout: 60_000 },
    );
    if (response.stop_reason === 'refusal') throw new Error('Claude declined to analyse this image');
    if (!response.parsed_output) throw new Error(`Claude returned no parseable result (stop_reason: ${response.stop_reason})`);
    return responseSchema.parse(response.parsed_output).items.map(toItem);
  }
}
