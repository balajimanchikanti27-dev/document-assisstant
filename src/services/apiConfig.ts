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
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
