import assert from 'assert';
import { documentJobManager } from '../src/jobs/documentJobManager.js';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=====================================================');
  console.log('CRITICAL BUG FIX: END-TO-END VERIFICATION SUITE');
  console.log('Testing Phases 1-8 (Tests A through H)');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  // -----------------------------------------------------------------
  // TEST HEALTH: Diagnostics and Provider Status (Phase 7)
  // -----------------------------------------------------------------
  try {
    console.log('[RUNNING] Health Check and Diagnostics...');
    const res = await fetch(`${BASE_URL}/api/health`);
    const health = await res.json();
    assert.strictEqual(health.status, 'healthy', 'Health check should be healthy');
    assert.ok(health.providers, 'Health check should report providers');
    assert.strictEqual(health.providers.wikipedia?.status, 'operational', 'Wikipedia should be operational');
    // Ensure no secret keys exposed
    const healthStr = JSON.stringify(health);
    assert.ok(!healthStr.includes('AIzaSy'), 'No API keys should be exposed in health response');
    console.log('  -> Health check PASSED (Status: healthy, Providers reported accurately)\n');
    passed++;
  } catch (err: any) {
    console.error('  -> Health check FAILED:', err.message, '\n');
    failed++;
  }

  // -----------------------------------------------------------------
  // TEST A: AI Web Research - Vignan University (Phase 2 & Phase 8)
  // -----------------------------------------------------------------
  try {
    console.log('[RUNNING] TEST A: AI Web Research - Vignan University...');
    const res = await fetch(`${BASE_URL}/api/research/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What is Vignan University, Vadlamudi, and what programmes does it offer?',
        sourcePreference: 'both',
        answerLength: 'balanced',
      }),
    });
    const data = await res.json();
    assert.strictEqual(data.success, true, 'Request should succeed');
    assert.ok(data.answer && data.answer.length > 50, 'Answer should be non-empty and detailed');
    assert.ok(data.citations && data.citations.length > 0, 'Citations should be present');
    assert.ok(
      data.answer.toLowerCase().includes('vignan') || data.answer.toLowerCase().includes('vadlamudi') || data.answer.toLowerCase().includes('program'),
      'Answer should mention Vignan / programmes'
    );
    console.log(`  -> TEST A PASSED (Citations: ${data.citations.length}, Answer length: ${data.answer.length})\n`);
    passed++;
  } catch (err: any) {
    console.error('  -> TEST A FAILED:', err.message, '\n');
    failed++;
  }

  // -----------------------------------------------------------------
  // TEST B: Research Question - Quantum Computing (Phase 2 & Phase 8)
  // -----------------------------------------------------------------
  try {
    console.log('[RUNNING] TEST B: AI Web Research - Quantum Computing...');
    const res = await fetch(`${BASE_URL}/api/research/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Explain how quantum computing differs from classical computing.',
        sourcePreference: 'wikipedia',
        answerLength: 'balanced',
      }),
    });
    const data = await res.json();
    assert.strictEqual(data.success, true, 'Request should succeed');
    assert.ok(data.answer && data.answer.length > 50, 'Answer should be non-empty');
    assert.ok(data.citations && data.citations.length > 0, 'Citations should be present');
    assert.ok(
      data.answer.toLowerCase().includes('quantum') || data.answer.toLowerCase().includes('qubit'),
      'Answer should explain quantum computing'
    );
    console.log(`  -> TEST B PASSED (Citations: ${data.citations.length}, Model: ${data.model})\n`);
    passed++;
  } catch (err: any) {
    console.error('  -> TEST B FAILED:', err.message, '\n');
    failed++;
  }

  // -----------------------------------------------------------------
  // TEST C: Ask My Documents - Unique Fact Retrieval (Phase 3 & Phase 8)
  // -----------------------------------------------------------------
  const testDocId = `test_doc_e2e_${Date.now()}`;
  const testUserId = `test_user_c_${Date.now()}`;

  try {
    console.log('[RUNNING] TEST C: Ask My Documents - Document Ingestion and Retrieval...');
    const uniqueFactText = `
CONFIDENTIAL RESEARCH REPORT 2026
Project Zephyr
Director: Dr. Evelyn Vance
Location: Sub-surface Research Facility Gamma, Olympus Mons, Mars.
Core Breakthrough: The Zephyr Quantum Resonator achieved 99.87% coherence on October 14, 2026.
Budget Allocation: $4.2 Billion USD under Galactic Exploration Directive 7.
    `.trim();

    const formData = new FormData();
    formData.set('userId', testUserId);
    formData.set('documentId', testDocId);
    formData.set('file', new Blob([uniqueFactText], { type: 'text/plain' }), 'project_zephyr_report.txt');

    const uploadRes = await fetch(`${BASE_URL}/api/documents/process`, {
      method: 'POST',
      body: formData,
    });
    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadData.success, true, 'Upload should succeed');

    // Query for the specific unique fact
    const queryRes = await fetch(`${BASE_URL}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Who is the director of Project Zephyr and what is the facility location?',
        documentIds: [testDocId],
        userId: testUserId,
      }),
    });
    const queryData = await queryRes.json();
    assert.strictEqual(queryData.success, true, 'Query should succeed');
    assert.strictEqual(queryData.isInsufficientEvidence, false, 'Evidence should be sufficient');
    assert.ok(queryData.answer.includes('Evelyn Vance'), 'Answer should mention Dr. Evelyn Vance');
    assert.ok(queryData.citations && queryData.citations.length > 0, 'Citations should be provided');
    assert.strictEqual(queryData.citations[0].documentId, testDocId, 'Citation should reference the document');
    console.log(`  -> TEST C PASSED (Director found: Evelyn Vance, Citation: ${queryData.citations[0].title})\n`);
    passed++;
  } catch (err: any) {
    console.error('  -> TEST C FAILED:', err.message, '\n');
    failed++;
  }

  // -----------------------------------------------------------------
  // TEST D: Missing Document Answer (Phase 3 & Phase 8)
  // -----------------------------------------------------------------
  try {
    console.log('[RUNNING] TEST D: Missing Document Answer...');
    const queryRes = await fetch(`${BASE_URL}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What is the recipe for baking chocolate chip cookies with sea salt?',
        documentIds: [testDocId],
        userId: testUserId,
      }),
    });
    const queryData = await queryRes.json();
    assert.strictEqual(queryData.success, true, 'Query response should be successful envelope');
    assert.strictEqual(queryData.isInsufficientEvidence, true, 'isInsufficientEvidence must be true');
    assert.strictEqual(
      queryData.answer.trim(),
      'There is no answer to your question in your uploaded document.',
      'Answer must exactly match the required fallback message'
    );
    console.log('  -> TEST D PASSED (Strict ungrounded fallback returned exactly as required)\n');
    passed++;
  } catch (err: any) {
    console.error('  -> TEST D FAILED:', err.message, '\n');
    failed++;
  }

  // -----------------------------------------------------------------
  // TEST E: Document Processing State (Phase 3 & Phase 8)
  // -----------------------------------------------------------------
  try {
    console.log('[RUNNING] TEST E: Document In-Processing Notification...');
    const processingDocId = `processing_doc_${Date.now()}`;
    // Register active job in 'processing' status via server
    const jobRes = await fetch(`${BASE_URL}/api/documents/mock-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: processingDocId,
        userId: testUserId,
        filename: 'large_unindexed_dataset.pdf',
        status: 'processing',
      }),
    });
    const jobData = await jobRes.json();
    assert.strictEqual(jobData.success, true, 'Mock job should be created');

    const queryRes = await fetch(`${BASE_URL}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What is inside the dataset?',
        documentIds: [processingDocId],
        userId: testUserId,
      }),
    });
    const queryData = await queryRes.json();
    assert.strictEqual(queryData.success, false, 'Query should fail when document is processing');
    const errMsg = (queryData.error?.message || queryData.error || '').toLowerCase();
    assert.ok(
      errMsg.includes('processed') || errMsg.includes('wait') || errMsg.includes('retry'),
      'Error message should inform user that document is processing'
    );
    console.log(`  -> TEST E PASSED (Processing rejection message: "${queryData.error?.message || queryData.error}")\n`);
    passed++;
  } catch (err: any) {
    console.error('  -> TEST E FAILED:', err.message, '\n');
    failed++;
  }

  // -----------------------------------------------------------------
  // TEST F: Provider Failure Graceful Handling (Phase 2 & Phase 8)
  // -----------------------------------------------------------------
  try {
    console.log('[RUNNING] TEST F: Provider Failure and Setup Error Handling...');
    const res = await fetch(`${BASE_URL}/api/research/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What are the top 5 trending tech stocks today?',
        sourcePreference: 'web', // Web-only mode without Tavily key
      }),
    });
    const data = await res.json();
    assert.strictEqual(data.success, false, 'Web-only search without key should return error');
    const errMsg = data.error?.message || data.error || '';
    assert.ok(
      errMsg.includes('TAVILY_API_KEY') || errMsg.includes('search provider'),
      'Error message must clearly identify missing search provider'
    );
    console.log(`  -> TEST F PASSED (Clear setup error returned: "${errMsg}")\n`);
    passed++;
  } catch (err: any) {
    console.error('  -> TEST F FAILED:', err.message, '\n');
    failed++;
  }

  // -----------------------------------------------------------------
  // TEST G: Authentication and Document User Isolation (Phase 3 & Phase 8)
  // -----------------------------------------------------------------
  try {
    console.log('[RUNNING] TEST G: User Isolation and Access Control...');
    const intruderUserId = `intruder_user_${Date.now()}`;

    const res = await fetch(`${BASE_URL}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Who is the director of Project Zephyr?',
        documentIds: [testDocId], // Belongs to testUserId, NOT intruderUserId
        userId: intruderUserId,
      }),
    });
    const data = await res.json();
    assert.strictEqual(data.success, false, 'Unauthorized user should be denied access');
    const errMsg = (data.error?.message || data.error || '').toLowerCase();
    assert.ok(
      errMsg.includes('permission') || errMsg.includes('not found'),
      'Should report permission or not found error'
    );
    console.log(`  -> TEST G PASSED (Unauthorized access blocked: "${data.error?.message || data.error}")\n`);
    passed++;
  } catch (err: any) {
    console.error('  -> TEST G FAILED:', err.message, '\n');
    failed++;
  }

  console.log('=====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
