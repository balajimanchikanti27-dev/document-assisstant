import { questionAnalyzer } from '../src/research/questionAnalyzer.js';
import { sourceRetriever } from '../src/research/sourceRetriever.js';
import { evidenceVerifier } from '../src/research/evidenceVerifier.js';
import { researchOrchestrator, researchResponseCache } from '../src/research/researchOrchestrator.js';
import { webResearchService } from '../src/research/researchService.js';
import { universityRagService } from '../src/university/universityRagService.js';
import {
  geminiService,
  GeminiAuthenticationError,
  GeminiTimeoutError,
  GeminiRateLimitError,
  GeminiModelError,
  GeminiConfigurationError,
} from '../src/services/gemini.service.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
              promptTokenCount: 120,
              candidatesTokenCount: 65,
              totalTokenCount: 185,
            },
          },
        };
      },
    }),
  } as unknown as GoogleGenerativeAI;
}

async function runAllDiagnostics() {
  console.log('================================================================');
  console.log('🔍 RUNNING COMPREHENSIVE RESEARCH PIPELINE DIAGNOSTICS');
  console.log('================================================================\n');

  // Test 1: "what is ai"
  console.log('--- TEST 1: "what is ai" (Clean cache) ---');
  researchResponseCache.clear();
  try {
    const res1 = await webResearchService.query({
      question: 'what is ai',
      sourcePreference: 'both',
      responseLength: 'balanced',
    });
    console.log('Test 1 Success:', {
      success: res1.success,
      answerSnippet: res1.answer.slice(0, 100),
      citationsCount: res1.citations.length,
      model: res1.model,
    });
  } catch (err: any) {
    console.error('Test 1 FAILED:', err.message);
  }

  // Test 2: "Explain artificial intelligence in simple English"
  console.log('\n--- TEST 2: "Explain artificial intelligence in simple English" ---');
  try {
    const res2 = await webResearchService.query({
      question: 'Explain artificial intelligence in simple English',
      sourcePreference: 'both',
      responseLength: 'balanced',
    });
    console.log('Test 2 Success:', {
      success: res2.success,
      answerSnippet: res2.answer.slice(0, 100),
      citationsCount: res2.citations.length,
      model: res2.model,
    });
  } catch (err: any) {
    console.error('Test 2 FAILED:', err.message);
  }

  // Test 3: "What is Vignan University, Vadlamudi?"
  console.log('\n--- TEST 3: "What is Vignan University, Vadlamudi?" ---');
  try {
    const isUni = universityRagService.isUniversityIntent('What is Vignan University, Vadlamudi?');
    console.log('Is University Intent detected?:', isUni);
    const res3 = await universityRagService.query({
      question: 'What is Vignan University, Vadlamudi?',
      responseLength: 'balanced',
      sourcePreference: 'both',
    });
    console.log('Test 3 Success:', {
      success: res3.success,
      isVerifiedKnowledge: res3.isVerifiedKnowledge,
      citationsCount: res3.citations.length,
      answerSnippet: res3.answer.slice(0, 100),
    });
  } catch (err: any) {
    console.error('Test 3 FAILED:', err.message);
  }

  // Test 4: Question with limited/no search results
  console.log('\n--- TEST 4: Limited / Nonexistent Search Query ---');
  try {
    const res4 = await webResearchService.query({
      question: 'xyzqwe9876543210 nonexistentsubjectterm12345',
      sourcePreference: 'both',
      responseLength: 'balanced',
    });
    console.log('Test 4 Result:', {
      success: res4.success,
      noSourcesFound: res4.noSourcesFound,
      citationsCount: res4.citations.length,
      answerSnippet: res4.answer.slice(0, 100),
    });
  } catch (err: any) {
    console.error('Test 4 FAILED:', err.message);
  }

  // Test 5: Simulated Invalid API Key
  console.log('\n--- TEST 5: Simulated Invalid API Key ---');
  const mockAuthFailAI = createMockGenAI('', {
    throwError: {
      status: 400,
      message: 'API_KEY_INVALID: API key not valid. Please pass a valid API key.',
    },
  });
  geminiService.setClientForTesting(mockAuthFailAI, 'gemini-1.5-flash');
  researchResponseCache.clear();

  try {
    const res5 = await webResearchService.query({
      question: 'what is ai',
      sourcePreference: 'both',
      responseLength: 'balanced',
    });
    console.log('Test 5 returned answer despite invalid API key:', {
      model: res5.model,
      answerSnippet: res5.answer.slice(0, 80),
    });
  } catch (err: any) {
    console.log('Test 5 caught expected error:', err.constructor.name, err.message);
  }

  // Test 6: Simulated Provider Timeout
  console.log('\n--- TEST 6: Simulated Provider Timeout ---');
  const mockTimeoutAI = createMockGenAI('', {
    throwError: new GeminiTimeoutError('Gemini API request timed out after 30000ms.'),
  });
  geminiService.setClientForTesting(mockTimeoutAI, 'gemini-1.5-flash');
  researchResponseCache.clear();

  try {
    const res6 = await webResearchService.query({
      question: 'what is ai',
      sourcePreference: 'both',
      responseLength: 'balanced',
    });
    console.log('Test 6 returned answer despite timeout:', {
      model: res6.model,
      answerSnippet: res6.answer.slice(0, 80),
    });
  } catch (err: any) {
    console.log('Test 6 caught expected timeout error:', err.constructor.name, err.message);
  }

  // Test 7: Simulated Gemini Failure
  console.log('\n--- TEST 7: Simulated Gemini Service Failure ---');
  const mockCrashAI = createMockGenAI('', {
    throwError: new Error('Internal Generative AI service error 500: Model overloaded'),
  });
  geminiService.setClientForTesting(mockCrashAI, 'gemini-1.5-flash');
  researchResponseCache.clear();

  try {
    const res7 = await webResearchService.query({
      question: 'what is ai',
      sourcePreference: 'both',
      responseLength: 'balanced',
    });
    console.log('Test 7 returned answer despite Gemini failure:', {
      model: res7.model,
      answerSnippet: res7.answer.slice(0, 80),
    });
  } catch (err: any) {
    console.log('Test 7 caught expected failure:', err.constructor.name, err.message);
  }

  // Reset Gemini client
  geminiService.setClientForTesting(null);
  geminiService.reloadConfiguration();

  console.log('\n================================================================');
  console.log('🏁 DIAGNOSTICS COMPLETE');
  console.log('================================================================');
}

runAllDiagnostics().catch(console.error);
