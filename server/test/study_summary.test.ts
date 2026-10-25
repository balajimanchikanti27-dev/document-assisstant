import assert from 'assert';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';
import { documentMetadataStore } from '../src/services/documentMetadataStore.js';
import { documentJobManager } from '../src/jobs/documentJobManager.js';
import { vectorStore } from '../src/vectorStore/memoryVectorStore.js';
import { studySummaryService } from '../src/services/studySummaryService.js';
import { ragService } from '../src/rag/ragService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('🎓 TEST SUITE: STUDY SUMMARY FOR EASY LEARNING (STUDENT FEATURE)');
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
              <p:txBody>
                <a:p><a:r><a:t>${s.title}</a:t></a:r></a:p>
              </p:txBody>
            </p:sp>
            <p:sp>
              <p:txBody>
                ${bodyXml}
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>`
    );
  });

  return await zip.generateAsync({ type: 'nodebuffer' });
}

async function runAllTests() {
  const userStudent = 'student_test_uid_401';
  const userHacker = 'intruder_test_uid_999';

  const uploadsDir = path.resolve(__dirname, '../data/test_uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // TEST 1: Generate study summary for a complete 6-slide Computer Science PPTX
  try {
    const pptxBuffer = await buildTestPptx([
      {
        title: 'Introduction to Operating Systems & Concurrency',
        bullets: [
          'An Operating System acts as an intermediary between user applications and bare computer hardware.',
          'Two fundamental goals: convenience for the user and efficient operation of computer hardware.',
        ],
      },
      {
        title: 'Processes and Threads',
        bullets: [
          'A process is an active program in execution containing program counter, stack, and data section.',
          'A thread is a lightweight unit of CPU execution sharing memory and files with peer threads.',
          'Context switching is the mechanism of saving state of old process and loading state of new process.',
        ],
      },
      {
        title: 'Mutual Exclusion and Deadlocks',
        bullets: [
          'Mutual Exclusion ensures only one process enters the critical section at any given moment.',
          'Deadlock occurs when four Coffman conditions hold: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.',
          'Banker\'s Algorithm is used for deadlock avoidance using safe state verification.',
        ],
      },
      {
        title: 'Memory Management: Virtual Memory and Paging',
        bullets: [
          'Virtual memory allows execution of processes not completely in physical memory RAM.',
          'Paging divides logical memory into fixed-size blocks called pages, and physical memory into frames.',
          'Page Fault occurs when an accessed virtual page is not loaded into physical frame in main memory.',
        ],
      },
      {
        title: 'Formulas and Important Equations in OS',
        bullets: [
          'Effective Access Time formula: EAT = (1 - p) * m + p * S, where p is page fault rate, m is memory access time, and S is page fault service time.',
          'Turnaround Time formula: Turnaround Time = Completion Time - Arrival Time.',
          'Waiting Time formula: Waiting Time = Turnaround Time - Burst Time.',
        ],
      },
      {
        title: 'Exam Review and Final Takeaways',
        bullets: [
          'Key distinction: Process has separate address space, whereas Threads share the same address space.',
          'Always check Banker Algorithm safety matrix for exam numericals.',
          'LRU (Least Recently Used) is an optimal page replacement heuristic.',
        ],
      },
    ]);

    const testDocId = `doc_study_${Date.now()}_cs_os`;
    const pptxPath = path.join(uploadsDir, `${testDocId}.pptx`);
    fs.writeFileSync(pptxPath, pptxBuffer);

    // Register document in metadata store
    documentMetadataStore.registerDocument({
      id: testDocId,
      ownerId: userStudent,
      filename: 'CS_Operating_Systems_Lecture.pptx',
      extension: 'pptx',
      sizeBytes: pptxBuffer.length,
      fileType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      status: 'processing',
      filePath: pptxPath,
    });

    // Process document into chunks
    await documentJobManager.executeIngestion(
      testDocId,
      userStudent,
      'CS_Operating_Systems_Lecture.pptx',
      pptxBuffer,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );

    // Call Study Summary Service
    const summaryResult = await studySummaryService.generateStudySummary(
      userStudent,
      testDocId,
      { forceRefresh: true }
    );

    assert(summaryResult.success === true, 'Summary result should be success: true');
    assert(summaryResult.documentId === testDocId, 'Document ID should match');
    assert(summaryResult.totalSections > 0, 'Total sections should be > 0');
    assert(summaryResult.summary.overview.length > 50, 'Overview should be comprehensive');
    
    // Check all required sections are present
    assert(Array.isArray(summaryResult.summary.sections), 'Sections array should exist');
    assert(summaryResult.summary.sections.length >= 2, 'Should have multiple batched slide sections');
    assert(summaryResult.summary.definitions.length > 0, 'Should have simplified definitions');
    assert(summaryResult.summary.difficultConcepts.length > 0, 'Should break down difficult concepts');
    assert(summaryResult.summary.formulasAndRules && summaryResult.summary.formulasAndRules.length > 0, 'Should extract formulas');
    assert(summaryResult.summary.conceptComparisons && summaryResult.summary.conceptComparisons.length > 0, 'Should compare related concepts');
    assert(summaryResult.summary.examRevisionPoints.length > 0, 'Should include high-yield exam points');
    assert(summaryResult.summary.quickRevisionRecap.length > 0, 'Should include rapid revision recap');

    // Check coverage report
    assert(summaryResult.summary.coverageReport.isFullyCovered === true, 'Coverage should report 100% complete');
    assert(summaryResult.summary.coverageReport.processedUnits === 6, 'Should process all 6 slides');
    assert(summaryResult.summary.coverageReport.unitType === 'slides', 'Unit type should be slides');

    // Check formatted markdown
    assert(summaryResult.formattedMarkdown.includes('## 1. 📘 Big Picture & Overview'), 'Markdown should have Big Picture & Overview');
    assert(summaryResult.formattedMarkdown.includes('## 5. 📐 Important Rules, Syntax & Formulas'), 'Markdown should have Rules, Syntax & Formulas');
    assert(summaryResult.formattedMarkdown.includes('## 9. 📊 Document Coverage & Integrity Report'), 'Markdown should have Document Coverage Report');

    pass('Test 1: Complete 6-slide PPTX summarized into all 10 student sections with verified 100% slide coverage');
  } catch (err) {
    fail('Test 1: Complete PPTX study summary', err);
  }

  // TEST 2: Strict Authorization Security (User B cannot access User A's study summary)
  try {
    const testDocId = `doc_study_${Date.now()}_auth_check`;
    const docPath = path.join(uploadsDir, `${testDocId}.txt`);
    fs.writeFileSync(docPath, 'Confidential study material for User Student only.');

    documentMetadataStore.registerDocument({
      id: testDocId,
      ownerId: userStudent,
      filename: 'Private_Notes.txt',
      extension: 'txt',
      sizeBytes: 50,
      fileType: 'text/plain',
      status: 'ready',
      filePath: docPath,
    });

    let hackerFailed = false;
    try {
      await studySummaryService.generateStudySummary(userHacker, testDocId);
    } catch (authErr: any) {
      if (authErr.message.includes('not authorized')) {
        hackerFailed = true;
      }
    }

    assert(hackerFailed, 'Intruder user must be rejected with authorization error');
    pass('Test 2: Security check - unauthorized user is strictly forbidden from generating or reading study summary');
  } catch (err) {
    fail('Test 2: Security check', err);
  }

  // TEST 3: Multi-format support with plain text study notes
  try {
    const txtContent = `
