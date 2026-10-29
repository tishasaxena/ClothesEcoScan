import { z } from 'zod';
import { CATEGORIES, CONDITIONS, type DetectedItem } from '../types.js';

export interface ImageInput {
  buffer: Buffer;
  mimeType: string;
  filename?: string;
}

export interface Recognizer {
  name: string;
  /** `label` is an optional close-up of the garment's care label, used to read exact fibre percentages. */
  recognize(image: ImageInput, label?: ImageInput): Promise<DetectedItem[]>;
}

export const SYSTEM_PROMPT = `You are a textile expert helping estimate the carbon footprint of clothing.
Identify every distinct clothing item, shoe or textile accessory in the photo (max 5).
If the photo shows a care/composition label, read the exact fibre percentages from it.
Otherwise infer the most likely composition from the look and texture of the fabric.
Use simple lowercase fibre names such as: cotton, organic cotton, recycled cotton, polyester,
recycled polyester, nylon, acrylic, elastane, wool, cashmere, silk, viscose, modal, lyocell,
linen, hemp, leather, synthetic leather, rubber, down.
Only mark condition "second-hand" if there are clear signs (thrift tags, visible wear).
A person wearing clothes counts: identify the garments they are wearing, not the person.
Return an empty items array if the photo does not show real clothing, for example: screenshots,
screens showing code, text or websites, documents, food, furniture, landscapes, or anything too
blurry or dark to identify. Never guess a garment that is not visibly in the photo.`;

/** A recognition failure with a message that is safe to show the user, and the HTTP status to answer with. */
export class RecognizerError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

/** User-turn instruction, depending on whether a care-label photo was attached. */
export const userPrompt = (hasLabel: boolean) =>
  hasLabel
    ? 'The first photo shows the garment. The second photo is its care label: use the exact fibre percentages printed on it for that garment.'
    : 'Identify the clothing in this photo.';

/** Validates and clamps whatever a vision model returns, whichever provider produced it. */
export const itemSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.enum(CATEGORIES).catch('other'),
  materials: z
    .array(z.object({ material: z.string(), percent: z.number().min(0).max(100) }))
    .max(6),
  condition: z.enum(CONDITIONS).catch('new'),
  color: z.string().max(40).nullish(),
  brand: z.string().max(60).nullish(),
  confidence: z.number().min(0).max(1).catch(0.5),
});
export const responseSchema = z.object({ items: z.array(itemSchema).max(5) });

export const toItem = (raw: z.infer<typeof itemSchema>): DetectedItem => ({
  ...raw,
  color: raw.color ?? undefined,
  brand: raw.brand ?? undefined,
});
