// `npm run check` — sends one sample garment photo through the configured recognizer (uses 1 request of your quota).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createRecognizer } from './services/recognizer.js';

dotenv.config({
  path: [fileURLToPath(new URL('../.env', import.meta.url)), fileURLToPath(new URL('../../.env', import.meta.url))],
  quiet: true,
});

const key = (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '').trim().replace(/^["']|["']$/g, '');
console.log(key ? `✓ Gemini key found (${key.slice(0, 6)}…${key.slice(-4)}, ${key.length} chars)` : '• No GEMINI_API_KEY in backend/.env');

const recognizer = createRecognizer();
console.log(`  recognizer: ${recognizer.name}`);
if (recognizer.name === 'mock') {
  console.error('✗ No API key found, so scans use sample matching. Add GEMINI_API_KEY=your_key to backend/.env');
  process.exit(1);
}

const photo = new URL('../../frontend/src/assets/samples/white-shirt.jpg', import.meta.url);
try {
  const items = await recognizer.recognize({ buffer: readFileSync(photo), mimeType: 'image/jpeg', filename: 'white-shirt.jpg' });
  console.log(`✓ ${recognizer.name} works. Sample photo recognised as: ${items.map((i) => i.name).join(', ') || '(nothing)'}`);
  console.log('  Start the app with: npm run dev');
} catch (err) {
  console.error(`✗ ${(err as Error).message}`);
  process.exit(1);
}
