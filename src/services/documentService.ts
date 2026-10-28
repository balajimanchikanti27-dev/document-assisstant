import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage, isFirebaseConfigured, auth } from './firebase';
import { UserDocument, UploadStage } from '../types';

export const SUPPORTED_FILE_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.md'];
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB per file

import { API_BASE_URL } from './apiConfig';

export interface FileValidationError {
  file: File;
  error: string;
}

export type UploadStageCallback = (
  progress: number,
  stage: UploadStage,
  stageMessage?: string
) => void;

export const validateDocumentFile = (file: File): string | null => {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
    return `Unsupported format (${extension}). Supported: PDF, PPT, PPTX, DOC, DOCX, TXT, MD.`;
  }
  if (file.size === 0) {
    return `File "${file.name}" is empty (0 bytes). Please upload a valid document.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File "${file.name}" exceeds maximum allowed size (100 MB). Actual size: ${(file.size / (1024 * 1024)).toFixed(1)} MB.`;
  }
  return null;
};

/**
 * Direct streaming upload to backend with genuine XMLHttpRequest byte progress events (0% - 100%)
 */
export const uploadDocumentToBackend = async (
  file: File,
  userId: string,
  docId: string,
  onProgress?: UploadStageCallback
): Promise<{ chunkCount?: number; pageCount?: number; slideCount?: number }> => {
  let token: string | undefined;
  try {
    token = await auth?.currentUser?.getIdToken();
  } catch (e) {}

  const canonicalUserId = auth?.currentUser?.uid || userId || 'anonymous';

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('userId', canonicalUserId);
    formData.append('documentId', docId);
    formData.append('filename', file.name);
    formData.append('file', file);

    if (onProgress) {
      onProgress(0, 'uploading', 'Starting upload...');
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        if (onProgress) {
          if (percent < 100) {
            onProgress(percent, 'uploading', `Uploading... ${percent}%`);
          } else {
            onProgress(100, 'processing', 'Upload complete. Processing text & slides...');
          }
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (onProgress) {
            onProgress(100, 'ready', 'Indexed & ready for questions');
          }
          resolve({
            chunkCount: data.chunkCount,
            pageCount: data.pageCount,
            slideCount: data.slideCount,
          });
        } catch (e) {
          resolve({});
        }
      } else {
        let errMessage = `Server error ${xhr.status}`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.error) errMessage = data.error;
        } catch (e) {}
        if (onProgress) {
          onProgress(0, 'error', errMessage);
        }
        reject(new Error(errMessage));
      }
    };

    xhr.onerror = () => {
      const msg = 'Network connection failed during upload. Check backend server on port 5000.';
      if (onProgress) onProgress(0, 'error', msg);
      reject(new Error(msg));
    };

    xhr.ontimeout = () => {
      const msg = 'Upload timed out. For very large files, ensure network connection is stable.';
      if (onProgress) onProgress(0, 'error', msg);
      reject(new Error(msg));
    };

    // 10-minute timeout for large 100 MB uploads
    xhr.timeout = 10 * 60 * 1000;
    xhr.open('POST', `${API_BASE_URL}/api/documents/process`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.setRequestHeader('x-user-id', canonicalUserId);
    xhr.send(formData);
  });
};

