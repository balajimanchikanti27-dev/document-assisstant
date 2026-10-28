/**
 * Centralized API base URL resolver.
 * - If VITE_API_BASE_URL is explicitly set, uses that external URL.
 * - Otherwise, dynamically uses the current browser origin (window.location.origin).
 *   This ensures seamless routing both in development (Vite dev server proxying /api to port 5000)
 *   and in production (single-origin serving directly from the backend).
 * - Falls back to http://localhost:5000 in non-browser runtime environments.
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || '';

    // If running on static hosting platforms (Vercel, Firebase Hosting, Netlify, etc.)
    // direct all API traffic to the persistent production backend on Render.
    if (
      hostname.endsWith('.vercel.app') ||
      hostname.endsWith('.firebaseapp.com') ||
      hostname.endsWith('.web.app') ||
      hostname.endsWith('.netlify.app') ||
      hostname.endsWith('.github.io')
    ) {
      return 'https://ai-assistant-backend-fbc3.onrender.com';
    }

    // When running directly on Render or unified host, use the same origin
    if (window.location.origin) {
      return window.location.origin;
    }
  }

  return 'https://ai-assistant-backend-fbc3.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();
