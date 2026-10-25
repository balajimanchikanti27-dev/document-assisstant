import { SourceCitation } from '../types';
import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface UniversityQueryResponse {
  success: boolean;
  isUniversityQuery: boolean;
  answer: string;
  campus: 'Vadlamudi';
  citations: SourceCitation[];
  categoryDetected?: string;
  isVerifiedKnowledge: boolean;
  retrievedChunkCount: number;
  modelUsed?: string;
}

export interface UniversityRefreshStatus {
  lastRefreshTime: string;
  totalIndexedChunks: number;
  totalSourcePages: number;
  seedUrlsAttempted: number;
  seedUrlsSuccessful: number;
  failedSources: string[];
  status: 'idle' | 'refreshing' | 'completed' | 'error';
  campus: 'Vadlamudi';
}

export interface UniversityRecord {
  id: string;
  url: string;
  title: string;
  category: string;
  campus: 'Vadlamudi';
  academicYear: string;
  lastVerifiedDate: string;
  content: string;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // Ignore offline/dev auth token errors
  }
  if (auth?.currentUser?.uid) {
    headers['x-user-id'] = auth.currentUser.uid;
  }
  return headers;
};

/**
 * Query Vignan University Knowledge via RAG pipeline
 */
export async function queryUniversityKnowledge(
  question: string,
  conversationId?: string,
  signal?: AbortSignal
): Promise<UniversityQueryResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/university/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question, conversationId }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `University query failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Get current ingestion status & vector index metrics
 */
export async function getUniversityStatus(): Promise<UniversityRefreshStatus> {
  const response = await fetch(`${API_BASE_URL}/api/university/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch university status: ${response.statusText}`);
  }
  const data = await response.json();
  return data.status;
}

/**
 * Trigger knowledge base ingestion refresh from official sources
 */
export async function refreshUniversityKnowledge(): Promise<UniversityRefreshStatus> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/university/refresh`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh university knowledge: ${response.statusText}`);
  }
  const data = await response.json();
  return data.status;
}

/**
 * List all verified university records
 */
export async function getUniversityRecords(): Promise<UniversityRecord[]> {
  const response = await fetch(`${API_BASE_URL}/api/university/records`);
  if (!response.ok) {
    throw new Error(`Failed to fetch university records: ${response.statusText}`);
  }
  const data = await response.json();
  return data.records;
}