// Document Service API
export const getDocuments = async (userId: string): Promise<UserDocument[]> => {
  let docs: UserDocument[] = [];

  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, `users/${userId}/documents`),
        orderBy('uploadedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as UserDocument[];
    } catch (error) {
      console.warn('Firestore documents fetch error (falling back to local cache):', error);
    }
  }

  // Merge with locally stored documents
  try {
    const stored = localStorage.getItem(`ai_documents_${userId}`);
    if (stored) {
      const localList: UserDocument[] = JSON.parse(stored);
      const docIds = new Set(docs.map((d) => d.id));
      for (const ld of localList) {
        if (!docIds.has(ld.id)) {
          docs.push(ld);
        }
      }
    }
  } catch (e) {}

  // Merge with backend documents if available
  try {
    const headers: Record<string, string> = { 'x-user-id': userId };
    const token = await auth?.currentUser?.getIdToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/api/documents`, { headers });
    if (res.ok) {
      const data = await res.json();
      const serverDocs = (data.data?.documents || data.documents || []) as any[];
      const docIds = new Set(docs.map((d) => d.id));
      for (const sd of serverDocs) {
        if (!docIds.has(sd.id)) {
          docs.push({
            id: sd.id,
            name: sd.name,
            size: sd.size || 0,
            type: sd.type || 'application/octet-stream',
            extension: '.' + sd.name.split('.').pop()?.toLowerCase(),
            uploadedAt: sd.uploadedAt,
            status: sd.status || 'ready',
            progress: 100,
            downloadUrl: `${API_BASE_URL}/api/documents/${sd.id}/download`,
            chunkCount: sd.chunkCount,
            pageCount: sd.pageCount,
            slideCount: sd.slideCount,
          });
        }
      }
    }
  } catch (e) {}

  return docs;
};

export const uploadDocument = async (
  userId: string,
  file: File,
  onProgress?: UploadStageCallback,
  existingDocId?: string
): Promise<UserDocument> => {
  const extError = validateDocumentFile(file);
  if (extError) {
    if (onProgress) onProgress(0, 'error', extError);
    throw new Error(extError);
  }

  const canonicalUserId = auth?.currentUser?.uid || userId || 'anonymous';

  if (onProgress) onProgress(0, 'selected', 'File selected. Initializing upload...');

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const docId = existingDocId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Direct Backend Streaming Upload Pipeline (With Genuine 0% - 100% Byte Progress Events)
  try {
    const backendMeta = await uploadDocumentToBackend(file, canonicalUserId, docId, (progress, stage, msg) => {
      if (onProgress) onProgress(progress, stage, msg);
    });

    if (onProgress) onProgress(100, 'saving_metadata', 'Saving document metadata...');

    const documentRecord: UserDocument = {
      id: docId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      extension,
      uploadedAt: new Date().toISOString(),
      status: 'ready',
      progress: 100,
      downloadUrl: `${API_BASE_URL}/api/documents/${docId}/download`,
      pageCount: backendMeta.pageCount,
      slideCount: backendMeta.slideCount,
      chunkCount: backendMeta.chunkCount,
    };

    // Record in Firestore if available
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, `users/${canonicalUserId}/documents`, docId);
        await setDoc(docRef, documentRecord);
      } catch (e) {
        console.warn('Could not write metadata to Firestore:', e);
      }
    }

    // Record in local cache
    try {
      const stored = localStorage.getItem(`ai_documents_${canonicalUserId}`);
      const list: UserDocument[] = stored ? JSON.parse(stored) : [];
      const existingIdx = list.findIndex((d) => d.id === docId);
      if (existingIdx !== -1) {
        list[existingIdx] = documentRecord;
      } else {
        list.unshift(documentRecord);
      }
      localStorage.setItem(`ai_documents_${canonicalUserId}`, JSON.stringify(list));
    } catch (e) {}

    // Optional non-blocking background backup to Firebase Storage if online
    if (isFirebaseConfigured && storage) {
      const activeStorage = storage;
      setTimeout(async () => {
        try {
          const storageRef = ref(activeStorage, `users/${canonicalUserId}/documents/${docId}_${file.name}`);
          const snapshot = await uploadBytesResumable(storageRef, file);
          const cloudUrl = await getDownloadURL(snapshot.ref);
          if (db) {
            const docRef = doc(db, `users/${canonicalUserId}/documents`, docId);
            await updateDoc(docRef, { downloadUrl: cloudUrl });
          }
        } catch (e) {
          // Cloud backup is non-fatal; backend file download is already available
        }
      }, 50);
    }

    if (onProgress) onProgress(100, 'ready', 'Indexed & ready for questions');
    return documentRecord;
  } catch (error: any) {
    if (onProgress) onProgress(0, 'error', error.message || 'Upload failed.');
    throw error;
  }
};

export const deleteDocument = async (
  userId: string,
  documentId: string,
  documentName?: string
): Promise<{ success: boolean; message?: string }> => {
  const canonicalUserId = auth?.currentUser?.uid || userId || 'anonymous';

  // 1. Clean up backend vector chunks, jobs, summaries, and disk repository
  const headers: Record<string, string> = { 'x-user-id': canonicalUserId };
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch (e) {}

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/documents/${encodeURIComponent(documentId)}?userId=${encodeURIComponent(canonicalUserId)}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg =
        data.error ||
        (res.status === 403
          ? 'You are not authorized to delete this document.'
          : res.status === 404
          ? 'Document not found or already deleted.'
          : `Failed to delete document (HTTP ${res.status}).`);
      throw new Error(errMsg);
    }
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message?.includes('fetch')) {
      throw new Error('Network error: Unable to reach backend server. Please verify the server is running on port 5000.');
    }
    throw err;
  }

  // 2. Clean up Firestore metadata with safe 4-second timeout (never hang the UI)
  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      const docRef = doc(db, `users/${canonicalUserId}/documents`, documentId);
      await Promise.race([
        deleteDoc(docRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore delete timeout')), 4000)),
      ]);
    } catch (e: any) {
      console.warn('[FIRESTORE CLEANUP NOTICE]', e.message);
    }
  }

  // 3. Clean up Firebase Storage with safe 4-second timeout
  if (isFirebaseConfigured && storage && auth?.currentUser) {
    const targets = [`users/${canonicalUserId}/documents/${documentId}`];
    if (documentName) {
      targets.unshift(`users/${canonicalUserId}/documents/${documentId}_${documentName}`);
    }

    for (const storagePath of targets) {
      try {
        const fileRef = ref(storage, storagePath);
        await Promise.race([
          deleteObject(fileRef),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Storage delete timeout')), 4000)),
        ]);
        break;
      } catch (e: any) {
        // Missing storage file is acceptable (idempotent)
      }
    }
  }

  // 4. Clean up local browser storage cache
  try {
    const stored = localStorage.getItem(`ai_documents_${canonicalUserId}`);
    if (stored) {
      const list: UserDocument[] = JSON.parse(stored);
      localStorage.setItem(
        `ai_documents_${canonicalUserId}`,
        JSON.stringify(list.filter((d) => d.id !== documentId))
      );
    }
  } catch (e) {}

  return { success: true };
};

export const retryDocumentProcessing = async (userId: string, documentId: string): Promise<void> => {
  const canonicalUserId = auth?.currentUser?.uid || userId || 'anonymous';

  if (isFirebaseConfigured && db) {
    const docRef = doc(db, `users/${canonicalUserId}/documents`, documentId);
    await updateDoc(docRef, {
      status: 'processing',
      errorMessage: null,
    });
  }

  // Trigger retry on backend
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-user-id': canonicalUserId };
    const token = await auth?.currentUser?.getIdToken().catch(() => undefined);
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`${API_BASE_URL}/api/documents/${documentId}/retry-processing`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId: canonicalUserId }),
    });
  } catch (e) {}
};

export interface StudySummaryResult {
  success: boolean;
  documentId: string;
  documentName: string;
  fileType?: string;
  totalPages?: number;
  totalSlides?: number;
  totalSections: number;
  processedUnits: string[];
  summary: {
    title: string;
    documentName: string;
    unitType: 'slides' | 'pages' | 'sections';
    totalUnitsDiscovered: number;
    totalUnitsProcessed: number;
    overview: string;
    sections: {
      location: string;
      title: string;
      simpleExplanation: string;
      keyPoints: string[];
      example?: string;
    }[];
    definitions: {
      term: string;
      simpleMeaning: string;
      technicalContext?: string;
    }[];
    difficultConcepts: {
      concept: string;
      stepByStep: string[];
      analogyOrExample?: string;
    }[];
    formulasAndRules?: {
      formulaOrRule: string;
      meaning: string;
      application: string;
    }[];
    conceptComparisons?: {
      conceptA: string;
      conceptB: string;
      keyDifferences: string;
    }[];
    examRevisionPoints: string[];
    quickRevisionRecap: string[];
    coverageReport: {
      discoveredUnits: number;
      processedUnits: number;
      isFullyCovered: boolean;
      unitType: 'slides' | 'pages' | 'sections';
      unextractedUnits?: string[];
    };
  };
  formattedMarkdown: string;
  generatedAt: string;
  modelUsed: string;
}

export const generateStudySummary = async (
  userId: string,
  documentId: string,
  forceRefresh: boolean = false
): Promise<StudySummaryResult> => {
  const canonicalUserId = auth?.currentUser?.uid || userId || 'anonymous';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': canonicalUserId,
  };
  const token = await auth?.currentUser?.getIdToken().catch(() => undefined);
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/study-summary`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ forceRefresh }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to generate study summary.');
  }

  return data;
};

export const getStudySummary = async (
  userId: string,
  documentId: string
): Promise<StudySummaryResult | null> => {
  const canonicalUserId = auth?.currentUser?.uid || userId || 'anonymous';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': canonicalUserId,
  };
  const token = await auth?.currentUser?.getIdToken().catch(() => undefined);
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/study-summary`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data : null;
  } catch {
    return null;
  }
};
