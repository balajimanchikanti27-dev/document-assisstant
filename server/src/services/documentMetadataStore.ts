import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isUserAuthorized } from '../vectorStore/memoryVectorStore.js';

export interface StoredDocumentRecord {
  id: string;
  ownerId: string;
  filename: string;
  fileType: string;
  extension: string;
  sizeBytes: number;
  filePath: string;
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
  chunkCount: number;
  pageCount?: number;
  slideCount?: number;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  processingVersion: string;
  quarantined?: boolean;
  quarantineReason?: string;
}

import { getStorageDataDir, getStorageUploadsDir } from '../utils/paths.js';

export class DocumentMetadataStore {
  private records: Map<string, StoredDocumentRecord> = new Map();
  private storageFilePath: string;
  private documentsDir: string;

  constructor() {
    const dataDir = getStorageDataDir();
    this.storageFilePath = path.join(dataDir, 'documents_registry.json');
    this.documentsDir = path.join(getStorageUploadsDir(), 'documents');
    if (!fs.existsSync(this.documentsDir)) {
      try {
        fs.mkdirSync(this.documentsDir, { recursive: true });
      } catch (e) {}
    }

    this.loadFromDisk();
    this.syncFromDisk();
  }

  private loadFromDisk(): void {
    if (fs.existsSync(this.storageFilePath)) {
      try {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const list: StoredDocumentRecord[] = JSON.parse(raw);
        for (const item of list) {
          if (item.id && item.id !== 'doc' && !/\.(pptx|pdf|docx|doc|ppt|txt|md)$/i.test(item.id)) {
            this.records.set(item.id, item);
          }
        }
      } catch (err: any) {
        console.warn('[DOC REGISTRY] Could not load persisted registry:', err.message);
      }
    }
  }

  public saveToDisk(): void {
    try {
      const list = Array.from(this.records.values());
      fs.writeFileSync(this.storageFilePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[DOC REGISTRY] Failed to persist registry to disk:', err.message);
    }
  }

  /**
   * Sync existing documents from disk and populate metadata store
   */
  public syncFromDisk(): void {
    if (!fs.existsSync(this.documentsDir)) return;

    try {
      // Purge any keys that were erroneously saved with file extensions or 'doc'
      for (const [key] of Array.from(this.records.entries())) {
        if (key === 'doc' || /\.(pptx|pdf|docx|doc|ppt|txt|md)$/i.test(key)) {
          this.records.delete(key);
        }
      }

      const files = fs.readdirSync(this.documentsDir);
      let updated = false;

      for (const file of files) {
        const fullPath = path.join(this.documentsDir, file);
        if (!fs.existsSync(fullPath)) continue;
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) continue;

        let ownerId = 'anonymous';
        let docId = '';
        let origFilename = file;

        const parts = file.split('__');
        if (parts.length >= 3) {
          ownerId = parts[0];
          docId = parts[1];
          origFilename = parts.slice(2).join('__');
        } else if (parts.length === 2) {
          ownerId = parts[0];
          const remainder = parts[1];
          const docMatch =
            remainder.match(/^(doc_\d+_[a-z0-9]+)_(.+)$/i) ||
            remainder.match(/^(test_doc_[a-z0-9_]+)_(.+)$/i) ||
            remainder.match(/^((?:doc|test_doc)_[a-zA-Z0-9_-]+?)_([a-zA-Z0-9_\s-]+\.[a-zA-Z0-9]+)$/);
          if (docMatch) {
            docId = docMatch[1];
            origFilename = docMatch[2];
          } else {
            const underscoreIdx = remainder.indexOf('_');
            if (underscoreIdx > 3) {
              docId = remainder.substring(0, underscoreIdx);
              origFilename = remainder.substring(underscoreIdx + 1);
            } else {
              docId = remainder.replace(/\.[^/.]+$/, '');
              origFilename = remainder;
            }
          }
        } else {
          // Legacy format: `${documentId}_${filename}`
          const docMatch =
            file.match(/^(doc_\d+_[a-z0-9]+)_(.+)$/i) ||
            file.match(/^(test_doc_[a-z0-9_]+)_(.+)$/i) ||
            file.match(/^((?:doc|test_doc)_[a-zA-Z0-9_-]+?)_([a-zA-Z0-9_\s-]+\.[a-zA-Z0-9]+)$/);
          if (docMatch) {
            docId = docMatch[1];
            origFilename = docMatch[2];
          } else {
            const underscoreIdx = file.indexOf('_');
            if (underscoreIdx > 3) {
              docId = file.substring(0, underscoreIdx);
              origFilename = file.substring(underscoreIdx + 1);
            }
          }
        }

        if (docId === 'doc') {
          docId = '';
        }

        if (docId) {
          const ext = '.' + origFilename.split('.').pop()?.toLowerCase();
          const existing = this.records.get(docId);
          if (!existing || (existing.ownerId === 'anonymous' && ownerId !== 'anonymous')) {
            const record: StoredDocumentRecord = {
              id: docId,
              ownerId: ownerId,
              filename: origFilename,
              fileType: this.guessMimeType(origFilename),
              extension: ext,
              sizeBytes: stat.size,
              filePath: fullPath,
              status: existing?.status || 'ready',
              stage: existing?.stage || 'indexed',
              chunkCount: existing?.chunkCount || 0,
              createdAt: existing?.createdAt || stat.birthtimeMs || Date.now(),
              updatedAt: stat.mtimeMs || Date.now(),
              processingVersion: 'v2.1',
              quarantined: existing?.quarantined ?? (ownerId === 'anonymous'),
              quarantineReason: existing?.quarantineReason,
            };
            this.records.set(docId, record);
            updated = true;
          }
        }
      }

      // Always save cleansed state
      this.saveToDisk();
    } catch (err: any) {
      console.warn('[DOC REGISTRY] Error syncing from disk:', err.message);
    }
  }

