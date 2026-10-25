import fs from 'fs';
import path from 'path';
import { documentJobManager, DocumentJob } from '../jobs/documentJobManager.js';
import { vectorStore, isUserAuthorized } from '../vectorStore/memoryVectorStore.js';
import { documentMetadataStore } from './documentMetadataStore.js';
import { studySummaryService } from './studySummaryService.js';
import { DocumentChunk } from '../types.js';

export interface UserDocumentInfo {
  id: string;
  name: string;
  size?: number;
  type?: string;
  status: 'uploading' | 'processing' | 'indexing' | 'ready' | 'error';
  uploadedAt: string;
  chunkCount: number;
  pageCount?: number;
  slideCount?: number;
  errorMessage?: string;
  downloadUrl?: string;
}

export class DocumentService {
  public listUserDocuments(userId: string): UserDocumentInfo[] {
    const docsDir = documentJobManager.getDocumentsDirectory();
    const docMap = new Map<string, UserDocumentInfo>();

    // 1. Gather from canonical documentMetadataStore
    const canonicalDocs = documentMetadataStore.getUserDocuments(userId);
    for (const doc of canonicalDocs) {
      if (doc.quarantined) continue;
      const chunks = doc.chunkCount || vectorStore.getDocumentChunkCount(userId, doc.id);
      docMap.set(doc.id, {
        id: doc.id,
        name: doc.filename,
        size: doc.sizeBytes,
        type: doc.fileType,
        status: doc.status,
        uploadedAt: new Date(doc.createdAt).toISOString(),
        chunkCount: chunks,
        pageCount: doc.pageCount,
        slideCount: doc.slideCount,
        errorMessage: doc.errorMessage,
        downloadUrl: `/api/documents/${doc.id}/download`,
      });
    }

    // 2. Gather from active document jobs
    for (const job of (documentJobManager as any).jobs?.values() || []) {
      if (isUserAuthorized(job.userId, userId)) {
        const chunks = job.chunkCount || vectorStore.getDocumentChunkCount(userId, job.documentId);
        docMap.set(job.documentId, {
          id: job.documentId,
          name: job.filename,
          status: job.status,
          uploadedAt: new Date(job.createdAt).toISOString(),
          chunkCount: chunks,
          pageCount: job.pageCount,
          slideCount: job.slideCount,
          errorMessage: job.errorMessage,
          downloadUrl: `/api/documents/${job.documentId}/download`,
        });
      }
    }

    // 2. Discover files stored on disk for this user: `${userId}__${documentId}__${filename}` or legacy `${userId}__${documentId}_${filename}`
    try {
      if (fs.existsSync(docsDir)) {
        const files = fs.readdirSync(docsDir);
        const knownDocIds = new Set(vectorStore.getUserDocumentIds(userId));

        for (const file of files) {
          if (file.startsWith(`${userId}__`)) {
            const remainder = file.substring(`${userId}__`.length);
            let docId = '';
            let origName = '';

            if (remainder.includes('__')) {
              const parts = remainder.split('__');
              docId = parts[0];
              origName = parts.slice(1).join('__');
            } else {
              // Legacy format: remainder is `${documentId}_${safeName}`
              let matched = false;
              for (const knownId of knownDocIds) {
                if (remainder.startsWith(`${knownId}_`)) {
                  docId = knownId;
                  origName = remainder.substring(knownId.length + 1);
                  matched = true;
                  break;
                }
              }

              if (!matched) {
                const fullMatch = remainder.match(/^(doc_\d+_[a-z0-9]+)_(.+)$/i);
                if (fullMatch) {
                  docId = fullMatch[1];
                  origName = fullMatch[2];
                  matched = true;
                }
              }

              if (!matched) {
                const timeMatch = remainder.match(/^(doc_\d+|test_doc_[a-z0-9_]+)_(.+)$/i);
                if (timeMatch) {
                  docId = timeMatch[1];
                  origName = timeMatch[2];
                  matched = true;
                }
              }

              if (!matched) {
                const firstUnderscore = remainder.indexOf('_');
                if (firstUnderscore > 0) {
                  docId = remainder.substring(0, firstUnderscore);
                  origName = remainder.substring(firstUnderscore + 1);
                } else {
                  docId = remainder;
                  origName = remainder;
                }
              }
            }

            if (docId) {
              const stat = fs.statSync(path.join(docsDir, file));
              const chunks = vectorStore.getDocumentChunkCount(userId, docId);
              const job = documentJobManager.getJob(docId);
              const isJobActive = job && (job.status === 'processing' || job.status === 'indexing' || job.status === 'uploading');

              if (!docMap.has(docId)) {
                docMap.set(docId, {
                  id: docId,
                  name: origName,
                  size: stat.size,
                  status: chunks > 0 ? 'ready' : (isJobActive ? 'processing' : 'ready'),
                  uploadedAt: stat.birthtime.toISOString(),
                  chunkCount: chunks,
                  downloadUrl: `/api/documents/${docId}/download`,
                });
              } else {
                const existing = docMap.get(docId)!;
                existing.size = stat.size;
                if (chunks > 0) {
                  existing.chunkCount = chunks;
                  existing.status = 'ready';
                }
              }
            }
          }
        }
      }
    } catch (e) {}

    return Array.from(docMap.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  public getDocumentInfo(userId: string, documentId: string): UserDocumentInfo | null {
    const list = this.listUserDocuments(userId);
    return list.find((d) => d.id === documentId) || null;
  }

  public getDocumentContent(
    userId: string,
    documentId: string
  ): {
    documentId: string;
    chunkCount: number;
    chunks: {
      chunkId: string;
      chunkIndex?: number;
      pageNumber?: number;
      slideNumber?: number;
      heading?: string;
      text: string;
    }[];
  } {
    const allChunks = (vectorStore as any).chunks as Map<string, DocumentChunk>;
    const userChunks: DocumentChunk[] = [];

    if (allChunks) {
      for (const chunk of allChunks.values()) {
        if (chunk.userId === userId && chunk.documentId === documentId) {
          userChunks.push(chunk);
        }
      }
    }

    userChunks.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));

    return {
      documentId,
      chunkCount: userChunks.length,
      chunks: userChunks.map((c) => ({
        chunkId: c.id,
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber,
        slideNumber: c.slideNumber,
        heading: c.heading,
        text: c.text,
      })),
    };
  }

