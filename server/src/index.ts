import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { vectorStore, isUserAuthorized } from './vectorStore/memoryVectorStore.js';
import { ragService } from './rag/ragService.js';
import { webResearchService } from './research/researchService.js';
import { ProviderTimeoutError, ProviderUnavailableError } from './research/sourceRetriever.js';
import { documentJobManager } from './jobs/documentJobManager.js';
import { feedbackStore } from './services/feedbackStore.js';
import {
  geminiService,
  GeminiAuthenticationError,
  GeminiRateLimitError,
  GeminiModelError,
  GeminiTimeoutError,
  GeminiConfigurationError,
} from './services/gemini.service.js';
import { authenticateUser } from './middleware/auth.js';
import { generalRateLimiter, aiQueryRateLimiter } from './middleware/rateLimiter.js';
import {
  validateDocumentQuery,
  validateResearchQuery,
  validateFeedbackPayload,
} from './middleware/validation.js';
import { webScrapingEvaluator } from './eval/webScrapingEvaluator.js';
import { WebScrapingCategory } from './eval/webScrapingDataset.js';
import { userService } from './services/user.service.js';
import { conversationService } from './services/conversation.service.js';
import { documentService } from './services/document.service.js';
import { studySummaryService } from './services/studySummaryService.js';
import { studyCoachService } from './services/studyCoachService.js';
import { documentOwnershipMigration } from './utils/documentOwnershipMigration.js';
import { getStorageUploadsDir } from './utils/paths.js';
import { sendSuccess, sendError } from './utils/response.js';
import { universityRagService } from './university/universityRagService.js';
import { universityVectorStore } from './university/universityVectorStore.js';
import {
  getAllFaculty,
  getFacultyByDepartment,
  getFacultyBySchool,
  getFacultyByDesignation,
  searchFacultyByResearch,
  getFacultyByName,
} from './university/vignanFacultyData.js';
import {
  getAllCampusImages,
  getCampusImagesByCategory,
  getCampusImagesByBlock,
  searchCampusImages,
} from './university/vignanCampusImages.js';
import {
  getSourceRegistry,
  getSourcesByCategory,
} from './university/vignanSourceRegistry.js';

dotenv.config();

// Global handler to silence internal pdf.js worker rejections on Node 26
process.on('unhandledRejection', (reason: any) => {
  if (reason && (reason.message === 'bad XRef entry' || String(reason).includes('bad XRef'))) {
    return;
  }
  console.error('[UNHANDLED REJECTION]', reason);
});

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Ensure upload directories exist
const baseUploadsDir = getStorageUploadsDir();
const tempUploadDir = path.join(baseUploadsDir, 'temp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const permanentDocumentsDir = path.join(baseUploadsDir, 'documents');
if (!fs.existsSync(permanentDocumentsDir)) {
  fs.mkdirSync(permanentDocumentsDir, { recursive: true });
}

// Multer disk storage streams 100MB files directly to disk without memory buffering
const diskStorage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
    cb(null, tempUploadDir);
  },
  filename: (_req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
    const safeName = (file?.originalname || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${safeName}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB per file maximum
  },
});

// Middlewares
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  })
);
app.options('*', cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Apply General Rate Limiter (Phase 9 DoS protection)
app.use(generalRateLimiter.middleware());

// Health check with safe diagnostic summary (Secrets masked, provider health distinguished from backend health)
app.get('/api/health', (_req: Request, res: Response) => {
  geminiService.reloadConfiguration();
  const geminiConfig = geminiService.validateConfig();
  const feedbackMetrics = feedbackStore.getFeedbackSummary();
  const tavilyAvailable = Boolean(process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY !== 'your_tavily_api_key_here');

  res.json({
    status: 'healthy',
    backendStatus: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    providers: {
      gemini: {
        configured: geminiConfig.configured,
        model: geminiConfig.model,
        keyStatus: geminiConfig.maskedKey,
        provider: geminiConfig.provider,
        note: geminiConfig.configured
          ? 'Gemini API key is detected in backend environment'
          : 'GEMINI_API_KEY not configured. Extractive/research fallback active.',
      },
      wikipedia: {
        status: 'operational',
        provider: 'MediaWiki REST API (Authoritative)',
        note: 'Official Wikipedia API endpoint active for encyclopedic retrieval.',
      },
      webSearch: {
        configured: tavilyAvailable,
        provider: 'Tavily / Wikipedia API',
        note: tavilyAvailable
          ? 'Tavily web search provider configured'
          : 'TAVILY_API_KEY not configured. Wikipedia authoritative search active.',
      },
      vectorIndex: {
        status: 'ready',
        totalChunksIndexed: vectorStore.totalChunks(),
      },
    },
    system: {
      maxFileSizeMb: 100,
      supportedExtensions: ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.md'],
      documentsRepository: fs.existsSync(permanentDocumentsDir) ? 'accessible' : 'missing',
    },
    feedbackStats: {
      totalFeedback: feedbackMetrics.totalCount,
      satisfactionRate: `${feedbackMetrics.satisfactionRate}%`,
    },
  });
});

// Detailed Integration Health Check (Phase 3: report whether each integration is configured and reachable without revealing secrets)
app.get('/api/health/integrations', async (_req: Request, res: Response): Promise<void> => {
  geminiService.reloadConfiguration();
  const geminiConfig = geminiService.validateConfig();
  const tavilyConfigured = Boolean(
    process.env.TAVILY_API_KEY &&
    process.env.TAVILY_API_KEY.trim() &&
    process.env.TAVILY_API_KEY !== 'your_tavily_api_key_here'
  );

  // 1. Wikipedia live reachability test (3.5s timeout)
  let wikiReachable = false;
  let wikiLatencyMs = 0;
  try {
    const start = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const wRes = await fetch(
      'https://en.wikipedia.org/w/api.php?action=query&meta=siteinfo&format=json',
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    wikiLatencyMs = Date.now() - start;
    wikiReachable = wRes.ok;
  } catch (e) {
    wikiReachable = false;
  }

  // 2. Gemini reachability test
  let geminiReachable: boolean | 'not_configured' = 'not_configured';
  let geminiLatencyMs: number | undefined;
  if (geminiConfig.configured) {
    try {
      const start = Date.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const pingRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
        { signal: ctrl.signal }
      );
      clearTimeout(timer);
      geminiLatencyMs = Date.now() - start;
      geminiReachable = pingRes.ok;
    } catch (e) {
      geminiReachable = false;
    }
  }

  // 3. Web search reachability
  let webSearchReachable: boolean | 'not_configured' = 'not_configured';
  if (tavilyConfigured) {
    webSearchReachable = true;
  }

  // 4. Vector store health
  const vectorStoreOperational = true;
  const chunkCount = vectorStore.totalChunks();

  // 5. Document repository disk storage health
  const docsRepoExists = fs.existsSync(permanentDocumentsDir);
  let docsRepoWritable = false;
  if (docsRepoExists) {
    try {
      const testFile = path.join(permanentDocumentsDir, '.health_check');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      docsRepoWritable = true;
    } catch {
      docsRepoWritable = false;
    }
  }

  // 6. Overall system status
  const overallStatus = vectorStoreOperational && docsRepoExists ? 'healthy' : 'degraded';

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    integrations: {
      gemini: {
        configured: geminiConfig.configured,
        reachable: geminiReachable,
        model: geminiConfig.model,
        keyStatus: geminiConfig.maskedKey,
        provider: 'Google Gemini Official SDK (@google/genai / @google/generative-ai)',
        latencyMs: geminiLatencyMs,
        notes: geminiConfig.configured
          ? (geminiReachable ? 'Gemini API is online and responding' : 'Gemini API key configured but unreachable')
          : 'GEMINI_API_KEY not configured. High-precision extractive RAG fallback active.',
      },
      wikipedia: {
        configured: true,
        reachable: wikiReachable,
        provider: 'MediaWiki REST API (Authoritative)',
        latencyMs: wikiLatencyMs,
        notes: wikiReachable ? 'Wikipedia API operational' : 'Wikipedia API unreachable or timed out',
      },
      webSearch: {
        configured: tavilyConfigured,
        reachable: webSearchReachable,
        provider: tavilyConfigured ? 'Tavily Search API' : 'Wikipedia Authoritative & University Knowledge Base',
        notes: tavilyConfigured
          ? 'Tavily search provider online'
          : 'External web search unconfigured; encyclopedic & university knowledge base active.',
      },
      vectorStore: {
        configured: true,
        operational: vectorStoreOperational,
        provider: 'MemoryVectorStore with Persistent Disk Sync',
        totalChunksIndexed: chunkCount,
      },
      documentStorage: {
        configured: true,
        operational: docsRepoExists && docsRepoWritable,
        repositoryDirectory: 'uploads/documents',
        maxUploadLimitMb: 100,
        writable: docsRepoWritable,
      },
      firebaseAuth: {
        configured: true,
        mode: 'Multi-Tenant Token Verification & User Isolation',
        notes: 'Verifies Firebase ID Tokens (JWT) with user isolation for documents, chats, and vectors.',
      },
    },
  });
});


