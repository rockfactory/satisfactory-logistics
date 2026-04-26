import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import pkg from './package.json' with { type: 'json' };

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
          rename: { stripBase: true },
        },
      ],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon-plain.ico'],
      manifest: {
        name: 'Satisfactory Logistics',
        short_name: 'SF Logistics',
        description:
          'Plan factories, track logistics and optimise production chains for the game Satisfactory.',
        theme_color: '#1a1b1e',
        background_color: '#1a1b1e',
        display: 'standalone',
        start_url: '/factories',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: [
          '**/*.{js,css,html,json,woff2,wasm}',
          'images/game/**/*.{png,webp,jpg}',
          'images/map/**/*.{png,jpg,webp}',
          'icons/*.png',
        ],
        globIgnores: ['**/world-map-5k.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/nymrtujjmzbhxcimjsci\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/images\/map\/world-map-5k\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'world-map-hires',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src/'),
      // `@etothepii/satisfactory-file-parser` does an optimistic
      // `require('stream/web')` for Node; in the browser Vite
      // externalises that to an empty object, so the library's own
      // fallback to `globalThis.ReadableStream` never fires and the
      // streaming parser explodes with "ReadableStream is not a
      // constructor". Point the import at a tiny shim that re-exports
      // the WHATWG globals.
      'stream/web': path.resolve(
        import.meta.dirname,
        './src/recipes/savegame/nodeStreamWebShim.ts',
      ),
    },
  },
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
    SENTRY_DSN: JSON.stringify(process.env.SENTRY_DSN),
  },
  build: {
    sourcemap: true,
    cssMinify: 'esbuild',
  },
});
