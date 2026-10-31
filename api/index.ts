import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/src/index.js';

/**
 * Vercel Serverless Function entry point for AI Assistant Backend.
 * Seamlessly routes all /api/* requests to the Express application.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // If Vercel rewrites mutated req.url, restore it from x-matched-path or x-forwarded-uri
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-forwarded-uri']) as string | undefined;
  if (matchedPath && typeof matchedPath === 'string' && matchedPath.startsWith('/api')) {
    req.url = matchedPath;
  }

  return app(req, res);
}

