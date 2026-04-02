import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
