import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import JSZip from 'jszip';
import { parseDocument, SUPPORTED_DOCUMENT_EXTENSIONS } from '../src/parsers/documentParser.js';
import { chunkSections } from '../src/chunker.js';
import { vectorStore } from '../src/vectorStore/memoryVectorStore.js';
import { ragService, DOCUMENT_FALLBACK_MESSAGE } from '../src/rag/ragService.js';
import { documentJobManager } from '../src/jobs/documentJobManager.js';
import { documentService } from '../src/services/document.service.js';

console.log('================================================================');
console.log('🧪 Comprehensive 12-Point Universal RAG Acceptance Test Suite');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function pass(name: string) {
  console.log(`  ✓ PASS [Scenario ${passedTests + 1}]: ${name}`);
  passedTests++;
}

function fail(name: string, err: any) {
  console.error(`  ✗ FAIL: ${name}`, err);
  failedTests++;
}

/**
 * Gets or creates a genuine, valid 3-page PDF buffer where Page 3 contains BGP facts.
 */
function getSample3PagePdf(): Buffer {
  const filePath = path.resolve(process.cwd(), 'sample_3page.pdf');
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  execSync('python make_pdf.py', { cwd: process.cwd() });
  return fs.readFileSync(filePath);
}

/**
 * Gets or creates a scanned document PDF simulation with zero selectable text layer.
 */
function getScannedSamplePdf(): Buffer {
  const filePath = path.resolve(process.cwd(), 'scanned_sample.pdf');
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  execSync('python -c "from make_pdf import create_pdf; create_pdf([\'\', \'\', \'\'], \'scanned_sample.pdf\')"', {
    cwd: process.cwd(),
  });
  return fs.readFileSync(filePath);
}

/**
 * Creates a valid multi-slide OpenXML PPTX presentation buffer.
 */
