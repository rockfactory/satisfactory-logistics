/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
declare const APP_VERSION: string;
declare const SENTRY_DSN: string;

interface ImportMetaEnv {
  readonly VITE_DEV_BANNER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
