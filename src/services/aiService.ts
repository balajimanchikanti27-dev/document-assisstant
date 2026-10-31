import { ChatMessage, SourceCitation } from '../types';
import { auth } from './firebase';

export const DOCUMENT_FALLBACK_MESSAGE = 'There is no answer to your question in your uploaded document.';

export interface DocumentQueryPayload {
  question: string;
  documentIds: string[];
  userId?: string;
  conversationId?: string;
  previousMessages?: { sender: 'user' | 'assistant'; text: string }[];
}

export interface DocumentQueryResponse {
  success?: boolean;
  answer: string;
  isInsufficientEvidence: boolean;
  citations: SourceCitation[];
  mode?: string;
  requestId?: string;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

import { API_BASE_URL } from './apiConfig';

export const queryDocumentAssistant = async (
  payload: DocumentQueryPayload,
  signal?: AbortSignal
): Promise<DocumentQueryResponse> => {
  if (!payload.documentIds || payload.documentIds.length === 0) {
    throw new Error('Please select at least one ready document before asking a question.');
  }

  if (!payload.question.trim()) {
    throw new Error('Question cannot be empty.');
  }

  try {
    let token: string | undefined;
    try {
      token = await auth?.currentUser?.getIdToken();
    } catch (e) {
      // Fallback for offline / dev
    }

    const effectiveUserId = payload.userId || auth?.currentUser?.uid || 'anonymous';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    headers['x-user-id'] = effectiveUserId;

    let response: Response;
    const primaryUrl = API_BASE_URL ? `${API_BASE_URL}/api/rag/query` : '/api/rag/query';

    try {
      response = await fetch(primaryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          userId: effectiveUserId,
        }),
        signal,
      });
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') throw fetchErr;
      // If primary fetch was an absolute URL that failed, retry relative path through Vite proxy
      if (primaryUrl !== '/api/rag/query') {
        try {
          response = await fetch('/api/rag/query', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              ...payload,
              userId: effectiveUserId,
            }),
            signal,
          });
        } catch (relErr: any) {
          if (relErr.name === 'AbortError') throw relErr;
          throw new Error('Cannot connect to backend server. Please verify backend is running on port 5000 (local) or Vercel deployment is active.');
        }
      } else {
        throw new Error('Cannot connect to backend server. Please verify backend is running on port 5000 (local) or Vercel deployment is active.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg =
        (errorData.error && typeof errorData.error === 'object')
          ? errorData.error.message || errorData.error.code
          : errorData.error || errorData.message || `Document Assistant API error: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    const rawJson = await response.json();
    const data = rawJson.data || rawJson;
    const isInsufficient = Boolean(data.isInsufficientEvidence);

    return {
      success: data.success ?? true,
      answer: isInsufficient ? DOCUMENT_FALLBACK_MESSAGE : (data.answer || DOCUMENT_FALLBACK_MESSAGE),
      isInsufficientEvidence: isInsufficient,
      citations: isInsufficient ? [] : (data.citations || []),
      mode: data.mode || 'document',
      requestId: rawJson.requestId || data.requestId,
      model: data.model,
      usage: data.usage,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Generation stopped by user.');
    }
    throw error;
  }
};
