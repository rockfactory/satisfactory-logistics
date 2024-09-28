import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'leonardfactory',
      project: 'satisfactory-logistics',
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
