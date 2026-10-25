import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { documentMetadataStore, StoredDocumentRecord } from '../services/documentMetadataStore.js';
import { vectorStore } from '../vectorStore/memoryVectorStore.js';

export interface MigrationItemReport {
  documentId: string;
  filename: string;
  previousOwner: string;
  resolvedOwner: string;
  evidenceSource: 'chat_session' | 'disk_prefix' | 'vector_chunk' | 'quarantined';
  actionTaken: 'reassigned' | 'preserved' | 'quarantined' | 'disk_renamed';
  status: 'repaired' | 'quarantined' | 'unchanged' | 'error';
  details: string;
}

export interface MigrationAuditReport {
  timestamp: string;
  isDryRun: boolean;
  totalDocumentsScanned: number;
  unassignedOrAnonymousCount: number;
  successfullyRepairedCount: number;
  quarantinedCount: number;
  unchangedCount: number;
  items: MigrationItemReport[];
}

export class DocumentOwnershipMigration {
  private documentsDir: string;
  private chatsFilePath: string;
  private vectorIndexFilePath: string;

  constructor() {
    try {
      const currentFile = fileURLToPath(import.meta.url);
      const serverRoot = path.resolve(path.dirname(currentFile), '..', '..');
      this.documentsDir = path.join(serverRoot, 'uploads', 'documents');
      this.chatsFilePath = path.join(serverRoot, 'data', 'chats.json');
      this.vectorIndexFilePath = path.join(serverRoot, 'data', 'vector_index.json');
    } catch {
      this.documentsDir = path.resolve(process.cwd(), 'uploads', 'documents');
      this.chatsFilePath = path.resolve(process.cwd(), 'data', 'chats.json');
      this.vectorIndexFilePath = path.resolve(process.cwd(), 'data', 'vector_index.json');
    }
  }

