import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // JSX goes through src/i18n, which translates the panel's Dutch text into the chosen language.
  plugins: [react({ jsxImportSource: 'grill-jsx' })],
  resolve: {
    alias: [{ find: /^grill-jsx\/(jsx-(dev-)?runtime)$/, replacement: fileURLToPath(new URL('./src/i18n/$1.ts', import.meta.url)) }],
  },
  server: { port: 5188, strictPort: true },
  preview: { port: 5189, strictPort: true },
});