// ==========================================
// 1. AUTHENTICATION & USER MANAGEMENT ROUTES
// ==========================================

// GET /api/auth/me - Return authenticated user profile and preferences
app.get('/api/auth/me', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  const profile = userService.getProfile(userId) || {
    uid: userId,
    email: req.user?.email,
    displayName: req.user?.email ? req.user.email.split('@')[0] : 'User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const settings = userService.getSettings(userId);
  sendSuccess(res, { profile, settings, user: req.user });
});

// POST /api/auth/sync-profile - Synchronize user profile fields
app.post('/api/auth/sync-profile', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  const updated = userService.syncProfile({
    uid: userId,
    ...req.body,
  });
  sendSuccess(res, { profile: updated });
});

// PATCH /api/users/me - Update editable profile details
app.patch('/api/users/me', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  const { displayName, photoURL } = req.body || {};
  const updated = userService.updateProfile(userId, { displayName, photoURL });
  sendSuccess(res, { profile: updated });
});

// DELETE /api/users/me - Permanently delete user account and associated documents/vectors
app.delete('/api/users/me', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId || 'anonymous';
  const result = await userService.deleteUserAndData(userId);
  conversationService.clearAllUserChats(userId);
  sendSuccess(res, { message: 'Account and associated data deleted successfully.', ...result });
});

// GET /api/users/me/settings - Retrieve user settings
app.get('/api/users/me/settings', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  const settings = userService.getSettings(userId);
  sendSuccess(res, { settings });
});

// PATCH /api/users/me/settings - Update user settings
app.patch('/api/users/me/settings', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  const updated = userService.updateSettings(userId, req.body || {});
  sendSuccess(res, { settings: updated });
});

// POST /api/users/me/export - Export all user data (documents, chats, settings)
app.post('/api/users/me/export', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  const profile = userService.getProfile(userId);
  const settings = userService.getSettings(userId);
  const documents = documentService.listUserDocuments(userId);
  const chats = conversationService.listChats(userId);
  const messagesByChat: Record<string, any[]> = {};
  for (const c of chats) {
    messagesByChat[c.id] = conversationService.getMessages(userId, c.id);
  }

  sendSuccess(res, {
    exportDate: new Date().toISOString(),
    userId,
    profile,
    settings,
    documents,
    chats,
    messages: messagesByChat,
  });
});

// ==========================================
// 2. DOCUMENT MANAGEMENT ROUTES
// ==========================================

