import { universityRagService } from '../src/university/universityRagService.js';
import { webResearchService } from '../src/research/researchService.js';
import { researchOrchestrator, researchResponseCache } from '../src/research/researchOrchestrator.js';
import { universityVectorStore } from '../src/university/universityVectorStore.js';
import { questionAnalyzer } from '../src/research/questionAnalyzer.js';

interface SessionQuestionTest {
  questionNumber: number;
  question: string;
  expectedCategory: string;
  mustIncludeKeywords: string[];
  mustNotBeGenericOverviewOnly: boolean;
  leadershipDistinctionCheck?: {
    isVC?: boolean;
    isChairman?: boolean;
  };
}

const REGRESSION_QUESTIONS: SessionQuestionTest[] = [
  {
    questionNumber: 1,
    question: 'Where is Vignan University located?',
    expectedCategory: 'location',
    mustIncludeKeywords: ['Vadlamudi', 'Guntur', '522213'],
    mustNotBeGenericOverviewOnly: true,
  },
  {
    questionNumber: 2,
    question: 'Who is the chairman of Vignan?',
    expectedCategory: 'leadership_chairman',
    mustIncludeKeywords: ['Dr. Lavu Rathaiah', 'Chairman'],
    mustNotBeGenericOverviewOnly: true,
    leadershipDistinctionCheck: { isChairman: true },
  },
  {
    questionNumber: 3,
    question: 'Who is the current vice-chancellor?',
    expectedCategory: 'leadership_vc',
    mustIncludeKeywords: ['Krishna Kishore', 'Vice-Chancellor'],
    mustNotBeGenericOverviewOnly: true,
    leadershipDistinctionCheck: { isVC: true },
  },
  {
    questionNumber: 4,
    question: 'What courses does Vignan offer?',
    expectedCategory: 'courses',
    mustIncludeKeywords: ['B.Tech', 'M.Tech', 'MBA', 'MCA'],
    mustNotBeGenericOverviewOnly: true,
  },
  {
    questionNumber: 5,
    question: 'What is the official address of Vignan University, Vadlamudi?',
    expectedCategory: 'location',
    mustIncludeKeywords: ['Vadlamudi', 'Chebrolu', 'Guntur', '522213', 'Andhra Pradesh'],
    mustNotBeGenericOverviewOnly: true,
  },
  {
    questionNumber: 6,
    question: 'What is the fee for CSE at Vignan University?',
    expectedCategory: 'fees',
    mustIncludeKeywords: ['₹2,60,000', 'Category A'],
    mustNotBeGenericOverviewOnly: true,
  },
  {
    questionNumber: 7,
    question: 'Which block contains the CSE department at Vignan?',
    expectedCategory: 'campus_blocks',
    mustIncludeKeywords: ['U-Block', 'Floor'],
    mustNotBeGenericOverviewOnly: true,
  },
  {
    questionNumber: 8,
    question: 'What is the admission process at Vignan University?',
    expectedCategory: 'admissions',
    mustIncludeKeywords: ['V-SAT', 'Eligibility', 'Counseling'],
    mustNotBeGenericOverviewOnly: true,
  },
];

const GENERIC_OVERVIEW_SIGNATURE = 'Deemed-to-be-University located in Vadlamudi, Guntur district, Andhra Pradesh, India. Re-accredited by NAAC with an prestigious A+ grade';

