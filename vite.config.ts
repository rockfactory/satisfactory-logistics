import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'leonardfactory',
      project: 'satisfactory-logistics',
    }),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/highs/build/highs.wasm',
          dest: 'highs',
        },
      ],
    }),
  ],

  define: {
    APP_VERSION: JSON.stringify(require('./package.json').version),
    SENTRY_DSN: JSON.stringify(process.env.SENTRY_DSN),
  },

  build: {
    sourcemap: true,
  },
});
