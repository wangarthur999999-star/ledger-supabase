import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SettingsProvider } from './context/SettingsContext';
import { ExchangeRateProvider } from './context/ExchangeRateContext';
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: "https://865c9e434991d506f2c8ec92add97c8c@o4511345252433920.ingest.us.sentry.io/4511346230689793",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <ExchangeRateProvider>
        <App />
      </ExchangeRateProvider>
    </SettingsProvider>
  </StrictMode>,
);
