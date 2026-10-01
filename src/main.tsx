import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const isLocalDevelopment = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

if (!isLocalDevelopment && window.location.protocol === 'https:' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.warn('Could not enable offline app mode', error);
    });
  });
}
