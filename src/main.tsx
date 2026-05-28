import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
const updateSW = registerSW({ 
  immediate: true,
  onRegisteredSW(swUrl, r) {
    if (r) {
      // Check for updates every time the app becomes visible
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          r.update();
        }
      });
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
