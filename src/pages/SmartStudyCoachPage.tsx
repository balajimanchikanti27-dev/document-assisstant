import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  FileCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Award,
  ChevronRight,
  BookMarked,
  Printer,
  Copy,
  Check,
  Loader2,
  FileText,
  Bookmark,
  Share2,
  Send,
  Sliders,
  Filter,
  CheckSquare,
  Square,
  Search,
  MessageSquare,
  Star,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getDocuments } from '../services/documentService';
import {
  coachService,
  QuizData,
  QuizEvaluationReport,
  RevisionNotesData,
  StudentCoachProgress,
  ImportantQuestionsBank,
  ShortNotesData,
  LongAnswerQuestionsData,
  DefinitionsAndFormulasData,
  FinalRevisionGuideData,
  QuestionType,
} from '../services/coachService';
import { UserDocument } from '../types';

export const SmartStudyCoachPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Document selection
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedDoc, setSelectedDoc] = useState<UserDocument | null>(null);
  const [multiDocMode, setMultiDocMode] = useState<boolean>(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Tabs for All 10 Actions + Evaluation/Progress
  type TabType =
    | 'summary'
    | 'simple_english'
    | 'quiz'
    | 'important_questions'
    | 'short_notes'
    | 'long_answer'
    | 'ask'
    | 'revision'
    | 'definitions_formulas'
    | 'final_guide'
    | 'mistakes'
    | 'weak_topics'
    | 'history';

  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // Loading & Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Feature Data States
  const [studyMaterial, setStudyMaterial] = useState<any>(null);
  const [explanationLevel, setExplanationLevel] = useState<'beginner' | 'detailed'>('beginner');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [importantBank, setImportantBank] = useState<ImportantQuestionsBank | null>(null);
  const [shortNotes, setShortNotes] = useState<ShortNotesData | null>(null);
  const [longAnswers, setLongAnswers] = useState<LongAnswerQuestionsData | null>(null);
  const [revisionNotes, setRevisionNotes] = useState<RevisionNotesData | null>(null);
  const [definitionsFormulas, setDefinitionsFormulas] = useState<DefinitionsAndFormulasData | null>(null);
  const [finalGuide, setFinalGuide] = useState<FinalRevisionGuideData | null>(null);
  const [progress, setProgress] = useState<StudentCoachProgress | null>(null);

  // Quiz Options
  const [quizLength, setQuizLength] = useState<number>(15);
  const [quizFilterType, setQuizFilterType] = useState<string>('all');

  // Quiz Taking State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [quizSubmitting, setQuizSubmitting] = useState<boolean>(false);
  const [lastEvaluation, setLastEvaluation] = useState<QuizEvaluationReport | null>(null);
  const [quizTimeElapsed, setQuizTimeElapsed] = useState<number>(0);
  const [quizTimerActive, setQuizTimerActive] = useState<boolean>(false);

  // In-Coach Grounded RAG Chat State
  const [chatQuestion, setChatQuestion] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<{ question: string; answer: string; citations: any[] }[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // UI helpers
  const [copiedRevision, setCopiedRevision] = useState<boolean>(false);
  const [copiedGuide, setCopiedGuide] = useState<boolean>(false);
  const [activeConceptFilter, setActiveConceptFilter] = useState<'all' | 'definitions' | 'formulas' | 'difficult'>('all');
  const [activePriorityFilter, setActivePriorityFilter] = useState<'all' | 'High' | 'Medium' | 'Basic'>('all');

  // 1. Load User Documents
  useEffect(() => {
    if (!user?.uid) return;
    getDocuments(user.uid)
      .then((docs) => {
        const readyDocs = docs.filter((d) => d.status === 'ready');
        setDocuments(readyDocs);

        // Preselect from URL query param if present
        const queryDocId = searchParams.get('docId');
        if (queryDocId && readyDocs.some((d) => d.id === queryDocId)) {
          setSelectedDocId(queryDocId);
          setSelectedDocIds([queryDocId]);
        } else if (readyDocs.length > 0 && !selectedDocId) {
          setSelectedDocId(readyDocs[0].id);
          setSelectedDocIds([readyDocs[0].id]);
        }
      })
      .catch(() => {
        showToast('Failed to load documents', 'error');
      });
  }, [user?.uid]);

  // Update selectedDoc object
  useEffect(() => {
    const doc = documents.find((d) => d.id === selectedDocId) || null;
    setSelectedDoc(doc);
    if (selectedDocId) {
      setSearchParams({ docId: selectedDocId });
    }
  }, [selectedDocId, documents]);

  // Reset all document-specific state when switching documents to prevent stale cross-document leakage
  useEffect(() => {
    setStudyMaterial(null);
    setQuizData(null);
    setImportantBank(null);
    setShortNotes(null);
    setLongAnswers(null);
    setRevisionNotes(null);
    setDefinitionsFormulas(null);
    setFinalGuide(null);
    setProgress(null);
    setLastEvaluation(null);
    setQuizAnswers({});
    setCurrentQuizIndex(0);
    setChatHistory([]);
    setError(null);
  }, [selectedDocId]);

  // 2. Load Core Content for Selected Document
  useEffect(() => {
    if (!selectedDocId || !user?.uid) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      coachService.getStudyMaterial(selectedDocId, user.uid, { level: explanationLevel }).catch(() => null),
      coachService.getDocumentProgress(selectedDocId, user.uid).catch(() => null),
      coachService.getRevisionNotes(selectedDocId, user.uid).catch(() => null),
    ])
      .then(([material, prog, notes]) => {
        if (!isMounted) return;
        setStudyMaterial(material);
        setProgress(prog);
        setRevisionNotes(notes);
      })
      .catch((err: any) => {
        if (isMounted) setError(err.message || 'Failed to load study coach data');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDocId, user?.uid, explanationLevel]);

  // Quiz Timer
  useEffect(() => {
    let interval: any;
    if (quizTimerActive && activeTab === 'quiz') {
      interval = setInterval(() => {
        setQuizTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizTimerActive, activeTab]);

  // Toggle multi-doc checkbox
  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      if (prev.includes(docId)) {
        const next = prev.filter((id) => id !== docId);
        return next.length > 0 ? next : [docId];
      } else {
        return [...prev, docId];
      }
    });
  };

  // Handle Tab / Action Switch
  const handleTabClick = async (tab: TabType) => {
    setActiveTab(tab);
    if (!selectedDocId || !user?.uid) return;

    if (tab === 'quiz' && !quizData && !loading) {
      handleGenerateQuiz(false);
    } else if (tab === 'important_questions' && !importantBank) {
      loadImportantQuestions();
    } else if (tab === 'short_notes' && !shortNotes) {
      loadShortNotes();
    } else if (tab === 'long_answer' && !longAnswers) {
      loadLongAnswers();
    } else if (tab === 'definitions_formulas' && !definitionsFormulas) {
      loadDefinitionsFormulas();
    } else if (tab === 'final_guide' && !finalGuide) {
      loadFinalGuide();
    }
  };

  // Lazy loaders for specific actions
  const loadImportantQuestions = async (forceRefresh = false) => {
    if (!selectedDocId || !user?.uid) return;
    setActionLoading(true);
    try {
      const bank = await coachService.getImportantExamQuestions(selectedDocId, forceRefresh, user.uid);
      setImportantBank(bank);
      showToast('Important exam questions loaded!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to load exam questions', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const loadShortNotes = async () => {
    if (!selectedDocId || !user?.uid) return;
    setActionLoading(true);
    try {
      const notes = await coachService.getShortNotes(selectedDocId, user.uid);
      setShortNotes(notes);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate short notes', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const loadLongAnswers = async () => {
    if (!selectedDocId || !user?.uid) return;
    setActionLoading(true);
    try {
      const laq = await coachService.getLongAnswerQuestions(selectedDocId, user.uid);
      setLongAnswers(laq);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate long-answer questions', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const loadDefinitionsFormulas = async () => {
    if (!selectedDocId || !user?.uid) return;
    setActionLoading(true);
    try {
      const df = await coachService.getKeyDefinitionsAndFormulas(selectedDocId, user.uid);
      setDefinitionsFormulas(df);
    } catch (err: any) {
      showToast(err.message || 'Failed to load definitions & formulas', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const loadFinalGuide = async () => {
    if (!selectedDocId || !user?.uid) return;
    setActionLoading(true);
    try {
      const fg = await coachService.getFinalRevisionGuide(selectedDocId, user.uid);
      setFinalGuide(fg);
    } catch (err: any) {
      showToast(err.message || 'Failed to create final revision guide', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Generate / Start Quiz
  const handleGenerateQuiz = async (forceRefresh = false) => {
    if (!selectedDocId || !user?.uid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await coachService.generateQuiz(
        selectedDocId,
        {
          forceRefresh,
          questionCount: quizLength,
        },
        user.uid
      );
      setQuizData(data);
      setQuizAnswers({});
      setCurrentQuizIndex(0);
      setQuizTimeElapsed(0);
      setQuizTimerActive(true);
      showToast(forceRefresh ? 'Fresh quiz generated!' : 'Quiz loaded ready for practice', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz');
      showToast('Quiz generation error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit Quiz for Grading
  const handleSubmitQuiz = async () => {
    if (!quizData || !selectedDocId || !user?.uid) return;

    const answeredCount = Object.keys(quizAnswers).length;
    if (answeredCount < quizData.questions.length) {
      const proceed = window.confirm(
        `You have answered ${answeredCount} of ${quizData.questions.length} questions. Do you want to submit anyway?`
      );
      if (!proceed) return;
    }

    setQuizSubmitting(true);
    setQuizTimerActive(false);

    try {
      const answerPayload = quizData.questions.map((q) => ({
        questionId: q.id,
        answer: quizAnswers[q.id] || '',
      }));

      const report = await coachService.submitQuiz(
        selectedDocId,
        answerPayload,
        quizTimeElapsed,
        user.uid
      );

      setLastEvaluation(report);
      const updatedProg = await coachService.getDocumentProgress(selectedDocId, user.uid);
      setProgress(updatedProg);

      showToast(`Quiz completed! Score: ${report.score}/${report.totalQuestions} (${report.percentage}%)`, 'success');
      setActiveTab('mistakes');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit quiz', 'error');
    } finally {
      setQuizSubmitting(false);
    }
  };

  // In-Coach Grounded RAG Chat
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim() || !selectedDocId || !user?.uid) return;

    const q = chatQuestion.trim();
    setChatQuestion('');
    setChatLoading(true);

    try {
      const targetDocs = multiDocMode && selectedDocIds.length > 0 ? selectedDocIds : [selectedDocId];
      const result = await coachService.askQuestion(targetDocs, q, user.uid);
      setChatHistory((prev) => [
        ...prev,
        { question: q, answer: result.answer, citations: result.citations },
      ]);
    } catch (err: any) {
      showToast(err.message || 'Failed to get answer', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyText = (text: string, setCopiedState: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedState(false), 2500);
  };

  return (
    <div className="flex-1 min-h-screen bg-neutral-50/60 dark:bg-neutral-950 flex flex-col p-4 md:p-8">
      {/* Top Banner / Hero */}
      <div className="max-w-7xl w-full mx-auto mb-6">
        <div className="bg-gradient-to-r from-brand-700 via-indigo-600 to-violet-700 text-white rounded-2xl p-6 md:p-8 shadow-xl shadow-brand-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Smart Study Coach • Competition Edition</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
              Master Your Coursework with AI
            </h1>
            <p className="text-sm md:text-base text-brand-100 leading-relaxed">
              Dynamically grounded summaries, interactive quizzes, prioritized exam questions, short revision cards, long-answer essays, and printable final cram guides.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Document Selector Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex flex-col gap-2 min-w-[260px]">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-brand-200 uppercase tracking-wider">
                  Course Document
                </label>
                <button
                  type="button"
                  onClick={() => setMultiDocMode(!multiDocMode)}
                  className="text-[10px] font-bold text-amber-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{multiDocMode ? 'Single Document' : 'Multi-Doc Mode'}</span>
                </button>
              </div>

              {!multiDocMode ? (
                <select
                  value={selectedDocId}
                  onChange={(e) => {
                    setSelectedDocId(e.target.value);
                    setSelectedDocIds([e.target.value]);
                  }}
                  className="bg-neutral-900/90 text-white text-sm font-medium rounded-lg px-3 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400 max-w-xs truncate"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id} className="bg-neutral-900 text-white">
                      {d.name} {d.slideCount ? `(${d.slideCount} slides)` : d.pageCount ? `(${d.pageCount} pages)` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                  {documents.map((d) => {
                    const isChecked = selectedDocIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDocSelection(d.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          isChecked ? 'bg-white/20 text-white font-semibold' : 'text-brand-100 hover:bg-white/10'
                        }`}
                      >
                        <span className="truncate pr-2">{d.name}</span>
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-white/50 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>

      {/* 10 SMART STUDY COACH ACTIONS - QUICK LAUNCHER GRID */}
      <div className="max-w-7xl w-full mx-auto mb-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                10 Core Study Actions
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Select any action to generate or practice instantly
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {[
              { id: 'summary', num: '1', title: 'Summarize Document', desc: 'Overall & Topic Breakdown', icon: BookOpen, color: 'text-blue-500' },
              { id: 'simple_english', num: '2', title: 'Explain in Simple English', desc: 'Analogies & Plain Words', icon: Lightbulb, color: 'text-amber-500' },
              { id: 'quiz', num: '3', title: 'Complete Quiz', desc: 'MCQs, T/F, Short, Long', icon: FileCheck, color: 'text-emerald-500' },
              { id: 'important_questions', num: '4', title: 'Important Exam Qs', desc: 'High-Yield Question Bank', icon: Star, color: 'text-purple-500' },
              { id: 'short_notes', num: '5', title: 'Short Notes', desc: 'High-Yield Bullet Cards', icon: FileText, color: 'text-rose-500' },
              { id: 'long_answer', num: '6', title: 'Long-Answer Qs', desc: '5 & 10 Mark Essay Qs', icon: Layers, color: 'text-indigo-500' },
              { id: 'ask', num: '7', title: 'Ask Questions', desc: 'Document-Grounded Q&A', icon: MessageSquare, color: 'text-teal-500' },
              { id: 'revision', num: '8', title: 'Topic Revision Notes', desc: 'Slide & Chapter Cards', icon: BookMarked, color: 'text-cyan-500' },
              { id: 'definitions_formulas', num: '9', title: 'Key Definitions & Rules', desc: 'Formulas & Examples', icon: HelpCircle, color: 'text-orange-500' },
              { id: 'final_guide', num: '10', title: 'Final Revision Guide', desc: 'Printable Master Cheat Sheet', icon: Award, color: 'text-amber-600' },
            ].map((action) => {
              const Icon = action.icon;
              const isSelected = activeTab === action.id;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleTabClick(action.id as TabType)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-brand-50/80 dark:bg-brand-950/40 border-brand-500 shadow-sm ring-1 ring-brand-500/30'
                      : 'bg-neutral-50/70 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      #{action.num}
                    </span>
                    <Icon className={`w-4 h-4 ${action.color}`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {action.title}
                    </h4>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {action.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Workspace Container */}
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
        {/* Navigation Tabs Bar */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1.5 shadow-sm mb-6 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'summary', label: '1. Summary', icon: BookOpen },
            { id: 'simple_english', label: '2. Simple English', icon: Lightbulb },
            { id: 'quiz', label: '3. Quiz', icon: FileCheck },
            { id: 'important_questions', label: '4. Important Questions', icon: Star },
            { id: 'short_notes', label: '5. Short Notes', icon: FileText },
            { id: 'long_answer', label: '6. Long-Answer', icon: Layers },
            { id: 'ask', label: '7. Ask Document', icon: MessageSquare },
            { id: 'revision', label: '8. Revision Notes', icon: BookMarked },
            { id: 'definitions_formulas', label: '9. Definitions & Rules', icon: HelpCircle },
            { id: 'final_guide', label: '10. Final Guide', icon: Award },
            { id: 'mistakes', label: 'Mistakes', icon: AlertTriangle, badge: lastEvaluation ? `${lastEvaluation.incorrectQuestions.length}` : undefined },
            { id: 'weak_topics', label: 'Weak Topics', icon: TrendingUp, badge: progress?.currentWeakTopics?.length },
            { id: 'history', label: 'History', icon: Clock, badge: progress?.totalAttempts },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id as TabType)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Loading Spinner */}
        {(loading || actionLoading) && (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-brand-600 mb-4" />
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Synthesizing Grounded Study Material...
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
              Analyzing authorized sections, validating slide numbers, and extracting verified exam questions.
            </p>
          </div>
        )}

        {/* Error Message */}
        {!loading && !actionLoading && error && (
          <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Study Coach Notice</h3>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1 mb-4">{error}</p>
            <button
              onClick={() => handleGenerateQuiz(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
            >
              Retry Action
            </button>
          </div>
        )}

        {/* No Documents State */}
        {!loading && documents.length === 0 && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center max-w-md mx-auto my-12 shadow-sm">
            <GraduationCap className="w-12 h-12 text-brand-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              No Uploaded Study Documents
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              Upload course slides (PPTX), textbooks (PDF), or notes (DOCX/TXT) in My Documents to unlock the Smart Study Coach.
            </p>
            <button
              onClick={() => navigate('/app/documents')}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md transition-colors inline-flex items-center gap-2"
            >
              <span>Go to My Documents</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =========================================================================
            ACTION 1: SUMMARIZE ENTIRE DOCUMENT (With Beginner / Academic Toggle)
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'summary' && studyMaterial && (
          <div className="space-y-6">
            {/* Header with Level Selector */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                      Complete Document Summary
                    </h3>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {studyMaterial.documentName} • {studyMaterial.totalSections || studyMaterial.summary?.sections?.length} sections analyzed
                    </span>
                  </div>
                </div>

                {/* Level Toggle */}
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setExplanationLevel('beginner')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      explanationLevel === 'beginner'
                        ? 'bg-white dark:bg-neutral-700 text-brand-600 dark:text-white shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    Beginner-Friendly
                  </button>
                  <button
                    type="button"
                    onClick={() => setExplanationLevel('detailed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      explanationLevel === 'detailed'
                        ? 'bg-white dark:bg-neutral-700 text-brand-600 dark:text-white shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    Academic Exam Prep
                  </button>
                </div>
              </div>

              {/* Overall Summary */}
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-2">
                  Executive Document Overview
                </h4>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {studyMaterial.summary?.overview}
                </p>
              </div>
            </div>

            {/* Detailed Topic-by-Topic Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(studyMaterial.summary?.sections || []).map((sec: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm hover:border-brand-300 dark:hover:border-brand-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {sec.location}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Topic {idx + 1}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                      {sec.title}
                    </h4>

                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
                      {sec.simpleExplanation}
                    </p>

                    {sec.keyPoints && sec.keyPoints.length > 0 && (
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 mb-3">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">
                          Key Points & Takeaways
                        </span>
                        <ul className="space-y-1">
                          {sec.keyPoints.map((pt: string, pIdx: number) => (
                            <li key={pIdx} className="text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-1.5">
                              <span className="text-brand-500 font-bold">•</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {sec.example && (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3">
                        <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block mb-1">
                          Example from Content
                        </span>
                        <p className="text-xs text-amber-900 dark:text-amber-200 font-mono leading-relaxed">
                          {sec.example}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Revision Section */}
            {studyMaterial.summary?.quickRevisionRecap && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                    Final Quick-Revision Points
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {studyMaterial.summary.quickRevisionRecap.map((bullet: string, bIdx: number) => (
                    <div key={bIdx} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {bullet}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ACTION 2: EXPLAIN IN SIMPLE ENGLISH (Analogies, Glossary, Concepts)
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'simple_english' && studyMaterial && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Explain in Simple English
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Difficult terms translated into intuitive everyday analogies and clear step-by-step principles.
                  </p>
                </div>
              </div>
            </div>

            {/* Difficult Concepts Breakdown */}
            {studyMaterial.summary?.difficultConcepts && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider px-1">
                  Step-by-Step Concept Breakdown
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {studyMaterial.summary.difficultConcepts.map((dc: any, idx: number) => (
                    <div key={idx} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                      <h4 className="text-base font-bold text-brand-700 dark:text-brand-300 mb-3">
                        {dc.concept}
                      </h4>
                      <div className="space-y-2 mb-4">
                        {dc.stepByStep.map((st: string, sIdx: number) => (
                          <div key={sIdx} className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {sIdx + 1}
                            </span>
                            <span className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                              {st}
                            </span>
                          </div>
                        ))}
                      </div>
                      {dc.analogyOrExample && (
                        <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80">
                          <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 block mb-1">
                            💡 Everyday Analogy:
                          </span>
                          <p className="text-xs text-amber-800 dark:text-amber-300 italic leading-relaxed">
                            "{dc.analogyOrExample}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ACTION 3: GENERATE COMPLETE QUIZ & INTERACTIVE QUIZ TAKING
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'quiz' && (
          <div className="space-y-6">
            {/* Quiz Configuration Toolbar */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Quiz Length:
                </span>
                {[10, 15, 20, 30].map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => {
                      setQuizLength(len);
                      handleGenerateQuiz(true);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      quizLength === len
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                    }`}
                  >
                    {len} Questions
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {quizTimerActive && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTimer(quizTimeElapsed)}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleGenerateQuiz(true)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate Quiz</span>
                </button>
              </div>
            </div>

            {/* Quiz Question Card */}
            {quizData && quizData.questions.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
                {/* Stepper Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                      Question {currentQuizIndex + 1} of {quizData.questions.length}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 uppercase font-mono text-[10px]">
                      {quizData.questions[currentQuizIndex].type}
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    {quizData.questions[currentQuizIndex].sourceLocation}
                  </span>
                </div>

                {/* Current Question */}
                {(() => {
                  const q = quizData.questions[currentQuizIndex];
                  const currentAnswer = quizAnswers[q.id] || '';

                  return (
                    <div className="space-y-6">
                      <h3 className="text-base md:text-lg font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                        {q.question}
                      </h3>

                      {/* Multiple Choice Options */}
                      {q.type === 'mcq' && q.options && (
                        <div className="space-y-3">
                          {q.options.map((opt: string, optIdx: number) => {
                            const optionLetter = ['A', 'B', 'C', 'D'][optIdx];
                            const isSelected =
                              currentAnswer === String(optIdx) ||
                              currentAnswer === optionLetter ||
                              currentAnswer === opt;

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() =>
                                  setQuizAnswers({ ...quizAnswers, [q.id]: String(optIdx) })
                                }
                                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                                  isSelected
                                    ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-950 dark:text-brand-100 shadow-sm'
                                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300'
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'bg-brand-600 text-white'
                                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                  }`}
                                >
                                  {optionLetter}
                                </span>
                                <span className="text-sm pt-0.5 leading-relaxed">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* True / False Options */}
                      {q.type === 'true_false' && (
                        <div className="grid grid-cols-2 gap-4">
                          {['True', 'False'].map((opt, optIdx) => {
                            const isSelected = currentAnswer.toLowerCase() === opt.toLowerCase();
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })}
                                className={`p-4 rounded-xl border text-center font-bold text-sm transition-all ${
                                  isSelected
                                    ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-700 dark:text-brand-300 shadow-sm'
                                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Text Input for Short Answer, Fill-in-blanks, Long Answer */}
                      {q.type !== 'mcq' && q.type !== 'true_false' && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                            Type your answer:
                          </label>
                          <textarea
                            rows={3}
                            value={currentAnswer}
                            onChange={(e) =>
                              setQuizAnswers({ ...quizAnswers, [q.id]: e.target.value })
                            }
                            placeholder="Type your answer grounded in the document..."
                            className="w-full p-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      )}

                      {/* Navigation Stepper Controls */}
                      <div className="flex items-center justify-between pt-6 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                          type="button"
                          disabled={currentQuizIndex === 0}
                          onClick={() => setCurrentQuizIndex((prev) => Math.max(0, prev - 1))}
                          className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        >
                          Previous
                        </button>

                        {currentQuizIndex < quizData.questions.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setCurrentQuizIndex((prev) => prev + 1)}
                            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-colors inline-flex items-center gap-1.5"
                          >
                            <span>Next Question</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={quizSubmitting}
                            onClick={handleSubmitQuiz}
                            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                          >
                            {quizSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>Submit Quiz for Grading</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ACTION 4: IMPORTANT EXAM QUESTIONS (Question Bank with Priorities)
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'important_questions' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                      Important Exam Questions Bank
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Prioritized revision priorities based on topic emphasis and exam weightage.
                    </p>
                  </div>
                </div>

                {/* Priority Filter */}
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                  {['all', 'High', 'Medium', 'Basic'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActivePriorityFilter(p as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                        activePriorityFilter === p
                          ? 'bg-white dark:bg-neutral-700 text-purple-600 dark:text-white shadow-sm'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Disclaimer Banner */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 text-xs text-purple-800 dark:text-purple-300">
                <ShieldAlert className="w-4 h-4 shrink-0 text-purple-600" />
                <span>
                  <strong>AI Disclaimer:</strong> AI-generated revision priorities, not guaranteed exam questions. Use to focus your revision on high-yield topics.
                </span>
              </div>
            </div>

            {/* Questions Bank List */}
            {importantBank && (
              <div className="space-y-4">
                {importantBank.questions
                  .filter((q) => activePriorityFilter === 'all' || q.importance === activePriorityFilter)
                  .map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm hover:border-purple-300 dark:hover:border-purple-800 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              q.importance === 'High'
                                ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                                : q.importance === 'Medium'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {q.importance} Priority
                          </span>
                          <span className="text-[11px] text-neutral-500 font-medium">
                            {q.topic}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-neutral-400">
                          {q.sourceLocation}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3">
                        {q.question}
                      </h4>

                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 mb-2">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">
                          Suggested Answer Points
                        </span>
                        <ul className="space-y-1">
                          {q.suggestedAnswerPoints.map((pt, pIdx) => (
                            <li key={pIdx} className="text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-1.5">
                              <span className="text-purple-500 font-bold">•</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <span>Expected Length: {q.recommendedAnswerLength}</span>
                        <span className="capitalize">Type: {q.category.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ACTION 5: GENERATE SHORT NOTES
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'short_notes' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                      High-Yield Short Notes
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Concise revision flashcards covering core topics and formulas.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const text = (shortNotes?.sections || [])
                      .map((s) => `## ${s.topic} (${s.location})\n${s.bullets.map((b) => `• ${b}`).join('\n')}`)
                      .join('\n\n');
                    handleCopyText(text, setCopiedRevision);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5"
                >
                  {copiedRevision ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRevision ? 'Copied' : 'Copy All Notes'}</span>
                </button>
              </div>
            </div>

            {shortNotes && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shortNotes.sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                        {sec.location}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                      {sec.topic}
                    </h4>
                    <ul className="space-y-1 mb-3">
                      {sec.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      💡 {sec.keyTakeaway}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ACTION 6: GENERATE LONG-ANSWER QUESTIONS
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'long_answer' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Long-Answer Examination Questions
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Comprehensive 5-mark and 10-mark essay questions complete with structured model answers and marking rubrics.
                  </p>
                </div>
              </div>
            </div>

            {longAnswers && (
              <div className="space-y-6">
                {longAnswers.questions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {q.marks} Marks Essay Question
                        </span>
                        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                          {q.topic}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-neutral-400">{q.location}</span>
                    </div>

                    <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                      {q.question}
                    </h4>

                    {/* Model Answer Structure */}
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 space-y-3">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">
                        Model Answer Structure
                      </span>

                      <div className="text-xs text-neutral-700 dark:text-neutral-300">
                        <strong className="text-indigo-600 dark:text-indigo-400">Introduction: </strong>
                        {q.modelAnswerStructure.introduction}
                      </div>

                      <div className="space-y-1.5 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800">
                        {q.modelAnswerStructure.corePoints.map((cp, cpIdx) => (
                          <div key={cpIdx} className="text-xs text-neutral-700 dark:text-neutral-300">
                            <strong>{cp.point}: </strong>
                            <span>{cp.explanation}</span>
                          </div>
                        ))}
                      </div>

                      {q.modelAnswerStructure.diagramOrSyntaxExplanation && (
                        <div className="text-xs text-neutral-600 dark:text-neutral-400 italic">
                          <strong>Diagram / Syntax Focus: </strong>
                          {q.modelAnswerStructure.diagramOrSyntaxExplanation}
                        </div>
                      )}

                      <div className="text-xs text-neutral-700 dark:text-neutral-300">
                        <strong className="text-indigo-600 dark:text-indigo-400">Conclusion: </strong>
                        {q.modelAnswerStructure.conclusion}
                      </div>
                    </div>

                    {/* Marking Scheme */}
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                        Examination Marking Scheme
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.markingScheme.map((ms, msIdx) => (
                          <div
                            key={msIdx}
                            className="p-2.5 rounded-lg bg-neutral-100/70 dark:bg-neutral-800/40 flex items-center justify-between text-xs text-neutral-700 dark:text-neutral-300"
                          >
                            <span>{ms.criterion}</span>
                            <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                              {ms.marks} marks
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ACTION 7: ASK QUESTIONS ABOUT THE DOCUMENT (Interactive RAG Q&A)
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'ask' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Ask Questions About Your Document
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Ask any doubt or exam question. Answers are strictly grounded in your uploaded material.
                  </p>
                </div>
              </div>

              {/* Chat Form */}
              <form onSubmit={handleAskQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  placeholder="e.g. What is the difference between Checked and Unchecked exceptions?"
                  className="flex-1 p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatQuestion.trim()}
                  className="px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Ask AI</span>
                </button>
              </form>
            </div>

            {/* Chat History */}
            <div className="space-y-4">
              {chatHistory.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-3">
                  <div className="flex items-start gap-2 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    <span className="text-teal-600 dark:text-teal-400">Q:</span>
                    <span>{item.question}</span>
                  </div>

                  <p className="text-xs md:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {item.answer}
                  </p>

                  {item.citations && item.citations.length > 0 && (
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase">Sources:</span>
                      {item.citations.map((c: any, cIdx: number) => (
                        <span key={cIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          {c.slideNumber ? `Slide ${c.slideNumber}` : c.pageNumber ? `Page ${c.pageNumber}` : c.heading || 'Document'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            ACTION 8: GENERATE TOPIC-WISE REVISION NOTES
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'revision' && revisionNotes && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Topic-Wise Revision Notes
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Cheat sheet cards organized by course sections and slide numbers.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {revisionNotes.topicCards.map((tc, idx) => (
                <div key={idx} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                      {tc.location}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{tc.topic}</h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">{tc.coreConcept}</p>
                  <ul className="space-y-1 pt-1">
                    {tc.keyTakeaways.map((k, kIdx) => (
                      <li key={kIdx} className="text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-1.5">
                        <span className="text-cyan-500 font-bold">•</span>
                        <span>{k}</span>
                      </li>
                    ))}
                  </ul>
                  {tc.examCaution && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 italic pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      ⚠️ {tc.examCaution}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            ACTION 9: SHOW KEY DEFINITIONS, FORMULAS AND EXAMPLES
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'definitions_formulas' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Key Definitions, Formulas and Examples
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Searchable glossary of terminology, syntax rules, and practical examples.
                  </p>
                </div>
              </div>
            </div>

            {definitionsFormulas && (
              <div className="space-y-6">
                {/* Definitions */}
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-3 px-1">
                    Definitions & Terminology
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {definitionsFormulas.definitions.map((d, idx) => (
                      <div key={idx} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm">
                        <h5 className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-1">{d.term}</h5>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{d.simpleMeaning}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formulas & Rules */}
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-3 px-1">
                    Formulas, Code Syntax & Rules
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {definitionsFormulas.formulasAndRules.map((f, idx) => (
                      <div key={idx} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-1.5">
                        <div className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                          {f.ruleOrFormula}
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300">{f.meaning}</p>
                        <p className="text-[11px] text-neutral-500 italic">Application: {f.application}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Examples */}
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-3 px-1">
                    Practical Examples
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {definitionsFormulas.examples.map((ex, idx) => (
                      <div key={idx} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{ex.title}</h5>
                          <span className="text-[10px] font-mono text-neutral-400">{ex.location}</span>
                        </div>
                        <div className="font-mono text-xs p-2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                          {ex.scenario}
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300">
                          <strong>Concept: </strong>{ex.conceptIllustrated}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ACTION 10: CREATE A FINAL REVISION GUIDE (Printable Master Cheat Sheet)
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'final_guide' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Final Examination Revision Guide
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Master revision cram guide ready for high-yield preparation, copying, or printing.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (finalGuide?.printableMarkdown) {
                      handleCopyText(finalGuide.printableMarkdown, setCopiedGuide);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5"
                >
                  {copiedGuide ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedGuide ? 'Copied' : 'Copy Guide'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {finalGuide && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Executive Summary</h4>
                  <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">{finalGuide.executiveSummary}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Master Preparation Checklist</h4>
                  <div className="space-y-1.5">
                    {finalGuide.masterChecklist.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                        <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">60-Second Quick Recap</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {finalGuide.quickRecapBullets.map((b, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-700 dark:text-neutral-300">
                        • {b}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Common Pitfalls to Avoid in Examinations</h4>
                  <div className="space-y-2">
                    {finalGuide.examPitfallsToAvoid.map((p, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                        ⚠️ {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            EVALUATION: EXPLAIN MY MISTAKES (Post-Quiz Diagnosis)
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'mistakes' && (
          <div className="space-y-6">
            {lastEvaluation ? (
              <div className="space-y-6">
                {/* Score Summary Card */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Evaluation Score</span>
                      <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 mt-1">
                        {lastEvaluation.score} / {lastEvaluation.totalQuestions} ({lastEvaluation.percentage}%) • Grade {lastEvaluation.grade}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateQuiz(true)}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-colors"
                    >
                      Retry Another Question Set
                    </button>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {lastEvaluation.overallFeedback}
                  </p>
                </div>

                {/* All Questions Review */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider px-1">
                    Question-by-Question Review & Explanations
                  </h4>
                  {lastEvaluation.evaluations.map((ev, idx) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border transition-all ${
                        ev.isCorrect
                          ? 'bg-white dark:bg-neutral-900 border-emerald-200 dark:border-emerald-900/60'
                          : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {ev.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            Question {idx + 1}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {ev.sourceLocation || ev.sourceReference}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                        {ev.question}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                        <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          <strong>Your Answer: </strong>{ev.studentAnswer}
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold">
                          <strong>Correct Answer: </strong>{ev.correctAnswer}
                        </div>
                      </div>

                      <p className="text-xs text-neutral-600 dark:text-neutral-400 italic">
                        💡 {ev.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center max-w-md mx-auto my-6 shadow-sm">
                <FileCheck className="w-10 h-10 text-brand-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                  No Quiz Completed Yet
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                  Take the quiz in Action 3 to get verified mistake analysis and personalized feedback.
                </p>
                <button
                  onClick={() => handleTabClick('quiz')}
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Start Quiz Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            WEAK TOPICS & PERSONALIZED REVISION
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'weak_topics' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Weak Topics & Revision Recommendations
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Diagnosed from your quiz attempts with exact slide/page numbers to review.
                  </p>
                </div>
              </div>
            </div>

            {progress?.currentWeakTopics && progress.currentWeakTopics.length > 0 ? (
              <div className="space-y-4">
                {progress.currentWeakTopics.map((wt, idx) => (
                  <div key={idx} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                        {wt.topic || wt.topicName}
                      </h4>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300">
                        {wt.priority} Priority
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {wt.revisionGuidance || wt.recommendedRevision}
                    </p>

                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase">Recommended Slides:</span>
                      {(wt.recommendedSlides || wt.revisionSlides || []).map((sl: string, sIdx: number) => (
                        <span key={sIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono">
                          {sl}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center max-w-md mx-auto my-6 shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                  No Weak Topics Detected!
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Great performance! Complete more quizzes to monitor your ongoing coursework mastery.
                </p>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            QUIZ HISTORY & ATTEMPTS
        ========================================================================= */}
        {!loading && !actionLoading && !error && activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Quiz History & Progress Tracking
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Total Attempts: {progress?.totalAttempts || 0} • Best Score: {progress?.bestPercentage || 0}%
                  </p>
                </div>
              </div>
            </div>

            {progress?.attempts && progress.attempts.length > 0 ? (
              <div className="space-y-3">
                {progress.attempts.map((att, idx) => (
                  <div
                    key={att.attemptId || idx}
                    className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        Score: {att.score} / {att.total} ({att.percentage}%)
                      </span>
                      <span className="text-xs text-neutral-400 block mt-0.5">
                        {new Date(att.date).toLocaleDateString()} {new Date(att.date).toLocaleTimeString()}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        att.percentage >= 80
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : att.percentage >= 60
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                      }`}
                    >
                      {att.percentage >= 60 ? 'Passed' : 'Needs Practice'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center max-w-md mx-auto my-6 shadow-sm">
                <Clock className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                  No Past Attempts
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Attempt your first quiz to record your study progress.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