async function runRegressionSuite() {
  console.log('========================================================================');
  console.log('VIGNAN AI RESEARCH: 8-QUESTION SESSION REGRESSION TEST SUITE');
  console.log('Testing question-specific retrieval, answer synthesis, citations & cache');
  console.log('========================================================================\n');

  // Initialize vector store
  universityVectorStore.initStore();
  researchResponseCache.clear();

  const conversationHistory: { sender: 'user' | 'assistant'; text: string }[] = [];
  const generatedAnswers: { question: string; answer: string; citationsCount: number }[] = [];
  let allPassed = true;

  // ------------------------------------------------------------------------
  // PART 1: Run the 8 Distinct Session Questions in Sequence
  // ------------------------------------------------------------------------
  console.log('--- Part 1: Testing 8 Distinct Questions in the Same Research Session ---');

  for (const item of REGRESSION_QUESTIONS) {
    const startTime = Date.now();
    console.log(`\n[Question ${item.questionNumber}/8]: "${item.question}"`);

    // Intent Analysis Check
    const classified = universityRagService.classifyQuestionIntent(item.question);
    console.log(`  -> Intent Classified: [${classified.category}] | Target: "${classified.targetSubject}"`);

    if (classified.category !== item.expectedCategory) {
      console.warn(`  ⚠️ Category mismatch: expected ${item.expectedCategory}, got ${classified.category}`);
    }

    // Query Execution via University RAG Service
    const uniResponse = await universityRagService.query({
      question: item.question,
      conversationId: 'regression_session_test',
      userId: 'test_user_regression',
      previousMessages: [...conversationHistory],
    });

    const latency = Date.now() - startTime;
    const answer = uniResponse.answer;

    // Check 1: Answer must not be the generic overview
    const isGenericOverview = answer.includes(GENERIC_OVERVIEW_SIGNATURE) && !answer.includes('**');
    if (isGenericOverview) {
      console.error(`  ✗ FAIL: Received identical generic overview instead of tailored answer!`);
      allPassed = false;
    } else {
      console.log(`  ✓ Not a generic overview dump.`);
    }

    // Check 2: Required keywords for this specific question
    const missingKeywords = item.mustIncludeKeywords.filter(
      (kw) => !answer.toLowerCase().includes(kw.toLowerCase())
    );
    if (missingKeywords.length > 0) {
      console.error(`  ✗ FAIL: Answer missing expected keywords: ${missingKeywords.join(', ')}`);
      allPassed = false;
    } else {
      console.log(`  ✓ Contains required question keywords: [${item.mustIncludeKeywords.join(', ')}]`);
    }

    // Check 3: Leadership Distinction
    if (item.leadershipDistinctionCheck?.isChairman) {
      const mentionsChairman = answer.toLowerCase().includes('dr. lavu rathaiah');
      const distinguishesFromVC = answer.toLowerCase().includes('vice-chancellor') || answer.toLowerCase().includes('academic executive');
      if (!mentionsChairman) {
        console.error(`  ✗ FAIL: Chairman answer does not mention Dr. Lavu Rathaiah`);
        allPassed = false;
      } else {
        console.log(`  ✓ Correctly identifies Chairman Dr. Lavu Rathaiah.`);
      }
      if (distinguishesFromVC) {
        console.log(`  ✓ Explicitly distinguishes Chairman from Vice-Chancellor.`);
      }
    }

    if (item.leadershipDistinctionCheck?.isVC) {
      const mentionsVC = answer.toLowerCase().includes('krishna kishore') || answer.toLowerCase().includes('nagabhushan');
      const distinguishesFromChairman = answer.toLowerCase().includes('rathaiah') || answer.toLowerCase().includes('distinction') || answer.toLowerCase().includes('founder');
      if (!mentionsVC) {
        console.error(`  ✗ FAIL: Vice-Chancellor answer does not mention Prof. K. V. Krishna Kishore`);
        allPassed = false;
      } else {
        console.log(`  ✓ Correctly identifies Vice-Chancellor Prof. K. V. Krishna Kishore.`);
      }
      if (distinguishesFromChairman) {
        console.log(`  ✓ Explicitly distinguishes Vice-Chancellor from Founder Chairman.`);
      }
    }

    // Check 4: Citations
    if (!uniResponse.citations || uniResponse.citations.length === 0) {
      console.error(`  ✗ FAIL: Missing citations for factual answer!`);
      allPassed = false;
    } else {
      const firstCite = uniResponse.citations[0];
      const hasValidUrl = firstCite.url.startsWith('https://www.vignan.ac.in') || firstCite.url.startsWith('https://vignan.ac.in');
      console.log(`  ✓ Citations Verified: ${uniResponse.citations.length} sources (Top: "${firstCite.title}" -> ${firstCite.url})`);
      if (!hasValidUrl) {
        console.warn(`  ⚠️ Citation URL may not be official university URL: ${firstCite.url}`);
      }
    }

    // Record for session context and diversity check
    conversationHistory.push({ sender: 'user', text: item.question });
    conversationHistory.push({ sender: 'assistant', text: answer.slice(0, 180) });
    generatedAnswers.push({
      question: item.question,
      answer,
      citationsCount: uniResponse.citations?.length || 0,
    });

    console.log(`  ✓ Query completed in ${latency}ms`);
  }

  // ------------------------------------------------------------------------
  // PART 2: Verify Answer Diversity Across All 8 Questions
  // ------------------------------------------------------------------------
  console.log('\n--- Part 2: Answer Diversity & Non-Repetition Verification ---');
  let duplicatesFound = 0;
  for (let i = 0; i < generatedAnswers.length; i++) {
    for (let j = i + 1; j < generatedAnswers.length; j++) {
      const a1 = generatedAnswers[i].answer;
      const a2 = generatedAnswers[j].answer;
      if (a1 === a2) {
        console.error(`  ✗ DUPLICATE DETECTED: Question ${i + 1} and Question ${j + 1} produced the exact same answer!`);
        duplicatesFound++;
        allPassed = false;
      }
    }
  }

  if (duplicatesFound === 0) {
    console.log(`  ✓ PASS: All 8 questions produced 100% unique, question-specific answers.`);
  }

  // ------------------------------------------------------------------------
  // PART 3: Verify Research Response Cache Behavior (Requirement 6)
  // ------------------------------------------------------------------------
  console.log('\n--- Part 3: Research Response Cache Key Isolation Verification ---');
  const payloadQ1 = { question: 'Where is Vignan University located?', sourcePreference: 'both' as const };
  const payloadQ2 = { question: 'Who is the chairman of Vignan?', sourcePreference: 'both' as const };

  const key1 = researchResponseCache.buildKey(payloadQ1);
  const key2 = researchResponseCache.buildKey(payloadQ2);

  console.log(`  Cache Key Q1: "${key1}"`);
  console.log(`  Cache Key Q2: "${key2}"`);

  if (key1 === key2) {
    console.error('  ✗ FAIL: Cache keys for different questions collided!');
    allPassed = false;
  } else {
    console.log('  ✓ PASS: Different Vignan questions produce completely separate cache keys.');
  }

  // Set mock entry for key1
  const mockResp = {
    success: true,
    answer: 'Location answer cached',
    citations: [],
    searchSteps: [],
    noSourcesFound: false,
    mode: 'research' as const,
  };
  researchResponseCache.set(key1, mockResp, payloadQ1.question);

  if (researchResponseCache.get(key1)?.answer !== 'Location answer cached') {
    console.error('  ✗ FAIL: Cache lookup for key1 failed');
    allPassed = false;
  } else {
    console.log('  ✓ PASS: Cache hit correctly retrieved for identical question.');
  }

  if (researchResponseCache.get(key2) !== null) {
    console.error('  ✗ FAIL: Cache leaked answer from Q1 to Q2!');
    allPassed = false;
  } else {
    console.log('  ✓ PASS: Cache correctly misses for Q2 (no cross-question answer pollution).');
  }

  // ------------------------------------------------------------------------
  // PART 4: Verification of Unsupported / Non-existent Inquiries (Requirement 2 & 5)
  // ------------------------------------------------------------------------
  console.log('\n--- Part 4: Handling Unsupported Queries Without Hallucination ---');
  const unsupportedQueries = [
    'What is the secret underground tunnel to the moon at Vignan University?',
    'What is the personal mobile phone number of the Vignan gate security guard?',
  ];

  for (const unverifiedQ of unsupportedQueries) {
    console.log(`  Testing: "${unverifiedQ}"`);
    const resp = await universityRagService.query({ question: unverifiedQ });
    const isHonestLimitation =
      resp.answer.toLowerCase().includes('could not find verified') ||
      resp.answer.toLowerCase().includes('unverified') ||
      !resp.isVerifiedKnowledge;

    if (isHonestLimitation) {
      console.log(`  ✓ PASS: Correctly refused to hallucinate unverified facts. (isVerifiedKnowledge: ${resp.isVerifiedKnowledge})`);
    } else {
      console.error(`  ✗ FAIL: Fabricated information for unverified query!`);
      allPassed = false;
    }
  }

  // ------------------------------------------------------------------------
  // PART 5: Full Web Research Pipeline Integration Check (via WebResearchService)
  // ------------------------------------------------------------------------
  console.log('\n--- Part 5: Full Research Pipeline Ingestion Check ---');
  const webQ = 'Who is the chairman of Vignan University?';
  const webResearchResult = await webResearchService.query({
    question: webQ,
    sourcePreference: 'both',
  });

  console.log(`  Web Research Mode Answer Preview: "${webResearchResult.answer.slice(0, 120)}..."`);
  console.log(`  Web Research Citations Count: ${webResearchResult.citations.length}`);
  console.log(`  Web Research Steps Count: ${webResearchResult.searchSteps.length}`);

  if (webResearchResult.answer.includes('Dr. Lavu Rathaiah') && webResearchResult.citations.length > 0) {
    console.log('  ✓ PASS: Web research orchestrator retrieved Vignan knowledge and generated tailored answer.');
  } else {
    console.error('  ✗ FAIL: Web research pipeline did not return tailored chairman answer.');
    allPassed = false;
  }

  console.log('\n========================================================================');
  if (allPassed) {
    console.log('🎉 ALL REGRESSION TESTS PASSED (8/8 Questions + Cache + Grounding + Diversity)');
  } else {
    console.log('❌ SOME REGRESSION TESTS FAILED');
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runRegressionSuite().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
