/**
 * Centralized API base URL resolver.
 * - Respects VITE_API_BASE_URL if explicitly set (including Render backend: https://ai-assistant-backend-qqlh.onrender.com)
 * - In local development with Vite (`npm run dev`), returns empty string so Vite proxy forwards /api to localhost:5000.
 * - In production deployment on Vercel or cloud hosts, defaults to the deployed Render backend URL.
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // If in browser environment
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    // Local development: use empty string so Vite proxy forwards /api to localhost:5000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }
    // Deployed on Vercel or other cloud host: default to the deployed Render backend
    return 'https://ai-assistant-backend-qqlh.onrender.com';
  }

  return 'https://ai-assistant-backend-qqlh.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();
