import { questionAnalyzer } from '../src/research/questionAnalyzer.js';
import { sourceRetriever } from '../src/research/sourceRetriever.js';
import { evidenceVerifier } from '../src/research/evidenceVerifier.js';
import { feedbackStore } from '../src/services/feedbackStore.js';
import { RateLimiter } from '../src/middleware/rateLimiter.js';
import { DOCUMENT_FALLBACK_MESSAGE } from '../src/services/gemini.service.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 Starting Advanced AI Agent Intelligence & Security Tests');
  console.log('======================================================\n');

  // ---------------------------------------------------------
  // PHASE 1: Intelligent Question Analysis Tests
  // ---------------------------------------------------------
  console.log('Test Suite 1: Intelligent Question Analysis (Phase 1)');

  // 1.1 Intent & Expected Answer Type
  const numericAnalysis = questionAnalyzer.analyze('What was the net profit margin in Q3 2026?');
  assert(numericAnalysis.expectedAnswerType === 'numeric', 'Identifies numeric answer type');
  assert(numericAnalysis.constraints.some((c) => c.toLowerCase().includes('q3')), 'Extracts Q3 constraint');

  const comparisonAnalysis = questionAnalyzer.analyze('Compare React and Vue in terms of virtual DOM and learning curve.');
  assert(comparisonAnalysis.intent === 'comparison', 'Identifies comparison intent');
  assert(comparisonAnalysis.expectedAnswerType === 'comparison_table', 'Identifies comparison_table answer type');
  assert(comparisonAnalysis.isMultiSourceRequired, 'Flags query as requiring multiple sources');

  // 1.2 Coreference & Follow-up Resolution (Phase 6)
  const history = [
    { sender: 'user' as const, text: 'What are the main security features of Cloud Storage?' },
    {
      sender: 'assistant' as const,
      text: 'Here are three key features:\n1. Server-Side Encryption with customer-managed keys (CMEK).\n2. Granular Identity and Access Management (IAM) permissions.\n3. Object Lifecycle Management rules for retention.',
    },
  ];

  const followUp1 = questionAnalyzer.analyze('Explain the second point in more detail', history);
  assert(followUp1.dependsOnPreviousContext, 'Detects conversational dependency on prior turns');
  assert(
    followUp1.resolvedQuestion.toLowerCase().includes('iam') || followUp1.resolvedQuestion.toLowerCase().includes('permissions'),
    'Resolves "second point" to IAM permissions from previous assistant message'
  );

  const pronounHistory = [
    { sender: 'user' as const, text: 'How does Snowflake handle concurrency?' },
    { sender: 'assistant' as const, text: 'Snowflake separates compute and storage to scale clusters independently.' },
  ];
  const followUp2 = questionAnalyzer.analyze('How does it compare to BigQuery?', pronounHistory);
  assert(followUp2.resolvedQuestion.includes('Snowflake'), 'Resolves pronoun "it" to Snowflake');

  // 1.3 Ambiguity Detection & Stated Assumptions
  const ambAnalysis = questionAnalyzer.analyze('What is the maximum speed of a jaguar?');
  assert(ambAnalysis.ambiguity.isAmbiguous, 'Detects polysemous ambiguity for "jaguar"');
  assert(Boolean(ambAnalysis.ambiguity.assumption), 'Formulates transparent assumption clarifying animal species vs car');

  // 1.4 False Premise & Anachronistic Assumption Detection
  const falsePremise = questionAnalyzer.analyze('Why did Thomas Jefferson invent the iPhone in 1805?');
  assert(falsePremise.hasFalsePremise === true, 'Detects false premise in question');
  assert(
    Boolean(
      falsePremise.falsePremiseClarification?.includes('not invent') &&
      falsePremise.falsePremiseClarification?.includes('Apple') &&
      falsePremise.falsePremiseClarification?.includes('2007')
    ),
    'Formulates clear counterfactual clarification with accurate historical attribution'
  );

  // 1.5 Future Speculation & Uncertainty Detection
  const futureSpec = questionAnalyzer.analyze('What will the exact price of Bitcoin be on December 31, 2035?');
  assert(futureSpec.isFutureSpeculation === true, 'Detects future unanswerable speculation');
  assert(
    Boolean(
      futureSpec.futureSpeculationNote?.includes('predicted') &&
      futureSpec.futureSpeculationNote?.includes('uncertain')
    ),
    'Formulates explicit notice of future uncertainty and unverified prediction'
  );

  // 1.6 Multi-part Question Decomposition
  const multiPart = questionAnalyzer.analyze('What is the capital of France? And what is its population?');
  assert(multiPart.isMultiPart, 'Detects multi-part question with multiple clauses');
  assert(multiPart.subQueries.length >= 2, 'Decomposes question into distinct sub-queries');

  // ---------------------------------------------------------
  // PHASE 2 & 3: Source Orchestration & Domain Authority
  // ---------------------------------------------------------
  console.log('\nTest Suite 2: Source Orchestration & Authority Scoring (Phase 2 & 3)');

  const govAuthority = sourceRetriever.assessDomainAuthority('nasa.gov');
  assert(govAuthority.authorityScore >= 0.95 && govAuthority.isPrimarySource, 'Rates .gov as primary authoritative source');

  const eduAuthority = sourceRetriever.assessDomainAuthority('stanford.edu');
  assert(eduAuthority.authorityScore >= 0.90 && eduAuthority.isPrimarySource, 'Rates .edu as primary academic source');

  const forumAuthority = sourceRetriever.assessDomainAuthority('reddit.com');
  assert(forumAuthority.authorityScore < 0.50 && !forumAuthority.isPrimarySource, 'Rates user forums with low authority score');

  const normalizedUrl = sourceRetriever.normalizeUrl('https://example.com/article?utm_source=twitter&ref=feed#section');
  assert(normalizedUrl === 'https://example.com/article', 'Strips tracking tags and fragments during URL normalization');

  // ---------------------------------------------------------
  // PHASE 4 & 5: Evidence Grounding & Bounded Verification
  // ---------------------------------------------------------
  console.log('\nTest Suite 3: Evidence Grounding & Bounded Verification (Phase 4 & 5)');

  const mockSources = [
    {
      id: 'wiki_1',
      title: 'CRISPR Gene Editing',
      url: 'https://en.wikipedia.org/wiki/CRISPR_gene_editing',
      canonicalUrl: 'https://en.wikipedia.org/wiki/CRISPR_gene_editing',
      domain: 'en.wikipedia.org',
      snippet: 'CRISPR-Cas9 is a technology that allows geneticists to edit parts of the genome by cutting DNA sequences.',
      extractedText: 'CRISPR-Cas9 is a technology that allows geneticists to edit parts of the genome by cutting DNA sequences with guide RNA.',
      sourceType: 'wikipedia' as const,
      authorityScore: 0.88,
      isPrimarySource: false,
      retrievalTimestamp: Date.now(),
    },
  ];

  const groundedAnswer = 'CRISPR-Cas9 enables geneticists to edit parts of the genome by cutting specific DNA sequences using guide RNA.';
  const groundedCheck = evidenceVerifier.verifyAnswerClaims(groundedAnswer, mockSources);
  assert(groundedCheck.isGrounded, 'Verifies grounded answer with high claim-to-passage alignment');
  assert(groundedCheck.supportedRatio >= 0.8, 'Supported claim ratio exceeds 80%');

  const hallucinatedAnswer = 'CRISPR was discovered by Albert Einstein in 1915 to transmit quantum telegraphs across Mars.';
  const hallucinatedCheck = evidenceVerifier.verifyAnswerClaims(hallucinatedAnswer, mockSources);
  assert(!hallucinatedCheck.isGrounded, 'Correctly flags hallucinated answer unsupported by retrieved passages');

  // Strict Fallback Message Exactness
  assert(
    DOCUMENT_FALLBACK_MESSAGE === 'There is no answer to your question in your uploaded document.',
    'Verifies verbatim document-only insufficient evidence fallback constant'
  );

  // ---------------------------------------------------------
  // PHASE 8: User Feedback Store & Quality Improvement
  // ---------------------------------------------------------
  console.log('\nTest Suite 4: User Feedback Store & Metrics (Phase 8)');

  feedbackStore.clear();

  await feedbackStore.recordFeedback({
    messageId: 'msg_test_01',
    conversationId: 'chat_01',
    userId: 'user_eval_a',
    mode: 'document',
    rating: 'like',
    category: 'accurate',
    comment: 'Precise slide citation.',
  });

  await feedbackStore.recordFeedback({
    messageId: 'msg_test_02',
    conversationId: 'chat_01',
    userId: 'user_eval_a',
    mode: 'research',
    rating: 'like',
    category: 'accurate',
  });

  await feedbackStore.recordFeedback({
    messageId: 'msg_test_03',
    conversationId: 'chat_02',
    userId: 'user_eval_b',
    mode: 'document',
    rating: 'dislike',
    category: 'missing_citation',
    comment: 'Need page number.',
  });

  const feedbackSummary = feedbackStore.getFeedbackSummary();
  assert(feedbackSummary.totalCount === 3, 'Stores feedback records');
  assert(feedbackSummary.likes === 2 && feedbackSummary.dislikes === 1, 'Calculates like/dislike counts accurately');
  assert(feedbackSummary.satisfactionRate === 66.7, 'Calculates satisfaction rate percentage');
  assert(feedbackSummary.categoryBreakdown['missing_citation'] === 1, 'Aggregates issue categories for retrieval improvement');

  // ---------------------------------------------------------
  // PHASE 9: Reliability, Rate Limiting & Bounds Enforcement
  // ---------------------------------------------------------
  console.log('\nTest Suite 5: Rate Limiting & Bounds Enforcement (Phase 9)');

  const testLimiter = new RateLimiter({
    windowMs: 1000,
    maxRequests: 2,
    message: 'Test limit reached',
  });

  let rateLimitHit = false;
  const mockReq: any = { ip: '127.0.0.1', userId: 'rate_test_user' };
  const mockRes: any = {
    setHeader: () => {},
    status: (code: number) => ({
      json: (data: any) => {
        if (code === 429) rateLimitHit = true;
      },
    }),
  };

  const middleware = testLimiter.middleware();
  middleware(mockReq, mockRes, () => {}); // 1
  middleware(mockReq, mockRes, () => {}); // 2
  middleware(mockReq, mockRes, () => {}); // 3 -> Trigger 429
  assert(rateLimitHit, 'Rate limiter triggers HTTP 429 when max request quota is exceeded');

  console.log('\n======================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