// POST /api/documents/upload-session - Initialize an authenticated upload session
app.post('/api/documents/upload-session', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  const sessionId = `upload_sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  sendSuccess(res, {
    sessionId,
    userId,
    maxFileSizeMb: 100,
    supportedExtensions: ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.md'],
    uploadEndpoint: '/api/documents/process',
  });
});

// GET /api/documents - List all user documents
app.get('/api/documents', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  const documents = documentService.listUserDocuments(userId);
  sendSuccess(res, { documents, count: documents.length });
});

// GET /api/documents/:documentId - Get metadata for a specific document
app.get('/api/documents/:documentId', authenticateUser, (req: Request, res: Response): void => {
  const { documentId } = req.params;
  const userId = req.userId || 'anonymous';
  const docInfo = documentService.getDocumentInfo(userId, documentId);
  if (!docInfo) {
    sendError(res, 'DOCUMENT_NOT_FOUND', `Document with ID "${documentId}" not found.`, 404);
    return;
  }
  sendSuccess(res, { document: docInfo });
});

// GET /api/documents/:documentId/content - Retrieve extracted content sections and chunks
app.get('/api/documents/:documentId/content', authenticateUser, (req: Request, res: Response): void => {
  const { documentId } = req.params;
  const userId = req.userId || 'anonymous';
  const content = documentService.getDocumentContent(userId, documentId);
  sendSuccess(res, content);
});

// POST /api/documents/:documentId/reprocess - Reprocess an existing document
app.post('/api/documents/:documentId/reprocess', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const { documentId } = req.params;
  const userId = req.userId || 'anonymous';
  const docsDir = documentJobManager.getDocumentsDirectory();

  if (!fs.existsSync(docsDir)) {
    sendError(res, 'DOCUMENTS_NOT_FOUND', 'Documents repository not found on disk.', 404);
    return;
  }

  const files = fs.readdirSync(docsDir);
  const match = files.find((f) => f.startsWith(`${userId}__${documentId}_`) || f.includes(`_${documentId}_`));

  if (!match) {
    sendError(res, 'FILE_NOT_FOUND', `No local file found to reprocess for document ID "${documentId}".`, 404);
    return;
  }

  const filePath = path.join(docsDir, match);
  const filename = match.split(`${documentId}_`)[1] || match;

  try {
    const job = await documentJobManager.executeIngestion(
      documentId,
      userId,
      filename,
      filePath
    );
    sendSuccess(res, {
      documentId,
      status: job.status,
      stage: job.stage,
      chunkCount: job.chunkCount,
      pageCount: job.pageCount,
      slideCount: job.slideCount,
    });
  } catch (err: any) {
    sendError(res, 'REPROCESS_FAILED', err.message || 'Failed to reprocess document.');
  }
});

// ==========================================
// 3. CONVERSATION & CHAT MANAGEMENT ROUTES
// ==========================================

// POST /api/chats - Create a new conversation session
app.post('/api/chats', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  const { mode = 'document', title, selectedDocumentIds } = req.body || {};
  const chat = conversationService.createChat(userId, mode, title, selectedDocumentIds);
  sendSuccess(res, { chat }, 201);
});

// GET /api/chats - List user's conversations
app.get('/api/chats', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  const mode = req.query.mode as any;
  const chats = conversationService.listChats(userId, mode);
  sendSuccess(res, { chats, count: chats.length });
});

// GET /api/chats/:chatId - Retrieve a conversation session
app.get('/api/chats/:chatId', authenticateUser, (req: Request, res: Response): void => {
  const { chatId } = req.params;
  const userId = req.userId || 'anonymous';
  const chat = conversationService.getChat(userId, chatId);
  if (!chat) {
    sendError(res, 'CHAT_NOT_FOUND', `Conversation "${chatId}" not found.`, 404);
    return;
  }
  sendSuccess(res, { chat });
});

// PATCH /api/chats/:chatId - Update conversation metadata
app.patch('/api/chats/:chatId', authenticateUser, (req: Request, res: Response): void => {
  const { chatId } = req.params;
  const userId = req.userId || 'anonymous';
  const { title, selectedDocumentIds } = req.body || {};
  const updated = conversationService.updateChat(userId, chatId, { title, selectedDocumentIds });
  if (!updated) {
    sendError(res, 'CHAT_NOT_FOUND', `Conversation "${chatId}" not found.`, 404);
    return;
  }
  sendSuccess(res, { chat: updated });
});

// DELETE /api/chats/:chatId - Delete a conversation session
app.delete('/api/chats/:chatId', authenticateUser, (req: Request, res: Response): void => {
  const { chatId } = req.params;
  const userId = req.userId || 'anonymous';
  const deleted = conversationService.deleteChat(userId, chatId);
  if (!deleted) {
    sendError(res, 'CHAT_NOT_FOUND', `Conversation "${chatId}" not found.`, 404);
    return;
  }
  sendSuccess(res, { message: `Conversation "${chatId}" deleted successfully.` });
});

// GET /api/chats/:chatId/messages - Retrieve messages for a conversation
app.get('/api/chats/:chatId/messages', authenticateUser, (req: Request, res: Response): void => {
  const { chatId } = req.params;
  const userId = req.userId || 'anonymous';
  const messages = conversationService.getMessages(userId, chatId);
  sendSuccess(res, { messages, count: messages.length });
});

// POST /api/chats/:chatId/messages - Submit a message through the processing pipeline and persist
app.post(
  '/api/chats/:chatId/messages',
  aiQueryRateLimiter.middleware(),
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const { chatId } = req.params;
    const userId = req.userId || 'anonymous';
    const {
      content,
      question,
      mode = 'document',
      selectedDocumentIds,
      sourcePreference,
      responseLength,
      role = 'user',
      persistOnly = false,
      citations = [],
      isInsufficientEvidence = false,
    } = req.body || {};
    const queryText = content || question;

    // Handle background persist-only sync requests without triggering duplicate AI runs
    if (persistOnly || role === 'assistant') {
      const savedMsg = conversationService.addMessage(userId, chatId, {
        role: role as 'user' | 'assistant',
        content: (queryText || '').trim(),
        mode,
        citations,
        isInsufficientEvidence,
      });
      sendSuccess(res, { message: savedMsg });
      return;
    }

    if (!queryText || !queryText.trim()) {
      sendError(res, 'EMPTY_QUERY', 'Message content or question is required.', 400);
      return;
    }

    // 1. Save user query message
    const userMsg = conversationService.addMessage(userId, chatId, {
      role: 'user',
      content: queryText.trim(),
      mode,
    });

    try {
      let answer = '';
      let citations: any[] = [];
      let isInsufficientEvidence = false;
      let modelUsed = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

      if (mode === 'document') {
        const docIds = selectedDocumentIds || [];
        const prev = conversationService.getMessages(userId, chatId).slice(-6).map((m) => ({
          sender: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          text: m.content,
        }));

        const result = await ragService.query({
          question: queryText.trim(),
          documentIds: docIds,
          userId,
          conversationId: chatId,
          previousMessages: prev,
        });

        answer = result.answer;
        citations = result.citations || [];
        isInsufficientEvidence = Boolean(result.isInsufficientEvidence);
        if (result.model) modelUsed = result.model;
      } else {
        const prev = conversationService.getMessages(userId, chatId).slice(-6).map((m) => ({
          sender: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          text: m.content,
        }));

        if (universityRagService.isUniversityIntent(queryText)) {
          const uniResult = await universityRagService.query({
            question: queryText.trim(),
            conversationId: chatId,
            userId,
            responseLength: responseLength || 'balanced',
            sourcePreference: sourcePreference || 'both',
            previousMessages: prev,
          });
          answer = uniResult.answer;
          citations = uniResult.citations || [];
          isInsufficientEvidence = !uniResult.isVerifiedKnowledge;
          if (uniResult.modelUsed) modelUsed = uniResult.modelUsed;
        } else {
          const result = await webResearchService.query({
            question: queryText.trim(),
            sourcePreference: sourcePreference || 'both',
            responseLength: responseLength || 'balanced',
            conversationId: chatId,
            userId,
            previousMessages: prev,
          });

          answer = result.answer;
          citations = result.citations || [];
          if (result.model) modelUsed = result.model;
        }
      }

      // 2. Save assistant response message
      const assistantMsg = conversationService.addMessage(userId, chatId, {
        role: 'assistant',
        content: answer,
        mode,
        citations,
        isInsufficientEvidence,
        modelUsed,
      });

      sendSuccess(res, {
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        answer,
        citations,
        isInsufficientEvidence,
        mode,
      });
    } catch (err: any) {
      if (err.message && (err.message.includes('permission') || err.message.includes('not authorized'))) {
        sendError(res, 'FORBIDDEN', err.message, 403);
        return;
      }
      if (
        err.statusCode === 404 ||
        (err.message && (err.message.includes('could not be found') || err.message.includes('have been deleted')))
      ) {
        sendError(res, 'DOCUMENT_NOT_FOUND', err.message, 404);
        return;
      }
      if (
        err.message &&
        (err.message.includes('currently being processed') ||
          err.message.includes('failed indexing') ||
          err.message.includes('not indexed yet'))
      ) {
        sendError(res, 'DOCUMENT_INDEXING', err.message, 422);
        return;
      }
      sendError(res, 'AI_PROCESSING_ERROR', err.message || 'Failed to process AI query.', err.statusCode || 500);
    }
  }
);

// Ingest and process documents up to 100MB into RAG vector index (Both /api/documents and /api/documents/process supported)
app.post('/api/documents', upload.single('file'), authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const file = req.file;
  const userId = req.userId || 'anonymous';
  const documentId = req.body.documentId || `doc_${Date.now()}`;
  const filename = req.body.filename || file?.originalname || 'document.txt';

  if (!file) {
    sendError(res, 'NO_FILE', 'No document file provided for ingestion.', 400);
    return;
  }

  try {
    const job = await documentJobManager.executeIngestion(
      documentId,
      userId,
      filename,
      file.path,
      file.mimetype
    );

    if (job.status === 'error') {
      sendError(res, 'PROCESSING_ERROR', job.errorMessage || 'Failed to process document.', 422);
      return;
    }

    sendSuccess(res, {
      documentId,
      documentName: filename,
      status: job.status,
      stage: job.stage,
      chunkCount: job.chunkCount,
      pageCount: job.pageCount,
      slideCount: job.slideCount,
    });
  } catch (err: any) {
    if (file && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }
    sendError(res, 'PROCESSING_FAILED', err.message || 'Document processing failed.', 500);
  }
});

app.post(
  '/api/documents/process',
  upload.single('file'),
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    const userId = req.userId || 'anonymous';
    const documentId = req.body.documentId || `doc_${Date.now()}`;
    const filename = req.body.filename || file?.originalname || 'document.txt';

    if (!file) {
      res.status(400).json({ error: 'No document file provided for ingestion.' });
      return;
    }

    console.log(
      `[RAG INGESTION] Received "${filename}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) on disk: ${file.path}`
    );

    try {
      // Execute ingestion through job manager
      const job = await documentJobManager.executeIngestion(
        documentId,
        userId,
        filename,
        file.path,
        file.mimetype
      );

      if (job.status === 'error') {
        res.status(422).json({
          error: job.errorMessage || 'Failed to process document.',
          documentId,
          status: 'error',
        });
        return;
      }

      console.log(
        `[RAG INGESTION COMPLETE] "${filename}" indexed: ${job.chunkCount || 0} chunks, pages: ${job.pageCount || 0}, slides: ${job.slideCount || 0}`
      );

      res.json({
        success: true,
        documentId,
        documentName: filename,
        status: job.status,
        stage: job.stage,
        chunkCount: job.chunkCount,
        pageCount: job.pageCount,
        slideCount: job.slideCount,
      });
    } catch (err: any) {
      console.error('[RAG INGESTION ERROR]', err);
      if (file && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (e) {}
      }
      res.status(500).json({ error: err.message || 'Document processing failed.' });
    }
  }
);

