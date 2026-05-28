import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from './ErrorBoundary.tsx';

// Register service worker
try {
  const updateSW = registerSW({ 
    immediate: true,
    onRegisteredSW(swUrl, r) {
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000); // Check every minute
      }
      
      // Check for updates every time the app becomes visible
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && r) {
          r.update();
        }
      });
    }
  });
} catch (e) {
  console.log('SW registration failed', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
