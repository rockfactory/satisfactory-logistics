/// <reference types="vite/client" />
declare const APP_VERSION: string;
declare const SENTRY_DSN: string;

interface ImportMetaEnv {
  readonly VITE_DEV_BANNER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
