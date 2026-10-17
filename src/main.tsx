import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { NotificationProvider } from './components/NotificationSystem.tsx';
import './index.css';

// Global interceptor for uncatchable Firebase Quota errors
const originalConsoleError = console.error;
let lastQuotaErrorTime = 0;
console.error = (...args) => {
  for (const arg of args) {
     const msg = String(arg);
     if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
         const now = Date.now();
         if (now - lastQuotaErrorTime > 10000) { // 10 seconds throttle
             window.dispatchEvent(new CustomEvent('firestore-quota-error'));
             lastQuotaErrorTime = now;
         }
         break;
     }
  }
  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </StrictMode>,
);
