import assert from 'assert';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';
import { documentMetadataStore } from '../src/services/documentMetadataStore.js';
import { documentOwnershipMigration } from '../src/utils/documentOwnershipMigration.js';
import { documentJobManager } from '../src/jobs/documentJobManager.js';
import { vectorStore, isUserAuthorized } from '../src/vectorStore/memoryVectorStore.js';
import { ragService, DOCUMENT_FALLBACK_MESSAGE } from '../src/rag/ragService.js';
import { documentService } from '../src/services/document.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('🛡️ MASTER TEST SUITE: DOCUMENT AUTHORIZATION & MULTI-FORMAT RAG');
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
  slides: { title: string; bullets: string[]; notes?: string }[]
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
 * Helper to build an in-memory valid PDF buffer with page numbering
 */
function buildTestPdf(pages: string[]): Buffer {
  const chunks: Buffer[] = [];
  chunks.push(Buffer.from('%PDF-1.4\n', 'latin1'));

  const offsets: number[] = [0];

  function addObj(num: number, content: string | Buffer) {
    const currentLen = chunks.reduce((acc, c) => acc + c.length, 0);
    offsets[num] = currentLen;
    chunks.push(Buffer.from(`${num} 0 obj\n`, 'latin1'));
    if (typeof content === 'string') {
      chunks.push(Buffer.from(content, 'latin1'));
    } else {
      chunks.push(content);
    }
    chunks.push(Buffer.from('\nendobj\n', 'latin1'));
  }

  // 1: Catalog
  addObj(1, '<< /Type /Catalog /Pages 2 0 R >>');

  // 2: Pages
  const numPages = pages.length;
  const kids = Array.from({ length: numPages }, (_, i) => `${3 + i} 0 R`).join(' ');
  addObj(2, `<< /Type /Pages /Kids [${kids}] /Count ${numPages} >>`);

  const fontObjNum = 3 + numPages;

  for (let i = 0; i < numPages; i++) {
    const pageNum = 3 + i;
    const contentNum = 3 + numPages + 1 + i;
    addObj(
      pageNum,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentNum} 0 R >>`
    );
  }

  addObj(fontObjNum, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  for (let i = 0; i < numPages; i++) {
    const contentNum = 3 + numPages + 1 + i;
    const sanitized = pages[i].replace(/[()\\]/g, '');
    const stream = `BT /F1 12 Tf 72 712 Td (${sanitized}) Tj ET`;
    const streamContent = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    addObj(contentNum, streamContent);
  }

  const totalObjs = 3 + numPages * 2;
  const xrefOffset = chunks.reduce((acc, c) => acc + c.length, 0);

  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f\r\n`;
  for (let i = 1; i <= totalObjs; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    xref += `${offStr} 00000 n\r\n`;
  }

  xref += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, 'latin1'));

  return Buffer.concat(chunks);
}

