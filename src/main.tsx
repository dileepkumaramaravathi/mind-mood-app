import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handleMockRequest } from './lib/mockApi';

// Safely patch window.fetch globally to intercept and fall back to local client-side offline database
const originalFetch = window.fetch;

const customFetch = async function (...args: any[]) {
  const requestUrl = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
  const isApi = requestUrl && (requestUrl.includes('/api/') || requestUrl.startsWith('/api/'));

  if (isApi) {
    try {
      const response = await originalFetch(args[0] as RequestInfo, args[1] as RequestInit | undefined);
      const contentType = response.headers.get('content-type') || '';
      
      // If it's an API route and we did not get standard JSON response, we fall back to the secure local store
      if (!contentType.includes('application/json')) {
        const clone = response.clone();
        const text = await clone.text();
        const trimmed = text.trim();
        const firstChar = trimmed.charAt(0);
        
        // Check if the response is actually HTML/Vercel error/Google auth redirects
        if (
          firstChar === '<' || 
          text.includes('Google Account') || 
          text.includes('Sign in') || 
          text.toLowerCase().includes('the page') ||
          text.toLowerCase().includes('unauthorized') ||
          text.toLowerCase().includes('forbidden')
        ) {
          // Fire non-blocking warning event to allow App.tsx to display beautiful dismissible top banner
          window.dispatchEvent(new CustomEvent('private-url-error', {
            detail: { url: requestUrl, status: response.status }
          }));
          
          console.warn('[Fetch Sandbox Bypass] Redirecting API route to local database layer:', requestUrl);
          return handleMockRequest(requestUrl, args[1] as any);
        }
      }
      return response;
    } catch (netError) {
      console.warn('[Fetch Sandbox Bypass] Network exception, running in client-side simulation:', netError);
      
      // Trigger non-blocking error event
      window.dispatchEvent(new CustomEvent('private-url-error', {
        detail: { url: requestUrl, error: String(netError) }
      }));
      
      return handleMockRequest(requestUrl, args[1] as any);
    }
  }

  return originalFetch(args[0] as RequestInfo, args[1] as RequestInit | undefined);
};

try {
  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e) {
  console.warn('[Fetch Sandbox] Could not define fetch directly on window. Attempting prototype overwrite...', e);
  try {
    Object.defineProperty(Window.prototype, 'fetch', {
      value: customFetch,
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (err) {
    console.error('[Fetch Sandbox] Absolute fallback failed to override window.fetch:', err);
  }
}

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