  public registerDocument(
    data: Partial<StoredDocumentRecord> & { id: string; ownerId: string; filename: string }
  ): StoredDocumentRecord {
    const existing = this.records.get(data.id);
    const ext = data.extension || '.' + data.filename.split('.').pop()?.toLowerCase();

    const record: StoredDocumentRecord = {
      id: data.id,
      ownerId: data.ownerId,
      filename: data.filename,
      fileType: data.fileType || this.guessMimeType(data.filename),
      extension: ext,
      sizeBytes: data.sizeBytes || existing?.sizeBytes || 0,
      filePath: data.filePath || existing?.filePath || '',
      status: data.status || 'processing',
      stage: data.stage || 'parsing',
      chunkCount: data.chunkCount || 0,
      pageCount: data.pageCount || existing?.pageCount,
      slideCount: data.slideCount || existing?.slideCount,
      errorMessage: data.errorMessage,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      processingVersion: data.processingVersion || 'v2.1',
      quarantined: data.quarantined || false,
      quarantineReason: data.quarantineReason,
    };

    this.records.set(data.id, record);
    this.saveToDisk();
    return record;
  }

  public updateDocument(id: string, updates: Partial<StoredDocumentRecord>): StoredDocumentRecord | null {
    const record = this.records.get(id);
    if (!record) return null;

    Object.assign(record, updates, { updatedAt: Date.now() });
    this.records.set(id, record);
    this.saveToDisk();
    return record;
  }

  public getDocument(id: string): StoredDocumentRecord | null {
    let rec = this.records.get(id);
    if (!rec) {
      this.loadFromDisk();
      rec = this.records.get(id);
    }
    return rec || null;
  }

  public hasDocument(id: string): boolean {
    if (!this.records.has(id)) {
      this.loadFromDisk();
    }
    return this.records.has(id);
  }

  public getUserDocuments(userId: string): StoredDocumentRecord[] {
    const list: StoredDocumentRecord[] = [];
    for (const record of this.records.values()) {
      if (isUserAuthorized(record.ownerId, userId) && !record.quarantined) {
        list.push(record);
      }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  public isDocumentOwnedBy(documentId: string, requestedUserId: string): boolean {
    let record = this.records.get(documentId);
    if (!record) {
      this.loadFromDisk();
      record = this.records.get(documentId);
    }
    if (record) {
      if (record.quarantined) return false;
      return isUserAuthorized(record.ownerId, requestedUserId);
    }

    // Fallback: check file on disk
    if (fs.existsSync(this.documentsDir)) {
      try {
        const files = fs.readdirSync(this.documentsDir);
        const match = files.find(
          (f) => f.includes(`__${documentId}__`) || f.includes(`__${documentId}_`) || f.startsWith(`${documentId}_`)
        );
        if (match) {
          const fileUser = match.includes('__') ? match.split('__')[0] : 'anonymous';
          return isUserAuthorized(fileUser, requestedUserId);
        }
      } catch {}
    }

    return false;
  }

  public deleteDocument(documentId: string, requestedUserId: string): boolean {
    const record = this.records.get(documentId);
    if (record && !isUserAuthorized(record.ownerId, requestedUserId)) {
      return false;
    }

    if (record?.filePath && fs.existsSync(record.filePath)) {
      try {
        fs.unlinkSync(record.filePath);
      } catch {}
    }

    this.records.delete(documentId);
    this.saveToDisk();
    return true;
  }

  public getAllRecords(): StoredDocumentRecord[] {
    return Array.from(this.records.values());
  }

  private guessMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'ppt':
        return 'application/vnd.ms-powerpoint';
      case 'pptx':
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'txt':
        return 'text/plain';
      case 'md':
        return 'text/markdown';
      default:
        return 'application/octet-stream';
    }
  }
}

export const documentMetadataStore = new DocumentMetadataStore();
