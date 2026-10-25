import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  Search,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Layers,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  BarChart2,
  Clock,
  Sparkles,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  WebScrapingTestCase,
  QuestionEvaluationReport,
  WebScrapingBenchmarkSummary,
  fetchWebScrapingDataset,
  fetchLatestEvaluationResults,
  runWebScrapingEvaluation,
  runSingleEvaluation,
} from '../services/evaluationService';

export const EvaluationPage: React.FC = () => {
  const [dataset, setDataset] = useState<WebScrapingTestCase[]>([]);
  const [summary, setSummary] = useState<WebScrapingBenchmarkSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<'fixture' | 'live'>('fixture');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [questions, latestSummary] = await Promise.all([
        fetchWebScrapingDataset(),
        fetchLatestEvaluationResults(),
      ]);
      setDataset(questions);
      setSummary(latestSummary);
    } catch (err) {
      console.error('Failed to load evaluation dataset or results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    setEvaluating(true);
    try {
      const categoryParam = selectedCategory === 'ALL' ? undefined : selectedCategory;
      const res = await runWebScrapingEvaluation(selectedMode, categoryParam);
      setSummary(res);
    } catch (err: any) {
      alert(`Evaluation error: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleRunSingle = async (questionId: string) => {
    setEvaluatingId(questionId);
    try {
      const updatedReport = await runSingleEvaluation(questionId, selectedMode);
      if (summary) {
        const nextResults = summary.results.map((r) =>
          r.questionId === questionId ? updatedReport : r
        );
        const passedCount = nextResults.filter((r) => r.passed).length;
        setSummary({
          ...summary,
          results: nextResults,
          passedCount,
          failedCount: nextResults.length - passedCount,
        });
      }
    } catch (err: any) {
      alert(`Single evaluation error: ${err.message}`);
    } finally {
      setEvaluatingId(null);
    }
  };

  const categories = [
    { code: 'ALL', name: 'All 50 Questions', range: '1-50' },
    { code: 'A', name: 'Category A: Basic Scraping', range: '1-10' },
    { code: 'B', name: 'Category B: APIs & Tools', range: '11-20' },
    { code: 'C', name: 'Category C: Data Extraction', range: '21-30' },
    { code: 'D', name: 'Category D: AI Research & RAG', range: '31-40' },
    { code: 'E', name: 'Category E: Reliability & Security', range: '41-50' },
  ];

  // Merge dataset items with report results
  const items = dataset.map((testCase) => {
    const report = summary?.results.find((r) => r.questionId === testCase.id);
    return { testCase, report };
  });

  const filteredItems = items.filter(({ testCase, report }) => {
    if (selectedCategory !== 'ALL' && testCase.categoryCode !== selectedCategory) {
      return false;
    }
    if (statusFilter === 'PASSED' && !report?.passed) return false;
    if (statusFilter === 'FAILED' && (report?.passed || !report)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText =
        testCase.question.toLowerCase() +
        ' ' +
        testCase.id.toLowerCase() +
        ' ' +
        testCase.expectedCriteria.join(' ').toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const metrics = summary?.metrics;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <BarChart2 className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Web-Scraping Evaluation Suite
              </h1>
            </div>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">
              Developer evaluation harness testing live search, URL discovery, HTML parsing, boilerplate cleaning,
              table extraction, claim grounding, and citation validity across 50 benchmark questions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Mode Selector */}
            <div className="flex bg-neutral-200 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedMode('fixture')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedMode === 'fixture'
                    ? 'bg-white dark:bg-neutral-700 text-brand-600 dark:text-brand-300 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
                title="Deterministic tests using verified HTML test fixtures"
              >
                Deterministic Fixtures
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode('live')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedMode === 'live'
                    ? 'bg-white dark:bg-neutral-700 text-brand-600 dark:text-brand-300 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
                title="Live integration test querying Wikipedia and public websites"
              >
                Live Web Integration
              </button>
            </div>

            {/* Run Button */}
            <button
              type="button"
              disabled={evaluating || loading}
              onClick={handleRunEvaluation}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-500/20 disabled:opacity-50 transition-all"
            >
              {evaluating ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating 50 Questions...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Evaluation Benchmark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Top Metrics Cards */}
        {summary && metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Quality Index</span>
              <div className="mt-2 text-2xl font-black text-brand-600 dark:text-brand-400">
                {(summary.averageScore * 100).toFixed(1)}%
              </div>
              <span className="text-[10px] text-neutral-400 mt-1">Weighted Composite</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Pass Rate</span>
              <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {summary.passedCount} / {summary.totalQuestions}
              </div>
              <span className="text-[10px] text-emerald-500 mt-1">
                {((summary.passedCount / summary.totalQuestions) * 100).toFixed(0)}% Passed
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">URL Retrieval</span>
              <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
                {metrics.urlRetrievalSuccessRate}%
              </div>
              <span className="text-[10px] text-neutral-400 mt-1">Discovery Success</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Extraction</span>
              <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {metrics.contentExtractionSuccessRate}%
              </div>
              <span className="text-[10px] text-neutral-400 mt-1">HTML Clean Text</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Relevance</span>
              <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">
                {metrics.averageRelevance}%
              </div>
              <span className="text-[10px] text-neutral-400 mt-1">Intent Matching</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Correctness</span>
              <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {metrics.averageCorrectness}%
              </div>
              <span className="text-[10px] text-neutral-400 mt-1">Criteria Criteria</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Citations</span>
              <div className="mt-2 text-2xl font-black text-sky-600 dark:text-sky-400">
                {metrics.citationValidityRate}%
              </div>
              <span className="text-[10px] text-neutral-400 mt-1">Valid Source URLs</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Grounding</span>
              <div className="mt-2 text-2xl font-black text-teal-600 dark:text-teal-400">
                {metrics.evidenceSupportRate}%
              </div>
              <span className="text-[10px] text-neutral-400 mt-1">Evidence Support</span>
            </div>
          </div>
        )}

        {/* Category Breakdown Badges */}
        {summary && summary.categoryBreakdown && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {Object.entries(summary.categoryBreakdown).map(([catCode, stat]) => (
              <div
                key={catCode}
                onClick={() => setSelectedCategory(selectedCategory === catCode ? 'ALL' : catCode)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedCategory === catCode
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  <span>Category {catCode}</span>
                  <span className="text-brand-600 dark:text-brand-400">{stat.avgScore}%</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                  <span>Passed:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {stat.passed} / {stat.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by question, ID, or keywords (e.g., Beautiful Soup, Scrapy, SSRF, robots.txt)..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {categories.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setSelectedCategory(c.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === c.code
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100'
                }`}
              >
                {c.code === 'ALL' ? 'All (50)' : `Cat ${c.code}`}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-medium rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PASSED">Passed Only</option>
            <option value="FAILED">Failed Only</option>
          </select>
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {filteredItems.map(({ testCase, report }) => {
            const isExpanded = expandedId === testCase.id;
            const isSingleRunning = evaluatingId === testCase.id;
            const passed = report?.passed ?? true;
            const score = report ? (report.overallScore * 100).toFixed(0) : '100';

            return (
              <div
                key={testCase.id}
                className={`rounded-2xl border transition-all ${
                  report && !report.passed
                    ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                {/* Question Summary Bar */}
                <div
                  className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : testCase.id)}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 ${
                        testCase.categoryCode === 'A'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : testCase.categoryCode === 'B'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          : testCase.categoryCode === 'C'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : testCase.categoryCode === 'D'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {testCase.id.toUpperCase()}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-neutral-400">
                          #{testCase.questionNumber} • {testCase.categoryName}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">
                        {testCase.question}
                      </h3>
                      {report?.answerSnippet && !isExpanded && (
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {report.answerSnippet}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Score badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        Number(score) >= 90
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : Number(score) >= 70
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {score}%
                    </span>

                    {/* Pass/Fail indicator */}
                    {passed ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Pass</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        <XCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Fail</span>
                      </span>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-4">
                    {/* Failure alerts if any */}
                    {report && report.failureReasons && report.failureReasons.length > 0 && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                        <span className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Failure Reasons:
                        </span>
                        {report.failureReasons.map((reason, i) => (
                          <div key={i} className="ml-4 list-disc">
                            • {reason}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Detailed Metric Scores */}
                    {report && (
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 rounded-xl bg-neutral-100/60 dark:bg-neutral-800/40 text-xs">
                        <div>
                          <span className="text-neutral-500">URL Discovery:</span>
                          <p className="font-bold text-neutral-800 dark:text-neutral-200">
                            {(report.scores.urlRetrieval * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Extraction:</span>
                          <p className="font-bold text-neutral-800 dark:text-neutral-200">
                            {(report.scores.contentExtraction * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Relevance:</span>
                          <p className="font-bold text-neutral-800 dark:text-neutral-200">
                            {(report.scores.relevance * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Correctness:</span>
                          <p className="font-bold text-neutral-800 dark:text-neutral-200">
                            {(report.scores.correctness * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Evidence Grounding:</span>
                          <p className="font-bold text-neutral-800 dark:text-neutral-200">
                            {(report.scores.evidenceSupport * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Citation Validity:</span>
                          <p className="font-bold text-neutral-800 dark:text-neutral-200">
                            {(report.scores.citationValidity * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Requirements and Criteria */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                          Expected Answer Criteria
                        </span>
                        <ul className="space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                          {testCase.expectedCriteria.map((c, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                          Required Evidence Keywords
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {testCase.requiredEvidence.map((ev, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-[11px] font-mono text-neutral-700 dark:text-neutral-300"
                            >
                              {ev}
                            </span>
                          ))}
                        </div>

                        <div className="pt-2">
                          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                            Verified Source URLs
                          </span>
                          <div className="flex flex-col gap-1 mt-1">
                            {testCase.relevantSourceUrls.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 truncate"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{url}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actual Synthesized Answer & Citations */}
                    {report?.answerSnippet && (
                      <div className="p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 space-y-2">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                          Actual Evidence-Grounded Answer Snippet
                        </span>
                        <p className="text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed font-sans">
                          {report.answerSnippet}
                        </p>
                        {report.citations && report.citations.length > 0 && (
                          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60">
                            <span className="text-[11px] font-bold text-neutral-500">
                              Generated Citations ({report.citations.length}):
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {report.citations.map((c, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600"
                                >
                                  [{i + 1}] {c.title} {c.domain ? `(${c.domain})` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Re-test single question action */}
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        disabled={isSingleRunning}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunSingle(testCase.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                      >
                        {isSingleRunning ? (
                          <>
                            <RotateCw className="w-3 h-3 animate-spin" />
                            <span>Re-testing...</span>
                          </>
                        ) : (
                          <>
                            <RotateCw className="w-3 h-3" />
                            <span>Re-test This Question</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
