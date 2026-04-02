import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        rotating: resolve(__dirname, 'rotating.html'),
        cube: resolve(__dirname, 'cube.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
