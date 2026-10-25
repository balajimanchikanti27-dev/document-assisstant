import assert from 'assert';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = 'http://localhost:5000';

console.log('================================================================');
console.log('🛡️ REGRESSION TEST SUITE: DOCUMENT DELETION & AUTHORIZATION FLOW');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function pass(testName: string) {
  console.log(`  ✓ PASS: ${testName}`);
  passedTests++;
}

function fail(testName: string, err: any) {
  console.error(`  ✗ FAIL: ${testName}`);
  console.error(err);
  failedTests++;
}

/**
 * Helper to build an in-memory PPTX buffer
 */
async function buildTestPptx(
  slides: { title: string; bullets: string[] }[]
): Promise<Buffer> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="xml" ContentType="application/xml"/>
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
      ${slides
        .map(
          (_, i) =>
            `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
        )
        .join('\n')}
    </Types>`
  );

  slides.forEach((s, idx) => {
    const slideNum = idx + 1;
    const bodyXml = s.bullets
      .map((b) => `<a:p><a:r><a:t>${b}</a:t></a:r></a:p>`)
      .join('\n');

    zip.file(
      `ppt/slides/slide${slideNum}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:nvSpPr><p:cNvPr id="1" name="Title 1"/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
              <p:txBody><a:p><a:r><a:t>${s.title}</a:t></a:r></a:p></p:txBody>
            </p:sp>
            <p:sp>
              <p:nvSpPr><p:cNvPr id="2" name="Content 1"/></p:nvPr>
              <p:txBody>${bodyXml}</p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>`
    );
  });

  return await zip.generateAsync({ type: 'nodebuffer' });
}

/**
 * Helper to build an in-memory DOCX buffer
 */
