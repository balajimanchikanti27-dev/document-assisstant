import { Request, Response, NextFunction } from 'express';
import { validateAndNormalizeImage, ImageValidationError } from '../utils/imageValidator.js';

/**
 * Request Validation Middleware
 * Phase 9: Request validation, bounds checking, and payload integrity enforcement.
 */

export function validateDocumentQuery(req: Request, res: Response, next: NextFunction): void {
  const { question, documentIds } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    res.status(400).json({ error: 'Question is required and cannot be empty.' });
    return;
  }

  if (question.length > 4000) {
    res.status(400).json({ error: 'Question exceeds maximum allowed length of 4000 characters.' });
    return;
  }

  if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    res.status(400).json({ error: 'At least one document ID must be specified.' });
    return;
  }

  if (documentIds.length > 25) {
    res.status(400).json({ error: 'Maximum of 25 documents can be queried simultaneously.' });
    return;
  }

  next();
}

export function validateResearchQuery(req: Request, res: Response, next: NextFunction): void {
  const { question, sourcePreference, responseLength, image } = req.body;

  const hasQuestion = Boolean(question && typeof question === 'string' && question.trim().length > 0);
  const hasImage = Boolean(image && typeof image === 'object' && (image.data || image.base64));

  if (!hasQuestion && !hasImage) {
    res.status(400).json({ error: 'A question or an image attachment is required.' });
    return;
  }

  if (hasQuestion && question.length > 4000) {
    res.status(400).json({ error: 'Question exceeds maximum allowed length of 4000 characters.' });
    return;
  }

  if (sourcePreference && !['both', 'wikipedia', 'web'].includes(sourcePreference)) {
    res.status(400).json({ error: 'Invalid source preference. Must be "both", "wikipedia", or "web".' });
    return;
  }

  if (responseLength && !['short', 'balanced', 'detailed'].includes(responseLength)) {
    res.status(400).json({ error: 'Invalid response length. Must be "short", "balanced", or "detailed".' });
    return;
  }

  if (hasImage) {
    try {
      const validatedImage = validateAndNormalizeImage(image);
      req.body.image = validatedImage;
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Invalid image attachment.' });
      return;
    }
  }

  next();
}

export function validateFeedbackPayload(req: Request, res: Response, next: NextFunction): void {
  const { messageId, rating, mode } = req.body;

  if (!messageId || typeof messageId !== 'string') {
    res.status(400).json({ error: 'messageId is required.' });
    return;
  }

  if (!rating || !['like', 'dislike'].includes(rating)) {
    res.status(400).json({ error: 'rating must be either "like" or "dislike".' });
    return;
  }

  if (mode && !['document', 'research'].includes(mode)) {
    res.status(400).json({ error: 'mode must be either "document" or "research".' });
    return;
  }

  next();
}
