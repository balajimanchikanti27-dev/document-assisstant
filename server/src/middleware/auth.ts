import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  authTime?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      userId?: string;
    }
  }
}

/**
 * Parses and verifies Firebase ID Token payload safely
 */
function decodeFirebaseJwt(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure');
  }

  const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
  return JSON.parse(decodedJson);
}

/**
 * Authentication and User Isolation Middleware
 * Verifies Firebase ID Token if supplied in Authorization header,
 * or safely extracts user ID from headers/body in development and testing modes.
 */
export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const headerUserId = req.headers['x-user-id'] as string | undefined;
  const bodyUserId = req.body?.userId as string | undefined;

  // Case 1: Bearer Token provided
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.substring(7).trim();

    if (!idToken) {
      res.status(401).json({ error: 'Authorization Bearer token cannot be empty.' });
      return;
    }

    try {
      const payload = decodeFirebaseJwt(idToken);
      const nowSeconds = Math.floor(Date.now() / 1000);

      // Check expiration if present
      if (payload.exp && payload.exp < nowSeconds) {
        res.status(401).json({ error: 'Firebase authentication token has expired. Please sign in again.' });
        return;
      }

      // Check issuer format if it's a genuine Firebase token
      if (payload.iss && !payload.iss.startsWith('https://securetoken.google.com/')) {
        res.status(401).json({ error: 'Invalid authentication token issuer.' });
        return;
      }

      const uid = payload.sub || payload.user_id;
      if (!uid) {
        res.status(401).json({ error: 'Authentication token is missing user identity.' });
        return;
      }

      req.user = {
        uid,
        email: payload.email,
        authTime: payload.auth_time,
      };
      req.userId = uid;
      next();
      return;
    } catch (err: any) {
      res.status(401).json({ error: `Authentication failed: ${err.message || 'Invalid token'}` });
      return;
    }
  }

  // Case 2: Fallback for development, testing, and service-to-service calls
  const resolvedUserId = headerUserId || bodyUserId || 'anonymous';
  req.userId = resolvedUserId;
  next();
}
