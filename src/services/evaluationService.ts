import { auth } from './firebase';

export interface WebScrapingTestCase {
  id: string;
  categoryCode: 'A' | 'B' | 'C' | 'D' | 'E';
  categoryName: string;
  questionNumber: number;
  question: string;
  expectedCriteria: string[];
  relevantSourceUrls: string[];
  requiredEvidence: string[];
  expectedCitationBehavior: string;
}

export interface QuestionEvaluationReport {
  questionId: string;
  categoryCode: 'A' | 'B' | 'C' | 'D' | 'E';
  categoryName: string;
  questionNumber: number;
  question: string;
  passed: boolean;
  overallScore: number;
  scores: {
    urlRetrieval: number;
    contentExtraction: number;
    relevance: number;
    correctness: number;
    evidenceSupport: number;
    citationValidity: number;
    latencyMs: number;
  };
  retrievedUrlCount: number;
  extractedContentLength: number;
  answerSnippet: string;
  citations: { title: string; url?: string; domain?: string }[];
  failureReasons: string[];
}

export interface WebScrapingBenchmarkSummary {
  timestamp: string;
  mode: 'fixture' | 'live';
  totalQuestions: number;
  passedCount: number;
  failedCount: number;
  averageScore: number;
  metrics: {
    urlRetrievalSuccessRate: number;
    contentExtractionSuccessRate: number;
    averageRelevance: number;
    averageCorrectness: number;
    citationValidityRate: number;
    evidenceSupportRate: number;
    averageLatencyMs: number;
  };
  categoryBreakdown: Record<string, { total: number; passed: number; avgScore: number }>;
  results: QuestionEvaluationReport[];
}

import { API_BASE_URL } from './apiConfig';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {}
  return { 'x-user-id': 'developer' };
}

export async function fetchWebScrapingDataset(): Promise<WebScrapingTestCase[]> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/eval/web-scraping/dataset`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to load evaluation dataset: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.dataset || [];
}

export async function fetchLatestEvaluationResults(): Promise<WebScrapingBenchmarkSummary | null> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/eval/web-scraping/latest`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to load latest benchmark results: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.results || null;
}

export async function runWebScrapingEvaluation(
  mode: 'fixture' | 'live' = 'fixture',
  category?: string
): Promise<WebScrapingBenchmarkSummary> {
  const headers = {
    ...(await getAuthHeader()),
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${API_BASE_URL}/api/eval/web-scraping/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ mode, category }),
  });
  if (!res.ok) {
    throw new Error(`Failed to run web scraping evaluation: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.summary;
}

export async function runSingleEvaluation(
  questionId: string,
  mode: 'fixture' | 'live' = 'fixture'
): Promise<QuestionEvaluationReport> {
  const headers = {
    ...(await getAuthHeader()),
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${API_BASE_URL}/api/eval/web-scraping/run-single`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ questionId, mode }),
  });
  if (!res.ok) {
    throw new Error(`Failed to run single evaluation: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.report;
}
