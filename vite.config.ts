import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import { fileURLToPath, URL } from 'node:url';
import { contentPlugin } from './plugins/content';

export default defineConfig({
  plugins: [contentPlugin(), react(), cloudflare()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(@codemirror\/(state|view|language|commands|autocomplete|search|lint)|@uiw|@lezer\/(common|highlight|lr)|style-mod|w3c-keyname|crelt)\//.test(id)) {
            return 'editor';
          }
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark') || id.includes('node_modules/micromark') || id.includes('node_modules/mdast') || id.includes('node_modules/hast')) {
            return 'markdown';
          }
          if (id.includes('node_modules/framer-motion')) return 'motion';
          return undefined;
        },
      },
    },
  },
  // Module workers so the Postgres and Python workers can code-split; PGlite ships its own wasm.
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@electric-sql/pglite', '@electric-sql/pglite-pgvector'] },
  server: { port: 5173 },
});
