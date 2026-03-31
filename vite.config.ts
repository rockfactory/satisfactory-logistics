import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { type Plugin, defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

const require = createRequire(import.meta.url);

function copyHighsWasm(): Plugin {
  const wasmSrc = 'node_modules/highs/build/highs.wasm';
  return {
    name: 'copy-highs-wasm',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/highs/highs.wasm') {
          res.setHeader('Content-Type', 'application/wasm');
          fs.createReadStream(wasmSrc).pipe(res);
          return;
        }
        next();
      });
    },
    writeBundle(options) {
      const outDir = options.dir ?? 'dist';
      const dest = path.resolve(outDir, 'highs');
      fs.mkdirSync(dest, { recursive: true });
      fs.copyFileSync(wasmSrc, path.resolve(dest, 'highs.wasm'));
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'leonardfactory',
      project: 'satisfactory-logistics',
    }),
    copyHighsWasm(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src/'),
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
