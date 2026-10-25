import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseDocument } from '../parsers/documentParser.js';
import { chunkSections } from '../chunker.js';
import { embeddingService } from '../embeddings/embeddingService.js';
import { vectorStore, isUserAuthorized } from '../vectorStore/memoryVectorStore.js';
import { documentMetadataStore } from '../services/documentMetadataStore.js';
import { DocumentChunk } from '../types.js';

export interface DocumentJob {
  documentId: string;
  userId: string;
  filename: string;
  tempFilePath?: string;
  permanentFilePath?: string;
  status: 'uploading' | 'processing' | 'indexing' | 'ready' | 'error';
  stage:
    | 'uploaded'
    | 'extracting'
    | 'parsing'
    | 'chunking'
    | 'embedding'
    | 'indexing'
    | 'indexed'
    | 'failed';
  progress: number;
  pageCount?: number;
  slideCount?: number;
  chunkCount?: number;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export class DocumentJobManager {
  private jobs: Map<string, DocumentJob> = new Map();
  private documentsDir: string;

  constructor() {
    try {
      const currentFile = fileURLToPath(import.meta.url);
      const serverRoot = path.resolve(path.dirname(currentFile), '..', '..');
      this.documentsDir = path.join(serverRoot, 'uploads', 'documents');
    } catch (e) {
      this.documentsDir = path.resolve(process.cwd(), 'uploads', 'documents');
    }

    if (!fs.existsSync(this.documentsDir)) {
      try {
        fs.mkdirSync(this.documentsDir, { recursive: true });
      } catch (e) {}
    }
  }

  public getDocumentsDirectory(): string {
    return this.documentsDir;
  }

  public createJob(documentId: string, userId: string, filename: string, tempFilePath?: string): DocumentJob {
    const job: DocumentJob = {
      documentId,
      userId,
      filename,
      tempFilePath,
      status: 'processing',
      stage: 'parsing',
      progress: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.jobs.set(documentId, job);
    return job;
  }

  public getJob(documentId: string): DocumentJob | undefined {
    return this.jobs.get(documentId);
  }

  public updateJob(documentId: string, updates: Partial<DocumentJob>): DocumentJob | undefined {
    const job = this.jobs.get(documentId);
    if (!job) return undefined;
    Object.assign(job, updates, { updatedAt: Date.now() });
    return job;
  }

  public deleteJob(documentId: string): boolean {
    return this.jobs.delete(documentId);
  }

  /**
   * Run full document ingestion pipeline with progress reporting and idempotent vector indexing
   */
  public async executeIngestion(
    documentId: string,
    userId: string,
    filename: string,
    inputBufferOrPath: Buffer | string,
    mimetype?: string
  ): Promise<DocumentJob> {
    let job = this.jobs.get(documentId);
    if (!job) {
      job = this.createJob(
        documentId,
        userId,
        filename,
        typeof inputBufferOrPath === 'string' ? inputBufferOrPath : undefined
      );
    }

    // Persist a permanent copy in uploads/documents/ with userId isolation
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const permanentPath = path.join(this.documentsDir, `${userId}__${documentId}__${safeName}`);

    try {
      if (typeof inputBufferOrPath === 'string' && fs.existsSync(inputBufferOrPath)) {
        if (inputBufferOrPath !== permanentPath) {
          try {
            fs.copyFileSync(inputBufferOrPath, permanentPath);
          } catch (e) {}
        }
      } else if (Buffer.isBuffer(inputBufferOrPath)) {
        try {
          fs.writeFileSync(permanentPath, inputBufferOrPath);
        } catch (e) {}
      }
      this.updateJob(documentId, { permanentFilePath: permanentPath });
    } catch (e) {}

    try {
      // 1. Extracting stage
      this.updateJob(documentId, {
        status: 'processing',
        stage: 'extracting',
        progress: 20,
      });

      const sections = await parseDocument(inputBufferOrPath, filename, mimetype);

      if (sections.length === 0) {
        throw new Error(`No readable text content could be extracted from "${filename}".`);
      }

      const pageCount = Math.max(...sections.map((s) => s.pageNumber || 0), 0) || undefined;
      const slideCount = Math.max(...sections.map((s) => s.slideNumber || 0), 0) || undefined;

      // 2. Semantic Chunking stage
      this.updateJob(documentId, {
        stage: 'chunking',
        progress: 45,
        pageCount,
        slideCount,
      });

      const unembeddedChunks = chunkSections(sections, documentId, userId, filename);

      // 3. Embedding Generation stage
      this.updateJob(documentId, {
        status: 'indexing',
        stage: 'embedding',
        progress: 70,
        chunkCount: unembeddedChunks.length,
      });

      const chunkTexts = unembeddedChunks.map((c) => c.text);
      const embeddings = await embeddingService.getEmbeddingsBatch(chunkTexts);

      const fullChunks: DocumentChunk[] = unembeddedChunks.map((c, idx) => ({
        id: c.id,
        documentId: c.documentId,
        userId: c.userId,
        documentName: c.documentName,
        sourceFilename: c.sourceFilename,
        fileType: c.fileType,
        pageNumber: c.pageNumber,
        slideNumber: c.slideNumber,
        heading: c.heading,
        sectionTitle: c.sectionTitle || c.heading,
        chunkIndex: c.chunkIndex,
        sequenceNumber: c.sequenceNumber ?? c.chunkIndex,
        processingVersion: c.processingVersion,
        indexingVersion: c.indexingVersion || c.processingVersion,
        createdAt: c.createdAt,
        text: c.text,
        textContent: c.textContent || c.text,
        embedding: embeddings[idx],
      }));

      // 4. Vector Indexing stage
      this.updateJob(documentId, {
        status: 'indexing',
        stage: 'indexing',
        progress: 90,
      });

      // Clear old chunks if any existed to guarantee idempotency
      vectorStore.deleteDocumentChunks(userId, documentId);
      await vectorStore.addChunks(fullChunks);

      // 5. Indexing Verification
      const indexedCount = vectorStore.getDocumentChunkCount(userId, documentId);
      if (indexedCount === 0) {
        throw new Error(`Indexing verification failed: No chunks were indexed for "${filename}".`);
      }

      // 6. Verified Completion
      const completedJob = this.updateJob(documentId, {
        status: 'ready',
        stage: 'indexed',
        progress: 100,
        pageCount,
        slideCount,
        chunkCount: indexedCount,
        errorMessage: undefined,
      })!;

      // Update canonical document metadata store
      documentMetadataStore.registerDocument({
        id: documentId,
        ownerId: userId,
        filename,
        filePath: permanentPath,
        fileType: mimetype || 'application/octet-stream',
        status: 'ready',
        stage: 'indexed',
        chunkCount: indexedCount,
        pageCount,
        slideCount,
        sizeBytes: fs.existsSync(permanentPath) ? fs.statSync(permanentPath).size : 0,
        errorMessage: undefined,
      });

      // Clean up temp file if different from permanent
      if (
        typeof inputBufferOrPath === 'string' &&
        inputBufferOrPath !== permanentPath &&
        fs.existsSync(inputBufferOrPath)
      ) {
        try {
          fs.unlinkSync(inputBufferOrPath);
        } catch (e) {}
      }

      return completedJob;
    } catch (err: any) {
      console.error(`[INGESTION FAILED] "${filename}":`, err.message);

      const failedJob = this.updateJob(documentId, {
        status: 'error',
        stage: 'failed',
        errorMessage: err.message || 'Processing failed.',
      })!;

      documentMetadataStore.registerDocument({
        id: documentId,
        ownerId: userId,
        filename,
        filePath: permanentPath,
        fileType: mimetype || 'application/octet-stream',
        status: 'error',
        stage: 'failed',
        errorMessage: err.message || 'Processing failed.',
        chunkCount: 0,
      });

      return failedJob;
    }
  }

  /**
   * Attempt automatic re-indexing if file is stored in permanent documents directory for this user
   */
  public async reindexIfMissing(userId: string, documentId: string, filename?: string): Promise<boolean> {
    if (vectorStore.hasDocumentChunks(userId, documentId)) {
      return true;
    }

    // 1. Check canonical metadata store first
    const rec = documentMetadataStore.getDocument(documentId);
    if (rec && documentMetadataStore.isDocumentOwnedBy(documentId, userId) && fs.existsSync(rec.filePath)) {
      console.log(`[AUTO-REINDEX] Re-indexing from registry: ${rec.filename} (${documentId}) on demand for user ${userId}...`);
      const job = await this.executeIngestion(documentId, userId, rec.filename, rec.filePath);
      return job.status === 'ready';
    }

    // 2. Fallback: look for matching file belonging to this user on disk
    try {
      if (!fs.existsSync(this.documentsDir)) return false;
      const files = fs.readdirSync(this.documentsDir);
      const match = files.find((f) => {
        if (!f.includes(`__${documentId}__`) && !f.includes(`__${documentId}_`)) return false;
        const fileUser = f.split('__')[0];
        return isUserAuthorized(fileUser, userId);
      });

      if (match) {
        const fullPath = path.join(this.documentsDir, match);
        const delim = match.includes(`__${documentId}__`) ? `__${documentId}__` : `__${documentId}_`;
        const prefix = match.split(delim)[0] + delim;
        const resolvedName = filename || match.substring(prefix.length);
        console.log(`[AUTO-REINDEX] Re-indexing from disk: ${resolvedName} (${documentId}) on demand for user ${userId}...`);
        const job = await this.executeIngestion(documentId, userId, resolvedName, fullPath);
        return job.status === 'ready';
      }
    } catch (e) {
      console.warn(`[AUTO-REINDEX ERROR] ${documentId}:`, e);
    }

    return false;
  }
}

export const documentJobManager = new DocumentJobManager();
