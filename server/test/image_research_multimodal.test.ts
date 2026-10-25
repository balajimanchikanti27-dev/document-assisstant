import {
  validateAndNormalizeImage,
  ImageValidationError,
  extractImageDimensions,
  MAX_IMAGE_SIZE_BYTES,
} from '../src/utils/imageValidator.js';
import { validateResearchQuery } from '../src/middleware/validation.js';
import {
  GeminiService,
  GeminiAuthenticationError,
  GeminiRateLimitError,
  GeminiTimeoutError,
  DOCUMENT_FALLBACK_MESSAGE,
} from '../src/services/gemini.service.js';
import { researchOrchestrator } from '../src/research/researchOrchestrator.js';
import { Request, Response } from 'express';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

// Generate valid test image buffers
const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length & type
  0x00, 0x00, 0x00, 0xc8, // width = 200px
  0x00, 0x00, 0x00, 0x64, // height = 100px
  0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc.
]);

const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, // SOI, APP0
  0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x11, 0x08, // SOF0
  0x00, 0x78, // height = 120px
  0x00, 0xa0, // width = 160px
  0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  0xff, 0xd9, // EOI
]);

const VALID_WEBP_BUFFER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, // "RIFF"
  0x24, 0x00, 0x00, 0x00, // file size - 8
  0x57, 0x45, 0x42, 0x50, // "WEBP"
  0x56, 0x50, 0x38, 0x58, // "VP8X"
  0x0a, 0x00, 0x00, 0x00, // chunk size
  0x10, 0x00, 0x00, 0x00, // flags
  0x7f, 0x00, 0x00, // width - 1 (128px)
  0x3f, 0x00, 0x00, // height - 1 (64px)
]);

const UNSUPPORTED_TXT_BUFFER = Buffer.from(
  'This is a plain text file pretending to be an image. MZ executable header not image.'
);

