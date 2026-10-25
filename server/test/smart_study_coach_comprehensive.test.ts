import assert from 'node:assert';
import path from 'node:path';
import { studyCoachService } from '../src/services/studyCoachService.js';
import { documentMetadataStore } from '../src/services/documentMetadataStore.js';
import { ragService } from '../src/rag/ragService.js';
import { studySummaryService } from '../src/services/studySummaryService.js';

console.log('================================================================');
console.log('🎓 COMPREHENSIVE SMART STUDY COACH END-TO-END VERIFICATION');
console.log('================================================================');

async function runCoachTests() {
  const legitUserId = 'buW1XmhCvKSfK2KFIR9Lu13zezk1';
  const unauthorizedUserId = 'hacker_imposter_user_999';
  const testDocId = 'doc_1792156713879_xpyhmsd'; // Exception_Handling.pptx

  // Ensure HTTP server is active for test 8
  try {
    await fetch('http://127.0.0.1:5000/api/health');
  } catch {
    console.log('Starting HTTP server for integration tests...');
    await import('../src/index.js');
    await new Promise((r) => setTimeout(r, 1200));
  }

  // Step 0: Ensure test document exists and is registered to legit user
  if (!documentMetadataStore.isDocumentOwnedBy(testDocId, legitUserId)) {
    documentMetadataStore.registerDocument({
      id: testDocId,
      ownerId: legitUserId,
      filename: 'Exception_Handling.pptx',
      fileType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: '.pptx',
      sizeBytes: 5426,
      filePath: path.resolve(process.cwd(), 'uploads', 'documents', 'doc_exception_handling_v1_Exception_Handling.pptx'),
      status: 'ready',
      stage: 'indexed',
      chunkCount: 24,
    });
  }
  const isOwner = documentMetadataStore.isDocumentOwnedBy(testDocId, legitUserId);
  assert.strictEqual(isOwner, true, 'Test document must be owned by legit user');
  console.log('✓ TEST 0: Document ownership verified for legitimate user');

  // Test 1: Learn Simply & Important Concepts (Study Material)
  console.log('\n--- TEST 1: Learn Simply & Important Concepts ---');
  const studyMaterial = await studyCoachService.getStudyMaterial(testDocId, legitUserId);
  assert.ok(studyMaterial, 'Study material must not be null');
  assert.ok(studyMaterial.sections.length > 0, 'Must contain sections covering the document');
  assert.ok(studyMaterial.concepts.length > 0, 'Must contain key concepts/definitions');
  assert.ok(studyMaterial.sections[0].summary.length > 20, 'Section summary must be substantive');
  console.log(`✓ TEST 1 PASSED: Generated ${studyMaterial.sections.length} sections and ${studyMaterial.concepts.length} key concepts from ${studyMaterial.documentName}`);

  // Test 2: Quiz Generation - Exactly 10 MCQs and 5 Short Answer Questions Grounded in Document
  console.log('\n--- TEST 2: Generate Quiz (10 MCQs + 5 Short-Answer Questions) ---');
  const quiz = await studyCoachService.generateQuiz(testDocId, legitUserId);
  assert.ok(quiz, 'Quiz must not be null');
  assert.strictEqual(quiz.questions.length, 15, 'Quiz must contain exactly 15 questions');

  const mcqs = quiz.questions.filter((q) => q.type === 'mcq');
  const shortAnswers = quiz.questions.filter((q) => q.type === 'short_answer');

  assert.strictEqual(mcqs.length, 10, 'Must have exactly 10 multiple choice questions');
  assert.strictEqual(shortAnswers.length, 5, 'Must have exactly 5 short answer questions');

  // Verify options, answer keys, and slide references
  for (const mcq of mcqs) {
    assert.strictEqual(mcq.options?.length, 4, `MCQ ${mcq.id} must have exactly 4 choices`);
    assert.ok(
      mcq.correctOptionIndex !== undefined && mcq.correctOptionIndex >= 0 && mcq.correctOptionIndex <= 3,
      'Correct option index must be 0-3'
    );
    assert.ok(mcq.sourceSlide !== undefined || mcq.sourcePage !== undefined, 'MCQ must cite slide/page');
  }

  for (const sa of shortAnswers) {
    assert.ok(sa.expectedAnswer && sa.expectedAnswer.length > 0, 'Short answer must have expected answer');
    assert.ok(sa.acceptableKeywords && sa.acceptableKeywords.length > 0, 'Short answer must have keywords');
  }
  console.log('✓ TEST 2 PASSED: 10 MCQs and 5 Short Answers generated with correct groundings and slide references.');

  // Test 3: Take Quiz - Scoring, Mistake Explanations, Weak Topics
  console.log('\n--- TEST 3: Take Quiz & Explain Mistakes ---');
  // Form answers: answer 8 MCQs correctly, 2 incorrectly; answer 4 short answers correctly, 1 incorrectly
  const studentAnswers: Record<string, string | number> = {};

  // Answer first 8 MCQs correctly
  for (let i = 0; i < 8; i++) {
    const q = mcqs[i];
    if (q && q.correctOptionIndex !== undefined) {
      studentAnswers[q.id] = q.correctOptionIndex;
    }
  }
  // Answer next 2 MCQs incorrectly
  const mcq8 = mcqs[8];
  if (mcq8 && mcq8.correctOptionIndex !== undefined) {
    studentAnswers[mcq8.id] = (mcq8.correctOptionIndex + 1) % 4;
  }
  const mcq9 = mcqs[9];
  if (mcq9 && mcq9.correctOptionIndex !== undefined) {
    studentAnswers[mcq9.id] = (mcq9.correctOptionIndex + 2) % 4;
  }

  // Answer first 4 short answers correctly using keywords
  for (let i = 0; i < 4; i++) {
    const sa = shortAnswers[i];
    if (sa) {
      const kw = sa.acceptableKeywords?.[0] || sa.expectedAnswer || 'concept';
      studentAnswers[sa.id] = `In this document, ${kw} is essential.`;
    }
  }
  // Answer last short answer incorrectly
  const sa4 = shortAnswers[4];
  if (sa4) {
    studentAnswers[sa4.id] = 'Completely wrong answer about something unrelated';
  }

  const evaluation = await studyCoachService.submitQuiz(testDocId, legitUserId, quiz.id, studentAnswers);
  assert.ok(evaluation, 'Evaluation must be generated');
  assert.strictEqual(evaluation.totalQuestions, 15, 'Total questions evaluated must be 15');
  assert.strictEqual(evaluation.correctAnswers, 12, 'Expected 12 correct answers');
  assert.strictEqual(evaluation.scorePercentage, 80, 'Expected 80% score');
  assert.strictEqual(evaluation.evaluations.filter((e) => !e.isCorrect).length, 3, 'Expected 3 mistakes');

  // Verify mistake explanations contain slide reference
  const mistakes = evaluation.evaluations.filter((e) => !e.isCorrect);
  for (const m of mistakes) {
    assert.ok(m.explanation && m.explanation.length > 10, 'Mistake must include explanation');
    assert.ok(m.sourceReference, 'Mistake must provide source reference');
  }
  console.log(`✓ TEST 3 PASSED: Score evaluated as ${evaluation.correctAnswers}/${evaluation.totalQuestions} (${evaluation.scorePercentage}%). All 3 mistakes received clear explanations with references.`);

  // Test 4: My Weak Topics
  console.log('\n--- TEST 4: My Weak Topics Identification & Guidance ---');
  assert.ok(evaluation.weakTopics.length > 0, 'Weak topics must be identified from missed questions');
  for (const wt of evaluation.weakTopics) {
    assert.ok(wt.topicName, 'Weak topic must have a name');
    assert.ok(wt.recommendedRevision, 'Must have revision recommendation');
    assert.ok(wt.revisionSlides.length > 0, 'Must recommend specific slides to review');
  }
  console.log(`✓ TEST 4 PASSED: Identified ${evaluation.weakTopics.length} weak topics with specific slide revision guidance.`);

  // Test 5: Revision Notes
  console.log('\n--- TEST 5: Revision Notes Generation ---');
  const revisionNotes = await studyCoachService.getRevisionNotes(testDocId, legitUserId);
  assert.ok(revisionNotes, 'Revision notes must be returned');
  assert.ok(revisionNotes.quickRecapBullets.length >= 3, 'Must have quick recap bullets');
  assert.ok(revisionNotes.keyFormulasOrRules.length >= 2, 'Must have rules/formulas');
  assert.ok(revisionNotes.highYieldExamQuestions.length >= 4, 'Must have high-yield exam questions');
  console.log(`✓ TEST 5 PASSED: Generated ${revisionNotes.quickRecapBullets.length} recap points and ${revisionNotes.highYieldExamQuestions.length} exam Q&As.`);

  // Test 6: Progress Persistence across Sessions
  console.log('\n--- TEST 6: Progress Persistence ---');
  const progress = await studyCoachService.getProgress(testDocId, legitUserId);
  assert.ok(progress, 'Progress record must exist');
  assert.ok(progress.attempts.length >= 1, 'Attempt must be saved in persistence store');
  assert.strictEqual(progress.attempts[progress.attempts.length - 1].scorePercentage, 80, 'Persisted score matches 80%');

  const overall = await studyCoachService.getUserOverallProgress(legitUserId);
  assert.ok(overall.totalQuizzesTaken >= 1, 'Overall progress must record attempt');
  console.log(`✓ TEST 6 PASSED: Progress persisted. Total attempts: ${overall.totalQuizzesTaken}, average score: ${overall.averageScore}%.`);

  // Test 7: Unauthorized Access Protection
  console.log('\n--- TEST 7: Cross-User Authorization Protection ---');
  let rejectedCount = 0;

  try {
    await studyCoachService.getStudyMaterial(testDocId, unauthorizedUserId);
  } catch (err: any) {
    rejectedCount++;
    assert.ok(err.message.includes('not authorized'), 'Expected authorization error');
  }

  try {
    await studyCoachService.generateQuiz(testDocId, unauthorizedUserId);
  } catch (err: any) {
    rejectedCount++;
    assert.ok(err.message.includes('not authorized'), 'Expected authorization error');
  }

  try {
    await studyCoachService.getRevisionNotes(testDocId, unauthorizedUserId);
  } catch (err: any) {
    rejectedCount++;
    assert.ok(err.message.includes('not authorized'), 'Expected authorization error');
  }

  assert.strictEqual(rejectedCount, 3, 'All 3 unauthorized actions must be rejected');
  console.log('✓ TEST 7 PASSED: Imposter user strictly rejected from study materials, quiz generation, and revision notes.');

  // Test 8: HTTP API Endpoints via Express Backend
  console.log('\n--- TEST 8: HTTP REST Endpoints ---');
  const baseUrl = 'http://127.0.0.1:5000/api/coach';

  // Test GET study-material with x-user-id header
  const matRes = await fetch(`${baseUrl}/${testDocId}/study-material`, {
    headers: { 'x-user-id': legitUserId },
  });
  assert.strictEqual(matRes.status, 200, 'HTTP study-material endpoint must return 200');
  const matJson = await matRes.json();
  assert.ok(matJson.studyMaterial, 'Response must have studyMaterial');

  // Test GET unauthorized study-material
  const unauthRes = await fetch(`${baseUrl}/${testDocId}/study-material`, {
    headers: { 'x-user-id': unauthorizedUserId },
  });
  assert.strictEqual(unauthRes.status, 403, 'Unauthorized HTTP request must return 403');

  // Test GET revision-notes
  const revRes = await fetch(`${baseUrl}/${testDocId}/revision-notes`, {
    headers: { 'x-user-id': legitUserId },
  });
  assert.strictEqual(revRes.status, 200, 'HTTP revision-notes endpoint must return 200');
  const revJson = await revRes.json();
  assert.ok(revJson.revisionNotes, 'Response must have revisionNotes');

  // Test GET progress
  const progRes = await fetch(`${baseUrl}/${testDocId}/progress`, {
    headers: { 'x-user-id': legitUserId },
  });
  assert.strictEqual(progRes.status, 200, 'HTTP progress endpoint must return 200');
  const progJson = await progRes.json();
  assert.ok(progJson.progress, 'Response must have progress');
  console.log('✓ TEST 8 PASSED: All REST API endpoints functioning properly with status codes 200 and 403.');

  console.log('\n================================================================');
  console.log('🎉 ALL SMART STUDY COACH TESTS PASSED WITH ZERO REGRESSIONS!');
  console.log('================================================================');
}

runCoachTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