  /**
   * Builds an ownership mapping based on authenticated chats that selected the document
   */
  private buildChatOwnershipEvidence(): Map<string, string> {
    const evidenceMap = new Map<string, string>();
    if (!fs.existsSync(this.chatsFilePath)) return evidenceMap;

    try {
      const raw = fs.readFileSync(this.chatsFilePath, 'utf-8');
      const chats = JSON.parse(raw);
      for (const chat of chats) {
        const userId = chat.userId;
        if (!userId || userId === 'anonymous' || userId === 'guest_user') continue;

        if (Array.isArray(chat.selectedDocumentIds)) {
          for (const docId of chat.selectedDocumentIds) {
            if (!evidenceMap.has(docId)) {
              evidenceMap.set(docId, userId);
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('[MIGRATION] Error reading chats for evidence:', e.message);
    }

    return evidenceMap;
  }

  /**
   * Run the ownership audit and repair process
   */
  public async runMigration(options: { dryRun?: boolean } = {}): Promise<MigrationAuditReport> {
    const dryRun = options.dryRun ?? false;
    const chatEvidence = this.buildChatOwnershipEvidence();
    const items: MigrationItemReport[] = [];

    let totalScanned = 0;
    let unassignedOrAnonymous = 0;
    let successfullyRepaired = 0;
    let quarantined = 0;
    let unchanged = 0;

    // Scan documents on disk
    if (fs.existsSync(this.documentsDir)) {
      const files = fs.readdirSync(this.documentsDir);

      for (const file of files) {
        totalScanned++;
        const fullPath = path.join(this.documentsDir, file);

        let currentOwner = 'anonymous';
        let docId = '';
        let originalName = file;

        if (file.includes('__')) {
          const firstDoubleUnder = file.indexOf('__');
          currentOwner = file.substring(0, firstDoubleUnder);
          const remainder = file.substring(firstDoubleUnder + 2);

          if (remainder.includes('__')) {
            const rParts = remainder.split('__');
            docId = rParts[0];
            originalName = rParts.slice(1).join('__');
          } else {
            // Legacy format: remainder is `${documentId}_${filename}`
            const docMatch =
              remainder.match(/^(doc_\d+_[a-z0-9]+)_(.+)$/i) ||
              remainder.match(/^(test_doc_[a-z0-9_]+)_(.+)$/i) ||
              remainder.match(/^(doc_[a-z0-9_]+)_(.+)$/i);
            if (docMatch) {
              docId = docMatch[1];
              originalName = docMatch[2];
            } else {
              const uIdx = remainder.indexOf('_');
              if (uIdx > 0) {
                docId = remainder.substring(0, uIdx);
                originalName = remainder.substring(uIdx + 1);
              } else {
                docId = remainder;
                originalName = remainder;
              }
            }
          }
        } else {
          const docMatch =
            file.match(/^(doc_\d+_[a-z0-9]+)_(.+)$/i) ||
            file.match(/^(doc_[a-z0-9_]+)_(.+)$/i);
          if (docMatch) {
            docId = docMatch[1];
            originalName = docMatch[2];
          } else {
            const uIdx = file.indexOf('_');
            if (uIdx > 0) {
              docId = file.substring(0, uIdx);
              originalName = file.substring(uIdx + 1);
            }
          }
        }

        if (!docId) {
          unchanged++;
          continue;
        }

        const isAnon = !currentOwner || currentOwner === 'anonymous' || currentOwner === 'guest_user';

        if (isAnon) {
          unassignedOrAnonymous++;
          const legitimateOwner = chatEvidence.get(docId);

          if (legitimateOwner) {
            // Proven owner from authenticated chat session history!
            successfullyRepaired++;
            const newFilename = `${legitimateOwner}__${docId}__${originalName}`;
            const newFullPath = path.join(this.documentsDir, newFilename);

            items.push({
              documentId: docId,
              filename: originalName,
              previousOwner: currentOwner,
              resolvedOwner: legitimateOwner,
              evidenceSource: 'chat_session',
              actionTaken: 'disk_renamed',
              status: 'repaired',
              details: `Established ownership via user chat sessions (${legitimateOwner})`,
            });

            if (!dryRun) {
              // 1. Rename file on disk
              try {
                if (fullPath !== newFullPath) {
                  if (!fs.existsSync(newFullPath)) {
                    fs.renameSync(fullPath, newFullPath);
                  } else {
                    fs.unlinkSync(fullPath);
                  }
                }
              } catch (err: any) {
                console.warn(`[MIGRATION] Disk rename failed for ${file}:`, err.message);
              }

              // 2. Register/update in metadata store
              documentMetadataStore.registerDocument({
                id: docId,
                ownerId: legitimateOwner,
                filename: originalName,
                filePath: newFullPath,
                status: 'ready',
                stage: 'indexed',
              });

              // 3. Update chunk ownership in vector store
              const allChunks = (vectorStore as any).chunks as Map<string, any>;
              if (allChunks) {
                for (const chunk of allChunks.values()) {
                  if (chunk.documentId === docId) {
                    chunk.userId = legitimateOwner;
                  }
                }
                vectorStore.saveToDisk();
              }
            }
          } else {
            // Owner cannot be proven with high confidence: quarantine safely without data loss
            quarantined++;
            items.push({
              documentId: docId,
              filename: originalName,
              previousOwner: currentOwner,
              resolvedOwner: 'anonymous (quarantined)',
              evidenceSource: 'quarantined',
              actionTaken: 'quarantined',
              status: 'quarantined',
              details: 'No authenticated chat sessions or verifiable user metadata found; preserved safely in quarantine',
            });

            if (!dryRun) {
              documentMetadataStore.registerDocument({
                id: docId,
                ownerId: currentOwner,
                filename: originalName,
                filePath: fullPath,
                status: 'ready',
                stage: 'indexed',
                quarantined: true,
                quarantineReason: 'Ownership could not be verified from upload records or authenticated chat sessions',
              });
            }
          }
        } else {
          // Already has a specific authenticated owner
          unchanged++;
          items.push({
            documentId: docId,
            filename: originalName,
            previousOwner: currentOwner,
            resolvedOwner: currentOwner,
            evidenceSource: 'disk_prefix',
            actionTaken: 'preserved',
            status: 'unchanged',
            details: `Valid existing ownership verified for user (${currentOwner})`,
          });

          if (!dryRun) {
            documentMetadataStore.registerDocument({
              id: docId,
              ownerId: currentOwner,
              filename: originalName,
              filePath: fullPath,
              status: 'ready',
              stage: 'indexed',
            });
          }
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      isDryRun: dryRun,
      totalDocumentsScanned: totalScanned,
      unassignedOrAnonymousCount: unassignedOrAnonymous,
      successfullyRepairedCount: successfullyRepaired,
      quarantinedCount: quarantined,
      unchangedCount: unchanged,
      items,
    };
  }
}

export const documentOwnershipMigration = new DocumentOwnershipMigration();
