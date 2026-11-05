import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

// Multi-page app: the store lives at "/", the admin panel at "/admin/".
//
// Demo mode (VITE_DEMO_MODE=1): Firebase modules are replaced by a local browser-only mock
// (src/demo/*) so the whole site, including the admin panel and invoices, can be tried without
// a backend. The normal production build never includes the mock.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, import.meta.dirname, 'VITE_'), ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('VITE_'))) };
  const demo = env.VITE_DEMO_MODE === '1';
  const d = (f) => resolve(import.meta.dirname, 'src/demo', f);

  return {
    resolve: demo ? {
      alias: {
        'firebase/app': d('app.js'),
        'firebase/firestore': d('firestore.js'),
        'firebase/auth': d('auth.js'),
      },
    } : {},
    plugins: demo ? [{
      name: 'demo-noindex',
      transformIndexHtml: (html) => html.replace('</head>', '<meta name="robots" content="noindex,nofollow"></head>'),
    }] : [],
    build: {
      rollupOptions: {
        input: {
          store: resolve(import.meta.dirname, 'index.html'),
          admin: resolve(import.meta.dirname, 'admin/index.html'),
        },
      },
    },
  };
});
