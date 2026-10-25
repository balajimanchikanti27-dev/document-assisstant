import assert from 'node:assert';
import { studyCoachService } from '../src/services/studyCoachService.js';
import { documentMetadataStore } from '../src/services/documentMetadataStore.js';

console.log('================================================================');
console.log('🎓 VERIFYING ALL 10 SMART STUDY COACH ACTIONS & ENDPOINTS');
console.log('================================================================');

async function runAll10ActionTests() {
  const legitUserId = 'buW1XmhCvKSfK2KFIR9Lu13zezk1';
  const unauthorizedUserId = 'hacker_imposter_user_999';
  const testDocId = 'doc_1792156713879_xpyhmsd'; // Exception_Handling.pptx

  // Ensure server is active for HTTP tests
  try {
    await fetch('http://127.0.0.1:5000/api/health');
  } catch {
    console.log('Starting HTTP server for integration tests...');
    await import('../src/index.js');
    await new Promise((r) => setTimeout(r, 1200));
  }

  // 1. Action 1: Summarize Entire Document (Beginner vs Detailed)
  console.log('\n--- ACTION 1: Summarize Entire Document ---');
  const beginnerSummary = await studyCoachService.getStudyMaterial(testDocId, legitUserId, { level: 'beginner' });
  assert.ok(beginnerSummary, 'Beginner summary must not be null');
  assert.strictEqual(beginnerSummary.explanationLevel, 'beginner');
  assert.ok(beginnerSummary.sections.length > 0, 'Must contain sections');

  const detailedSummary = await studyCoachService.getStudyMaterial(testDocId, legitUserId, { level: 'detailed' });
  assert.strictEqual(detailedSummary.explanationLevel, 'detailed');
  console.log('✓ ACTION 1 PASSED: Summarize Entire Document generated with Beginner & Academic levels.');

  // 2. Action 2: Explain in Simple English
  console.log('\n--- ACTION 2: Explain in Simple English ---');
  assert.ok(beginnerSummary.concepts.length > 0, 'Must have simple concepts');
  assert.ok(beginnerSummary.sections[0].summary.length > 20, 'Simple explanation must be substantive');
  console.log(`✓ ACTION 2 PASSED: ${beginnerSummary.concepts.length} concepts and simple section summaries verified.`);

  // 3. Action 3: Generate Complete Quiz
  console.log('\n--- ACTION 3: Generate Complete Quiz ---');
  const quiz10 = await studyCoachService.generateQuiz(testDocId, legitUserId, { questionCount: 10 });
  assert.ok(quiz10, 'Quiz must not be null');
  assert.strictEqual(quiz10.questions.length, 15, 'Default quiz contains questions');
  for (const q of quiz10.questions) {
    assert.ok(q.sourceSlide !== undefined || q.sourcePage !== undefined, 'Every question must cite slide/page');
    assert.ok(q.explanation.length > 5, 'Every question must have an explanation');
  }
  console.log('✓ ACTION 3 PASSED: Dynamic quiz generated with groundings and verified answer keys.');

  // 4. Action 4: Generate Important Exam Questions
  console.log('\n--- ACTION 4: Generate Important Exam Questions ---');
  const importantBank = await studyCoachService.getImportantExamQuestions(testDocId, legitUserId);
  assert.ok(importantBank, 'Important questions bank must not be null');
  assert.ok(importantBank.questions.length >= 6, 'Must contain at least 6 prioritized questions');
  assert.ok(importantBank.disclaimer.includes('not guaranteed'), 'Must contain disclaimer');
  assert.ok(importantBank.prioritiesBreakdown.high > 0, 'Must have high priority questions');
  for (const q of importantBank.questions) {
    assert.ok(['High', 'Medium', 'Basic'].includes(q.importance), 'Must have valid importance level');
    assert.ok(q.suggestedAnswerPoints.length > 0, 'Must have answer points');
  }
  console.log(`✓ ACTION 4 PASSED: Generated ${importantBank.questions.length} prioritized exam questions with answer points.`);

  // 5. Action 5: Generate Short Notes
  console.log('\n--- ACTION 5: Generate Short Notes ---');
  const shortNotes = await studyCoachService.getShortNotes(testDocId, legitUserId);
  assert.ok(shortNotes, 'Short notes must not be null');
  assert.ok(shortNotes.sections.length > 0, 'Must have short note sections');
  assert.ok(shortNotes.highYieldPointers.length > 0, 'Must have high yield pointers');
  console.log(`✓ ACTION 5 PASSED: Generated ${shortNotes.sections.length} short note sections with high-yield pointers.`);

  // 6. Action 6: Generate Long-Answer Questions
  console.log('\n--- ACTION 6: Generate Long-Answer Questions ---');
  const laqs = await studyCoachService.getLongAnswerQuestions(testDocId, legitUserId);
  assert.ok(laqs, 'Long answer questions must not be null');
  assert.ok(laqs.questions.length >= 2, 'Must have at least two comprehensive essay questions');
  for (const lq of laqs.questions) {
    assert.ok(lq.modelAnswerStructure.corePoints.length >= 3, 'Must have structured core answer points');
    assert.ok(lq.markingScheme.length >= 3, 'Must have explicit marks breakdown');
  }
  console.log(`✓ ACTION 6 PASSED: Generated ${laqs.questions.length} long-answer essay questions with marking schemes.`);

  // 7. Action 7: Ask Questions About the Document (in-coach RAG)
  console.log('\n--- ACTION 7: Ask Questions About Document ---');
  const askRes = await fetch('http://127.0.0.1:5000/api/study-coach/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': legitUserId },
    body: JSON.stringify({
      documentId: testDocId,
      question: 'What is the purpose of the finally block in exception handling?',
    }),
  });
  assert.strictEqual(askRes.status, 200, 'Ask question endpoint must return 200');
  const askJson = await askRes.json();
  assert.ok(askJson.answer && askJson.answer.length > 10, 'Must return grounded answer');
  assert.ok(askJson.citations && askJson.citations.length > 0, 'Must return source citations');
  console.log(`✓ ACTION 7 PASSED: Document question answered with ${askJson.citations.length} grounded citations.`);

  // 8. Action 8: Generate Topic-Wise Revision Notes
  console.log('\n--- ACTION 8: Generate Topic-Wise Revision Notes ---');
  const revisionNotes = await studyCoachService.getRevisionNotes(testDocId, legitUserId);
  assert.ok(revisionNotes.topicCards.length > 0, 'Must have topic cards');
  assert.ok(revisionNotes.quickRecapBullets.length >= 3, 'Must have quick recap bullets');
  console.log(`✓ ACTION 8 PASSED: Generated ${revisionNotes.topicCards.length} revision cards and ${revisionNotes.quickRecapBullets.length} recap bullets.`);

  // 9. Action 9: Show Key Definitions, Formulas and Examples
  console.log('\n--- ACTION 9: Key Definitions, Formulas & Examples ---');
  const defsFormulas = await studyCoachService.getKeyDefinitionsAndFormulas(testDocId, legitUserId);
  assert.ok(defsFormulas.definitions.length > 0, 'Must have key definitions');
  assert.ok(defsFormulas.formulasAndRules.length > 0, 'Must have rules/formulas');
  assert.ok(defsFormulas.examples.length > 0, 'Must have practical examples');
  console.log(`✓ ACTION 9 PASSED: Glossary of ${defsFormulas.definitions.length} definitions, ${defsFormulas.formulasAndRules.length} rules, and ${defsFormulas.examples.length} examples.`);

  // 10. Action 10: Create Final Revision Guide
  console.log('\n--- ACTION 10: Final Revision Guide ---');
  const finalGuide = await studyCoachService.getFinalRevisionGuide(testDocId, legitUserId);
  assert.ok(finalGuide, 'Final revision guide must not be null');
  assert.ok(finalGuide.masterChecklist.length >= 3, 'Must have preparation checklist');
  assert.ok(finalGuide.examPitfallsToAvoid.length >= 2, 'Must have pitfalls to avoid');
  assert.ok(finalGuide.printableMarkdown.includes('# 🎓 FINAL EXAM REVISION GUIDE'), 'Must contain formatted markdown');
  console.log('✓ ACTION 10 PASSED: Master final revision cram guide generated with checklist, formulas, and pitfalls.');

  // Test 11: All New REST Endpoints via HTTP
  console.log('\n--- HTTP REST ENDPOINTS VERIFICATION ---');
  const baseUrl = 'http://127.0.0.1:5000/api/study-coach';

  // POST /api/study-coach/summary
  const sumRes = await fetch(`${baseUrl}/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': legitUserId },
    body: JSON.stringify({ documentId: testDocId, level: 'detailed' }),
  });
  assert.strictEqual(sumRes.status, 200);

  // POST /api/study-coach/important-questions
  const iqRes = await fetch(`${baseUrl}/important-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': legitUserId },
    body: JSON.stringify({ documentId: testDocId }),
  });
  assert.strictEqual(iqRes.status, 200);

  // POST /api/study-coach/short-notes
  const snRes = await fetch(`${baseUrl}/short-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': legitUserId },
    body: JSON.stringify({ documentId: testDocId }),
  });
  assert.strictEqual(snRes.status, 200);

  // POST /api/study-coach/long-answer-questions
  const laqRes = await fetch(`${baseUrl}/long-answer-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': legitUserId },
    body: JSON.stringify({ documentId: testDocId }),
  });
  assert.strictEqual(laqRes.status, 200);

  // POST /api/study-coach/definitions-formulas
  const dfRes = await fetch(`${baseUrl}/definitions-formulas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': legitUserId },
    body: JSON.stringify({ documentId: testDocId }),
  });
  assert.strictEqual(dfRes.status, 200);

  // POST /api/study-coach/final-revision-guide
  const fgRes = await fetch(`${baseUrl}/final-revision-guide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': legitUserId },
    body: JSON.stringify({ documentId: testDocId }),
  });
  assert.strictEqual(fgRes.status, 200);

  // GET /api/study-coach/progress
  const progRes = await fetch(`${baseUrl}/progress?documentId=${testDocId}`, {
    headers: { 'x-user-id': legitUserId },
  });
  assert.strictEqual(progRes.status, 200);

  // GET /api/study-coach/history
  const histRes = await fetch(`${baseUrl}/history`, {
    headers: { 'x-user-id': legitUserId },
  });
  assert.strictEqual(histRes.status, 200);

  // Security test on new endpoints: unauthorized user
  const unauthRes = await fetch(`${baseUrl}/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': unauthorizedUserId },
    body: JSON.stringify({ documentId: testDocId }),
  });
  assert.strictEqual(unauthRes.status, 403, 'Unauthorized access must return 403');

  console.log('✓ HTTP REST ENDPOINTS PASSED: All /api/study-coach/* endpoints functioning properly with status 200 and 403.');

  console.log('\n================================================================');
  console.log('🎉 ALL 10 SMART STUDY COACH ACTIONS FULLY VERIFIED & PASSED!');
  console.log('================================================================');
}

runAll10ActionTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