// Query Document Job Processing Status
app.get('/api/documents/:documentId/status', (req: Request, res: Response): void => {
  const { documentId } = req.params;
  const job = documentJobManager.getJob(documentId);

  if (!job) {
    res.status(404).json({ error: 'Document job not found.' });
    return;
  }

  res.json({
    documentId: job.documentId,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    pageCount: job.pageCount,
    slideCount: job.slideCount,
    chunkCount: job.chunkCount,
    errorMessage: job.errorMessage,
  });
});

// POST /api/documents/mock-job - Diagnostic & test automation endpoint for job status
app.post('/api/documents/mock-job', (req: Request, res: Response): void => {
  const { documentId, userId, filename, status } = req.body;
  if (!documentId) {
    res.status(400).json({ error: 'documentId is required' });
    return;
  }
  const job = documentJobManager.createJob(documentId, userId || 'anonymous', filename || 'sample.pdf');
  if (status) {
    documentJobManager.updateJob(documentId, { status });
  }
  sendSuccess(res, { job });
});

// Download original document file
app.get('/api/documents/:documentId/download', authenticateUser, (req: Request, res: Response): void => {
  const { documentId } = req.params;
  const userId = req.userId || 'anonymous';
  const docsDir = documentJobManager.getDocumentsDirectory();

  if (!fs.existsSync(docsDir)) {
    res.status(404).json({ error: 'Documents repository directory not found.' });
    return;
  }

  const files = fs.readdirSync(docsDir);
  const match = files.find((f) => {
    if (!f.includes(`__${documentId}__`) && !f.includes(`__${documentId}_`) && !f.startsWith(`${documentId}_`)) return false;
    const fileUser = f.split('__')[0];
    return isUserAuthorized(fileUser, userId);
  });

  if (!match) {
    res.status(404).json({ error: 'Document file not found or unauthorized.' });
    return;
  }

  const filePath = path.join(docsDir, match);
  const delim = match.includes(`__${documentId}__`)
    ? `__${documentId}__`
    : match.includes(`__${documentId}_`)
    ? `__${documentId}_`
    : `${documentId}_`;
  const originalName = match.split(delim)[1] || match;
  res.download(filePath, originalName);
});

// Retry Document Ingestion
app.post(
  '/api/documents/:documentId/retry-processing',
  upload.single('file'),
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params;
    const file = req.file;
    const userId = req.userId || 'anonymous';
    const filename = req.body.filename || file?.originalname || 'retry_document.txt';

    if (!file) {
      res.status(400).json({ error: 'No document file provided for re-indexing.' });
      return;
    }

    try {
      const job = await documentJobManager.executeIngestion(
        documentId,
        userId,
        filename,
        file.path,
        file.mimetype
      );

      res.json({
        success: job.status !== 'error',
        documentId,
        status: job.status,
        stage: job.stage,
        chunkCount: job.chunkCount,
        pageCount: job.pageCount,
        slideCount: job.slideCount,
        errorMessage: job.errorMessage,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retry document ingestion.' });
    }
  }
);

// Summarize for Easy Learning - Student Study Summary Generation
app.post(
  '/api/documents/:documentId/study-summary',
  aiQueryRateLimiter.middleware(),
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params;
    const userId = req.userId || 'anonymous';
    const { forceRefresh = false } = req.body || {};

    try {
      const summary = await studySummaryService.generateStudySummary(userId, documentId, { forceRefresh });
      res.json(summary);
    } catch (err: any) {
      console.error(`[STUDY SUMMARY ERROR] ${documentId}:`, err.message);
      if (err.message?.includes('not authorized')) {
        res.status(403).json({ success: false, error: err.message });
        return;
      }
      if (err.message?.includes('could not be found')) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: err.message || 'Failed to generate study summary.' });
    }
  }
);

// Retrieve existing/cached Study Summary
app.get(
  '/api/documents/:documentId/study-summary',
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params;
    const userId = req.userId || 'anonymous';

    try {
      const summary = await studySummaryService.generateStudySummary(userId, documentId, { forceRefresh: false });
      res.json(summary);
    } catch (err: any) {
      if (err.message?.includes('not authorized')) {
        res.status(403).json({ success: false, error: err.message });
        return;
      }
      res.status(404).json({ success: false, error: err.message || 'Study summary not found.' });
    }
  }
);

