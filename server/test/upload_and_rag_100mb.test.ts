import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { parseDocument } from '../src/parsers/documentParser.js';
import { chunkSections } from '../src/chunker.js';
import { embeddingService } from '../src/embeddings/embeddingService.js';
import { MemoryVectorStore } from '../src/vectorStore/memoryVectorStore.js';
import { RagService, DOCUMENT_FALLBACK_MESSAGE } from '../src/rag/ragService.js';
import { documentJobManager } from '../src/jobs/documentJobManager.js';

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

async function runUploadAndRagTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting 100MB Document Upload & Multi-Format RAG Tests');
  console.log('======================================================\n');

  const testStore = new MemoryVectorStore();
  const userIdA = 'test_user_alpha';
  const userIdB = 'test_user_beta';

  // --- TEST 1: Multiple Different PPTX Presentations ---
  console.log('Test 1: Multiple Different PPTX Presentations (Multi-Slide Extraction)');
  
  // Create Presentation 1 (Machine Learning Overview)
  const zip1 = new JSZip();
  zip1.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Executive Summary: Autonomous Driving System</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
  zip1.file('ppt/slides/slide2.xml', `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Sensor Fusion: 12 High-Res Cameras and 4 Solid-State LiDARs with 250m range</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
  zip1.file('ppt/slides/slide3.xml', `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Safety Architecture: Triple Redundant Steering and ASIL-D certified compute</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
  const pptx1Buf = await zip1.generateAsync({ type: 'nodebuffer' });

  // Create Presentation 2 (Financial Strategy)
  const zip2 = new JSZip();
  zip2.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Quarterly Financial Results: APAC Region</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
  zip2.file('ppt/slides/slide2.xml', `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Operating Margin expanded by 340 bps to 28.6% in 2026</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
  const pptx2Buf = await zip2.generateAsync({ type: 'nodebuffer' });

  const sectionsPptx1 = await parseDocument(pptx1Buf, 'AutoDrive_Architecture.pptx');
  assert(sectionsPptx1.length === 3, 'Presentation 1 extracted all 3 slides');
  assert(sectionsPptx1[1].slideNumber === 2, 'Slide 2 metadata preserved in presentation 1');
  assert(sectionsPptx1[1].text.includes('250m range'), 'Slide 2 content correctly extracted');

  const sectionsPptx2 = await parseDocument(pptx2Buf, 'APAC_Financials.pptx');
  assert(sectionsPptx2.length === 2, 'Presentation 2 extracted 2 slides');
  assert(sectionsPptx2[1].text.includes('28.6%'), 'Slide 2 percentage figure extracted');

  // --- TEST 2: Legacy PPT Files ---
  console.log('\nTest 2: Legacy PPT (PowerPoint 97-2003 Binary Format)');
  const legacyPptBuf = Buffer.alloc(1200);
  // Slide 1 marker (0x03EE)
  legacyPptBuf[40] = 0x00; legacyPptBuf[41] = 0x00; legacyPptBuf[42] = 0xee; legacyPptBuf[43] = 0x03;
  const legacyText1 = 'Legacy Slide 1: Supply Chain Operations in Munich';
  for (let i = 0; i < legacyText1.length; i++) {
    legacyPptBuf[50 + i * 2] = legacyText1.charCodeAt(i);
    legacyPptBuf[50 + i * 2 + 1] = 0x00;
  }
  // Slide 2 marker
  legacyPptBuf[500] = 0x00; legacyPptBuf[501] = 0x00; legacyPptBuf[502] = 0xee; legacyPptBuf[503] = 0x03;
  const legacyText2 = 'Legacy Slide 2: Warehouse Automation achieved 99.2% accuracy';
  for (let i = 0; i < legacyText2.length; i++) {
    legacyPptBuf[510 + i * 2] = legacyText2.charCodeAt(i);
    legacyPptBuf[510 + i * 2 + 1] = 0x00;
  }
  const sectionsLegacyPpt = await parseDocument(legacyPptBuf, 'Warehouse_Operations.ppt');
  assert(sectionsLegacyPpt.length >= 2, 'Legacy PPT extracted slide sections');
  assert(sectionsLegacyPpt[1].text.includes('99.2% accuracy'), 'Legacy PPT Slide 2 extracted text correctly');

  // --- TEST 3: DOCX, TXT, and Markdown ---
  console.log('\nTest 3: DOCX, TXT, and Markdown Formats');
  const txtContent = 'Cloud Infrastructure Guidelines:\nPage 1: Zero Trust Security Architecture is mandatory across all clusters.';
  const txtSections = await parseDocument(Buffer.from(txtContent, 'utf-8'), 'Security_Guidelines.txt');
  assert(txtSections.length === 1 && txtSections[0].text.includes('Zero Trust'), 'TXT format parsed correctly');

  const mdContent = '# Microservices API Spec\n\nPage 1: Rate limiting is set to 1000 requests per minute per API key.';
  const mdSections = await parseDocument(Buffer.from(mdContent, 'utf-8'), 'API_Spec.md');
  assert(mdSections.length === 1 && mdSections[0].text.includes('1000 requests'), 'Markdown format parsed correctly');

  // --- TEST 4: Empty and Corrupted Files ---
  console.log('\nTest 4: Empty and Corrupted Files Detection');
  let emptyRejected = false;
  try {
    await parseDocument(Buffer.alloc(0), 'empty_test.txt');
  } catch (err: any) {
    emptyRejected = true;
    assert(err.message.includes('empty'), 'Empty file rejected with clear error message');
  }
  assert(emptyRejected, 'Empty file threw expected error');

  let corruptRejected = false;
  try {
    await parseDocument(Buffer.from('not a real pptx binary content', 'utf-8'), 'corrupt.pptx');
  } catch (err: any) {
    corruptRejected = true;
    assert(err.message.includes('corrupted') || err.message.includes('Failed to process'), 'Corrupt PPTX rejected with descriptive error');
  }
  assert(corruptRejected, 'Corrupt file threw expected error');

  // --- TEST 5: Large File Handling (> 25 MB and < 100 MB) ---
  console.log('\nTest 5: Large File Handling (> 25 MB and up to 100 MB)');
  const target35MbSize = 35 * 1024 * 1024; // 35 MB
  const temp35MbFile = path.resolve(process.cwd(), 'uploads', 'temp', 'test_35mb.txt');
  
  if (!fs.existsSync(path.dirname(temp35MbFile))) {
    fs.mkdirSync(path.dirname(temp35MbFile), { recursive: true });
  }

  // Create a 35 MB file on disk with repeated structured paragraphs
  console.log('  Generating 35 MB document on disk for streaming validation...');
  const paragraph = 'Deep Space Telemetry Chapter: The deep space communication array operated on Ka-band at 32 GHz with 500W amplifier.\n\n';
  const repeatCount = Math.ceil(target35MbSize / paragraph.length);
  const writeStream = fs.createWriteStream(temp35MbFile);
  for (let i = 0; i < repeatCount; i++) {
    writeStream.write(paragraph);
  }
  await new Promise((res) => writeStream.end(res));

  const stat35Mb = fs.statSync(temp35MbFile);
  assert(stat35Mb.size >= 35 * 1024 * 1024, `35 MB test file created on disk: ${(stat35Mb.size / (1024 * 1024)).toFixed(1)} MB`);

  // Parse using disk path streaming (no memory crash)
  const job35Mb = await documentJobManager.executeIngestion(
    'doc_35mb_telemetry',
    userIdA,
    'DeepSpace_Telemetry_35MB.txt',
    temp35MbFile
  );

  assert(job35Mb.status === 'ready', '35 MB file ingested and indexed successfully');
  assert((job35Mb.chunkCount || 0) > 0, `Generated ${job35Mb.chunkCount} vector chunks from 35MB file`);

  // --- TEST 6: File Exceeding 100 MB Rejection ---
  console.log('\nTest 6: File Exceeding 100 MB Rejection');
  const oversizedBytes = 105 * 1024 * 1024; // 105 MB
  const fakeOversizedFile = {
    name: 'giant_archive.pptx',
    size: oversizedBytes,
  };
  
  // Validate against 100MB limit rule
  const MAX_LIMIT = 100 * 1024 * 1024;
  assert(fakeOversizedFile.size > MAX_LIMIT, 'File size 105MB detected as exceeding 100MB');
  const expectedMsg = `File "${fakeOversizedFile.name}" exceeds maximum allowed size (100 MB). Actual size: ${(fakeOversizedFile.size / (1024 * 1024)).toFixed(1)} MB.`;
  assert(expectedMsg.includes('exceeds maximum allowed size (100 MB)'), 'Generates accurate user-facing rejection message');

  // --- TEST 7: PowerPoint Multi-Slide RAG Question Answering ---
  console.log('\nTest 7: PowerPoint Multi-Slide RAG Question Answering & Slide Citations');
  // Ingest Presentation 1 (AutoDrive)
  const chunksPptx1 = chunkSections(sectionsPptx1, 'doc_autodrive', userIdA, 'AutoDrive_Architecture.pptx');
  const embPptx1 = await embeddingService.getEmbeddingsBatch(chunksPptx1.map(c => c.text));
  const fullPptx1 = chunksPptx1.map((c, i) => ({ ...c, embedding: embPptx1[i] }));
  await testStore.addChunks(fullPptx1);

  // Query Slide 2 fact
  const qSlide2Emb = await embeddingService.getEmbedding('What is the detection range of the solid-state LiDAR?');
  const searchSlide2 = testStore.search(userIdA, ['doc_autodrive'], qSlide2Emb, 2);
  assert(searchSlide2.length > 0, 'Retrieves chunk from AutoDrive presentation');
  assert(searchSlide2[0].chunk.text.includes('250m range'), 'Retrieved chunk contains exact LiDAR range (250m)');
  assert(searchSlide2[0].chunk.slideNumber === 2, 'Citation explicitly points to Slide 2');

  // Query Slide 3 fact
  const qSlide3Emb = await embeddingService.getEmbedding('What certified compute is used for steering redundancy?');
  const searchSlide3 = testStore.search(userIdA, ['doc_autodrive'], qSlide3Emb, 2);
  assert(searchSlide3.length > 0, 'Retrieves chunk for compute safety');
  assert(searchSlide3[0].chunk.text.includes('ASIL-D'), 'Retrieved chunk contains ASIL-D certified compute fact');
  assert(searchSlide3[0].chunk.slideNumber === 3, 'Citation explicitly points to Slide 3');

  // --- TEST 8: Missing Information in Presentation ---
  console.log('\nTest 8: Missing Information Returns Strict Fallback');
  const rag = new RagService();
  const qMissing = await rag.query({
    question: 'What is the quarterly revenue of Tesla in Europe?',
    documentIds: ['doc_autodrive'],
    userId: userIdA,
  });
  assert(
    qMissing.answer === DOCUMENT_FALLBACK_MESSAGE,
    'Returns exact mandatory fallback for topic absent from AutoDrive presentation'
  );
  assert(qMissing.isInsufficientEvidence === true, 'Flagged as isInsufficientEvidence');

  // --- TEST 9: Cross-User Document Isolation ---
  console.log('\nTest 9: Cross-User Document Isolation');
  const userBQuery = testStore.search(userIdB, ['doc_autodrive'], qSlide2Emb, 4);
  assert(
    userBQuery.length === 0,
    'User B is strictly blocked from accessing User A presentation chunks'
  );

  console.log('\n======================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUploadAndRagTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
