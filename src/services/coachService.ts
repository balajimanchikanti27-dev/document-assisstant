import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { API_BASE_URL } from './apiConfig';

async function getAuthHeaders(userId?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const user = auth?.currentUser;
  const effectiveUserId = userId || user?.uid || 'anonymous';
  headers['x-user-id'] = effectiveUserId;

  if (user) {
    try {
      const token = await user.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {}
  }

  return headers;
}

export type QuestionType =
  | 'mcq'
  | 'short_answer'
  | 'true_false'
  | 'fill_in_the_blank'
  | 'one_line'
  | 'long_answer'
  | 'application';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  correctOptionIndex?: number;
  acceptableKeywords?: string[];
  expectedAnswer?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic: string;
  sourceLocation: string;
  sourceSlide?: number | string;
  sourcePage?: number | string;
  sourceSnippet: string;
  explanation: string;
}

export interface QuizData {
  quizId: string;
  id?: string;
  documentId: string;
  documentName: string;
  questions: QuizQuestion[];
  totalQuestions: number;
  mcqCount: number;
  shortAnswerCount: number;
  generatedAt: string;
  modelUsed: string;
}

export interface QuestionEvaluation {
  questionId: string;
  type: QuestionType;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  topic: string;
  sourceLocation: string;
  sourceReference?: string;
  sourceSnippet: string;
  explanation: string;
}

