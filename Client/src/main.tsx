import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './styles/scripture-styles.css';
import './styles/scripture-overrides.css';
import { loadRecaptchaEnterprise } from './lib/recaptcha.lib';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

// Preload reCAPTCHA Enterprise once on app boot (safe if injected elsewhere too)
if (SITE_KEY) {
  loadRecaptchaEnterprise(SITE_KEY).catch(() => {
    // Optional: swallow or route to a logger
    console.warn('reCAPTCHA failed to preload (likely adblock or network).');
  });
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
} else {
  console.error('Failed to mount app: #root element not found in index.html');
}
