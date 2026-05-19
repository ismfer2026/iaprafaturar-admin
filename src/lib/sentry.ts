import * as Sentry from '@sentry/react';

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn('⚠️ Sentry DSN não configurado');
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    release: `iaprafaturar-admin@${import.meta.env.VITE_APP_VERSION || '0.0.0'}`,
  });
}

export { Sentry };