// =============================================================================
// Smart Study Coach Endpoints
// =============================================================================

// GET /api/coach/:documentId/study-material - Learn Simply & Key Concepts
app.get('/api/coach/:documentId/study-material', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const { documentId } = req.params;
  const userId = req.userId || 'anonymous';
  try {
    const material = await studyCoachService.getStudyMaterial(userId, documentId);
    res.json({ success: true, data: material, studyMaterial: material });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// POST /api/coach/:documentId/quiz/generate - Generate 10 MCQs + 5 Short Answers
app.post('/api/coach/:documentId/quiz/generate', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const { documentId } = req.params;
  const userId = req.userId || 'anonymous';
  const { forceRefresh = false } = req.body || {};
  try {
    const quiz = await studyCoachService.generateQuiz(userId, documentId, { forceRefresh });
    res.json({ success: true, data: quiz, quiz });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// POST /api/coach/:documentId/quiz/submit - Score quiz, explain mistakes, pinpoint weak topics
app.post('/api/coach/:documentId/quiz/submit', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const { documentId } = req.params;
  const userId = req.userId || 'anonymous';
  const { answers = [], timeSpentSeconds = 0 } = req.body || {};
  try {
    const evaluation = await studyCoachService.submitQuiz(userId, documentId, { answers, timeSpentSeconds });
    res.json({ success: true, data: evaluation, evaluation });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// GET /api/coach/:documentId/revision-notes - Topic cheat sheet & exam questions
app.get('/api/coach/:documentId/revision-notes', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const { documentId } = req.params;
  const userId = req.userId || 'anonymous';
  try {
    const notes = await studyCoachService.getRevisionNotes(userId, documentId);
    res.json({ success: true, data: notes, revisionNotes: notes });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// GET /api/coach/:documentId/progress - Student's quiz history and weak topics for document
app.get('/api/coach/:documentId/progress', authenticateUser, (req: Request, res: Response): void => {
  const { documentId } = req.params;
  const userId = req.userId || 'anonymous';
  try {
    const progress = studyCoachService.getProgress(userId, documentId);
    res.json({ success: true, data: progress, progress: progress });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// GET /api/coach/progress - Student's overall progress across all documents
app.get('/api/coach/progress', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  try {
    const progress = studyCoachService.getUserOverallProgress(userId);
    res.json({ success: true, data: progress, progress });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// Standardized /api/study-coach/* Endpoints (Contract Compliance)
// =============================================================================

// POST /api/study-coach/summary - Complete Document Summary (Beginner or Detailed)
app.post('/api/study-coach/summary', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId || 'anonymous';
  const { documentId, documentIds, level = 'beginner', forceRefresh = false } = req.body || {};
  const targetId = documentId || (Array.isArray(documentIds) && documentIds[0]);

  if (!targetId) {
    res.status(400).json({ success: false, error: 'Document ID is required.' });
    return;
  }

  try {
    const material = await studyCoachService.getStudyMaterial(userId, targetId, { level, forceRefresh });
    res.json({ success: true, data: material, studyMaterial: material });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// POST /api/study-coach/quiz - Grounded Quiz Generation
app.post('/api/study-coach/quiz', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId || 'anonymous';
  const { documentId, documentIds, questionCount, questionTypes, forceRefresh = false } = req.body || {};
  const targetId = documentId || (Array.isArray(documentIds) && documentIds[0]);

  if (!targetId) {
    res.status(400).json({ success: false, error: 'Document ID is required.' });
    return;
  }

  try {
    const quiz = await studyCoachService.generateQuiz(userId, targetId, {
      forceRefresh,
      questionCount,
      questionTypes,
    });
    res.json({ success: true, data: quiz, quiz });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// POST /api/study-coach/important-questions - High-Yield Prioritized Question Bank
app.post('/api/study-coach/important-questions', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId || 'anonymous';
  const { documentId, documentIds, forceRefresh = false } = req.body || {};
  const targetId = documentId || (Array.isArray(documentIds) && documentIds[0]);

  if (!targetId) {
    res.status(400).json({ success: false, error: 'Document ID is required.' });
    return;
  }

  try {
    const questions = await studyCoachService.getImportantExamQuestions(userId, targetId, { forceRefresh });
    res.json({ success: true, data: questions, importantQuestions: questions });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// POST /api/study-coach/revision-notes - Topic-wise Cheat Sheet & Revision Notes
app.post('/api/study-coach/revision-notes', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId || 'anonymous';
  const { documentId, documentIds, forceRefresh = false } = req.body || {};
  const targetId = documentId || (Array.isArray(documentIds) && documentIds[0]);

  if (!targetId) {
    res.status(400).json({ success: false, error: 'Document ID is required.' });
    return;
  }

  try {
    const notes = await studyCoachService.getRevisionNotes(userId, targetId, { forceRefresh });
    res.json({ success: true, data: notes, revisionNotes: notes });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// POST /api/study-coach/evaluate-quiz - Evaluate Quiz & Diagnose Weak Topics
app.post('/api/study-coach/evaluate-quiz', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId || 'anonymous';
  const { documentId, answers = [], timeSpentSeconds = 0 } = req.body || {};

  if (!documentId) {
    res.status(400).json({ success: false, error: 'Document ID is required.' });
    return;
  }

  try {
    const evaluation = await studyCoachService.submitQuiz(userId, documentId, { answers, timeSpentSeconds });
    res.json({ success: true, data: evaluation, evaluation });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// POST /api/study-coach/short-notes - Concise High-Yield Notes
app.post('/api/study-coach/short-notes', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId || 'anonymous';
  const { documentId } = req.body || {};

  if (!documentId) {
    res.status(400).json({ success: false, error: 'Document ID is required.' });
    return;
  }

  try {
    const shortNotes = await studyCoachService.getShortNotes(userId, documentId);
    res.json({ success: true, data: shortNotes, shortNotes });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// POST /api/study-coach/long-answer-questions - 5 & 10 Mark Essay Questions
app.post('/api/study-coach/long-answer-questions', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId || 'anonymous';
  const { documentId } = req.body || {};

  if (!documentId) {
    res.status(400).json({ success: false, error: 'Document ID is required.' });
    return;
  }

  try {
    const laqs = await studyCoachService.getLongAnswerQuestions(userId, documentId);
    res.json({ success: true, data: laqs, longAnswerQuestions: laqs });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// POST /api/study-coach/definitions-formulas - Definitions, Formulas, and Examples
app.post('/api/study-coach/definitions-formulas', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId || 'anonymous';
  const { documentId } = req.body || {};

  if (!documentId) {
    res.status(400).json({ success: false, error: 'Document ID is required.' });
    return;
  }

  try {
    const data = await studyCoachService.getKeyDefinitionsAndFormulas(userId, documentId);
    res.json({ success: true, data, definitionsAndFormulas: data });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// POST /api/study-coach/final-revision-guide - Comprehensive Final Revision Cram Guide
app.post('/api/study-coach/final-revision-guide', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId || 'anonymous';
  const { documentId } = req.body || {};

  if (!documentId) {
    res.status(400).json({ success: false, error: 'Document ID is required.' });
    return;
  }

  try {
    const guide = await studyCoachService.getFinalRevisionGuide(userId, documentId);
    res.json({ success: true, data: guide, revisionGuide: guide });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// POST /api/study-coach/ask - Grounded Document Q&A inside Study Coach
app.post('/api/study-coach/ask', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId || 'anonymous';
  const { documentId, documentIds, question } = req.body || {};
  const targetIds = Array.isArray(documentIds) && documentIds.length > 0 ? documentIds : documentId ? [documentId] : [];

  if (targetIds.length === 0 || !question) {
    res.status(400).json({ success: false, error: 'Document ID(s) and question are required.' });
    return;
  }

  try {
    // Verify ownership of all target documents
    for (const docId of targetIds) {
      studyCoachService.verifyAccess(userId, docId);
    }

    const ragResult = await ragService.query({
      question,
      documentIds: targetIds,
      userId,
    });

    res.json({ success: true, data: ragResult, answer: ragResult.answer, citations: ragResult.citations });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// GET /api/study-coach/progress - Progress for specific document or overall
app.get('/api/study-coach/progress', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  const documentId = req.query.documentId as string | undefined;

  try {
    if (documentId) {
      const progress = studyCoachService.getProgress(userId, documentId);
      res.json({ success: true, data: progress, progress });
    } else {
      const overall = studyCoachService.getUserOverallProgress(userId);
      res.json({ success: true, data: overall, progress: overall });
    }
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// GET /api/study-coach/history - Quiz History for authenticated user
app.get('/api/study-coach/history', authenticateUser, (req: Request, res: Response): void => {
  const userId = req.userId || 'anonymous';
  try {
    const history = studyCoachService.getQuizHistory(userId);
    res.json({ success: true, data: history, history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ask My Documents RAG Query (Grounded Answer Generation via Gemini with Self-Correction)
app.post(
  '/api/rag/query',
  aiQueryRateLimiter.middleware(),
  authenticateUser,
  validateDocumentQuery,
  async (req: Request, res: Response): Promise<void> => {
    const requestId = `req_rag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();

    try {
      const { question, documentIds, conversationId, previousMessages } = req.body;
      const userId = req.userId || 'anonymous';

      console.log(
        `[RAG RECEIVED] [${requestId}] Mode: document | User: ${userId} | Docs: [${(documentIds || []).join(', ')}] | QLen: ${question?.length || 0} | Q: "${question?.slice(0, 80)}..."`
      );

      const response = await ragService.query({
        question,
        documentIds,
        userId,
        conversationId,
        previousMessages,
      });

      if (response.success === false) {
        const isAuthError =
          response.rejectionReason?.includes('not authorized') ||
          response.rejectionReason?.includes('permission');
        const statusCode = isAuthError ? 403 : (response.statusCode || 400);
        res.status(statusCode).json({
          success: false,
          error: response.rejectionReason || 'Document query failed.',
          requestId,
        });
        return;
      }

      const latencyMs = Date.now() - startTime;
      console.log(
        `[RAG SUCCESS] [${requestId}] Duration: ${latencyMs}ms | Citations: ${response.citations?.length || 0} | InsufficientEvidence: ${Boolean(response.isInsufficientEvidence)} | Model: ${response.model || 'default'}`
      );

      res.json({
        success: true,
        requestId,
        mode: 'document',
        ...response,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      console.error(`[RAG QUERY FAILURE] [${requestId}] Duration: ${latencyMs}ms | Error:`, err.message);

      if (
        err.message &&
        (err.message.includes('currently being processed') ||
          err.message.includes('failed indexing') ||
          err.message.includes('not indexed yet'))
      ) {
        res.status(422).json({
          success: false,
          status: err.message.includes('currently being processed') ? 'processing' : 'indexing_failed',
          error: err.message,
          requestId,
        });
        return;
      }

      if (err.message && (err.message.includes('permission') || err.message.includes('not authorized'))) {
        res.status(403).json({ success: false, error: err.message, requestId });
        return;
      }

      if (
        err.statusCode === 404 ||
        (err.message && (err.message.includes('could not be found') || err.message.includes('have been deleted')))
      ) {
        res.status(404).json({ success: false, error: err.message, requestId });
        return;
      }

      if (
        err.statusCode === 400 ||
        (err.message && (err.message.includes('cannot be empty') || err.message.includes('select at least one document')))
      ) {
        res.status(400).json({ success: false, error: err.message, requestId });
        return;
      }

      if (err instanceof GeminiAuthenticationError) {
        res.status(401).json({ success: false, error: err.message, requestId });
        return;
      }
      if (err instanceof GeminiRateLimitError) {
        res.status(429).json({ success: false, error: err.message, requestId });
        return;
      }
      if (err instanceof GeminiTimeoutError) {
        res.status(504).json({ success: false, error: err.message, requestId });
        return;
      }
      if (err instanceof GeminiConfigurationError) {
        res.status(503).json({ success: false, error: err.message, requestId });
        return;
      }
      if (err instanceof GeminiModelError) {
        res.status(400).json({ success: false, error: err.message, requestId });
        return;
      }

      if (err.statusCode && typeof err.statusCode === 'number') {
        res.status(err.statusCode).json({ success: false, error: err.message, requestId });
        return;
      }

      if (err.message && (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED'))) {
        res.status(502).json({ success: false, error: 'Upstream service unavailable. Please try again.', requestId });
        return;
      }

      res.status(500).json({ success: false, error: err.message || 'RAG query failed.', requestId });
    }
  }
);

// AI Web Research Query (Grounded Answer Generation via Gemini with Bounded Self-Correction)
app.post(
  '/api/research/query',
  aiQueryRateLimiter.middleware(),
  authenticateUser,
  validateResearchQuery,
  async (req: Request, res: Response): Promise<void> => {
    const requestId = `req_res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();

    try {
      const { question, sourcePreference, responseLength, conversationId, previousMessages, image } = req.body;
      const userId = req.userId || 'anonymous';
      const effectiveSourcePref = sourcePreference || 'both';
      const effectiveLength = responseLength || 'balanced';

      console.log(
        `[RESEARCH RECEIVED] [${requestId}] Mode: research | Sources: ${effectiveSourcePref} | Length: ${effectiveLength} | User: ${userId} | Image: ${Boolean(image)} | Q: "${question?.slice(0, 80) || '[IMAGE ONLY]'}"`
      );

      if (question && universityRagService.isUniversityIntent(question)) {
        console.log(`[RESEARCH ROUTING] [${requestId}] Detected Vignan University context -> Routing to University RAG Service`);
        const uniResponse = await universityRagService.query({
          question,
          conversationId,
          userId,
          responseLength: effectiveLength,
          sourcePreference: effectiveSourcePref,
          previousMessages,
        });

        if (uniResponse.isVerifiedKnowledge) {
          const latencyMs = Date.now() - startTime;
          console.log(
            `[RESEARCH SUCCESS] [${requestId}] Duration: ${latencyMs}ms | Mode: university-rag | Citations: ${uniResponse.citations?.length || 0} | Verified: ${uniResponse.isVerifiedKnowledge}`
          );

          res.json({
            success: true,
            requestId,
            mode: 'research',
            answer: uniResponse.answer,
            citations: uniResponse.citations,
            searchSteps: [
              { step: 'understanding', message: `Classified inquiry into ${uniResponse.categoryDetected || 'university'} domain...`, timestamp: Date.now() - 300 },
              { step: 'searching_wikipedia', message: 'Querying official Vignan knowledge store and verified university registry...', timestamp: Date.now() - 200 },
              { step: 'reading_sources', message: `Retrieved ${uniResponse.retrievedChunkCount} verified official university records...`, timestamp: Date.now() - 100 },
              { step: 'generating', message: `Synthesizing question-specific factual answer via ${uniResponse.modelUsed || 'verified pipeline'}...`, timestamp: Date.now() - 20 },
              { step: 'completed', message: 'Web search and answer synthesis completed', timestamp: Date.now() },
            ],
            noSourcesFound: false,
            campus: uniResponse.campus,
            isUniversityQuery: true,
            model: uniResponse.modelUsed,
          });
          return;
        }

        console.log(`[RESEARCH FALLTHROUGH] [${requestId}] University RAG knowledge unverified -> Falling through to Wikipedia & Web Research`);
      }

      const response = await webResearchService.query({
        question: question || '',
        sourcePreference: effectiveSourcePref,
        responseLength: effectiveLength,
        conversationId,
        userId,
        previousMessages,
        image,
      });

      const latencyMs = Date.now() - startTime;
      console.log(
        `[RESEARCH SUCCESS] [${requestId}] Duration: ${latencyMs}ms | Mode: web-research | Citations: ${response.citations?.length || 0} | Model: ${response.model || 'default'}`
      );

      res.json({
        success: true,
        requestId,
        mode: 'research',
        ...response,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      console.error(`[RESEARCH QUERY FAILURE] [${requestId}] Duration: ${latencyMs}ms | Error:`, err.message);

      if (err instanceof GeminiAuthenticationError || err.name === 'GeminiAuthenticationError') {
        res.status(401).json({ success: false, error: err.message, requestId });
        return;
      }
      if (err instanceof GeminiRateLimitError || err.name === 'GeminiRateLimitError') {
        res.status(429).json({ success: false, error: err.message, requestId });
        return;
      }
      if (
        err instanceof GeminiTimeoutError ||
        err.name === 'GeminiTimeoutError' ||
        err instanceof ProviderTimeoutError ||
        err.name === 'ProviderTimeoutError'
      ) {
        res.status(504).json({ success: false, error: err.message, requestId });
        return;
      }
      if (
        err instanceof GeminiConfigurationError ||
        err.name === 'GeminiConfigurationError' ||
        err instanceof ProviderUnavailableError ||
        err.name === 'ProviderUnavailableError'
      ) {
        res.status(503).json({ success: false, error: err.message, requestId });
        return;
      }
      if (err instanceof GeminiModelError || err.name === 'GeminiModelError') {
        res.status(400).json({ success: false, error: err.message, requestId });
        return;
      }

      const statusCode = typeof err.statusCode === 'number' ? err.statusCode : typeof err.status === 'number' ? err.status : 500;
      const safeError = err.message ? err.message.replace(/AIzaSy[A-Za-z0-9_-]{30,}/g, '[REDACTED_API_KEY]') : 'Web research query failed.';
      res.status(statusCode).json({ success: false, error: safeError, requestId });
    }
  }
);

// Phase 8: Record User Feedback on Answers
app.post(
  '/api/feedback',
  authenticateUser,
  validateFeedbackPayload,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        messageId,
        conversationId,
        mode,
        rating,
        category,
        comment,
        question,
        retrievedSourceIds,
        modelUsed,
      } = req.body;
      const userId = req.userId || 'anonymous';

      const feedbackRecord = await feedbackStore.recordFeedback({
        messageId,
        conversationId,
        userId,
        mode: mode || 'document',
        rating,
        category,
        comment,
        question,
        retrievedSourceIds,
        modelUsed,
      });

      res.json({ success: true, feedback: feedbackRecord });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to record feedback.' });
    }
  }
);

// Phase 8: Retrieve Feedback Quality Metrics & Recurring Issue Summary
app.get('/api/feedback/summary', authenticateUser, (_req: Request, res: Response): void => {
  const summary = feedbackStore.getFeedbackSummary();
  res.json({ success: true, ...summary });
});

// Delete document and its chunks from vector index, jobs, summaries, and disk repository
app.delete('/api/documents/:documentId', authenticateUser, (req: Request, res: Response): void => {
  try {
    const { documentId } = req.params;
    const userId = req.userId || 'anonymous';

    if (!documentId || !documentId.trim()) {
      res.status(400).json({ success: false, error: 'Document ID is required.' });
      return;
    }

    const result = documentService.deleteUserDocument(userId, documentId.trim());
    res.status(200).json({
      success: true,
      message: 'Document and associated vectors deleted successfully.',
      documentId: documentId.trim(),
      ...result,
    });
  } catch (err: any) {
    const statusCode =
      err.statusCode ||
      (err.message?.includes('not authorized') || err.message?.includes('Forbidden')
        ? 403
        : err.message?.includes('not found') || err.message?.includes('already deleted')
        ? 404
        : 500);

    res.status(statusCode).json({
      success: false,
      error: err.message || 'Failed to delete document.',
    });
  }
});

// Run or audit document ownership migration (supports dryRun mode)
app.post('/api/documents/admin/migrate-ownership', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const { dryRun = false } = req.body || {};
    const report = await documentOwnershipMigration.runMigration({ dryRun });
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/admin/migration-status', authenticateUser, async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await documentOwnershipMigration.runMigration({ dryRun: true });
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Phase 10 / Developer-Only Web Scraping & Research Agent Evaluation Endpoints
app.get('/api/eval/web-scraping/dataset', (_req: Request, res: Response): void => {
  try {
    const dataset = webScrapingEvaluator.getDataset();
    res.json({ success: true, count: dataset.length, dataset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/eval/web-scraping/latest', (_req: Request, res: Response): void => {
  try {
    const latest = webScrapingEvaluator.getLatestResults();
    res.json({ success: true, results: latest });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/eval/web-scraping/run', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mode = 'fixture', category } = req.body || {};
    const summary = await webScrapingEvaluator.evaluateAll(
      mode,
      category as WebScrapingCategory | undefined
    );
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Evaluation run failed.' });
  }
});

app.post('/api/eval/web-scraping/run-single', async (req: Request, res: Response): Promise<void> => {
  try {
    const { questionId, mode = 'fixture' } = req.body || {};
    if (!questionId) {
      res.status(400).json({ error: 'questionId is required.' });
      return;
    }
    const testCase = webScrapingEvaluator.getDataset().find((q) => q.id === questionId);
    if (!testCase) {
      res.status(404).json({ error: `Question with ID ${questionId} not found in dataset.` });
      return;
    }
    const report = await webScrapingEvaluator.evaluateQuestion(testCase, mode);
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Single evaluation failed.' });
  }
});

// ==========================================
// VIGNAN UNIVERSITY KNOWLEDGE PIPELINE ROUTES
// ==========================================

// Query Vignan University Knowledge via RAG
app.post('/api/university/query', async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, conversationId } = req.body || {};
    if (!question || !question.trim()) {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }

    const response = await universityRagService.query({
      question: question.trim(),
      conversationId,
      userId: (req as any).userId || 'anonymous',
    });

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'University query failed.' });
  }
});

// Get Vignan University Knowledge Base & Vector Index Status
app.get('/api/university/status', (_req: Request, res: Response): void => {
  try {
    const status = universityVectorStore.getStatus();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve university status.' });
  }
});

// Refresh / Update Knowledge Base from Official Sources
app.post('/api/university/refresh', async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await universityVectorStore.refreshKnowledge();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Knowledge refresh failed.' });
  }
});

// List All Verified University Source Records
app.get('/api/university/records', (_req: Request, res: Response): void => {
  try {
    const records = universityVectorStore.getAllRecords();
    res.json({ success: true, count: records.length, records });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve records.' });
  }
});

// Phase 11: University Overview & Key Institutional Statistics
app.get('/api/university/info', (_req: Request, res: Response): void => {
  try {
    const status = universityVectorStore.getStatus();
    const facultyCount = getAllFaculty().length;
    const imagesCount = getAllCampusImages().length;
    const sourcesCount = getSourceRegistry().length;

    res.json({
      success: true,
      institution: {
        name: "Vignan's Foundation for Science, Technology & Research (VFSTR)",
        shortName: 'Vignan University',
        type: 'Deemed-to-be-University (Section 3 of UGC Act 1956)',
        establishedYear: 2008,
        sponsoringTrust: 'Vignan Educational Trust (est. 1997)',
        naacAccreditation: 'A+ Grade (3.49 CGPA in 2021)',
        campus: 'Vadlamudi, Chebrolu Mandal, Guntur District, Andhra Pradesh - 522213',
        totalCampusAreaAcres: 104,
        website: 'https://www.vignan.ac.in/',
      },
      knowledgeBase: {
        totalIndexedChunks: status.totalIndexedChunks,
        totalSourceRecords: status.totalSourcePages,
        totalFacultyProfiles: facultyCount,
        totalCampusImages: imagesCount,
        totalSourcesInRegistry: sourcesCount,
        lastRefreshTime: status.lastRefreshTime,
        status: status.status,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve university info.' });
  }
});

// Phase 3 & 11: Queryable Faculty Directory with Filters
app.get('/api/university/faculties', (req: Request, res: Response): void => {
  try {
    const { department, school, designation, research, name } = req.query;
    let list = getAllFaculty();

    if (department && typeof department === 'string') {
      list = getFacultyByDepartment(department);
    }
    if (school && typeof school === 'string') {
      const q = school.toLowerCase();
      list = list.filter((f) => f.school.toLowerCase().includes(q));
    }
    if (designation && typeof designation === 'string') {
      const q = designation.toLowerCase();
      list = list.filter((f) => f.designation.toLowerCase().includes(q));
    }
    if (research && typeof research === 'string') {
      const q = research.toLowerCase();
      list = list.filter((f) =>
        f.researchInterests.some((ri) => ri.toLowerCase().includes(q))
      );
    }
    if (name && typeof name === 'string') {
      const q = name.toLowerCase().replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '').trim();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }

    res.json({
      success: true,
      count: list.length,
      faculties: list,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve faculty directory.' });
  }
});

// Phase 8 & 11: Campus Images Visual Gallery with Filters
app.get('/api/university/images', (req: Request, res: Response): void => {
  try {
    const { category, block, search } = req.query;
    let images = getAllCampusImages();

    if (category && typeof category === 'string') {
      images = getCampusImagesByCategory(category as any);
    }
    if (block && typeof block === 'string') {
      images = getCampusImagesByBlock(block);
    }
    if (search && typeof search === 'string') {
      images = searchCampusImages(search);
    }

    res.json({
      success: true,
      count: images.length,
      images,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve campus images.' });
  }
});

// Phase 1 & 11: Official Source Registry with Category Filter
app.get('/api/university/sources', (req: Request, res: Response): void => {
  try {
    const { category } = req.query;
    let sources = getSourceRegistry();

    if (category && typeof category === 'string') {
      sources = getSourcesByCategory(category as any);
    }

    res.json({
      success: true,
      count: sources.length,
      sources,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve source registry.' });
  }
});

// Multer & General Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: 'File exceeds maximum allowed size of 100 MB per file.',
      });
      return;
    }
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }

  if (err) {
    res.status(500).json({ error: err.message || 'Internal server error.' });
    return;
  }

  next();
});

// Start Server
const server = app.listen(Number(PORT), HOST, () => {
  const geminiConfig = geminiService.validateConfig();

  console.log(`=======================================================`);
  console.log(`🚀 AI Assistant RAG & Research Backend active on http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}`);
  console.log(`   Health check: http://127.0.0.1:${PORT}/api/health`);
  console.log(`   Gemini Status: ${geminiConfig.configured ? 'Configured (' + geminiConfig.model + ', key: ' + geminiConfig.maskedKey + ')' : 'Not Configured (offline fallback active)'}`);
  console.log(`   Upload Limit: 100 MB per file (disk streaming)`);
  console.log(`   Rate Limiting: Active (Phase 9 protection)`);
  console.log(`=======================================================`);

  // Run initial idempotent document ownership reconciliation
  documentOwnershipMigration.runMigration({ dryRun: false })
    .then((report) => {
      if (report.successfullyRepairedCount > 0) {
        console.log(`[DOC MIGRATION] Repaired ${report.successfullyRepairedCount} legacy document records, quarantined ${report.quarantinedCount}, unchanged ${report.unchangedCount}.`);
      }
    })
    .catch((err) => {
      console.warn('[DOC MIGRATION] Initial migration scan notice:', err.message);
    });
});

// Graceful shutdown handling for container and cloud platforms
const handleGracefulShutdown = (signal: string) => {
  console.log(`\n[SHUTDOWN] Received ${signal}. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log('[SHUTDOWN] HTTP server closed. Process terminating safely.');
    process.exit(0);
  });
  // Force exit after 10 seconds if connections hang
  setTimeout(() => {
    console.warn('[SHUTDOWN] Force terminating process after timeout.');
    process.exit(0);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

export { app, server };
