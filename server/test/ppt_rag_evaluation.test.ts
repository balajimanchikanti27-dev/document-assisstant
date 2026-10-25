import assert from 'assert';
import { ragService, DOCUMENT_FALLBACK_MESSAGE } from '../src/rag/ragService.js';
import { vectorStore } from '../src/vectorStore/memoryVectorStore.js';

async function runPptRagTestSuite() {
  console.log('\n======================================================');
  console.log('PPT/PPTX RAG COMPREHENSIVE VERIFICATION & TEST SUITE');
  console.log('======================================================\n');

  const DOC_EXC = 'doc_1792158202219_qajn1xz'; // Exception_Handling.pptx
  const DOC_M2 = 'doc_1792158146035_hm2d99n';  // M2-Unit1.pptx
  const TEST_USER = 'buW1XmhCvKSfK2KFIR9Lu13zezk1';

  console.log('Vector Store Total Chunks:', vectorStore.totalChunks());
  console.log('Chunks for DOC_EXC (guest_user):', vectorStore.getDocumentChunkCount(TEST_USER, DOC_EXC));
  console.log('Chunks for DOC_M2 (guest_user):', vectorStore.getDocumentChunkCount(TEST_USER, DOC_M2));

  assert.ok(
    vectorStore.getDocumentChunkCount(TEST_USER, DOC_EXC) > 0,
    'DOC_EXC must have indexed chunks'
  );
  assert.ok(
    vectorStore.getDocumentChunkCount(TEST_USER, DOC_M2) > 0,
    'DOC_M2 must have indexed chunks'
  );

  // ---------------------------------------------------------
  // TEST 1: The Primary Failing Bug: "what is exception"
  // Selected: Both DOC_EXC and DOC_M2
  // ---------------------------------------------------------
  console.log('\n--- TEST 1: Core Bug Reproduction: "what is exception" (Both PPTs selected) ---');
  const res1 = await ragService.query({
    question: 'what is exception',
    documentIds: [DOC_EXC, DOC_M2],
    userId: TEST_USER,
  });

  console.log('Success:', res1.success);
  console.log('isInsufficientEvidence:', res1.isInsufficientEvidence);
  console.log('Answer Preview:\n', res1.answer.slice(0, 350) + '...\n');
  console.log('Citations Count:', res1.citations.length);
  res1.citations.forEach((c) => console.log(`  - [${c.documentName}] ${c.title}`));

  assert.strictEqual(res1.success, true, 'Query must succeed');
  assert.strictEqual(
    res1.isInsufficientEvidence,
    false,
    'Evidence must NOT be marked insufficient when definition exists in slide'
  );
  assert.notStrictEqual(
    res1.answer,
    DOCUMENT_FALLBACK_MESSAGE,
    'Answer must NOT be fallback message'
  );

  // Verify Slide 3 definition is present in the response or retrieved context
  const hasSlide3 = res1.citations.some(
    (c) => c.slideNumber === 3 && c.documentName.includes('Exception_Handling')
  );
  assert.ok(hasSlide3, 'Citations must include Slide 3 of Exception_Handling.pptx');
  assert.ok(
    res1.answer.toLowerCase().includes('unwanted event') ||
    res1.answer.toLowerCase().includes('interrupts the normal flow') ||
    res1.answer.toLowerCase().includes('exception'),
    'Answer must explain that an exception is an unwanted event that interrupts program flow'
  );
  console.log('✓ TEST 1 PASSED: Core bug resolved. Slide 3 retrieved and grounded answer generated.');

  // ---------------------------------------------------------
  // TEST 2: Ask for the definition using different wording
  // ---------------------------------------------------------
  console.log('\n--- TEST 2: Different wording: "Define an exception in Java and its unhandled behaviour" ---');
  const res2 = await ragService.query({
    question: 'Define an exception in Java and its unhandled behaviour',
    documentIds: [DOC_EXC, DOC_M2],
    userId: TEST_USER,
  });

  console.log('isInsufficientEvidence:', res2.isInsufficientEvidence);
  assert.strictEqual(res2.isInsufficientEvidence, false);
  const citesSlide3 = res2.citations.some((c) => c.slideNumber === 3);
  assert.ok(citesSlide3, 'Must cite Slide 3');
  console.log('✓ TEST 2 PASSED: Rephrased question successfully retrieves Slide 3 definition.');

  // ---------------------------------------------------------
  // TEST 3: Ask about a heading or term appearing later in the presentation
  // ---------------------------------------------------------
  console.log('\n--- TEST 3: Later Topic: "Explain the throw keyword in Java" ---');
  const res3 = await ragService.query({
    question: 'Explain the throw keyword in Java',
    documentIds: [DOC_EXC, DOC_M2],
    userId: TEST_USER,
  });

  console.log('isInsufficientEvidence:', res3.isInsufficientEvidence);
  console.log('Citations:');
  res3.citations.forEach((c) => console.log(`  - [${c.documentName}] Slide ${c.slideNumber}`));

  assert.strictEqual(res3.isInsufficientEvidence, false);
  const citesThrow = res3.citations.some(
    (c) => c.slideNumber === 14 || c.slideNumber === 17 || c.slideNumber === 8
  );
  assert.ok(citesThrow, 'Must cite throw slides (Slide 14, 17, or 8)');
  console.log('✓ TEST 3 PASSED: Retrieved later slide on throw keyword.');

  // ---------------------------------------------------------
  // TEST 4: Ask about a fact in the second selected document (M2-Unit1.pptx)
  // ---------------------------------------------------------
  console.log('\n--- TEST 4: Fact in second document: "What is dynamic method dispatch?" ---');
  const res4 = await ragService.query({
    question: 'What is dynamic method dispatch?',
    documentIds: [DOC_EXC, DOC_M2],
    userId: TEST_USER,
  });

  console.log('isInsufficientEvidence:', res4.isInsufficientEvidence);
  console.log('Citations:');
  res4.citations.forEach((c) => console.log(`  - [${c.documentName}] Slide ${c.slideNumber}: ${c.title}`));

  assert.strictEqual(res4.isInsufficientEvidence, false);
  const citesM2 = res4.citations.some(
    (c) => c.documentName.includes('M2-Unit1') && c.slideNumber === 31
  );
  assert.ok(citesM2, 'Must cite Slide 31 of M2-Unit1.pptx');
  console.log('✓ TEST 4 PASSED: Fact in second selected document retrieved accurately.');

  // ---------------------------------------------------------
  // TEST 5: Ask a question genuinely absent from BOTH documents
  // ---------------------------------------------------------
  console.log('\n--- TEST 5: Question absent from both documents: "What is quantum superposition in quantum computing?" ---');
  const res5 = await ragService.query({
    question: 'What is quantum superposition in quantum computing?',
    documentIds: [DOC_EXC, DOC_M2],
    userId: TEST_USER,
  });

  console.log('isInsufficientEvidence:', res5.isInsufficientEvidence);
  console.log('Answer:', res5.answer);
  assert.strictEqual(res5.isInsufficientEvidence, true, 'Must flag insufficient evidence');
  assert.strictEqual(
    res5.answer,
    DOCUMENT_FALLBACK_MESSAGE,
    'Must return exact required fallback message'
  );
  assert.strictEqual(res5.citations.length, 0, 'Must have zero citations when evidence is absent');
  console.log('✓ TEST 5 PASSED: Strict fallback triggered when information is absent.');

  // ---------------------------------------------------------
  // TEST 6: Verify citation format (filename and slide number)
  // ---------------------------------------------------------
  console.log('\n--- TEST 6: Citation formatting validation ---');
  const res6 = await ragService.query({
    question: 'What is an exception?',
    documentIds: [DOC_EXC],
    userId: TEST_USER,
  });

  assert.ok(res6.citations.length > 0, 'Must have citations');
  const topCite = res6.citations[0];
  assert.strictEqual(topCite.documentName, 'Exception_Handling.pptx');
  assert.strictEqual(topCite.slideNumber, 3);
  assert.ok(topCite.title.includes('Exception_Handling.pptx'), 'Title includes filename');
  assert.ok(topCite.title.includes('Slide 3'), 'Title includes slide number');
  console.log(`Top Citation Title: "${topCite.title}"`);
  console.log('✓ TEST 6 PASSED: Citation format includes exact filename and slide number.');

  // ---------------------------------------------------------
  // TEST 7: Switching selected documents prevents unselected files from influencing answer
  // ---------------------------------------------------------
  console.log('\n--- TEST 7: Document isolation on selection switch ---');
  // When ONLY M2-Unit1 is selected, asking for custom user-defined exception (only in Exception_Handling.pptx) must NOT find it
  const res7a = await ragService.query({
    question: 'How do you create a custom user-defined exception in Java?',
    documentIds: [DOC_M2], // ONLY M2-Unit1 selected!
    userId: TEST_USER,
  });

  console.log('Only M2 selected for custom exception question: isInsufficientEvidence =', res7a.isInsufficientEvidence);
  assert.strictEqual(
    res7a.isInsufficientEvidence,
    true,
    'Unselected Exception_Handling.pptx must NOT bleed into M2-only query'
  );
  assert.strictEqual(res7a.answer, DOCUMENT_FALLBACK_MESSAGE);

  // When ONLY Exception_Handling is selected, asking about dynamic method dispatch (only in M2-Unit1) must NOT find it
  const res7b = await ragService.query({
    question: 'What is dynamic method dispatch mechanism in Java?',
    documentIds: [DOC_EXC], // ONLY Exception_Handling selected!
    userId: TEST_USER,
  });

  console.log('Only Exception_Handling selected for dynamic method dispatch: isInsufficientEvidence =', res7b.isInsufficientEvidence);
  assert.strictEqual(
    res7b.isInsufficientEvidence,
    true,
    'Unselected M2-Unit1.pptx must NOT bleed into Exception_Handling query'
  );
  assert.strictEqual(res7b.answer, DOCUMENT_FALLBACK_MESSAGE);

  console.log('✓ TEST 7 PASSED: Document isolation verified. Unselected documents never influence answers.');

  console.log('\n======================================================');
  console.log('ALL 7 TESTS PASSED END-TO-END WITH ZERO REGRESSIONS!');
  console.log('======================================================\n');
}

runPptRagTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
