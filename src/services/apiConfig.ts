/**
 * Centralized API base URL resolver.
 * - In Vercel unified production deployment, returns '' (empty string) so all API requests
 *   use relative same-origin paths (`/api/...`), completely avoiding CORS and external hops.
 * - In local development with Vite (`npm run dev`), relative requests (`/api/...`) are
 *   automatically proxied to the local backend on port 5000 via vite.config.ts.
 * - If VITE_API_BASE_URL is explicitly configured, it is respected (ignoring deprecated Render domains).
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    // Override any legacy Render backend URLs
    if (envUrl.includes('onrender.com')) {
      return '';
    }
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Default to relative same-origin routing for Vercel and Vite proxy
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