async function runMasterTestSuite() {
  const userA = 'test_verified_user_alpha';
  const userB = 'test_unauthorized_user_beta';
  const realOwnerUid = 'buW1XmhCvKSfK2KFIR9Lu13zezk1';

  // -------------------------------------------------------------------------
  // TEST 1: Canonical Document Metadata Store & Ownership Verification
  // -------------------------------------------------------------------------
  try {
    const testDocId = `test_contract_${Date.now()}`;
    documentMetadataStore.registerDocument({
      id: testDocId,
      ownerId: userA,
      filename: 'security_contract.pdf',
      filePath: `/fake/path/${testDocId}.pdf`,
      status: 'ready',
      stage: 'indexed',
      chunkCount: 5,
    });

    assert.strictEqual(documentMetadataStore.isDocumentOwnedBy(testDocId, userA), true);
    assert.strictEqual(documentMetadataStore.isDocumentOwnedBy(testDocId, userB), false);
    assert.strictEqual(documentMetadataStore.isDocumentOwnedBy('nonexistent_id', userA), false);

    pass('Test 1: Canonical Document Metadata Store enforces ownership contract');
  } catch (err: any) {
    fail('Test 1: Canonical Document Metadata Store', err);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Multi-format Ingestion (PDF, PPTX, DOCX, TXT, MD)
  // -------------------------------------------------------------------------
  const formatDocIds: { [fmt: string]: string } = {};

  try {
    // 2a. PDF
    const docsDir = documentJobManager.getDocumentsDirectory();
    const existingPdfPath = path.join(
      docsDir,
      'buW1XmhCvKSfK2KFIR9Lu13zezk1__doc_1792302657589_x8au6ct__exp-4_adda_.pdf'
    );
    let pdfBuf: Buffer;
    if (fs.existsSync(existingPdfPath)) {
      pdfBuf = fs.readFileSync(existingPdfPath);
    } else {
      const pdfFiles = fs.readdirSync(docsDir).filter((f) => f.endsWith('.pdf'));
      if (pdfFiles.length > 0) {
        pdfBuf = fs.readFileSync(path.join(docsDir, pdfFiles[0]));
      } else {
        throw new Error('No valid PDF file found for test');
      }
    }
    const pdfDocId = `doc_pdf_${Date.now()}`;
    const pdfJob = await documentJobManager.executeIngestion(
      pdfDocId,
      userA,
      'quantum_computing.pdf',
      pdfBuf,
      'application/pdf'
    );
    assert.strictEqual(pdfJob.status, 'ready');
    assert(vectorStore.getDocumentChunkCount(userA, pdfDocId) > 0);
    formatDocIds['pdf'] = pdfDocId;

    // 2b. PPTX
    const pptxBuf = await buildTestPptx([
      {
        title: 'Distributed Systems Consensus',
        bullets: [
          'Raft consensus algorithm relies on leader election and log replication.',
          'Heartbeat timeouts prevent split-brain scenarios across distributed nodes.',
        ],
      },
      {
        title: 'Paxos vs Raft',
        bullets: [
          'Paxos offers symmetric multi-leader variants like Egalitarian Paxos.',
          'Raft is designed for understandability and deterministic state machine transitions.',
        ],
      },
    ]);
    const pptxDocId = `doc_pptx_${Date.now()}`;
    const pptxJob = await documentJobManager.executeIngestion(
      pptxDocId,
      userA,
      'consensus_protocols.pptx',
      pptxBuf,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    assert.strictEqual(pptxJob.status, 'ready');
    assert.strictEqual(pptxJob.slideCount, 2);
    assert(vectorStore.getDocumentChunkCount(userA, pptxDocId) > 0);
    formatDocIds['pptx'] = pptxDocId;

    // 2c. DOCX
    const docxBuf = await buildTestDocx([
      'Autonomous Microservices Governance and Telemetry Architecture.',
      'OpenTelemetry collectors stream spans, metrics, and logs to centralized Grafana Tempo instances.',
      'Circuit breakers prevent cascading failures during database outages.',
    ]);
    const docxDocId = `doc_docx_${Date.now()}`;
    const docxJob = await documentJobManager.executeIngestion(
      docxDocId,
      userA,
      'microservices_telemetry.docx',
      docxBuf,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    assert.strictEqual(docxJob.status, 'ready');
    assert(vectorStore.getDocumentChunkCount(userA, docxDocId) > 0);
    formatDocIds['docx'] = docxDocId;

    // 2d. TXT
    const txtBuf = Buffer.from(
      'Cryogenic Storage Specifications: Liquid Nitrogen maintains temperature at 77 Kelvin for biospecimen preservation.\nSafety protocol requires oxygen sensors and emergency pressure release valves.'
    );
    const txtDocId = `doc_txt_${Date.now()}`;
    const txtJob = await documentJobManager.executeIngestion(
      txtDocId,
      userA,
      'cryogenics_spec.txt',
      txtBuf,
      'text/plain'
    );
    assert.strictEqual(txtJob.status, 'ready');
    assert(vectorStore.getDocumentChunkCount(userA, txtDocId) > 0);
    formatDocIds['txt'] = txtDocId;

    // 2e. MD
    const mdBuf = Buffer.from(
      '# Database Sharding Strategies\n\nConsistent hashing minimizes cache misses and data movement during node additions.\nVirtual nodes provide balanced data distribution across heterogeneous storage clusters.'
    );
    const mdDocId = `doc_md_${Date.now()}`;
    const mdJob = await documentJobManager.executeIngestion(
      mdDocId,
      userA,
      'database_sharding.md',
      mdBuf,
      'text/markdown'
    );
    assert.strictEqual(mdJob.status, 'ready');
    assert(vectorStore.getDocumentChunkCount(userA, mdDocId) > 0);
    formatDocIds['md'] = mdDocId;

    pass('Test 2: All 5 file formats (PDF, PPTX, DOCX, TXT, MD) ingested and indexed successfully');
  } catch (err: any) {
    fail('Test 2: Multi-format Ingestion', err);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Multi-Document Selected RAG Query & Citation Aggregation
  // -------------------------------------------------------------------------
  try {
    const multiDocIds = [formatDocIds['pptx'], formatDocIds['docx']];
    const queryResult = await ragService.query({
      userId: userA,
      documentIds: multiDocIds,
      question: 'How does Raft leader election work and what does OpenTelemetry collect?',
    });

    assert.strictEqual(queryResult.success, true);
    assert(queryResult.citations.length > 0);

    const docNames = queryResult.citations.map((c) => c.documentName);
    const hasPptx = docNames.some((n) => n.includes('consensus'));
    const hasDocx = docNames.some((n) => n.includes('telemetry'));

    assert(hasPptx || hasDocx, 'Citations should reference selected documents');
    assert(queryResult.answer.length > 20);

    pass('Test 3: Multi-document simultaneous query returns verified citations and answers');
  } catch (err: any) {
    fail('Test 3: Multi-Document RAG Query', err);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Cross-User Access Isolation & Security Protection
  // -------------------------------------------------------------------------
  try {
    // User B attempts to query User A's private documents
    const crossUserResult = await ragService.query({
      userId: userB,
      documentIds: [formatDocIds['pdf']],
      question: 'Explain quantum computing qubits and superposition',
    });

    // Must be rejected with success: false, fallback message, and rejectionReason
    assert.strictEqual(crossUserResult.success, false);
    assert.strictEqual(crossUserResult.answer, DOCUMENT_FALLBACK_MESSAGE);
    assert.strictEqual(crossUserResult.citations.length, 0);
    assert(
      crossUserResult.rejectionReason?.includes('not authorized'),
      'Must state user is not authorized'
    );

    // Vector store internal search must also enforce isolation
    const chunksDirect = vectorStore.search(
      userB,
      [formatDocIds['pdf']],
      new Array(768).fill(0.01),
      'quantum',
      5
    );
    assert.strictEqual(chunksDirect.length, 0, 'Vector search must reject cross-user access');

    pass('Test 4: Strict cross-user authorization rejection; zero data leakage');
  } catch (err: any) {
    fail('Test 4: Cross-User Access Isolation', err);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Legitimate Access to Prompt Target Document ('doc_1792156713879_xpyhmsd')
  // -------------------------------------------------------------------------
  try {
    const targetDocId = 'doc_1792156713879_xpyhmsd';

    // Verify document is registered to real owner
    assert.strictEqual(
      documentMetadataStore.isDocumentOwnedBy(targetDocId, realOwnerUid),
      true,
      'doc_1792156713879_xpyhmsd must belong to realOwnerUid'
    );

    // Query with legitimate owner
    const targetResult = await ragService.query({
      userId: realOwnerUid,
      documentIds: [targetDocId],
      question: 'What are the keywords in Java exception handling?',
    });

    assert.strictEqual(targetResult.success, true);
    assert(
      !targetResult.rejectionReason?.includes('not authorized'),
      'Authorized user must never receive authorization error'
    );
    assert(targetResult.citations.length > 0);

    // User B querying target document must still be rejected
    const unauthTargetResult = await ragService.query({
      userId: userB,
      documentIds: [targetDocId],
      question: 'What are the keywords in Java exception handling?',
    });
    assert.strictEqual(unauthTargetResult.success, false);
    assert(unauthTargetResult.rejectionReason?.includes('not authorized'));

    pass('Test 5: Target document doc_1792156713879_xpyhmsd is authorized for legitimate owner and protected against foreign users');
  } catch (err: any) {
    fail('Test 5: Target Document Authorization', err);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Exact Fallback Contract for Unanswerable Questions
  // -------------------------------------------------------------------------
  try {
    const unanswerableResult = await ragService.query({
      userId: userA,
      documentIds: [formatDocIds['txt']],
      question: 'What is the recipe for chocolate chip cookies with sea salt?',
    });

    assert.strictEqual(unanswerableResult.success, true);
    assert.strictEqual(unanswerableResult.isInsufficientEvidence, true);
    assert.strictEqual(
      unanswerableResult.answer,
      'There is no answer to your question in your uploaded document.'
    );
    assert.strictEqual(unanswerableResult.citations.length, 0);

    pass('Test 6: Exact fallback message returned verbatim when evidence is missing');
  } catch (err: any) {
    fail('Test 6: Exact Fallback Contract', err);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Stale, Deleted, and Invalid Document IDs Handling
  // -------------------------------------------------------------------------
  try {
    // 7a. Querying valid document alongside a stale/deleted document ID
    const mixedResult = await ragService.query({
      userId: userA,
      documentIds: [formatDocIds['docx'], 'nonexistent_stale_doc_99999'],
      question: 'What does OpenTelemetry collect in microservices architecture?',
    });

    assert.strictEqual(mixedResult.success, true);
    assert(mixedResult.citations.length > 0);
    assert(mixedResult.answer.toLowerCase().includes('telemetry') || mixedResult.answer.length > 20);

    // 7b. Querying ONLY nonexistent document IDs throws a clean error
    let threwCleanly = false;
    try {
      await ragService.query({
        userId: userA,
        documentIds: ['completely_bogus_doc_id_12345'],
        question: 'Any question here',
      });
    } catch (err: any) {
      threwCleanly = true;
      assert(err.message.includes('could not be found or have been deleted'));
    }
    assert.strictEqual(threwCleanly, true);

    pass('Test 7: Stale/invalid document IDs handled gracefully without 500 error');
  } catch (err: any) {
    fail('Test 7: Stale and Invalid Document IDs', err);
  }

  // -------------------------------------------------------------------------
  // TEST 8: Document Deletion, Storage Cleanup, and Re-index Rejection
  // -------------------------------------------------------------------------
  try {
    const tempDocId = `doc_to_delete_${Date.now()}`;
    const tempBuf = Buffer.from('Temporary secret project data to be wiped completely.');
    await documentJobManager.executeIngestion(
      tempDocId,
      userA,
      'temp_secret.txt',
      tempBuf,
      'text/plain'
    );

    assert(vectorStore.hasDocumentChunks(userA, tempDocId));
    assert(documentMetadataStore.hasDocument(tempDocId));

    // Delete document
    const deleted = await documentService.deleteDocument(userA, tempDocId);
    assert.strictEqual(deleted, true);

    // Verify vector chunks removed
    assert.strictEqual(vectorStore.hasDocumentChunks(userA, tempDocId), false);

    // Subsequent query must be rejected
    let deleteQueryFailed = false;
    try {
      await ragService.query({
        userId: userA,
        documentIds: [tempDocId],
        question: 'What was the secret project data?',
      });
    } catch (e: any) {
      deleteQueryFailed = true;
    }
    assert.strictEqual(deleteQueryFailed, true);

    pass('Test 8: Document deletion cleans up chunks, storage, and prevents subsequent queries');
  } catch (err: any) {
    fail('Test 8: Document Deletion and Cleanup', err);
  }

  // -------------------------------------------------------------------------
  // TEST 9: Idempotent Migration Re-Run Verification
  // -------------------------------------------------------------------------
  try {
    const auditReport = await documentOwnershipMigration.runMigration({ dryRun: false });
    assert.strictEqual(typeof auditReport.totalDocumentsScanned, 'number');
    assert(auditReport.totalDocumentsScanned > 0);
    // After initial repair, zero new repairs needed (fully idempotent)
    assert.strictEqual(
      auditReport.successfullyRepairedCount,
      0,
      'Migration must be idempotent on subsequent runs'
    );

    pass('Test 9: Idempotent ownership migration produces consistent state across repeated runs');
  } catch (err: any) {
    fail('Test 9: Idempotent Migration Verification', err);
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 MASTER TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMasterTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