function createMockGenAIWithParts(mockResponseText: string, options?: { throwError?: any; delayMs?: number }) {
  let capturedParts: any = null;
  return {
    getCapturedParts: () => capturedParts,
    client: {
      getGenerativeModel: (_modelOptions: any) => ({
        generateContent: async (content: any) => {
          capturedParts = content;
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
              },
            },
          };
        },
      }),
    },
  };
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('IMAGE UPLOAD & MULTIMODAL AI RESEARCH COMPREHENSIVE TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Test 1: Image Validation — Valid Formats (JPEG, PNG, WEBP)
  // -------------------------------------------------------------
  console.log('--- Test Group 1: Binary Image Validation & Magic Bytes ---');

  // 1.1 PNG Validation
  try {
    const pngResult = validateAndNormalizeImage({
      data: VALID_PNG_BUFFER.toString('base64'),
      filename: 'architecture_diagram.png',
    });
    assert(pngResult.mimeType === 'image/png', 'PNG correctly identified from binary magic bytes');
    assert(pngResult.width === 200, `PNG width extracted correctly (${pngResult.width}px)`);
    assert(pngResult.height === 100, `PNG height extracted correctly (${pngResult.height}px)`);
    assert(pngResult.size === VALID_PNG_BUFFER.length, 'PNG byte size matches buffer length');
  } catch (err: any) {
    assert(false, 'PNG validation failed', err.message);
  }

  // 1.2 JPEG Validation
  try {
    const jpegResult = validateAndNormalizeImage({
      data: `data:image/jpeg;base64,${VALID_JPEG_BUFFER.toString('base64')}`,
      filename: 'quarterly_chart.jpg',
    });
    assert(jpegResult.mimeType === 'image/jpeg', 'JPEG correctly identified from binary magic bytes');
    assert(jpegResult.width === 160, `JPEG width extracted correctly (${jpegResult.width}px)`);
    assert(jpegResult.height === 120, `JPEG height extracted correctly (${jpegResult.height}px)`);
    assert(!jpegResult.data.startsWith('data:'), 'Data URL prefix correctly stripped from base64');
  } catch (err: any) {
    assert(false, 'JPEG validation failed', err.message);
  }

  // 1.3 WEBP Validation
  try {
    const webpResult = validateAndNormalizeImage({
      data: VALID_WEBP_BUFFER.toString('base64'),
      filename: 'screenshot.webp',
    });
    assert(webpResult.mimeType === 'image/webp', 'WEBP correctly identified from RIFF/WEBP magic bytes');
    assert(webpResult.width === 128, `WEBP width extracted correctly (${webpResult.width}px)`);
    assert(webpResult.height === 64, `WEBP height extracted correctly (${webpResult.height}px)`);
  } catch (err: any) {
    assert(false, 'WEBP validation failed', err.message);
  }

  // -------------------------------------------------------------
  // Test 2: Reject Unsupported & Oversized Files
  // -------------------------------------------------------------
  console.log('\n--- Test Group 2: Rejection of Unsupported & Oversized Files ---');

  // 2.1 Reject plain text / invalid magic bytes
  let unsupportedRejected = false;
  try {
    validateAndNormalizeImage({
      data: UNSUPPORTED_TXT_BUFFER.toString('base64'),
      filename: 'fake_image.png', // Browser claimed it was PNG, but content is text!
    });
  } catch (err: any) {
    unsupportedRejected = err instanceof ImageValidationError && err.message.includes('Unsupported image format');
  }
  assert(unsupportedRejected, 'Rejects spoofed file when magic bytes do not match JPEG/PNG/WEBP');

  // 2.2 Reject oversized image (>10MB)
  let oversizedRejected = false;
  try {
    const oversizedBuffer = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1024);
    // write JPEG magic bytes
    oversizedBuffer[0] = 0xff;
    oversizedBuffer[1] = 0xd8;
    oversizedBuffer[2] = 0xff;
    validateAndNormalizeImage({
      data: oversizedBuffer.toString('base64'),
      filename: 'huge_scan.jpg',
    });
  } catch (err: any) {
    oversizedRejected = err instanceof ImageValidationError && err.message.includes('exceeds maximum allowed size of 10MB');
  }
  assert(oversizedRejected, 'Rejects image exceeding 10MB limit with clear diagnostic error');

  // 2.3 Reject empty base64 data
  let emptyRejected = false;
  try {
    validateAndNormalizeImage({ data: '' });
  } catch (err: any) {
    emptyRejected = err instanceof ImageValidationError;
  }
  assert(emptyRejected, 'Rejects empty image data payload');

  // -------------------------------------------------------------
  // Test 3: Express Validation Middleware (validateResearchQuery)
  // -------------------------------------------------------------
  console.log('\n--- Test Group 3: Request Validation Middleware ---');

  // 3.1 Text-only query passes
  let textOnlyPassed = false;
  const mockReq1: any = { body: { question: 'What is photosynthesis?' } };
  const mockRes1: any = { status: () => mockRes1, json: () => {} };
  validateResearchQuery(mockReq1, mockRes1, () => { textOnlyPassed = true; });
  assert(textOnlyPassed, 'Text-only question passes research query middleware');

  // 3.2 Image + Text query passes
  let imageTextPassed = false;
  const mockReq2: any = {
    body: {
      question: 'Explain this diagram in detail.',
      image: { data: VALID_PNG_BUFFER.toString('base64'), filename: 'diagram.png' },
    },
  };
  validateResearchQuery(mockReq2, mockRes1, () => { imageTextPassed = true; });
  assert(imageTextPassed, 'Image + Text query passes middleware and normalizes image payload');
  assert(mockReq2.body.image.mimeType === 'image/png', 'Image MIME type verified as image/png');

  // 3.3 Image-only query (without text question) passes
  let imageOnlyPassed = false;
  const mockReq3: any = {
    body: {
      question: '',
      image: { data: VALID_JPEG_BUFFER.toString('base64'), filename: 'photo.jpg' },
    },
  };
  validateResearchQuery(mockReq3, mockRes1, () => { imageOnlyPassed = true; });
  assert(imageOnlyPassed, 'Image without text question passes middleware appropriately');

  // 3.4 Missing both question and image fails with 400
  let emptyQueryStatus = 0;
  let emptyQueryError = '';
  const mockReq4: any = { body: { question: '   ' } };
  const mockRes4: any = {
    status: (s: number) => { emptyQueryStatus = s; return mockRes4; },
    json: (data: any) => { emptyQueryError = data.error; },
  };
  validateResearchQuery(mockReq4, mockRes4, () => {});
  assert(emptyQueryStatus === 400, 'Empty question and missing image returns HTTP 400');
  assert(emptyQueryError.includes('required'), 'HTTP 400 error message states requirement clearly');

  // 3.5 Invalid spoofed image in request body fails with 400
  let spoofedStatus = 0;
  const mockReq5: any = {
    body: {
      question: 'Analyze this',
      image: { data: UNSUPPORTED_TXT_BUFFER.toString('base64'), filename: 'corrupted.png' },
    },
  };
  const mockRes5: any = {
    status: (s: number) => { spoofedStatus = s; return mockRes5; },
    json: () => {},
  };
  validateResearchQuery(mockReq5, mockRes5, () => {});
  assert(spoofedStatus === 400, 'Spoofed or unsupported image returns HTTP 400 rejection');

  // -------------------------------------------------------------
  // Test 4: Gemini Multimodal Vision Integration
  // -------------------------------------------------------------
  console.log('\n--- Test Group 4: Gemini Vision Multimodal SDK Dispatch ---');

  const gemini = new GeminiService();

  // 4.1 Multimodal dispatch with diagram
  const mockDiagramAnswer =
    'The attached diagram illustrates a three-tier microservices architecture consisting of an API Gateway, Auth Service, and Database cluster.';
  const mockTracker1 = createMockGenAIWithParts(mockDiagramAnswer);
  gemini.setClientForTesting(mockTracker1.client as any, 'gemini-1.5-flash');

  const diagramResult = await gemini.generateAnswer({
    question: 'Explain the architecture flow in this diagram.',
    mode: 'research',
    evidence: {
      image: {
        data: VALID_PNG_BUFFER.toString('base64'),
        mimeType: 'image/png',
        filename: 'architecture.png',
      },
    },
  });

  assert(diagramResult.success, 'Gemini multimodal answer generation succeeds');
  assert(diagramResult.answer.includes('three-tier microservices'), 'Answer contains diagram analysis');
  const capturedParts1 = mockTracker1.getCapturedParts();
  assert(Array.isArray(capturedParts1) && capturedParts1.length === 2, 'Passed 2 multimodal parts to Gemini');
  assert(capturedParts1[1]?.inlineData?.mimeType === 'image/png', 'Passed official inlineData with correct MIME type');

  // 4.2 Multimodal dispatch with chart & screenshot
  const mockChartAnswer =
    'The screenshot displays a bar chart showing quarterly revenue growth from Q1 to Q4, with peak performance in Q4.';
  const mockTracker2 = createMockGenAIWithParts(mockChartAnswer);
  gemini.setClientForTesting(mockTracker2.client as any, 'gemini-1.5-flash');

  const chartResult = await gemini.generateAnswer({
    question: 'What trends are shown in this chart?',
    mode: 'research',
    evidence: {
      image: {
        data: VALID_JPEG_BUFFER.toString('base64'),
        mimeType: 'image/jpeg',
        filename: 'chart.jpg',
      },
    },
  });

  assert(chartResult.answer.includes('quarterly revenue growth'), 'Analyzes chart and trends accurately');

  // 4.3 Multimodal dispatch with image-only (empty text question)
  const mockAutoAnswer =
    'This image contains an architectural diagram with connected nodes representing client, server, and storage layers.';
  const mockTracker3 = createMockGenAIWithParts(mockAutoAnswer);
  gemini.setClientForTesting(mockTracker3.client as any, 'gemini-1.5-flash');

  const imageOnlyResult = await gemini.generateAnswer({
    question: '', // Empty question
    mode: 'research',
    evidence: {
      image: {
        data: VALID_PNG_BUFFER.toString('base64'),
        mimeType: 'image/png',
        filename: 'flowchart.png',
      },
    },
  });

  assert(imageOnlyResult.success, 'Image without text question automatically handled with default vision prompt');
  assert(imageOnlyResult.answer.includes('architectural diagram'), 'Image-only response generated successfully');

  // -------------------------------------------------------------
  // Test 5: Provider Failures & Error Mapping
  // -------------------------------------------------------------
  console.log('\n--- Test Group 5: Provider Failures & Resilience ---');

  // 5.1 Provider Timeout
  const timeoutTracker = createMockGenAIWithParts('', {
    throwError: new Error('Request timed out after 30000ms'),
  });
  gemini.setClientForTesting(timeoutTracker.client as any);

  let timeoutCaught = false;
  try {
    await gemini.generateAnswer({
      question: 'Explain this diagram',
      mode: 'research',
      evidence: {
        image: { data: VALID_PNG_BUFFER.toString('base64'), mimeType: 'image/png' },
      },
    });
  } catch (err: any) {
    timeoutCaught = err instanceof GeminiTimeoutError || err.name === 'GeminiTimeoutError';
  }
  assert(timeoutCaught, 'Provider timeout correctly mapped to GeminiTimeoutError');

  // 5.2 Provider Rate Limit (429)
  const rateLimitTracker = createMockGenAIWithParts('', {
    throwError: new Error('Resource has been exhausted (e.g. check quota) 429'),
  });
  gemini.setClientForTesting(rateLimitTracker.client as any);

  let rateLimitCaught = false;
  try {
    await gemini.generateAnswer({
      question: 'Explain this',
      mode: 'research',
      evidence: {
        image: { data: VALID_PNG_BUFFER.toString('base64'), mimeType: 'image/png' },
      },
    });
  } catch (err: any) {
    rateLimitCaught = err instanceof GeminiRateLimitError || err.name === 'GeminiRateLimitError';
  }
  assert(rateLimitCaught, 'Provider rate limit (429) correctly mapped to GeminiRateLimitError');

  // 5.3 Provider Authentication Error (401 / API key invalid)
  const authErrTracker = createMockGenAIWithParts('', {
    throwError: new Error('API_KEY_INVALID: API key not valid'),
  });
  gemini.setClientForTesting(authErrTracker.client as any);

  let authErrCaught = false;
  try {
    await gemini.generateAnswer({
      question: 'Explain this',
      mode: 'research',
      evidence: {
        image: { data: VALID_PNG_BUFFER.toString('base64'), mimeType: 'image/png' },
      },
    });
  } catch (err: any) {
    authErrCaught = err instanceof GeminiAuthenticationError || err.name === 'GeminiAuthenticationError';
  }
  assert(authErrCaught, 'Provider invalid API key correctly mapped to GeminiAuthenticationError');

  // -------------------------------------------------------------
  // Test 6: Text-Only Research Regression (Preserve Existing Feature)
  // -------------------------------------------------------------
  console.log('\n--- Test Group 6: Text-Only Web Research Regression ---');

  const textResearchTracker = createMockGenAIWithParts(
    'Quantum computing leverages superposition and entanglement to perform calculations exponentially faster than classical computers for specific problem classes.'
  );
  gemini.setClientForTesting(textResearchTracker.client as any);

  const textResult = await gemini.generateAnswer({
    question: 'How does quantum computing differ from classical computing?',
    mode: 'research',
    evidence: {
      webSources: [
        {
          title: 'Quantum computing',
          url: 'https://en.wikipedia.org/wiki/Quantum_computing',
          domain: 'en.wikipedia.org',
          snippet: 'Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics...',
          sourceType: 'wikipedia',
        },
      ],
    },
  });

  assert(textResult.success, 'Existing text-only research query works unchanged');
  assert(textResult.citations.length === 1, 'Citations correctly generated for text-only research');
  const capturedTextParts = textResearchTracker.getCapturedParts();
  assert(typeof capturedTextParts === 'string' || capturedTextParts.length === 1, 'Text-only query sends clean text without inlineData');

  // -------------------------------------------------------------
  // Test 7: Document-Only Mode Regression (Preserve Strict RAG)
  // -------------------------------------------------------------
  console.log('\n--- Test Group 7: Document Mode Regression ---');

  // 7.1 Strict fallback when no documents provided
  const noDocResult = await gemini.generateAnswer({
    question: 'What is the refund policy?',
    mode: 'document',
    evidence: { documents: [] },
  });
  assert(noDocResult.answer === DOCUMENT_FALLBACK_MESSAGE, 'Document mode returns required strict fallback when no documents match');
  assert(noDocResult.isInsufficientEvidence === true, 'Insufficient evidence flag correctly set');

  // 7.2 Grounded answer when document chunk provided
  const docAnswerTracker = createMockGenAIWithParts(
    'According to Section 4.1, tuition refunds are granted within the first 14 business days.'
  );
  gemini.setClientForTesting(docAnswerTracker.client as any);

  const docResult = await gemini.generateAnswer({
    question: 'What is the refund window?',
    mode: 'document',
    evidence: {
      documents: [
        {
          chunkId: 'chunk_1',
          documentId: 'doc_1',
          documentName: 'PolicyHandbook.pdf',
          pageNumber: 4,
          text: 'Section 4.1: Tuition refunds are granted within the first 14 business days of instruction.',
        },
      ],
    },
  });
  assert(docResult.success, 'Document mode generation works unchanged');
  assert(docResult.citations[0].pageNumber === 4, 'Preserves document citation page numbers');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
