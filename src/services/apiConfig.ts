/**
 * Centralized API base URL resolver.
 * - In Vercel unified production deployment, uses window.location.origin so all API requests
 *   use the same domain (`https://your-app.vercel.app/api/...`), completely avoiding CORS.
 * - In local development with Vite (`npm run dev`), window.location.origin (`http://localhost:3000`)
 *   automatically proxies relative /api requests to port 5000 via vite.config.ts.
 * - If VITE_API_BASE_URL is explicitly configured with a non-Render host, it is respected.
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    // Override any legacy Render backend URLs
    if (!envUrl.includes('onrender.com')) {
      return envUrl.trim().replace(/\/+$/, '');
    }
  }

  // Use current browser origin so requests target the active deployment host
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
};

export const API_BASE_URL = getApiBaseUrl();
