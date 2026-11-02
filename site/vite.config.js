import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Multi-page app: the store lives at "/", the admin panel at "/admin/".
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        store: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
    },
  },
});