export interface WeakTopicReport {
  topic: string;
  topicName?: string;
  incorrectCount: number;
  totalQuestionsInTopic: number;
  recommendedSlides: string[];
  revisionSlides?: string[];
  revisionGuidance: string;
  recommendedRevision?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface QuizEvaluationReport {
  attemptId: string;
  documentId: string;
  documentName: string;
  score: number;
  correctAnswers?: number;
  totalQuestions: number;
  percentage: number;
  scorePercentage?: number;
  grade: string;
  passed: boolean;
  timeSpentSeconds?: number;
  completedAt: string;
  evaluations: QuestionEvaluation[];
  incorrectQuestions: QuestionEvaluation[];
  weakTopics: WeakTopicReport[];
  overallFeedback: string;
}

export interface RevisionTopicCard {
  topic: string;
  location: string;
  coreConcept: string;
  keyTakeaways: string[];
  examCaution?: string;
}

export interface HighYieldExamQuestion {
  question: string;
  modelAnswer: string;
  location: string;
  examProbability: 'high' | 'very_high';
}

export interface FormulaOrRuleItem {
  ruleOrFormula: string;
  meaning: string;
  application: string;
  location: string;
}

export interface RevisionNotesData {
  documentId: string;
  documentName: string;
  generatedAt: string;
  quickRecapBullets: string[];
  topicCards: RevisionTopicCard[];
  highYieldQuestions: HighYieldExamQuestion[];
  highYieldExamQuestions?: HighYieldExamQuestion[];
  formulasAndRules: FormulaOrRuleItem[];
  keyFormulasOrRules?: FormulaOrRuleItem[];
}

export interface ImportantExamQuestion {
  id: string;
  question: string;
  importance: 'High' | 'Medium' | 'Basic';
  category: 'conceptual' | 'definition' | 'short_answer' | 'long_answer' | 'comparison' | 'process_formula' | 'application';
  topic: string;
  suggestedAnswerPoints: string[];
  sourceLocation: string;
  sourceSlide?: number | string;
  sourcePage?: number | string;
  recommendedAnswerLength: string;
}

export interface ImportantQuestionsBank {
  documentId: string;
  documentName: string;
  generatedAt: string;
  disclaimer: string;
  prioritiesBreakdown: { high: number; medium: number; basic: number };
  questions: ImportantExamQuestion[];
}

export interface ShortNotesSection {
  topic: string;
  location: string;
  bullets: string[];
  keyTakeaway: string;
}

export interface ShortNotesData {
  documentId: string;
  documentName: string;
  sections: ShortNotesSection[];
  highYieldPointers: string[];
}

export interface LongAnswerQuestion {
  id: string;
  topic: string;
  location: string;
  marks: 5 | 10;
  question: string;
  modelAnswerStructure: {
    introduction: string;
    corePoints: { point: string; explanation: string }[];
    diagramOrSyntaxExplanation?: string;
    conclusion: string;
  };
  markingScheme: { criterion: string; marks: number }[];
}

export interface LongAnswerQuestionsData {
  documentId: string;
  documentName: string;
  questions: LongAnswerQuestion[];
}

export interface DefinitionsAndFormulasData {
  documentId: string;
  documentName: string;
  definitions: { term: string; simpleMeaning: string; technicalContext?: string }[];
  formulasAndRules: FormulaOrRuleItem[];
  examples: { title: string; scenario: string; conceptIllustrated: string; location: string }[];
}

export interface FinalRevisionGuideData {
  documentId: string;
  documentName: string;
  executiveSummary: string;
  masterChecklist: string[];
  quickRecapBullets: string[];
  coreFormulas: { formulaOrRule: string; application: string }[];
  topExamQuestions: { question: string; briefAnswer: string; priority: string }[];
  examPitfallsToAvoid: string[];
  printableMarkdown: string;
}

export interface StudentCoachProgress {
  userId: string;
  documentId: string;
  documentName: string;
  latestScore?: number;
  latestPercentage?: number;
  totalAttempts: number;
  bestPercentage: number;
  attempts: {
    attemptId: string;
    score: number;
    total: number;
    percentage: number;
    scorePercentage?: number;
    date: string;
  }[];
  currentWeakTopics: WeakTopicReport[];
  lastStudiedAt: string;
}

/**
 * Smart Study Coach Client Service
 * Connects directly to real backend endpoints with resilient fallbacks and Firestore sync
 */
export const coachService = {
  /**
   * 1. Summarize Entire Document & 2. Explain in Simple English
   */
  async getStudyMaterial(
    documentId: string,
    userId?: string,
    options?: { level?: 'beginner' | 'detailed'; forceRefresh?: boolean }
  ): Promise<any> {
    const headers = await getAuthHeaders(userId);
    // Try POST /api/study-coach/summary first
    try {
      const res = await fetch(`${API_BASE_URL}/api/study-coach/summary`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          documentId,
          level: options?.level || 'beginner',
          forceRefresh: options?.forceRefresh ?? false,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || json.studyMaterial;
      }
    } catch {}

    // Fallback to GET /api/coach/:id/study-material
    const res = await fetch(`${API_BASE_URL}/api/coach/${encodeURIComponent(documentId)}/study-material`, {
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch study material (${res.status})`);
    }
    const data = await res.json();
    return data.data || data.studyMaterial;
  },

  /**
   * 3. Generate Complete Quiz (configurable length and question types)
   */
  async generateQuiz(
    documentId: string,
    options?: { forceRefresh?: boolean; questionCount?: number; questionTypes?: QuestionType[] } | boolean,
    userId?: string
  ): Promise<QuizData> {
    const opts = typeof options === 'boolean' ? { forceRefresh: options } : options || {};
    const headers = await getAuthHeaders(userId);

    // Try POST /api/study-coach/quiz first
    try {
      const res = await fetch(`${API_BASE_URL}/api/study-coach/quiz`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          documentId,
          forceRefresh: opts.forceRefresh ?? false,
          questionCount: opts.questionCount,
          questionTypes: opts.questionTypes,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || json.quiz;
      }
    } catch {}

    // Fallback to POST /api/coach/:id/quiz/generate
    const res = await fetch(`${API_BASE_URL}/api/coach/${encodeURIComponent(documentId)}/quiz/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ forceRefresh: opts.forceRefresh ?? false }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to generate quiz (${res.status})`);
    }
    const data = await res.json();
    return data.data || data.quiz;
  },

  /**
   * Submits student answers, calculates score, returns mistake explanations & weak topics
   */
  async submitQuiz(
    documentId: string,
    answers: { questionId: string; answer: string }[],
    timeSpentSeconds = 0,
    userId?: string
  ): Promise<QuizEvaluationReport> {
    const headers = await getAuthHeaders(userId);

    let report: QuizEvaluationReport;

    // Try POST /api/study-coach/evaluate-quiz first
    try {
      const res = await fetch(`${API_BASE_URL}/api/study-coach/evaluate-quiz`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ documentId, answers, timeSpentSeconds }),
      });
      if (res.ok) {
        const json = await res.json();
        report = json.data || json.evaluation;
      } else {
        throw new Error('Fallback to coach submit');
      }
    } catch {
      // Fallback to POST /api/coach/:id/quiz/submit
      const res = await fetch(`${API_BASE_URL}/api/coach/${encodeURIComponent(documentId)}/quiz/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ answers, timeSpentSeconds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to submit quiz (${res.status})`);
      }
      const json = await res.json();
      report = json.data || json.evaluation;
    }

    // Async sync to Firestore for multi-device student persistence
    const effectiveUid = userId || auth?.currentUser?.uid;
    if (db && effectiveUid && effectiveUid !== 'anonymous') {
      try {
        const docRef = doc(db, 'users', effectiveUid, 'coach_attempts', report.attemptId);
        await setDoc(docRef, {
          ...report,
          userId: effectiveUid,
          syncedAt: new Date().toISOString(),
        });
      } catch (e: any) {
        console.warn('[FIRESTORE NOTICE] Quiz attempt saved locally & backend:', e.message);
      }
    }

    return report;
  },

  /**
   * 4. Generate Important Exam Questions Bank
   */
  async getImportantExamQuestions(
    documentId: string,
    forceRefresh = false,
    userId?: string
  ): Promise<ImportantQuestionsBank> {
    const headers = await getAuthHeaders(userId);
    const res = await fetch(`${API_BASE_URL}/api/study-coach/important-questions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ documentId, forceRefresh }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load important exam questions (${res.status})`);
    }
    const json = await res.json();
    return json.data || json.importantQuestions;
  },

  /**
   * 5. Generate Short Notes
   */
  async getShortNotes(documentId: string, userId?: string): Promise<ShortNotesData> {
    const headers = await getAuthHeaders(userId);
    const res = await fetch(`${API_BASE_URL}/api/study-coach/short-notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ documentId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to generate short notes (${res.status})`);
    }
    const json = await res.json();
    return json.data || json.shortNotes;
  },

  /**
   * 6. Generate Long-Answer Questions
   */
  async getLongAnswerQuestions(documentId: string, userId?: string): Promise<LongAnswerQuestionsData> {
    const headers = await getAuthHeaders(userId);
    const res = await fetch(`${API_BASE_URL}/api/study-coach/long-answer-questions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ documentId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to generate long-answer questions (${res.status})`);
    }
    const json = await res.json();
    return json.data || json.longAnswerQuestions;
  },

  /**
   * 7. Ask Questions About the Document (in-coach grounded RAG)
   */
  async askQuestion(
    documentId: string | string[],
    question: string,
    userId?: string
  ): Promise<{ answer: string; citations: any[] }> {
    const headers = await getAuthHeaders(userId);
    const payload = Array.isArray(documentId)
      ? { documentIds: documentId, question }
      : { documentId, question };

    const res = await fetch(`${API_BASE_URL}/api/study-coach/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to answer question (${res.status})`);
    }
    const json = await res.json();
    return {
      answer: json.answer || json.data?.answer || '',
      citations: json.citations || json.data?.citations || [],
    };
  },

  /**
   * 8. Generate Topic-Wise Revision Notes
   */
  async getRevisionNotes(documentId: string, userId?: string): Promise<RevisionNotesData> {
    const headers = await getAuthHeaders(userId);
    // Try POST /api/study-coach/revision-notes
    try {
      const res = await fetch(`${API_BASE_URL}/api/study-coach/revision-notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ documentId }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || json.revisionNotes;
      }
    } catch {}

    // Fallback to GET /api/coach/:id/revision-notes
    const res = await fetch(`${API_BASE_URL}/api/coach/${encodeURIComponent(documentId)}/revision-notes`, {
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch revision notes (${res.status})`);
    }
    const data = await res.json();
    return data.data || data.revisionNotes;
  },

  /**
   * 9. Show Key Definitions, Formulas and Examples
   */
  async getKeyDefinitionsAndFormulas(documentId: string, userId?: string): Promise<DefinitionsAndFormulasData> {
    const headers = await getAuthHeaders(userId);
    const res = await fetch(`${API_BASE_URL}/api/study-coach/definitions-formulas`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ documentId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch definitions & formulas (${res.status})`);
    }
    const json = await res.json();
    return json.data || json.definitionsAndFormulas;
  },

  /**
   * 10. Create a Final Revision Guide
   */
  async getFinalRevisionGuide(documentId: string, userId?: string): Promise<FinalRevisionGuideData> {
    const headers = await getAuthHeaders(userId);
    const res = await fetch(`${API_BASE_URL}/api/study-coach/final-revision-guide`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ documentId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create final revision guide (${res.status})`);
    }
    const json = await res.json();
    return json.data || json.revisionGuide;
  },

  /**
   * Retrieves saved progress and attempts for a document
   */
  async getDocumentProgress(documentId: string, userId?: string): Promise<StudentCoachProgress> {
    const headers = await getAuthHeaders(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/study-coach/progress?documentId=${encodeURIComponent(documentId)}`, {
        headers,
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || json.progress;
      }
    } catch {}

    // Fallback to GET /api/coach/:id/progress
    try {
      const res = await fetch(`${API_BASE_URL}/api/coach/${encodeURIComponent(documentId)}/progress`, {
        headers,
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || json.progress;
      }
    } catch {}

    // Fallback to Firestore if backend is offline
    const effectiveUid = userId || auth?.currentUser?.uid;
    if (db && effectiveUid && effectiveUid !== 'anonymous') {
      try {
        const docRef = doc(db, 'users', effectiveUid, 'coach_progress', documentId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as StudentCoachProgress;
        }
      } catch {}
    }

    return {
      userId: effectiveUid || 'anonymous',
      documentId,
      documentName: 'Document',
      totalAttempts: 0,
      bestPercentage: 0,
      attempts: [],
      currentWeakTopics: [],
      lastStudiedAt: new Date().toISOString(),
    };
  },

  /**
   * Retrieves overall student coach progress across all documents
   */
  async getOverallProgress(userId?: string): Promise<any> {
    const headers = await getAuthHeaders(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/study-coach/progress`, { headers });
      if (res.ok) {
        const json = await res.json();
        return json.data || json.progress;
      }
    } catch {}

    try {
      const res = await fetch(`${API_BASE_URL}/api/coach/progress`, { headers });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch {}

    return {
      totalDocumentsStudied: 0,
      totalQuizzesCompleted: 0,
      averagePercentage: 0,
      documentsProgress: [],
    };
  },

  /**
   * Retrieves quiz attempt history
   */
  async getQuizHistory(userId?: string): Promise<QuizEvaluationReport[]> {
    const headers = await getAuthHeaders(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/study-coach/history`, { headers });
      if (res.ok) {
        const json = await res.json();
        return json.data || json.history || [];
      }
    } catch {}
    return [];
  },
};
