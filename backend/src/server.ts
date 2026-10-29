import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createApp } from './app.js';
import { createRecognizer } from './services/recognizer.js';
import { Store } from './services/store.js';

// backend/.env first, then the project-root .env (works from src/ in dev and dist/ in production).
dotenv.config({
  path: [fileURLToPath(new URL('../.env', import.meta.url)), fileURLToPath(new URL('../../.env', import.meta.url))],
  quiet: true,
});

const port = Number(process.env.PORT ?? 3001);
// In-memory by default (data resets on restart). Set DB_PATH to keep data in a JSON file between restarts.
const dbPath = process.env.DB_PATH || undefined;

const recognizer = createRecognizer();
const app = createApp({ store: new Store(dbPath), recognizer });

app.listen(port, () => {
  console.log(`EcoScan API on http://localhost:${port}`);
  console.log(`  recognizer: ${recognizer.name}`);
  if (recognizer.name === 'mock') {
    console.log('  (no API key found: photos are matched to sample garments. Add GEMINI_API_KEY to backend/.env for real recognition.)');
  }
  console.log(`  storage:    ${dbPath ? `JSON file (${dbPath})` : 'in-memory (resets on restart)'}`);
});
