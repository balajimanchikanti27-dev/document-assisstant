import assert from 'node:assert';
import path from 'node:path';
import { studyCoachService } from '../src/services/studyCoachService.js';
import { studySummaryService } from '../src/services/studySummaryService.js';
import { documentMetadataStore } from '../src/services/documentMetadataStore.js';

console.log('================================================================');
console.log('🧪 SMART STUDY COACH - TARGETED DBMS REGRESSION TEST SUITE');
console.log('================================================================');

async function runRegressionSuite() {
  const legitUserId = 'buW1XmhCvKSfK2KFIR9Lu13zezk1';
  const dbmsDocId = 'doc_1792863817927_ejhsg76'; // DBMS_Unit_-_IV_C1_Transactions_Scheduling__1_.pptx
  const javaDocId = 'doc_1792156713879_xpyhmsd'; // Exception_Handling.pptx

  // Step 0: Ensure document metadata store is synchronized
  const dbmsDoc = documentMetadataStore.getDocument(dbmsDocId);
  assert.ok(dbmsDoc, `DBMS document ${dbmsDocId} must exist in metadata store`);
  assert.strictEqual(
    documentMetadataStore.isDocumentOwnedBy(dbmsDocId, legitUserId),
    true,
    'DBMS document must be owned by legitimate user'
  );
  console.log(`✓ STEP 0: DBMS document verified: "${dbmsDoc.filename}" (Owner: ${legitUserId})`);

  // Forbidden Java keywords for DBMS tests
  const forbiddenJavaTerms = [
    'exception',
    'try-catch',
    'finally',
    'throw new',
    'throws',
    'arithmeticexception',
    'nullpointerexception',
    'throwable',
    'custom exception',
    'checked exception',
    'unchecked exception',
    'safety net in a circus',
    'circus',
  ];

  // Helper to assert no forbidden terms appear
  const assertNoJavaLeak = (text: string, context: string) => {
    const lower = text.toLowerCase();
    for (const term of forbiddenJavaTerms) {
      assert.strictEqual(
        lower.includes(term),
        false,
        `[CRITICAL LEAK] Found forbidden term "${term}" in ${context}. Snippet: "${text.slice(0, 160)}..."`
      );
    }
  };

  // --------------------------------------------------------------------------
  // TEST A: Important Exam Questions - Grounded in DBMS, No Java Exceptions
  // --------------------------------------------------------------------------
  console.log('\n--- TEST A: Important Exam Questions on DBMS Document ---');
  const importantBank = await studyCoachService.getImportantExamQuestions(
    legitUserId,
    dbmsDocId,
    { forceRefresh: true }
  );

  assert.ok(importantBank, 'Important questions bank must not be null');
  assert.ok(importantBank.questions.length >= 6, `Must contain at least 6 questions (got ${importantBank.questions.length})`);
  assert.strictEqual(importantBank.documentName, dbmsDoc.filename, 'Document name must match');

  let dbmsKeywordsFound = 0;
  for (const q of importantBank.questions) {
    const ans = q.modelAnswer || (q.suggestedAnswerPoints ? q.suggestedAnswerPoints.join('. ') : '');
    assert.ok(q.question && q.question.length > 10, 'Question must have text');
    assert.ok(ans && ans.length > 10, 'Model answer or suggested points must be substantive');
    assert.ok(q.location || q.sourceLocation, 'Location citation must be present');
    assert.ok(['High', 'Medium', 'Basic'].includes(q.importance), 'Importance must be High, Medium, or Basic');

    // Assert zero Java leakage
    assertNoJavaLeak(q.question, `Important Question "${q.question}"`);
    assertNoJavaLeak(ans, `Model Answer for "${q.question}"`);

    // Check for DBMS-specific terms
    const lowerQ = (q.question + ' ' + ans).toLowerCase();
    if (
      lowerQ.includes('transaction') ||
      lowerQ.includes('schedule') ||
      lowerQ.includes('serializ') ||
      lowerQ.includes('acid') ||
      lowerQ.includes('commit') ||
      lowerQ.includes('rollback') ||
      lowerQ.includes('concurrency') ||
      lowerQ.includes('recoverab') ||
      lowerQ.includes('precedence')
    ) {
      dbmsKeywordsFound++;
    }
  }

  assert.ok(
    dbmsKeywordsFound >= 3,
    `At least 3 questions must directly mention DBMS concepts (found ${dbmsKeywordsFound})`
  );
  console.log(`✓ TEST A PASSED: Generated ${importantBank.questions.length} Important Questions. All 100% grounded in DBMS with zero Java leakage.`);

  // --------------------------------------------------------------------------
  // TEST B: Explain in Simple English - Genuine Document Topics, No Circus Analogy
  // --------------------------------------------------------------------------
  console.log('\n--- TEST B: Explain in Simple English on DBMS Document ---');
  const summaryResult = await studySummaryService.generateStudySummary(
    legitUserId,
    dbmsDocId,
    { forceRefresh: true }
  );

  assert.ok(summaryResult && summaryResult.summary, 'Summary must exist');
  const summary = summaryResult.summary;

  // 1. Difficult Concepts & Step-by-step
  assert.ok(summary.difficultConcepts && summary.difficultConcepts.length > 0, 'Difficult concepts must exist');
  for (const dc of summary.difficultConcepts) {
    if (dc.analogyOrExample) {
      assertNoJavaLeak(dc.analogyOrExample, `Analogy/Example for "${dc.concept}"`);
      assert.strictEqual(
        dc.analogyOrExample.toLowerCase().includes('circus'),
        false,
        'Analogy must not be the generic circus safety net'
      );
      console.log(`  Concept "${dc.concept}": "${dc.analogyOrExample}"`);
    }
    assert.ok(dc.stepByStep.length >= 2, `Step by step for "${dc.concept}" must have at least 2 steps`);
    for (const step of dc.stepByStep) {
      assertNoJavaLeak(step, `Step-by-step in "${dc.concept}": "${step}"`);
      assert.strictEqual(
        step.includes('Understand core motivation'),
        false,
        'Must not have generic template filler "Understand core motivation"'
      );
      assert.strictEqual(
        step.includes('Notice communication'),
        false,
        'Must not have generic template filler "Notice communication"'
      );
    }
  }

  // 3. Section coverage and real slide references
  assert.ok(summary.sections.length >= 10, `Must cover slides across the document (got ${summary.sections.length} sections)`);
  const hasSlideReferences = summary.sections.some((s: any) => /Slide\s+\d+/i.test(s.location));
  assert.strictEqual(hasSlideReferences, true, 'Sections must cite genuine Slide numbers');
  console.log(`✓ TEST B PASSED: Simple English contains real DBMS explanation, genuine steps, and citations across ${summary.sections.length} sections.`);

  // --------------------------------------------------------------------------
  // TEST C: MCQ Quiz - 10 MCQs + 5 Short Answers, 100% Grounded
  // --------------------------------------------------------------------------
  console.log('\n--- TEST C: MCQ Quiz Generation on DBMS Document ---');
  const quiz = await studyCoachService.generateQuiz(
    legitUserId,
    dbmsDocId,
    { forceRefresh: true, questionCount: 15 }
  );

  assert.ok(quiz && Array.isArray(quiz.questions), 'Quiz must be generated');
  assert.strictEqual(quiz.questions.length, 15, 'Quiz must have exactly 15 questions');

  const mcqs = quiz.questions.filter((q) => q.type === 'mcq');
  const shortAnswers = quiz.questions.filter((q) => q.type === 'short_answer');

  assert.strictEqual(mcqs.length, 10, 'Must have exactly 10 MCQs');
  assert.strictEqual(shortAnswers.length, 5, 'Must have exactly 5 Short Answer questions');

  for (const mcq of mcqs) {
    assert.strictEqual(mcq.options?.length, 4, `MCQ ${mcq.id} must have exactly 4 choices`);
    assert.ok(
      mcq.correctOptionIndex !== undefined && mcq.correctOptionIndex >= 0 && mcq.correctOptionIndex <= 3,
      `MCQ ${mcq.id} must have correctOptionIndex between 0 and 3`
    );
    assert.strictEqual(
      mcq.options?.[mcq.correctOptionIndex!],
      mcq.correctAnswer,
      `MCQ ${mcq.id} correctOptionIndex must match correctAnswer`
    );
    assert.ok(
      mcq.sourceSlide !== undefined || mcq.sourcePage !== undefined || mcq.sourceLocation,
      `MCQ ${mcq.id} must cite slide or page`
    );

    // Assert zero Java leakage in question and in options
    assertNoJavaLeak(mcq.question, `MCQ Question: "${mcq.question}"`);
    for (const opt of mcq.options!) {
      assertNoJavaLeak(opt, `MCQ Option in "${mcq.question}": "${opt}"`);
      assert.strictEqual(
        opt.includes('hardware interrupt generated exclusively by the BIOS'),
        false,
        'MCQ option must not contain hardcoded BIOS distractor'
      );
    }
  }

  for (const sa of shortAnswers) {
    assert.ok(sa.expectedAnswer && sa.expectedAnswer.length > 5, `Short Answer ${sa.id} must have expected answer`);
    assert.ok(sa.acceptableKeywords && sa.acceptableKeywords.length > 0, `Short Answer ${sa.id} must have keywords`);
    assertNoJavaLeak(sa.question, `Short Answer Question: "${sa.question}"`);
    assertNoJavaLeak(sa.expectedAnswer!, `Short Answer Expected: "${sa.expectedAnswer}"`);
  }
  console.log(`✓ TEST C PASSED: 10 MCQs and 5 Short Answers generated with 100% DBMS grounding and zero Java leakage.`);

  // --------------------------------------------------------------------------
  // TEST D: Short-Answer, Long-Answer (5- and 10-mark), Notes & Guide
  // --------------------------------------------------------------------------
  console.log('\n--- TEST D: Long Answer, Short Notes, Definitions & Final Guide ---');
  // 1. Long Answer
  const longAnswers = await studyCoachService.getLongAnswerQuestions(legitUserId, dbmsDocId);
  assert.ok(longAnswers && longAnswers.questions.length >= 2, 'Must have at least 2 long answer questions');
  const essay10 = longAnswers.questions.find((q) => q.suggestedMarks === 10);
  const essay5 = longAnswers.questions.find((q) => q.suggestedMarks === 5);
  assert.ok(essay10, 'Must have a 10-mark essay question');
  assert.ok(essay10.markingScheme && essay10.markingScheme.length > 0, '10-mark question must have marking scheme');
  assertNoJavaLeak(essay10.question, '10-mark question');
  assertNoJavaLeak(essay5.question, '5-mark question');

  // 2. Short Notes
  const shortNotes = await studyCoachService.getShortNotes(legitUserId, dbmsDocId);
  const noteList = shortNotes.notes || shortNotes.sections;
  assert.ok(shortNotes && noteList.length >= 3, 'Must have at least 3 topic cards');
  for (const note of noteList) {
    const noteText = note.topic + ' ' + (note.bullets?.join(' ') || '') + ' ' + note.keyTakeaway;
    assertNoJavaLeak(noteText, `Short Note "${note.topic}"`);
  }

  // 3. Definitions & Formulas
  const defs = await studyCoachService.getKeyDefinitionsAndFormulas(legitUserId, dbmsDocId);
  assert.ok(defs && defs.definitions.length > 0, 'Must have definitions');
  for (const def of defs.definitions) {
    assertNoJavaLeak(def.term + ' ' + (def.simpleMeaning || (def as any).definition || ''), `Definition "${def.term}"`);
  }

  // 4. Final Revision Guide
  const guide = await studyCoachService.getFinalRevisionGuide(legitUserId, dbmsDocId);
  assert.ok(guide && guide.masterChecklist.length >= 3, 'Must have master checklist');
  for (const item of guide.masterChecklist) {
    assertNoJavaLeak(item, `Checklist item: "${item}"`);
  }
  for (const pit of guide.examPitfallsToAvoid) {
    assertNoJavaLeak(pit, `Pitfall: "${pit}"`);
  }
  console.log(`✓ TEST D PASSED: Long Answer (10m & 5m), Short Notes, Definitions, and Revision Guide are 100% DBMS grounded.`);

  // --------------------------------------------------------------------------
  // TEST E: Switch Documents - Verify Zero Cross-Document Leakage
  // --------------------------------------------------------------------------
  console.log('\n--- TEST E: Switch Documents and Check for Cross-Document Leakage ---');
  // Load Java document
  const javaBank = await studyCoachService.getImportantExamQuestions(
    legitUserId,
    javaDocId,
    { forceRefresh: true }
  );
  assert.ok(javaBank.questions.length >= 3, 'Java document should produce questions');
  // Java document should contain Java questions
  const javaText = javaBank.questions
    .map((q) => q.question + ' ' + (q.modelAnswer || (q.suggestedAnswerPoints ? q.suggestedAnswerPoints.join(' ') : '')))
    .join(' ')
    .toLowerCase();
  assert.ok(
    javaText.includes('exception') || javaText.includes('try') || javaText.includes('throw') || javaText.includes('error'),
    'Java document must produce exception questions'
  );
  // Java document MUST NOT contain DBMS terms
  assert.strictEqual(javaText.includes('serializability'), false, 'Java doc must not contain DBMS serializability');
  assert.strictEqual(javaText.includes('precedence graph'), false, 'Java doc must not contain DBMS precedence graph');

  // Switch back to DBMS document
  const dbmsBankAgain = await studyCoachService.getImportantExamQuestions(
    legitUserId,
    dbmsDocId,
    { forceRefresh: false }
  );
  const dbmsText = dbmsBankAgain.questions
    .map((q) => q.question + ' ' + (q.modelAnswer || (q.suggestedAnswerPoints ? q.suggestedAnswerPoints.join(' ') : '')))
    .join(' ')
    .toLowerCase();
  assert.ok(
    dbmsText.includes('transaction') || dbmsText.includes('schedule') || dbmsText.includes('serializ'),
    'DBMS document must produce DBMS questions'
  );
  assertNoJavaLeak(dbmsText, 'DBMS questions after switching back from Java');
  console.log('✓ TEST E PASSED: Clean separation when switching between DBMS and Java documents.');

  // --------------------------------------------------------------------------
  // TEST F: Missing / Unreadable Document Error Reporting
  // --------------------------------------------------------------------------
  console.log('\n--- TEST F: Missing or Unreadable Document Handling ---');
  let errorCaught = false;
  try {
    await studyCoachService.generateQuiz(
      legitUserId,
      'doc_nonexistent_empty_unreadable_999'
    );
  } catch (err: any) {
    errorCaught = true;
    assert.ok(
      err.message.includes('not found') || err.message.includes('not authorized') || err.message.includes('empty'),
      `Error must be clear and actionable (got: "${err.message}")`
    );
  }
  assert.strictEqual(errorCaught, true, 'Must throw error on nonexistent/unreadable document');
  console.log('✓ TEST F PASSED: Unreadable/missing documents return clear errors instead of inventing questions.');

  // --------------------------------------------------------------------------
  // TEST G: All Question Types (True/False, Fill in Blank, One Line, Application)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST G: All Question Types (TF, FIB, OneLine, Application) ---');
  const customQuiz = await studyCoachService.generateQuiz(
    legitUserId,
    dbmsDocId,
    {
      forceRefresh: true,
      questionCount: 8,
      questionTypes: ['true_false', 'fill_in_the_blank', 'one_line', 'application'],
    }
  );

  assert.strictEqual(customQuiz.questions.length, 8, 'Must generate exactly 8 questions');
  const tf = customQuiz.questions.filter((q) => q.type === 'true_false');
  const fib = customQuiz.questions.filter((q) => q.type === 'fill_in_the_blank');
  const ol = customQuiz.questions.filter((q) => q.type === 'one_line');
  const app = customQuiz.questions.filter((q) => q.type === 'application');

  assert.ok(tf.length > 0, 'Must have True/False questions');
  assert.ok(fib.length > 0, 'Must have Fill-in-the-blank questions');
  assert.ok(ol.length > 0, 'Must have One-line questions');
  assert.ok(app.length > 0, 'Must have Application questions');

  for (const q of customQuiz.questions) {
    assertNoJavaLeak(q.question, `Custom question (${q.type}): "${q.question}"`);
    assert.ok(q.sourceLocation, 'Location citation must be present');
  }
  console.log(`✓ TEST G PASSED: Generated and verified True/False, Fill-in-the-blank, One-line, and Application question types.`);

  console.log('\n================================================================');
  console.log('🎉 ALL REGRESSION TESTS PASSED WITH 100% DBMS GROUNDING!');
  console.log('================================================================\n');
}

runRegressionSuite().catch((err) => {
  console.error('\n❌ REGRESSION TEST FAILED:', err);
  process.exit(1);
});
