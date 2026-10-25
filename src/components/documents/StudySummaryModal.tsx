import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  GraduationCap,
  X,
  Copy,
  Check,
  MessageSquare,
  RefreshCw,
  BookOpen,
  Sparkles,
  Layers,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  FileCheck,
  ListChecks,
  ExternalLink,
  BookMarked,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  generateStudySummary,
  getStudySummary,
  StudySummaryResult,
} from '../../services/documentService';
import { UserDocument } from '../../types';

interface StudySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: UserDocument | null;
  onStartFollowUpChat?: (documentId: string, initialQuestion?: string) => void;
}

export const StudySummaryModal: React.FC<StudySummaryModalProps> = ({
  isOpen,
  onClose,
  document,
  onStartFollowUpChat,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<StudySummaryResult | null>(null);
  const [activeTab, setActiveTab] = useState<'full' | 'cards' | 'exam'>('full');
  const [copied, setCopied] = useState(false);
  const [followUpQuery, setFollowUpQuery] = useState('');

  // Fetch or generate summary when opened
  useEffect(() => {
    if (!isOpen || !document || !user) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Try fetching existing cached summary first, or generate if not available
    getStudySummary(user.uid, document.id)
      .then(async (existing) => {
        if (!isMounted) return;
        if (existing) {
          setSummaryResult(existing);
          setLoading(false);
          return;
        }

        // If not cached, trigger generation
        const fresh = await generateStudySummary(user.uid, document.id);
        if (isMounted) {
          setSummaryResult(fresh);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || 'Failed to generate study summary.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, document?.id, user?.uid]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen || !document) return null;

  const handleRegenerate = async () => {
    if (!user || !document) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await generateStudySummary(user.uid, document.id, true);
      setSummaryResult(fresh);
      showToast('Fresh study summary generated!', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate study summary.');
      showToast('Could not refresh summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!summaryResult) return;
    try {
      await navigator.clipboard.writeText(summaryResult.formattedMarkdown);
      setCopied(true);
      showToast('Full study guide copied to clipboard', 'info');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const handleAskFollowUp = (query?: string) => {
    const questionText = query || followUpQuery;
    onClose();

    if (onStartFollowUpChat) {
      onStartFollowUpChat(document.id, questionText);
      return;
    }

    // Default: navigate to new document assistant chat
    navigate(`/app/chat/new?mode=document`);
  };

  const coverage = summaryResult?.summary?.coverageReport;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-summary-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-neutral-900/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="w-full max-w-5xl h-[92vh] max-h-[900px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 bg-neutral-50/70 dark:bg-neutral-900/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="study-summary-title"
                  className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate"
                >
                  Summarize for Easy Learning
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300">
                  Student Edition
                </span>
                {coverage && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    <FileCheck className="w-3 h-3" />
                    <span>
                      {coverage.processedUnits} / {coverage.discoveredUnits}{' '}
                      {coverage.unitType} (
                      {coverage.isFullyCovered ? '100% complete' : 'Partial'})
                    </span>
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                {document.name}
              </p>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-2 shrink-0">
            {summaryResult && !loading && (
              <>
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors"
                  title="Copy full study guide as Markdown"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Notes</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="p-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Regenerate summary"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Close study summary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Tabs */}
        {summaryResult && !loading && !error && (
          <div className="px-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 bg-white dark:bg-neutral-900 text-xs font-semibold">
            <div className="flex items-center gap-2 -mb-px">
              <button
                type="button"
                onClick={() => setActiveTab('full')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'full'
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Complete Study Guide</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cards')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'cards'
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Concepts & Examples ({summaryResult.summary.difficultConcepts?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('exam')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'exam'
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Exam High-Yield & Flashcards</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 text-[11px] text-neutral-400">
              <span>Model: {summaryResult.modelUsed || 'Gemini Pro'}</span>
            </div>
          </div>
        )}

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Loading State */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center animate-pulse">
                  <GraduationCap className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="absolute inset-0 rounded-2xl border-2 border-brand-500 border-t-transparent animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Reading entire document in simple English...
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
                  Processing all slides, pages, and formulas in batches. Explaining difficult technical concepts for beginner students.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="p-6 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/20 text-center max-w-md mx-auto my-12 space-y-3">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                Failed to Read Document for Summary
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
              <button
                type="button"
                onClick={handleRegenerate}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Tab 1: Full Markdown Guide */}
          {summaryResult && !loading && !error && activeTab === 'full' && (
            <div className="space-y-6">
              {/* Coverage Banner */}
              <div className="p-4 rounded-2xl bg-brand-50/60 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">
                      Full Document Coverage Verified
                    </span>
                    <p className="text-neutral-600 dark:text-neutral-400 text-[11px]">
                      Extracted and processed all{' '}
                      {coverage?.processedUnits || 0} of{' '}
                      {coverage?.discoveredUnits || 0}{' '}
                      {coverage?.unitType || 'sections'}. Explaining technical jargon with intuitive real-world analogies.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAskFollowUp('Explain the most difficult concept from this document in even simpler terms')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask Questions in Chat</span>
                  </button>
                </div>
              </div>

              {/* Rendered Full Markdown */}
              <div className="prose-custom text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ node, ...props }) => (
                      <p className="mb-3 leading-relaxed last:mb-0" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc pl-5 mb-3 space-y-1.5" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal pl-5 mb-3 space-y-1.5" {...props} />
                    ),
                    li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
                    h1: ({ node, ...props }) => (
                      <h1
                        className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100 mt-6 mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-800"
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-5 mb-2 flex items-center gap-2"
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-4 mb-1.5"
                        {...props}
                      />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-brand-500 pl-4 py-1 italic bg-brand-50/30 dark:bg-brand-950/10 text-neutral-700 dark:text-neutral-300 my-3 rounded-r-xl"
                        {...props}
                      />
                    ),
                    code: ({ node, className, children, ...props }) => (
                      <code
                        className="font-mono text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-brand-700 dark:text-brand-300 font-medium"
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                  }}
                >
                  {summaryResult.formattedMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Tab 2: Interactive Concept Cards & Real-World Analogies */}
          {summaryResult && !loading && !error && activeTab === 'cards' && (
            <div className="space-y-6">
              {/* Difficult Concepts & Step-by-Step */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Difficult Concepts Simplified Step-by-Step</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {summaryResult.summary.difficultConcepts?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-3"
                    >
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                        {item.concept}
                      </h4>

                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                          How it works step-by-step:
                        </span>
                        <ol className="list-decimal pl-4 text-xs text-neutral-700 dark:text-neutral-300 space-y-1">
                          {item.stepByStep.map((step, sIdx) => (
                            <li key={sIdx}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      {item.analogyOrExample && (
                        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                          <span className="font-semibold block mb-0.5 flex items-center gap-1">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                            <span>Real-World Analogy / Example:</span>
                          </span>
                          <p className="leading-relaxed">{item.analogyOrExample}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Definitions Glossary */}
              {summaryResult.summary.definitions && summaryResult.summary.definitions.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
                    <BookMarked className="w-4 h-4 text-brand-600" />
                    <span>Tricky Words & Jargon Made Simple</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {summaryResult.summary.definitions.map((def, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 text-xs space-y-1"
                      >
                        <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                          {def.term}
                        </span>
                        <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                          {def.simpleMeaning}
                        </p>
                        {def.technicalContext && (
                          <span className="text-[10px] text-neutral-400 block italic">
                            Context: {def.technicalContext}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concept Differences & Comparisons */}
              {summaryResult.summary.conceptComparisons &&
                summaryResult.summary.conceptComparisons.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-purple-600" />
                      <span>Differences Between Related Concepts</span>
                    </h3>

                    <div className="space-y-3">
                      {summaryResult.summary.conceptComparisons.map((comp, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs space-y-2"
                        >
                          <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
                            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                              {comp.conceptA}
                            </span>
                            <span className="text-neutral-400 font-normal">vs</span>
                            <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                              {comp.conceptB}
                            </span>
                          </div>
                          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            {comp.keyDifferences}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Tab 3: Exam Prep & Formulas */}
          {summaryResult && !loading && !error && activeTab === 'exam' && (
            <div className="space-y-6">
              {/* Important Formulas & Rules */}
              {summaryResult.summary.formulasAndRules &&
                summaryResult.summary.formulasAndRules.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-brand-600" />
                      <span>Key Formulas, Rules & Syntax</span>
                    </h3>

                    <div className="space-y-3">
                      {summaryResult.summary.formulasAndRules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs space-y-2"
                        >
                          <div className="font-mono text-sm font-bold text-brand-700 dark:text-brand-300 bg-neutral-100 dark:bg-neutral-800/80 px-3 py-1.5 rounded-lg inline-block">
                            {rule.formulaOrRule}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                            <div>
                              <span className="text-[11px] font-semibold text-neutral-500 uppercase">
                                Meaning in Plain English:
                              </span>
                              <p className="text-neutral-700 dark:text-neutral-300 mt-0.5">
                                {rule.meaning}
                              </p>
                            </div>
                            <div>
                              <span className="text-[11px] font-semibold text-neutral-500 uppercase">
                                When to use / Apply:
                              </span>
                              <p className="text-neutral-700 dark:text-neutral-300 mt-0.5">
                                {rule.application}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* High Yield Exam Points */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
                  <ListChecks className="w-4 h-4 text-emerald-600" />
                  <span>Important Examination & Revision Points</span>
                </h3>

                <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 space-y-2">
                  <ul className="space-y-2 text-xs text-neutral-800 dark:text-neutral-200">
                    {summaryResult.summary.examRevisionPoints?.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 60-Second Flashcard Recap */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-brand-600" />
                  <span>60-Second Quick Revision Recap</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {summaryResult.summary.quickRevisionRecap?.map((recap, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        {idx + 1}
                      </span>
                      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        {recap}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Interactive Bar: Ask Follow-up Questions */}
        {summaryResult && !loading && (
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full relative">
              <input
                type="text"
                value={followUpQuery}
                onChange={(e) => setFollowUpQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskFollowUp();
                }}
                placeholder="Ask a follow-up question about this document..."
                className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleAskFollowUp()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors shadow-sm shrink-0 w-full sm:w-auto"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Ask in Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