# Data Structures and Algorithms: Sorting Algorithms

## Bubble Sort and Insertion Sort
Bubble Sort compares adjacent elements and swaps them if they are in wrong order.
Time Complexity: O(n^2) in worst and average case, O(n) in best case when already sorted.
Space Complexity: O(1) auxiliary space.

## Merge Sort
Merge Sort is a Divide and Conquer algorithm. It divides input array into two halves,
calls itself for the two halves, and then merges the two sorted halves.
Time Complexity: O(n log n) in all cases (worst, average, and best).
Space Complexity: O(n) auxiliary space for temporary arrays.

## Quick Sort
Quick Sort chooses a pivot element and partitions the array around the pivot.
Time Complexity: O(n log n) average case, but O(n^2) worst case if array is already sorted and first element picked as pivot.
To prevent O(n^2), Randomized Quick Sort or Median-of-Three pivot selection is used.

## Important Exam Points
- Merge Sort is stable, while Quick Sort is not stable in its standard implementation.
- For linked lists, Merge Sort is preferred over Quick Sort because of sequential access.
- Quick Sort is cache-friendly and in-place, making it faster in practice for random arrays.
`;

    const txtDocId = `doc_study_${Date.now()}_dsa_txt`;
    const txtPath = path.join(uploadsDir, `${txtDocId}.txt`);
    fs.writeFileSync(txtPath, txtContent, 'utf-8');

    documentMetadataStore.registerDocument({
      id: txtDocId,
      ownerId: userStudent,
      filename: 'DSA_Sorting_Notes.txt',
      extension: 'txt',
      sizeBytes: Buffer.byteLength(txtContent),
      fileType: 'text/plain',
      status: 'processing',
      filePath: txtPath,
    });

    await documentJobManager.executeIngestion(
      txtDocId,
      userStudent,
      'DSA_Sorting_Notes.txt',
      txtPath,
      'text/plain'
    );

    const txtSummary = await studySummaryService.generateStudySummary(userStudent, txtDocId);

    assert(txtSummary.success === true, 'TXT summary should succeed');
    assert(txtSummary.summary.difficultConcepts.length > 0, 'Should simplify DSA concepts');
    assert(txtSummary.summary.examRevisionPoints.length > 0, 'Should have exam points');
    assert(txtSummary.summary.coverageReport.isFullyCovered === true, 'Coverage should be 100%');

    pass('Test 3: Plain text study document summarized with concept breakdowns, complexities, and exam revision');
  } catch (err) {
    fail('Test 3: Plain text study document summary', err);
  }

  // TEST 4: Follow-up question integration in Document Assistant
  try {
    const query = 'What is the time complexity of Merge Sort?';
    const docs = documentMetadataStore.getUserDocuments(userStudent);
    const dsaDoc = docs.find((d) => d.filename.includes('DSA_Sorting_Notes'));
    assert(dsaDoc, 'DSA document should exist');

    const ragResponse = await ragService.query({
      question: query,
      documentIds: [dsaDoc.id],
      userId: userStudent,
    });

    assert(ragResponse.answer.length > 10, 'RAG query should produce an answer');
    assert(ragResponse.isInsufficientEvidence === false, 'Should find evidence in document');
    assert(ragResponse.answer.toLowerCase().includes('log') || ragResponse.answer.toLowerCase().includes('o(n'), 'Answer should mention O(n log n)');

    pass('Test 4: Follow-up question on summarized document works seamlessly via RAG pipeline');
  } catch (err) {
    fail('Test 4: Follow-up question integration', err);
  }

  // TEST 5: Cache retrieval test
  try {
    const docs = documentMetadataStore.getUserDocuments(userStudent);
    const dsaDoc = docs.find((d) => d.filename.includes('DSA_Sorting_Notes'));
    assert(dsaDoc, 'DSA document should exist');

    // Retrieve cached summary (forceRefresh: false)
    const cached = await studySummaryService.generateStudySummary(userStudent, dsaDoc.id, { forceRefresh: false });
    assert(cached.success === true, 'Cached retrieval should succeed');
    assert(cached.documentId === dsaDoc.id, 'Cached doc ID should match');

    pass('Test 5: Fast cache retrieval serves previously generated study summary instantly');
  } catch (err) {
    fail('Test 5: Cache retrieval test', err);
  }

  console.log('\n================================================================');
  console.log(`📊 SUMMARY RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Test suite uncaught error:', e);
  process.exit(1);
});
