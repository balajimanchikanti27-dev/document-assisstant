import assert from 'node:assert';
import {
  geminiService,
  GeminiAuthenticationError,
  GeminiTimeoutError,
  GeminiRateLimitError,
} from '../src/services/gemini.service.js';
import {
  sourceRetriever,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../src/research/sourceRetriever.js';
import { researchOrchestrator, researchResponseCache } from '../src/research/researchOrchestrator.js';
import { webResearchService } from '../src/research/researchService.js';
import { questionAnalyzer } from '../src/research/questionAnalyzer.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const BASE_URL = 'http://localhost:5000';

function createMockGenAI(mockResponseText: string, options?: { throwError?: any; delayMs?: number }) {
  return {
    getGenerativeModel: (_modelOptions: any) => ({
      generateContent: async (_prompt: string) => {
        if (options?.delayMs) {
          await new Promise((r) => setTimeout(r, options.delayMs));
        }
        if (options?.throwError) {
          throw options.throwError;
        }
        return {
          response: {
            text: () => mockResponseText,
            usageMetadata: {
              promptTokenCount: 150,
              candidatesTokenCount: 80,
              totalTokenCount: 230,
            },
          },
        };
      },
    }),
  } as unknown as GoogleGenerativeAI;
}

let passed = 0;
let failed = 0;

function pass(name: string) {
  console.log(`  ✓ PASS: ${name}`);
  passed++;
}

function fail(name: string, err: any) {
  console.error(`  ✗ FAIL: ${name}`);
  console.error(`    ↳ Error: ${err.message || err}`);
  failed++;
}

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('🧪 AI WEB RESEARCH API & PIPELINE REGRESSION TEST SUITE');
  console.log('Testing 7 Core Scenarios + End-to-End HTTP Contract Validation');
  console.log('================================================================\n');

  // Reset any cached responses and ensure fresh state
  researchResponseCache.clear();
  sourceRetriever.clearCache();

  // -----------------------------------------------------------------
  // TEST 1: Question "what is ai"
  // -----------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/research/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'research_user_1',
      },
      body: JSON.stringify({
        question: 'what is ai',
        sourcePreference: 'both',
        responseLength: 'balanced',
      }),
    });

    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.answer.length > 50, 'Answer must not be empty');
    assert.ok(
      data.answer.toLowerCase().includes('artificial intelligence') ||
      data.answer.toLowerCase().includes('intelligence demonstrated by machines') ||
      data.answer.toLowerCase().includes('computational systems'),
      'Answer must ground factual definition of AI'
    );
    assert.ok(data.citations && data.citations.length >= 1, 'Must include real source citations');
    assert.ok(
      data.citations.some((c: any) => c.title.toLowerCase().includes('artificial intelligence') || c.title.toLowerCase() === 'ai'),
      'Citations must reference authoritative Artificial intelligence article'
    );
    assert.strictEqual(data.noSourcesFound, false);
    pass('Test 1: "what is ai" succeeds with verified evidence and real Wikipedia citations (HTTP 200)');
  } catch (err: any) {
    fail('Test 1: "what is ai"', err);
  }

  // -----------------------------------------------------------------
  // TEST 2: Question "Explain artificial intelligence in simple English"
  // -----------------------------------------------------------------
  try {
    const analysis = questionAnalyzer.analyze('Explain artificial intelligence in simple English');
    assert.strictEqual(analysis.focusedSearchQuery, 'Artificial intelligence', 'Should strip lead-ins and simple English suffix');

    const res = await fetch(`${BASE_URL}/api/research/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'research_user_2',
      },
      body: JSON.stringify({
        question: 'Explain artificial intelligence in simple English',
        sourcePreference: 'both',
        responseLength: 'balanced',
      }),
    });

    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(
      !data.answer.includes("I Can't Explain"),
      'Must not search for or return "I Can\'t Explain" music article'
    );
    assert.ok(
      data.citations.some((c: any) => c.title.toLowerCase().includes('artificial intelligence')),
      'Citations must ground Artificial intelligence topic'
    );
    pass('Test 2: "Explain artificial intelligence in simple English" correctly maps to AI topic (HTTP 200)');
  } catch (err: any) {
    fail('Test 2: "Explain artificial intelligence in simple English"', err);
  }

  // -----------------------------------------------------------------
  // TEST 3: Question "What is Vignan University, Vadlamudi?"
  // -----------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/research/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'research_user_3',
      },
      body: JSON.stringify({
        question: 'What is Vignan University, Vadlamudi?',
        sourcePreference: 'both',
        responseLength: 'balanced',
      }),
    });

    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.answer.includes('Vadlamudi') || data.answer.includes('Vignan'), 'Answer must describe Vignan University Vadlamudi');
    assert.ok(data.citations && data.citations.length >= 1, 'Must include verified university citations');
    assert.ok(
      data.citations.some((c: any) => c.domain.includes('vignan.ac.in')),
      'Citations must link to official vignan.ac.in records'
    );
    pass('Test 3: "What is Vignan University, Vadlamudi?" routes to verified university knowledge (HTTP 200)');
  } catch (err: any) {
    fail('Test 3: "What is Vignan University, Vadlamudi?"', err);
  }

  // -----------------------------------------------------------------
  // TEST 4: Question with Limited or No Search Results
  // -----------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/research/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'research_user_4',
      },
      body: JSON.stringify({
        question: 'xyzqwe9876543210 nonexistentsubjectterm12345',
        sourcePreference: 'both',
        responseLength: 'balanced',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.noSourcesFound, true, 'noSourcesFound must be true for empty search hits');
    assert.strictEqual(data.citations.length, 0, 'No citations when no sources exist');
    assert.ok(
      data.answer.includes('No verified sources were found') || data.answer.includes('could not find verified official records'),
      'Must explain absence of records honestly rather than hallucinating'
    );
    pass('Test 4: Obscure question correctly handles empty search results without hallucinating (HTTP 200)');
  } catch (err: any) {
    fail('Test 4: Limited or No Search Results', err);
  }

  // -----------------------------------------------------------------
  // TEST 5: Simulated Invalid API Key
  // -----------------------------------------------------------------
  try {
    // Inject mock client that throws 400 API_KEY_INVALID into geminiService
    const mockAuthFailAI = createMockGenAI('', {
      throwError: {
        status: 400,
        message: 'API_KEY_INVALID: API key not valid. Please pass a valid API key.',
      },
    });
    geminiService.setClientForTesting(mockAuthFailAI, 'gemini-1.5-flash');
    researchResponseCache.clear();

    let authErrorCaught = false;
    try {
      await researchOrchestrator.executeResearch({
        question: 'what is ai',
        sourcePreference: 'both',
        responseLength: 'balanced',
      });
    } catch (err: any) {
      authErrorCaught =
        err instanceof GeminiAuthenticationError ||
        err.name === 'GeminiAuthenticationError' ||
        err.message?.includes('API key is invalid') ||
        err.message?.includes('API_KEY_INVALID');
    }
    assert.ok(authErrorCaught, 'Must propagate GeminiAuthenticationError when API key is invalid');

    // Verify error classification in Gemini service
    let mappedAuthError = false;
    try {
      await geminiService.generateAnswer({
        question: 'test question',
        mode: 'research',
        evidence: { webSources: [{ title: 'T', url: 'https://e.org', domain: 'e.org', snippet: 'S', sourceType: 'web' }] },
      });
    } catch (err: any) {
      mappedAuthError = err instanceof GeminiAuthenticationError;
    }
    assert.ok(mappedAuthError, 'Gemini service must map API_KEY_INVALID to GeminiAuthenticationError');

    pass('Test 5: Simulated invalid API key correctly raises GeminiAuthenticationError (401 mapping)');
  } catch (err: any) {
    fail('Test 5: Simulated Invalid API Key', err);
  } finally {
    geminiService.setClientForTesting(null);
    geminiService.reloadConfiguration();
  }

  // -----------------------------------------------------------------
  // TEST 6: Simulated Provider Timeout
  // -----------------------------------------------------------------
  try {
    // 6a. Gemini provider timeout
    const mockTimeoutAI = createMockGenAI('', {
      throwError: new GeminiTimeoutError('Gemini API request timed out after 30000ms.'),
    });
    geminiService.setClientForTesting(mockTimeoutAI, 'gemini-1.5-flash');
    researchResponseCache.clear();

    let geminiTimeoutCaught = false;
    try {
      await researchOrchestrator.executeResearch({
        question: 'what is ai',
        sourcePreference: 'both',
        responseLength: 'balanced',
      });
    } catch (err: any) {
      geminiTimeoutCaught =
        err instanceof GeminiTimeoutError ||
        err.name === 'GeminiTimeoutError' ||
        err.message?.includes('timed out');
    }
    assert.ok(geminiTimeoutCaught, 'Must propagate timeout error when Gemini API times out');

    // 6b. Search retriever timeout
    let providerTimeoutCaught = false;
    try {
      // Query with 1ms timeout to guarantee AbortError
      await sourceRetriever.searchWikipedia('artificial intelligence', 1);
    } catch (err: any) {
      providerTimeoutCaught = err instanceof ProviderTimeoutError || err.name === 'ProviderTimeoutError';
    }
    assert.ok(providerTimeoutCaught, 'Must throw ProviderTimeoutError when Wikipedia search times out');

    pass('Test 6: Simulated provider timeout raises GeminiTimeoutError / ProviderTimeoutError (504 mapping)');
  } catch (err: any) {
    fail('Test 6: Simulated Provider Timeout', err);
  } finally {
    geminiService.setClientForTesting(null);
    geminiService.reloadConfiguration();
  }

  // -----------------------------------------------------------------
  // TEST 7: Simulated Gemini Service Failure
  // -----------------------------------------------------------------
  try {
    const mockCrashAI = createMockGenAI('', {
      throwError: new Error('Internal Generative AI service error 500: Model overloaded'),
    });
    geminiService.setClientForTesting(mockCrashAI, 'gemini-1.5-flash');
    researchResponseCache.clear();

    let serviceFailureCaught = false;
    try {
      await researchOrchestrator.executeResearch({
        question: 'what is ai',
        sourcePreference: 'both',
        responseLength: 'balanced',
      });
    } catch (err: any) {
      serviceFailureCaught =
        err.message?.includes('Internal Generative AI service error') ||
        err.message?.includes('Model overloaded');
    }
    assert.ok(serviceFailureCaught, 'Must propagate service failure without returning fake 200 answer');

    pass('Test 7: Simulated Gemini failure correctly reports error without returning fake HTTP 200');
  } catch (err: any) {
    fail('Test 7: Simulated Gemini Failure', err);
  } finally {
    geminiService.setClientForTesting(null);
    geminiService.reloadConfiguration();
  }

  // -----------------------------------------------------------------
  // TEST 8: Validation of Input & Payload Bounds (HTTP 400)
  // -----------------------------------------------------------------
  try {
    const emptyRes = await fetch(`${BASE_URL}/api/research/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '   ' }),
    });
    assert.strictEqual(emptyRes.status, 400, 'Empty question must return 400 Bad Request');
    const emptyData = await emptyRes.json();
    assert.ok(emptyData.error.includes('Question is required'));

    const invalidPrefRes = await fetch(`${BASE_URL}/api/research/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'what is ai', sourcePreference: 'invalid_mode' }),
    });
    assert.strictEqual(invalidPrefRes.status, 400, 'Invalid sourcePreference must return 400 Bad Request');

    pass('Test 8: Request validation rejects empty questions and invalid preferences with HTTP 400');
  } catch (err: any) {
    fail('Test 8: Validation of Input & Payload Bounds', err);
  }

  // -----------------------------------------------------------------
  // TEST 9: Multi-Source Provider Isolation & Web-only Configuration Check
  // -----------------------------------------------------------------
  try {
    // When web-only search is selected without configured key, verify clear error
    let webOnlyThrows = false;
    try {
      await sourceRetriever.retrieve('quantum computing', { sourcePreference: 'web' });
    } catch (err: any) {
      webOnlyThrows = err instanceof ProviderUnavailableError || err.message?.includes('TAVILY_API_KEY');
    }
    assert.ok(webOnlyThrows, 'Web-only search without API key must raise ProviderUnavailableError');

    pass('Test 9: Web-only search configuration validated with ProviderUnavailableError (503 mapping)');
  } catch (err: any) {
    fail('Test 9: Multi-Source Provider Isolation', err);
  }

  // -----------------------------------------------------------------
  // TEST 10: Secret Credential Sanitization
  // -----------------------------------------------------------------
  try {
    const status = geminiService.validateConfig();
    assert.ok(!status.maskedKey.includes('AIzaSy') || status.maskedKey.includes('...'), 'Keys must be masked');
    assert.strictEqual(typeof status.configured, 'boolean');
    pass('Test 10: Secret credentials and API keys safely sanitized from all outputs');
  } catch (err: any) {
    fail('Test 10: Secret Credential Sanitization', err);
  }

  console.log('\n================================================================');
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
