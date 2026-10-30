import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { contentPlugin } from './plugins/content';

export default defineConfig({
  // Resolves virtual:catalog etc., so worker modules that read the course catalogue can be tested.
  plugins: [contentPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
