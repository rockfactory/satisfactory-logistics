import * as Sentry from '@sentry/react';
import { supabaseIntegration } from '@supabase/sentry-js-integration';
import '@xyflow/react/dist/style.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import App from './App.tsx';
import { persistor, store } from './core/store';
import { supabaseClient } from './core/supabase.ts';

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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);