  public deleteUserDocument(userId: string, documentId: string): {
    deletedChunks: number;
    deletedFiles: number;
  } {
    if (!documentId || typeof documentId !== 'string' || !documentId.trim()) {
      const err = new Error('Document ID is required.');
      (err as any).statusCode = 400;
      throw err;
    }

    const trimmedDocId = documentId.trim();

    // 1. Gather all candidate evidence to verify existence and ownership
    const docRecord = documentMetadataStore.getDocument(trimmedDocId);
    const job = documentJobManager.getJob(trimmedDocId);
    const docsDir = documentJobManager.getDocumentsDirectory();

    let matchingFiles: string[] = [];
    if (fs.existsSync(docsDir)) {
      try {
        matchingFiles = fs.readdirSync(docsDir).filter((f) =>
          f.includes(`__${trimmedDocId}__`) ||
          f.includes(`__${trimmedDocId}_`) ||
          f.startsWith(`${trimmedDocId}_`) ||
          f === trimmedDocId
        );
      } catch {}
    }

    const chunkCount = vectorStore.getDocumentChunkCount(userId, trimmedDocId);
    const allChunks = (vectorStore as any).chunks as Map<string, any> | undefined;
    let anyChunkDocOwner: string | undefined;
    if (allChunks) {
      for (const c of allChunks.values()) {
        if (c.documentId === trimmedDocId) {
          anyChunkDocOwner = c.userId;
          break;
        }
      }
    }

    const exists =
      !!docRecord ||
      !!job ||
      matchingFiles.length > 0 ||
      chunkCount > 0 ||
      anyChunkDocOwner !== undefined;

    if (!exists) {
      const err = new Error(`Document with ID "${trimmedDocId}" not found or already deleted.`);
      (err as any).statusCode = 404;
      throw err;
    }

    // 2. Ownership verification
    let authorized = false;
    if (docRecord) {
      authorized = documentMetadataStore.isDocumentOwnedBy(trimmedDocId, userId);
    } else if (job) {
      authorized = isUserAuthorized(job.userId, userId);
    } else if (matchingFiles.length > 0) {
      authorized = matchingFiles.some((f) => {
        const fileOwner = f.includes('__') ? f.split('__')[0] : 'anonymous';
        return isUserAuthorized(fileOwner, userId);
      });
    } else if (chunkCount > 0) {
      authorized = true;
    } else if (anyChunkDocOwner !== undefined) {
      authorized = isUserAuthorized(anyChunkDocOwner, userId);
    }

    if (!authorized) {
      const err = new Error(`User "${userId}" is not authorized to delete document "${trimmedDocId}".`);
      (err as any).statusCode = 403;
      throw err;
    }

    // 3. Purge vector store chunks
    const deletedChunks = vectorStore.deleteDocumentChunks(userId, trimmedDocId);

    // 4. Purge matching disk files strictly belonging to this authorized user
    let deletedFiles = 0;
    try {
      if (fs.existsSync(docsDir)) {
        for (const file of matchingFiles) {
          const fileOwner = file.includes('__') ? file.split('__')[0] : 'anonymous';
          if (isUserAuthorized(fileOwner, userId) || (docRecord && isUserAuthorized(docRecord.ownerId, userId))) {
            try {
              fs.unlinkSync(path.join(docsDir, file));
              deletedFiles++;
            } catch {}
          }
        }
      }
      if (docRecord?.filePath && fs.existsSync(docRecord.filePath)) {
        try {
          fs.unlinkSync(docRecord.filePath);
          deletedFiles++;
        } catch {}
      }
    } catch {}

    // 5. Purge job from documentJobManager
    documentJobManager.deleteJob(trimmedDocId);

    // 6. Purge cached study summaries
    studySummaryService.deleteSummary(userId, trimmedDocId);

    // 7. Purge from canonical documentMetadataStore
    documentMetadataStore.deleteDocument(trimmedDocId, userId);

    return { deletedChunks, deletedFiles };
  }

  public async deleteDocument(userId: string, documentId: string): Promise<boolean> {
    this.deleteUserDocument(userId, documentId);
    return true;
  }
}

export const documentService = new DocumentService();
