import 'core-js/stable/object/has-own';
import 'core-js/stable/set/difference';

import * as Sentry from '@sentry/react';
import { supabaseIntegration } from '@supabase/sentry-js-integration';
import '@xyflow/react/dist/style.css';
import { setAutoFreeze } from 'immer';
import App from './App';
import { AuthSessionManager } from './auth/AuthSessionManager';
import { supabaseClient } from './core/supabase';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
setAutoFreeze(false); // TODO Bug on change solver

Sentry.init({
  dsn: SENTRY_DSN,
  integrations: [
    supabaseIntegration(supabaseClient, Sentry, {
      tracing: true,
      breadcrumbs: true,
      errors: true,
    }),
    Sentry.replayIntegration({
      maskAllText: false,
      maskAllInputs: false,
    }),
  ],
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  maxBreadcrumbs: 50,
  replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,
  debug: import.meta.env.DEV,
  enabled: !import.meta.env.DEV,
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AuthSessionManager />
    <App />
  </StrictMode>,
);
