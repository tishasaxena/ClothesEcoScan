import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Demo build: swap the HTTP client for the in-browser API so the app runs with no server.
    mode === 'demo' && {
      name: 'ecoscan-demo-api',
      enforce: 'pre' as const,
      resolveId(source: string) {
        if (/\/lib\/api$/.test(source)) return fileURLToPath(new URL('./src/lib/demoApi.ts', import.meta.url));
      },
    },
  ],
  build: mode === 'demo' ? { outDir: 'dist-demo', cssCodeSplit: false, assetsInlineLimit: Infinity } : undefined,
  server: {
    host: true,
    proxy: { '/api': 'http://localhost:3001' },
  },
}));