async function createMultiSlidePptx(
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

    if (s.notes) {
      zip.file(
        `ppt/notesSlides/notesSlide${slideNum}.xml`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${s.notes}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
        </p:notes>`
      );
    }
  });

  return await zip.generateAsync({ type: 'nodebuffer' });
}

/**
 * Creates a valid OpenXML DOCX buffer containing structured text and a table.
 */
async function createDocxWithTable(
  title: string,
  intro: string,
  table: { headers: string[]; rows: string[][] }
): Promise<Buffer> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="xml" ContentType="application/xml"/>
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`
  );

  let tableXml = '<w:tbl>';
  // Header row
  tableXml += '<w:tr>' + table.headers.map(h => `<w:tc><w:p><w:r><w:t>${h}</w:t></w:r></w:p></w:tc>`).join('') + '</w:tr>';
  // Data rows
  for (const row of table.rows) {
    tableXml += '<w:tr>' + row.map(cell => `<w:tc><w:p><w:r><w:t>${cell}</w:t></w:r></w:p></w:tc>`).join('') + '</w:tr>';
  }
  tableXml += '</w:tbl>';

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
      <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${title}</w:t></w:r></w:p>
      <w:p><w:r><w:t>${intro}</w:t></w:r></w:p>
      ${tableXml}
    </w:body>
  </w:document>`;

  zip.file('word/document.xml', docXml);
  return await zip.generateAsync({ type: 'nodebuffer' });
}

async function runComprehensiveTests() {
  const testUserId = 'tester_full_suite_01';

  // =========================================================================
  // 1. A PDF question whose answer is on page 3
  // =========================================================================
  console.log('\n--- 1. Testing PDF Question with Answer on Page 3 ---');
  const pdfBuffer = getSample3PagePdf();

  const pdfDocId = 'doc_pdf_net_manual_v1';
  const pdfJob = await documentJobManager.executeIngestion(
    pdfDocId,
    testUserId,
    'Network_Protocols_Manual.pdf',
    pdfBuffer
  );

  assert.strictEqual(pdfJob.status, 'ready');
  assert.strictEqual(pdfJob.pageCount, 3);

  const resPdf = await ragService.query({
    question: 'What port does BGP operate over and what is its default keepalive timer in the manual?',
    documentIds: [pdfDocId],
    userId: testUserId,
  });

  assert.strictEqual(resPdf.success, true);
  assert.strictEqual(resPdf.isInsufficientEvidence, false);
  assert.ok(resPdf.answer.includes('179') || resPdf.answer.includes('port'));
  assert.ok(resPdf.citations.length > 0);
  assert.strictEqual(resPdf.citations[0].pageNumber, 3, 'Citation must refer to Page 3');
  assert.ok(resPdf.citations[0].title.includes('Page 3'));
  pass('PDF question answer located specifically on page 3 with valid citation');

  // =========================================================================
  // 2. A PPT question whose answer is on slide 7
  // =========================================================================
  console.log('\n--- 2. Testing PPT/PPTX Question with Answer on Slide 7 ---');
  const pptxBuffer = await createMultiSlidePptx([
    { title: 'Slide 1: Cloud Architecture', bullets: ['Introduction to public and private cloud models.'] },
    { title: 'Slide 2: Virtualization', bullets: ['Type-1 and Type-2 hypervisor comparisons.'] },
    { title: 'Slide 3: Container Orchestration', bullets: ['Kubernetes pods, services, and ingresses.'] },
    { title: 'Slide 4: Storage Infrastructure', bullets: ['Comparing block volumes and object stores.'] },
    { title: 'Slide 5: Software Defined Networking', bullets: ['Virtual Private Cloud subnets and peering.'] },
    { title: 'Slide 6: Serverless Functions', bullets: ['Event-driven function execution and cold starts.'] },
    {
      title: 'Disaster Recovery and SLA Guarantees',
      bullets: [
        'Our tier-4 datacenter architecture guarantees an uptime SLA of 99.995%.',
        'The Disaster Recovery protocol guarantees a Recovery Point Objective (RPO) of 15 seconds.',
        'The Recovery Time Objective (RTO) is guaranteed at 2 minutes across multi-region active replication.',
      ],
      notes: 'Presenter Note: Emphasize that RPO is 15 seconds.',
    },
  ]);

  const pptDocId = 'doc_pptx_cloud_guide_v7';
  const pptJob = await documentJobManager.executeIngestion(
    pptDocId,
    testUserId,
    'Cloud_Infrastructure_Guide.pptx',
    pptxBuffer
  );

  assert.strictEqual(pptJob.status, 'ready');
  assert.strictEqual(pptJob.slideCount, 7, 'Must parse all 7 slides');

  const resPpt = await ragService.query({
    question: 'What is the Recovery Point Objective (RPO) and Recovery Time Objective (RTO) in the disaster recovery slide?',
    documentIds: [pptDocId],
    userId: testUserId,
  });

  assert.strictEqual(resPpt.success, true);
  assert.strictEqual(resPpt.isInsufficientEvidence, false);
  assert.ok(resPpt.answer.includes('15') || resPpt.answer.toLowerCase().includes('rpo'));
  assert.ok(resPpt.citations.length > 0);
  assert.strictEqual(resPpt.citations[0].slideNumber, 7, 'Citation must refer specifically to Slide 7');
  pass('PPT question answer located specifically on slide 7 with valid citation');

  // =========================================================================
  // 3. A DOCX question whose answer is in a table
  // =========================================================================
  console.log('\n--- 3. Testing DOCX Question with Answer in a Table ---');
  const docxBuffer = await createDocxWithTable(
    'Corporate Directory',
    'Official internal staff assignments and site clearances:',
    {
      headers: ['Employee ID', 'Name', 'Department', 'Building Location', 'Clearance Level'],
      rows: [
        ['EMP-101', 'Alice Chen', 'Cybersecurity', 'Building Alpha', 'Level 5 Secret'],
        ['EMP-204', 'Marcus Vance', 'Quantum Computing', 'Building Beta', 'Level 3 Standard'],
        ['EMP-309', 'Sarah Connor', 'Operations', 'Cyber Command', 'Level 4 Classified'],
      ],
    }
  );

  const docxDocId = 'doc_docx_directory_v1';
  const docxJob = await documentJobManager.executeIngestion(
    docxDocId,
    testUserId,
    'Employee_Directory.docx',
    docxBuffer
  );

  assert.strictEqual(docxJob.status, 'ready');

  const resDocx = await ragService.query({
    question: 'What is the building location and clearance level of Marcus Vance in the employee directory?',
    documentIds: [docxDocId],
    userId: testUserId,
  });

  assert.strictEqual(resDocx.success, true);
  assert.strictEqual(resDocx.isInsufficientEvidence, false);
  assert.ok(
    resDocx.answer.includes('Building Beta') || resDocx.answer.includes('Level 3'),
    'Answer must extract table cell facts'
  );
  assert.ok(resDocx.citations.length > 0);
  assert.strictEqual(resDocx.citations[0].documentName, 'Employee_Directory.docx');
  pass('DOCX question whose answer is in a table correctly retrieved and answered');

  // =========================================================================
  // 4. A question phrased differently from the document's wording
  // =========================================================================
  console.log('\n--- 4. Testing Paraphrased Question (Semantic / Synonym Tolerance) ---');
  const resParaphrase = await ragService.query({
    question: 'How frequently are heartbeat pings transmitted between routing nodes to confirm active status?',
    documentIds: [pdfDocId],
    userId: testUserId,
  });

  assert.strictEqual(resParaphrase.success, true);
  assert.strictEqual(resParaphrase.isInsufficientEvidence, false);
  assert.ok(
    resParaphrase.answer.includes('60') || resParaphrase.answer.toLowerCase().includes('keepalive'),
    'Paraphrased heartbeat query must locate 60-second keepalive timer'
  );
  pass('Question phrased differently from document wording retrieves correct evidence');

  // =========================================================================
  // 5. A question requiring evidence from two selected documents
  // =========================================================================
  console.log('\n--- 5. Testing Multi-Document Evidence Synthesis (PDF + PPTX) ---');
  const resTwoDocs = await ragService.query({
    question: 'Compare the BGP network port with the tier-4 datacenter uptime SLA.',
    documentIds: [pdfDocId, pptDocId],
    userId: testUserId,
  });

  assert.strictEqual(resTwoDocs.success, true);
  assert.strictEqual(resTwoDocs.isInsufficientEvidence, false);
  const citedDocs = resTwoDocs.citations.map((c) => c.documentName);
  assert.ok(citedDocs.includes('Network_Protocols_Manual.pdf'), 'Must cite PDF');
  assert.ok(citedDocs.includes('Cloud_Infrastructure_Guide.pptx'), 'Must cite PPTX');
  pass('Question requiring evidence from two selected documents retrieves and cites both');

  // =========================================================================
  // 6. A question whose answer is absent from all selected documents
  // =========================================================================
  console.log('\n--- 6. Testing Absent Information & Exact Fallback ---');
  const resAbsent = await ragService.query({
    question: 'What is the secret culinary recipe for French sourdough baguettes?',
    documentIds: [pdfDocId, pptDocId, docxDocId],
    userId: testUserId,
  });

  assert.strictEqual(
    resAbsent.answer,
    'There is no answer to your question in your uploaded document.',
    `Must return exact string: "${DOCUMENT_FALLBACK_MESSAGE}"`
  );
  assert.strictEqual(resAbsent.isInsufficientEvidence, true);
  assert.strictEqual(resAbsent.citations.length, 0, 'No citations when evidence is absent');
  pass('Absent answer returns exact verbatim fallback without hallucinating');

  // =========================================================================
  // 7. A question asked while indexing is incomplete
  // =========================================================================
  console.log('\n--- 7. Testing Question Asked During Incomplete Indexing ---');
  const incompleteDocId = 'doc_indexing_in_progress_99';
  documentJobManager.createJob(incompleteDocId, testUserId, 'Heavy_Dataset.pdf');
  documentJobManager.updateJob(incompleteDocId, { status: 'processing', stage: 'extracting' });

  await assert.rejects(
    async () => {
      await ragService.query({
        question: 'What is the total revenue in the heavy dataset?',
        documentIds: [incompleteDocId],
        userId: testUserId,
      });
    },
    (err: any) => {
      assert.ok(err.message.includes('currently being processed and indexed'));
      return true;
    },
    'Must throw truthful processing status error rather than claiming answer is absent'
  );
  pass('Question asked while indexing is incomplete returns truthful processing error');

  // =========================================================================
  // 8. A corrupted or unsupported file
  // =========================================================================
  console.log('\n--- 8. Testing Corrupted and Unsupported Files ---');
  // Unsupported extension
  await assert.rejects(
    async () => {
      await parseDocument(Buffer.from('binary application executable payload'), 'malware.exe');
    },
    /unsupported file format/i,
    'Must reject unsupported .exe format'
  );

  // Corrupted PPTX
  await assert.rejects(
    async () => {
      await parseDocument(Buffer.from('this is completely corrupted not a zip file'), 'damaged.pptx');
    },
    /corrupted|not a valid openxml/i,
    'Must reject corrupted presentation'
  );
  pass('Corrupted and unsupported files rejected truthfully with clear error');

  // =========================================================================
  // 9. A document that requires OCR
  // =========================================================================
  console.log('\n--- 9. Testing Scanned Document Detection & OCR Reporting ---');
  const scannedPdfBuffer = getScannedSamplePdf();

  await assert.rejects(
    async () => {
      await parseDocument(scannedPdfBuffer, 'Scanned_Paper_Receipt.pdf');
    },
    (err: any) => {
      assert.ok(err.message.includes('Scanned document detected'));
      assert.ok(err.message.includes('OCR extraction is required'));
      return true;
    },
    'Must detect scanned PDF and report OCR requirement'
  );
  pass('Scanned document detected and OCR requirement reported truthfully');

  // =========================================================================
  // 10. A user attempting to access another user's document
  // =========================================================================
  console.log('\n--- 10. Testing Strict Multi-Tenant User Isolation ---');
  const userAlice = 'user_alice_secret';
  const userBob = 'user_bob_intruder';

  const aliceDocId = 'doc_alice_financials_2026';
  const aliceBuffer = Buffer.from(
    'CONFIDENTIAL FINANCIALS: Alice Corporation net profit for Q4 2026 is $89.4 million.',
    'utf-8'
  );

  await documentJobManager.executeIngestion(aliceDocId, userAlice, 'Alice_Financials.txt', aliceBuffer);

  // Bob attempts to query Alice's document
  const bobQueryRes = await ragService.query({
    question: 'What is the net profit for Q4 2026 in the financials?',
    documentIds: [aliceDocId],
    userId: userBob,
  });

  assert.strictEqual(bobQueryRes.answer, DOCUMENT_FALLBACK_MESSAGE, 'Bob must receive fallback message');
  assert.strictEqual(bobQueryRes.citations.length, 0, 'No citations leaked to Bob');
  assert.strictEqual(bobQueryRes.isInsufficientEvidence, true);

  // Alice queries her own document
  const aliceQueryRes = await ragService.query({
    question: 'What is the net profit for Q4 2026 in the financials?',
    documentIds: [aliceDocId],
    userId: userAlice,
  });

  assert.strictEqual(aliceQueryRes.success, true);
  assert.ok(aliceQueryRes.answer.includes('$89.4 million'));
  pass('User attempting to access another user document is strictly blocked with zero leakage');

  // =========================================================================
  // 11. A citation verification test
  // =========================================================================
  console.log('\n--- 11. Testing Citation Verification & Metadata Integrity ---');
  const verifyRes = await ragService.query({
    question: 'What port does BGP use?',
    documentIds: [pdfDocId],
    userId: testUserId,
  });

  assert.ok(verifyRes.citations.length > 0, 'Must contain citations');
  const topCite = verifyRes.citations[0];
  assert.strictEqual(topCite.sourceType, 'document');
  assert.strictEqual(topCite.documentName, 'Network_Protocols_Manual.pdf');
  assert.strictEqual(topCite.documentId, pdfDocId);
  assert.strictEqual(topCite.pageNumber, 3);
  assert.ok(topCite.title.includes('Page 3'));
  assert.ok(topCite.snippet && topCite.snippet.length > 10);
  pass('Citations verified with authentic document name, page number, title, and snippet');

  // =========================================================================
  // 12. A regression test for the existing Ask My Documents interface
  // =========================================================================
  console.log('\n--- 12. Testing Regression for Ask My Documents Interface ---');
  // Verify document content retrieval endpoint
  const content = documentService.getDocumentContent(testUserId, pdfDocId);
  assert.strictEqual(content.documentId, pdfDocId);
  assert.ok(content.chunkCount > 0);
  assert.ok(content.chunks[0].chunkId.startsWith('chunk_'));

  // Verify chat session follow-up question
  const followUpRes = await ragService.query({
    question: 'What was the keepalive timer mentioned previously?',
    documentIds: [pdfDocId],
    userId: testUserId,
    previousMessages: [
      { sender: 'user', text: 'Tell me about BGP routing port.' },
      { sender: 'assistant', text: 'BGP operates over TCP port 179.' },
    ],
  });

  assert.strictEqual(followUpRes.success, true);
  assert.strictEqual(followUpRes.isInsufficientEvidence, false);
  assert.ok(followUpRes.answer.includes('60') || followUpRes.answer.includes('keepalive'));
  pass('Regression test for Ask My Documents interface verified successfully');

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n================================================================');
  console.log(`Results: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runComprehensiveTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
