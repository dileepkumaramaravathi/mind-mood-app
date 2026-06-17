import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely patch window.fetch globally to intercept and clean any private development URL auth redirects or HTML responses
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch(...args);
  
  const requestUrl = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
  // If it's an API route and we did not get standard JSON
  if (requestUrl && (requestUrl.includes('/api/') || requestUrl.startsWith('/api/'))) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const clone = response.clone();
      try {
        const text = await clone.text();
        const trimmed = text.trim();
        const firstChar = trimmed.charAt(0);
        
        // If it starts with HTML or shows typical gated warning text
        if (
          firstChar === '<' || 
          text.includes('Google Account') || 
          text.includes('Sign in') || 
          text.toLowerCase().includes('the page') ||
          text.toLowerCase().includes('unauthorized') ||
          text.toLowerCase().includes('forbidden')
        ) {
          // Trigger global custom event
          window.dispatchEvent(new CustomEvent('private-url-error', {
            detail: { url: requestUrl, status: response.status }
          }));
          
          // Return valid JSON mock block response to prevent standard .json() SyntaxError / Token-T crashes!
          return new Response(JSON.stringify({
            error: "PRIVATE_DEVELOPMENT_URL_BLOCK",
            message: "Private development URL block detected. Please use the Shared App URL instead."
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (e) {
        // Suppress reader error
      }
    }
  }
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for PWA Offline & Installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered successfully under scope:', reg.scope);
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });
  });
}