async function buildTestDocx(paragraphs: string[]): Promise<Buffer> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`
  );

  const bodyXml = paragraphs
    .map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`)
    .join('');

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>${bodyXml}</w:body>
    </w:document>`
  );

  return await zip.generateAsync({ type: 'nodebuffer' });
}

/**
 * Helper to upload a document via HTTP endpoint
 */
async function uploadDocHttp(
  userId: string,
  documentId: string,
  filename: string,
  buffer: Buffer,
  mimetype: string
): Promise<{ status: number; data: any }> {
  const formData = new FormData();
  formData.set('userId', userId);
  formData.set('documentId', documentId);
  formData.set('filename', filename);
  formData.set('file', new Blob([buffer], { type: mimetype }), filename);

  const res = await fetch(`${BASE_URL}/api/documents/process`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  return { status: res.status, data };
}

/**
 * Create a mock JWT
 */
function createMockJwt(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = Buffer.from('mock_signature').toString('base64');
  return `${header}.${body}.${signature}`;
}

async function runRegressionSuite() {
  const userA = `user_alice_${Date.now()}`;
  const userB = `user_bob_${Date.now()}`;
  const docsDir = path.resolve(__dirname, '..', 'uploads', 'documents');

  // -----------------------------------------------------------------
  // TEST 1: PPTX Document Ingestion and Deletion Flow
  // -----------------------------------------------------------------
  try {
    const pptxDocId = `doc_del_pptx_${Date.now()}`;
    const pptxBuf = await buildTestPptx([
      { title: 'AI Automation', bullets: ['Agents streamline complex distributed workflows.'] },
    ]);

    const upload = await uploadDocHttp(
      userA,
      pptxDocId,
      'ai_automation.pptx',
      pptxBuf,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    assert.strictEqual(upload.status, 200, 'PPTX upload must succeed');
    assert.strictEqual(upload.data.success, true);
    assert.ok(upload.data.chunkCount > 0, 'PPTX must have chunks');

    // Verify document appears in listing
    const listRes1 = await fetch(`${BASE_URL}/api/documents`, { headers: { 'x-user-id': userA } });
    const listData1 = await listRes1.json();
    assert.ok(listData1.data?.documents?.some((d: any) => d.id === pptxDocId), 'PPTX must be listed');

    // HTTP DELETE
    const delRes = await fetch(`${BASE_URL}/api/documents/${pptxDocId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(delRes.status, 200, 'DELETE PPTX should return HTTP 200');
    const delData = await delRes.json();
    assert.strictEqual(delData.success, true);
    assert.ok(delData.deletedChunks > 0, 'Should report deleted chunks');

    // Verify document is gone from listing and 404 on direct fetch
    const listRes2 = await fetch(`${BASE_URL}/api/documents`, { headers: { 'x-user-id': userA } });
    const listData2 = await listRes2.json();
    assert.strictEqual(listData2.data?.documents?.some((d: any) => d.id === pptxDocId), false, 'PPTX must be removed');

    const getRes = await fetch(`${BASE_URL}/api/documents/${pptxDocId}`, { headers: { 'x-user-id': userA } });
    assert.strictEqual(getRes.status, 404, 'Direct get must return 404');

    pass('Test 1: PPTX document deletion cleans up all storage layers (HTTP 200)');
  } catch (err: any) {
    fail('Test 1: PPTX document deletion', err);
  }

  // -----------------------------------------------------------------
  // TEST 2: Markdown / Text Document Ingestion and Deletion Flow
  // -----------------------------------------------------------------
  try {
    const mdDocId = `doc_del_md_${Date.now()}`;
    const mdContent = `# Cloud Infrastructure Specification

## Section 1: Service Mesh Architecture
The microservices utilize an Envoy-based service mesh with mutual TLS encryption across all pods.

## Section 2: Zero-Trust Security Policies
Access control is enforced at ingress and internal sidecar proxies using cryptographic identity assertions.
`;
    const mdBuf = Buffer.from(mdContent, 'utf-8');

    const upload = await uploadDocHttp(
      userA,
      mdDocId,
      'cloud_spec.md',
      mdBuf,
      'text/markdown'
    );
    assert.strictEqual(upload.status, 200, 'Markdown document upload must succeed');
    assert.ok(upload.data.chunkCount > 0, 'Markdown document must produce chunks');

    const delRes = await fetch(`${BASE_URL}/api/documents/${mdDocId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(delRes.status, 200, 'DELETE document should return HTTP 200');
    const delData = await delRes.json();
    assert.strictEqual(delData.success, true);
    assert.ok(delData.deletedChunks > 0);

    const getRes = await fetch(`${BASE_URL}/api/documents/${mdDocId}`, { headers: { 'x-user-id': userA } });
    assert.strictEqual(getRes.status, 404, 'Deleted document must return 404');

    pass('Test 2: Markdown / Document deletion cleans up all storage layers (HTTP 200)');
  } catch (err: any) {
    fail('Test 2: Markdown / Document deletion', err);
  }

  // -----------------------------------------------------------------
  // TEST 3: DOCX Document Ingestion and Deletion Flow
  // -----------------------------------------------------------------
  try {
    const docxDocId = `doc_del_docx_${Date.now()}`;
    const docxBuf = await buildTestDocx([
      'Distributed Database Sharding and Consensus Architectures.',
      'Raft protocol maintains leader leases and deterministic log commits across replicas.',
    ]);

    const upload = await uploadDocHttp(
      userA,
      docxDocId,
      'sharding_spec.docx',
      docxBuf,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    assert.strictEqual(upload.status, 200, 'DOCX upload must succeed');
    assert.ok(upload.data.chunkCount > 0);

    const delRes = await fetch(`${BASE_URL}/api/documents/${docxDocId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(delRes.status, 200, 'DELETE DOCX should return HTTP 200');
    const delData = await delRes.json();
    assert.strictEqual(delData.success, true);
    assert.ok(delData.deletedChunks > 0);

    const getRes = await fetch(`${BASE_URL}/api/documents/${docxDocId}`, { headers: { 'x-user-id': userA } });
    assert.strictEqual(getRes.status, 404);

    pass('Test 3: DOCX document deletion cleans up all storage layers (HTTP 200)');
  } catch (err: any) {
    fail('Test 3: DOCX document deletion', err);
  }

  // -----------------------------------------------------------------
  // TEST 4: Multiple Documents Belonging to the Same User - Selective Deletion
  // -----------------------------------------------------------------
  try {
    const doc1 = `doc_multi_1_${Date.now()}`;
    const doc2 = `doc_multi_2_${Date.now()}`;
    const doc3 = `doc_multi_3_${Date.now()}`;

    await uploadDocHttp(userA, doc1, 'notes1.txt', Buffer.from('Alpha data content notes'), 'text/plain');
    await uploadDocHttp(userA, doc2, 'notes2.txt', Buffer.from('Beta data content notes'), 'text/plain');
    await uploadDocHttp(userA, doc3, 'notes3.txt', Buffer.from('Gamma data content notes'), 'text/plain');

    const listRes = await fetch(`${BASE_URL}/api/documents`, { headers: { 'x-user-id': userA } });
    const listData = await listRes.json();
    const docIds = (listData.data?.documents || []).map((d: any) => d.id);
    assert.ok(docIds.includes(doc1) && docIds.includes(doc2) && docIds.includes(doc3));

    // Delete doc 1 only
    const delRes = await fetch(`${BASE_URL}/api/documents/${doc1}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(delRes.status, 200);

    const checkRes = await fetch(`${BASE_URL}/api/documents`, { headers: { 'x-user-id': userA } });
    const checkData = await checkRes.json();
    const remainingIds = (checkData.data?.documents || []).map((d: any) => d.id);

    assert.strictEqual(remainingIds.includes(doc1), false, 'Doc 1 must be gone');
    assert.strictEqual(remainingIds.includes(doc2), true, 'Doc 2 must remain');
    assert.strictEqual(remainingIds.includes(doc3), true, 'Doc 3 must remain');

    // Clean up remaining
    await fetch(`${BASE_URL}/api/documents/${doc2}`, { method: 'DELETE', headers: { 'x-user-id': userA } });
    await fetch(`${BASE_URL}/api/documents/${doc3}`, { method: 'DELETE', headers: { 'x-user-id': userA } });

    pass('Test 4: Selective deletion of 1 document preserves other documents belonging to the same user');
  } catch (err: any) {
    fail('Test 4: Multiple documents belonging to the same user', err);
  }

  // -----------------------------------------------------------------
  // TEST 5: Document with Vector Chunks and Embeddings Verification
  // -----------------------------------------------------------------
  try {
    const chunkDocId = `doc_chunk_verify_${Date.now()}`;
    const upload = await uploadDocHttp(
      userA,
      chunkDocId,
      'deep_knowledge.txt',
      Buffer.from(
        '# Deep Knowledge Specifications\n\n' +
        '## Section 1: Coherence\n' +
        'Detailed quantum coherence metric data under high pressure environments. '.repeat(20) + '\n\n' +
        '## Section 2: Thermodynamics\n' +
        'Thermal limits and heat dissipation parameters in closed cryogenic vessels. '.repeat(20)
      ),
      'text/plain'
    );
    assert.ok(upload.data.chunkCount >= 2, 'Should have multiple chunks');

    const delRes = await fetch(`${BASE_URL}/api/documents/${chunkDocId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(delRes.status, 200);
    const delData = await delRes.json();
    assert.strictEqual(delData.deletedChunks, upload.data.chunkCount, 'All chunks must be deleted');

    const contentRes = await fetch(`${BASE_URL}/api/documents/${chunkDocId}/content`, {
      headers: { 'x-user-id': userA },
    });
    const contentJson = await contentRes.json();
    const chunks = contentJson.data?.chunks ?? contentJson.chunks ?? [];
    assert.ok(contentRes.status === 404 || chunks.length === 0, 'Chunks must be empty after deletion');

    pass('Test 5: Vector chunks and embeddings completely purged upon document deletion');
  } catch (err: any) {
    fail('Test 5: Vector chunks purge', err);
  }

  // -----------------------------------------------------------------
  // TEST 6: Missing or Already-Deleted File & Idempotent Cleanup
  // -----------------------------------------------------------------
  try {
    const phantomDocId = `doc_phantom_${Date.now()}`;
    await uploadDocHttp(
      userA,
      phantomDocId,
      'phantom_file.txt',
      Buffer.from('Temporary data for phantom test'),
      'text/plain'
    );

    // Manually remove file from disk to simulate missing file
    const files = fs.readdirSync(docsDir);
    for (const file of files) {
      if (file.includes(phantomDocId)) {
        try { fs.unlinkSync(path.join(docsDir, file)); } catch {}
      }
    }

    // Deletion must succeed gracefully even when disk file is already missing
    const res1 = await fetch(`${BASE_URL}/api/documents/${phantomDocId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(res1.status, 200, 'Missing disk file must be handled gracefully with HTTP 200');
    const data1 = await res1.json();
    assert.strictEqual(data1.success, true);

    // Subsequent repeated delete request returns HTTP 404 cleanly
    const res2 = await fetch(`${BASE_URL}/api/documents/${phantomDocId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(res2.status, 404, 'Second delete must return HTTP 404 Not Found');

    pass('Test 6: Missing disk file handled safely without 500 error; subsequent delete returns 404');
  } catch (err: any) {
    fail('Test 6: Missing or already-deleted file handling', err);
  }

  // -----------------------------------------------------------------
  // TEST 7: Invalid or Expired Firebase Token Rejection
  // -----------------------------------------------------------------
  try {
    const protectedDocId = `doc_token_prot_${Date.now()}`;
    await uploadDocHttp(
      userA,
      protectedDocId,
      'protected.txt',
      Buffer.from('Classified research content'),
      'text/plain'
    );

    // Case 7a: Expired token
    const expiredToken = createMockJwt({
      sub: userA,
      iss: 'https://securetoken.google.com/document-assisstant',
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    });

    const expRes = await fetch(`${BASE_URL}/api/documents/${protectedDocId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${expiredToken}`,
        'x-user-id': userA,
      },
    });
    assert.strictEqual(expRes.status, 401, 'Expired token must return HTTP 401');
    const expData = await expRes.json();
    assert.ok(expData.error.toLowerCase().includes('expired'), 'Must report token expiration');

    // Case 7b: Malformed token
    const malformedRes = await fetch(`${BASE_URL}/api/documents/${protectedDocId}`, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer not_a_valid_jwt_structure',
        'x-user-id': userA,
      },
    });
    assert.strictEqual(malformedRes.status, 401, 'Malformed token must return HTTP 401');

    // Clean up with legitimate user
    await fetch(`${BASE_URL}/api/documents/${protectedDocId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA },
    });

    pass('Test 7: Expired and invalid Firebase tokens rejected with HTTP 401');
  } catch (err: any) {
    fail('Test 7: Token validation', err);
  }

  // -----------------------------------------------------------------
  // TEST 8: Cross-User Deletion Protection (Strict Authorization Enforcement)
  // -----------------------------------------------------------------
  try {
    const victimDocId = `doc_victim_${Date.now()}`;
    await uploadDocHttp(
      userA,
      victimDocId,
      'alice_confidential.txt',
      Buffer.from('Alice proprietary trade secrets'),
      'text/plain'
    );

    // Bob tries to delete Alice's document
    const unauthorizedRes = await fetch(`${BASE_URL}/api/documents/${victimDocId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userB },
    });
    assert.strictEqual(unauthorizedRes.status, 403, 'Cross-user deletion must be rejected with HTTP 403 Forbidden');
    const unauthData = await unauthorizedRes.json();
    assert.strictEqual(unauthData.success, false);
    assert.ok(unauthData.error.toLowerCase().includes('not authorized'));

    // Verify Alice's document was NOT deleted
    const aliceCheck = await fetch(`${BASE_URL}/api/documents/${victimDocId}`, {
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(aliceCheck.status, 200, 'Alice doc must still exist');

    // Clean up with legitimate owner Alice
    const legitRes = await fetch(`${BASE_URL}/api/documents/${victimDocId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(legitRes.status, 200, 'Legitimate owner deletion must succeed');

    pass('Test 8: Cross-user deletion strictly forbidden (HTTP 403); victim documents completely protected');
  } catch (err: any) {
    fail('Test 8: Cross-user deletion protection', err);
  }

  // -----------------------------------------------------------------
  // TEST 9: Associated Study Summary & Cached Reference Cleanup
  // -----------------------------------------------------------------
  try {
    const summaryDocId = `doc_sum_test_${Date.now()}`;
    await uploadDocHttp(
      userA,
      summaryDocId,
      'lecture_summary.txt',
      Buffer.from('Photosynthesis converts solar light into chemical bond energy in chloroplasts.'),
      'text/plain'
    );

    // Seed cached summary file
    const summaryCacheDir = path.resolve(__dirname, '..', 'data', 'study_summaries');
    if (!fs.existsSync(summaryCacheDir)) {
      fs.mkdirSync(summaryCacheDir, { recursive: true });
    }
    const summaryPath = path.join(summaryCacheDir, `${userA}__${summaryDocId}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify({ documentId: summaryDocId, overview: 'Mock summary' }));
    assert.strictEqual(fs.existsSync(summaryPath), true, 'Summary cache must exist before deletion');

    const delRes = await fetch(`${BASE_URL}/api/documents/${summaryDocId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(delRes.status, 200);

    // Verify summary file removed
    assert.strictEqual(fs.existsSync(summaryPath), false, 'Cached study summary must be deleted');

    pass('Test 9: Associated study summaries and cached references cleaned up on deletion');
  } catch (err: any) {
    fail('Test 9: Study summary cleanup', err);
  }

  // -----------------------------------------------------------------
  // TEST 10: Network Failure Resilience and Retry Flow
  // -----------------------------------------------------------------
  try {
    const retryDocId = `doc_retry_test_${Date.now()}`;
    await uploadDocHttp(
      userA,
      retryDocId,
      'retry_doc.txt',
      Buffer.from('Retry resilience test data'),
      'text/plain'
    );

    // First attempt: invalid route triggers error
    const failedRes = await fetch(`${BASE_URL}/api/documents/${retryDocId}_nonexistent_route`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(failedRes.status, 404, 'Failed attempt returns error status');

    // Document remains intact
    const intactRes = await fetch(`${BASE_URL}/api/documents/${retryDocId}`, {
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(intactRes.status, 200, 'Document must remain intact after failed delete');

    // Second attempt (retry) with correct canonical ID succeeds
    const successRes = await fetch(`${BASE_URL}/api/documents/${retryDocId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA },
    });
    assert.strictEqual(successRes.status, 200, 'Retry attempt succeeds with HTTP 200');

    pass('Test 10: Failed attempt preserves document; subsequent retry succeeds cleanly');
  } catch (err: any) {
    fail('Test 10: Retry flow', err);
  }

  // -----------------------------------------------------------------
  // TEST 11: Repeated Rapid Delete Click (Duplicate Submission Safety)
  // -----------------------------------------------------------------
  try {
    const rapidDocId = `doc_rapid_${Date.now()}`;
    await uploadDocHttp(
      userA,
      rapidDocId,
      'rapid_doc.txt',
      Buffer.from('Rapid concurrent submission test data'),
      'text/plain'
    );

    // Fire two delete requests concurrently
    const [resFirst, resSecond] = await Promise.all([
      fetch(`${BASE_URL}/api/documents/${rapidDocId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userA },
      }),
      fetch(`${BASE_URL}/api/documents/${rapidDocId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userA },
      }),
    ]);

    // One must succeed with 200, and the other must return either 200 or 404 without crashing
    const statuses = [resFirst.status, resSecond.status];
    assert.ok(statuses.includes(200), 'At least one request must return HTTP 200');
    assert.ok(
      statuses.every(s => s === 200 || s === 404),
      'Concurrent responses must be 200 or 404, never 500'
    );

    pass('Test 11: Concurrent/repeated delete requests are safe and idempotent (no 500 or corruption)');
  } catch (err: any) {
    fail('Test 11: Repeated delete click safety', err);
  }

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 REGRESSION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('Fatal error in regression suite:', err);
  process.exit(1);
});
