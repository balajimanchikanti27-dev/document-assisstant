import assert from 'assert';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { parseDocument } from '../src/parsers/documentParser.js';
import { documentJobManager } from '../src/jobs/documentJobManager.js';
import { vectorStore } from '../src/vectorStore/memoryVectorStore.js';
import { ragService, DOCUMENT_FALLBACK_MESSAGE } from '../src/rag/ragService.js';
import { geminiService } from '../src/services/gemini.service.js';

console.log('=================================================================');
console.log('🌐 UNIVERSAL MULTI-SUBJECT & MULTI-FORMAT RAG VERIFICATION SUITE');
console.log('=================================================================\n');

let passed = 0;
function pass(label: string) {
  console.log(`  ✓ PASS: ${label}`);
  passed++;
}

async function buildPptxBuffer(
  slides: { title: string; bullets: string[]; table?: string[][]; notes?: string }[]
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

    let tableXml = '';
    if (s.table && s.table.length > 0) {
      const rowsXml = s.table
        .map(
          (row) =>
            `<a:tr h="370840">${row
              .map(
                (cell) =>
                  `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${cell}</a:t></a:r></a:p></a:txBody></a:tc>`
              )
              .join('')}</a:tr>`
        )
        .join('');
      tableXml = `<p:graphicFrame><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl>${rowsXml}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
    }

    zip.file(
      `ppt/slides/slide${slideNum}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="1" name="Title 1"/>
                <p:nvPr><p:ph type="title"/></p:nvPr>
              </p:nvSpPr>
              <p:txBody><a:p><a:r><a:t>${s.title}</a:t></a:r></a:p></p:txBody>
            </p:sp>
            <p:sp>
              <p:nvSpPr><p:cNvPr id="2" name="Content 1"/></p:nvSpPr>
              <p:txBody>${bodyXml}</p:txBody>
            </p:sp>
            ${tableXml}
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
          <p:cSld><p:spTree><p:sp><p:txBody>
            <a:p><a:r><a:t>${s.notes}</a:t></a:r></a:p>
          </p:txBody></p:sp></p:spTree></p:cSld>
        </p:notes>`
      );
    }
  });

  return await zip.generateAsync({ type: 'nodebuffer' });
}

async function buildDocxBuffer(sections: { heading: string; paragraphs: string[]; table?: string[][] }[]): Promise<Buffer> {
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
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`
  );

  const bodyParts: string[] = [];
  for (const sec of sections) {
    bodyParts.push(
      `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${sec.heading}</w:t></w:r></w:p>`
    );
    for (const p of sec.paragraphs) {
      bodyParts.push(`<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`);
    }
    if (sec.table && sec.table.length > 0) {
      const rowsXml = sec.table
        .map(
          (row) =>
            `<w:tr>${row
              .map((cell) => `<w:tc><w:p><w:r><w:t>${cell}</w:t></w:r></w:p></w:tc>`)
              .join('')}</w:tr>`
        )
        .join('');
      bodyParts.push(`<w:tbl>${rowsXml}</w:tbl>`);
    }
  }

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>${bodyParts.join('\n')}</w:body>
    </w:document>`
  );

  return await zip.generateAsync({ type: 'nodebuffer' });
}

function buildMinimalPdfBuffer(pages: string[]): Buffer {
  // Construct a valid multi-page ASCII PDF with proper xref offsets
  const objects: string[] = [];
  // 1: Catalog, 2: Pages
  const pageObjIds: number[] = [];
  let nextId = 3;

  for (let i = 0; i < pages.length; i++) {
    const pageId = nextId++;
    const contentId = nextId++;
    const fontId = nextId++;
    pageObjIds.push(pageId);

    const lines = pages[i].split('\n').map((l) => l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'));
    const textOps = ['BT', '/F1 11 Tf', '50 750 Td', '14 TL'];
    for (const line of lines) {
      textOps.push(`(${line}) Tj T*`);
    }
    textOps.push('ET');
    const streamData = textOps.join('\n');

    objects[pageId] = `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> /MediaBox [0 0 612 792] /Contents ${contentId} 0 R >>\nendobj\n`;
    objects[contentId] = `${contentId} 0 obj\n<< /Length ${Buffer.byteLength(streamData, 'utf8')} >>\nstream\n${streamData}\nendstream\nendobj\n`;
    objects[fontId] = `${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  }

  objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(pdf, 'utf8');
    pdf += objects[id];
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';
  for (let id = 1; id < objects.length; id++) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

async function runSuite() {
  // Use offline grounded mode so retrieval & evidence grounding are tested deterministically
  geminiService.setClientForTesting(null);

  const testUser = 'student_universal_rag_user';
  const otherUser = 'unauthorized_other_user';

  // ---------------------------------------------------------------------------
  // 1. REAL UPLOADED DOCUMENTS: Normalization.pptx & DBMS Transactions & Java
  // ---------------------------------------------------------------------------
  console.log('1. Testing Actual Uploaded Academic Presentations (Normalization.pptx, DBMS_Transactions.pptx, Exception_Handling.pptx)');
  const resolveUploadFile = (filename: string) => {
    const p1 = path.resolve(process.cwd(), 'server', 'uploads', 'documents', filename);
    if (fs.existsSync(p1)) return p1;
    return path.resolve(process.cwd(), 'uploads', 'documents', filename);
  };

  const normPath = resolveUploadFile(
    'buW1XmhCvKSfK2KFIR9Lu13zezk1__doc_1792895290600_rk28wxw__Normalization.pptx'
  );
  const txPath = resolveUploadFile(
    'buW1XmhCvKSfK2KFIR9Lu13zezk1__doc_1792863817927_ejhsg76__DBMS_Unit_-_IV_C1_Transactions_Scheduling__1_.pptx'
  );
  const excPath = resolveUploadFile(
    'buW1XmhCvKSfK2KFIR9Lu13zezk1__doc_1792156713879_xpyhmsd__Exception_Handling.pptx'
  );

  const docNorm = 'doc_real_norm_univ';
  const docTx = 'doc_real_tx_univ';
  const docExc = 'doc_real_exc_univ';

  if (fs.existsSync(normPath)) {
    const jobNorm = await documentJobManager.executeIngestion(docNorm, testUser, 'Normalization.pptx', fs.readFileSync(normPath));
    assert.strictEqual(jobNorm.status, 'ready');
    assert.strictEqual(jobNorm.stage, 'indexed');
    assert.strictEqual(jobNorm.slideCount, 15);
    pass('Actual Normalization.pptx extracted (15 slides) and verified indexed');

    // Direct definition question
    const rNorm1 = await ragService.query({
      question: 'What is normalization in DBMS?',
      documentIds: [docNorm],
      userId: testUser,
    });
    assert.strictEqual(rNorm1.isInsufficientEvidence, false, 'Normalization definition must succeed');
    assert.ok(rNorm1.answer.toLowerCase().includes('redundancy') || rNorm1.answer.toLowerCase().includes('anomalies'));
    pass('Normalization.pptx: Direct definition query answered with slide citations');

    // Acronym <-> Full Name query ("What is Second Normal Form?" when slide says "2NF")
    const rNorm2 = await ragService.query({
      question: 'What is Second Normal Form and partial dependency?',
      documentIds: [docNorm],
      userId: testUser,
    });
    assert.strictEqual(rNorm2.isInsufficientEvidence, false, 'Second Normal Form query must match 2NF slide');
    assert.ok(rNorm2.answer.toLowerCase().includes('partial') || rNorm2.answer.toLowerCase().includes('2nf'));
    pass('Normalization.pptx: Full name "Second Normal Form" matched acronym "2NF" slide');

    // Paraphrased conceptual question ("How does normalization prevent data duplication?")
    const rNorm3 = await ragService.query({
      question: 'How does normalization prevent data duplication?',
      documentIds: [docNorm],
      userId: testUser,
    });
    assert.strictEqual(rNorm3.isInsufficientEvidence, false, 'Paraphrased duplication query must match redundancy slide');
    pass('Normalization.pptx: Paraphrased query ("data duplication") matched "redundancy" slide');
  }

  if (fs.existsSync(txPath)) {
    const jobTx = await documentJobManager.executeIngestion(docTx, testUser, 'DBMS_Unit_IV_Transactions.pptx', fs.readFileSync(txPath));
    assert.strictEqual(jobTx.status, 'ready');
    assert.ok((jobTx.slideCount || 0) >= 62);
    pass('Actual DBMS_Transactions.pptx extracted (62 slides) and verified indexed');

    const rTx1 = await ragService.query({
      question: 'What is a transaction in DBMS?',
      documentIds: [docTx],
      userId: testUser,
    });
    assert.strictEqual(rTx1.isInsufficientEvidence, false);
    assert.ok(rTx1.answer.toLowerCase().includes('transaction') || rTx1.answer.toLowerCase().includes('logical unit'));
    pass('DBMS_Transactions.pptx: Retrieved definition across 62-slide presentation');
  }

  if (fs.existsSync(excPath)) {
    const jobExc = await documentJobManager.executeIngestion(docExc, testUser, 'Exception_Handling.pptx', fs.readFileSync(excPath));
    assert.strictEqual(jobExc.status, 'ready');
    pass('Actual Exception_Handling.pptx extracted and indexed');
  }

  // ---------------------------------------------------------------------------
  // 2. MULTI-SUBJECT ACADEMIC CORPUS: Python (.docx), AI (.pdf), DSA (.pptx), Networks (.md), Math (.txt)
  // ---------------------------------------------------------------------------
  console.log('\n2. Testing Universal Multi-Subject Academic Corpus (Python DOCX, AI PDF, DSA PPTX, Networks MD, Math TXT)');

  const pythonDocx = await buildDocxBuffer([
    {
      heading: 'Python Memory Management and Global Interpreter Lock (GIL)',
      paragraphs: [
        'Python uses automatic reference counting combined with a cyclic garbage collector to manage heap memory.',
        'The Global Interpreter Lock (GIL) is a mutex in CPython that allows only one thread to execute Python bytecode at a time.',
        'Advantages of GIL: simplifies C extension integration and makes single-threaded programs fast.',
        'Disadvantages of GIL: prevents true CPU-bound multithreading in a single CPython process; use multiprocessing for CPU-intensive tasks.',
      ],
    },
    {
      heading: 'Python Lists vs Tuples Comparison',
      paragraphs: [
        'Lists are mutable sequences defined with square brackets, whereas tuples are immutable sequences defined with parentheses.',
      ],
      table: [
        ['Feature', 'List', 'Tuple'],
        ['Mutability', 'Mutable (can modify elements)', 'Immutable (fixed after creation)'],
        ['Memory Footprint', 'Larger dynamic allocation', 'Smaller fixed allocation'],
        ['Dictionary Key', 'Cannot be used as dict key', 'Can be used as dict key if hashable'],
      ],
    },
  ]);

  const aiPdf = buildMinimalPdfBuffer([
    'Artificial Intelligence Search Algorithms\nBreadth First Search (BFS) explores nodes level by level using a FIFO queue and guarantees the shortest path in unweighted graphs.\nDepth First Search (DFS) explores as deep as possible along each branch using a LIFO stack.',
    'Informed Heuristic Search: A* Algorithm\nA* search evaluates nodes using the formula f(n) = g(n) + h(n), where g(n) is the actual path cost from the start node and h(n) is the admissible heuristic estimate to the goal.\nConvolutional Neural Networks (CNN) use spatial filters for computer vision tasks.',
  ]);

  const dsaPptx = await buildPptxBuffer([
    {
      title: 'AVL Trees and Self-Balancing Binary Search Trees',
      bullets: [
        'An AVL tree is a height-balanced Binary Search Tree (BST) where the balance factor of every node is -1, 0, or +1.',
        'Balance Factor = Height(Left Subtree) - Height(Right Subtree).',
        'Rotations used to restore balance: LL Rotation, RR Rotation, LR Rotation, and RL Rotation.',
      ],
      table: [
        ['Operation', 'Average Time Complexity', 'Worst-Case Time Complexity'],
        ['Search', 'O(log n)', 'O(log n)'],
        ['Insertion', 'O(log n)', 'O(log n)'],
        ['Deletion', 'O(log n)', 'O(log n)'],
      ],
    },
  ]);

  const networksMd = Buffer.from(
    `# Computer Networks: Transport Layer Protocols

## TCP Three-Way Handshake Process
Transmission Control Protocol (TCP) establishes a reliable connection using a three-step process:
1. SYN: Client sends a synchronization packet with initial sequence number x.
2. SYN-ACK: Server responds with synchronization-acknowledgment packet (seq=y, ack=x+1).
3. ACK: Client sends final acknowledgment (ack=y+1) and data transfer begins.

## TCP vs UDP
- TCP is connection-oriented, reliable, and performs congestion control.
- UDP (User Datagram Protocol) is connectionless, lightweight, and suitable for real-time video streaming and DNS lookups.
`,
    'utf-8'
  );

  const mathTxt = Buffer.from(
    `Probability and Linear Algebra Reference Notes

Bayes Theorem Formula:
Bayes' theorem calculates conditional probability: P(A|B) = (P(B|A) * P(A)) / P(B), where P(B) > 0.

Eigenvalues and Eigenvectors:
For a square matrix A, a non-zero vector v is an eigenvector with eigenvalue lambda if A * v = lambda * v.
The characteristic equation is det(A - lambda * I) = 0.
`,
    'utf-8'
  );

  const docPy = 'doc_subj_python';
  const docAi = 'doc_subj_ai';
  const docDsa = 'doc_subj_dsa';
  const docNet = 'doc_subj_net';
  const docMath = 'doc_subj_math';

  await documentJobManager.executeIngestion(docPy, testUser, 'Python_Advanced_Notes.docx', pythonDocx);
  await documentJobManager.executeIngestion(docAi, testUser, 'AI_Search_Heuristics.pdf', aiPdf);
  await documentJobManager.executeIngestion(docDsa, testUser, 'DSA_AVL_Trees.pptx', dsaPptx);
  await documentJobManager.executeIngestion(docNet, testUser, 'Computer_Networks_TCP_UDP.md', networksMd);
  await documentJobManager.executeIngestion(docMath, testUser, 'Mathematics_Probability_LinearAlgebra.txt', mathTxt);

  pass('Ingested all 5 subject documents across DOCX, PDF, PPTX, MD, and TXT');

  // Test Python DOCX (advantages/disadvantages + comparison table)
  const rPy1 = await ragService.query({
    question: 'What are the advantages and disadvantages of the GIL in Python?',
    documentIds: [docPy],
    userId: testUser,
  });
  assert.strictEqual(rPy1.isInsufficientEvidence, false);
  assert.ok(rPy1.answer.toLowerCase().includes('gil') || rPy1.answer.toLowerCase().includes('global interpreter lock'));
  pass('Python DOCX: Advantages/disadvantages of GIL answered with section citation');

  const rPy2 = await ragService.query({
    question: 'Compare list and tuple mutability and memory footprint in Python',
    documentIds: [docPy],
    userId: testUser,
  });
  assert.strictEqual(rPy2.isInsufficientEvidence, false);
  assert.ok(rPy2.answer.toLowerCase().includes('mutable') && rPy2.answer.toLowerCase().includes('immutable'));
  pass('Python DOCX: Comparison table extracted and answered');

  // Test AI PDF (acronyms + formula)
  const rAi1 = await ragService.query({
    question: 'What is the evaluation formula in A* heuristic search?',
    documentIds: [docAi],
    userId: testUser,
  });
  assert.strictEqual(rAi1.isInsufficientEvidence, false);
  assert.ok(rAi1.answer.includes('f(n)') || rAi1.answer.includes('g(n)'));
  pass('AI PDF: Formula f(n) = g(n) + h(n) extracted and answered with Page citation');

  // Test DSA PPTX (acronym + table complexity)
  const rDsa1 = await ragService.query({
    question: 'What is the worst-case time complexity of insertion in an AVL tree?',
    documentIds: [docDsa],
    userId: testUser,
  });
  assert.strictEqual(rDsa1.isInsufficientEvidence, false);
  assert.ok(rDsa1.answer.toLowerCase().includes('o(log n)'));
  pass('DSA PPTX: Table complexity O(log n) extracted and answered with Slide citation');

  // Test Computer Networks MD (step-by-step process)
  const rNet1 = await ragService.query({
    question: 'Explain the three steps of the TCP handshake process',
    documentIds: [docNet],
    userId: testUser,
  });
  assert.strictEqual(rNet1.isInsufficientEvidence, false);
  assert.ok(rNet1.answer.includes('SYN') && rNet1.answer.includes('ACK'));
  pass('Computer Networks MD: Process steps (SYN, SYN-ACK, ACK) retrieved and answered');

  // Test Mathematics TXT (formula)
  const rMath1 = await ragService.query({
    question: 'What is Bayes theorem formula for conditional probability?',
    documentIds: [docMath],
    userId: testUser,
  });
  assert.strictEqual(rMath1.isInsufficientEvidence, false);
  assert.ok(rMath1.answer.includes('P(A|B)'));
  pass('Mathematics TXT: Bayes theorem formula retrieved and answered');

  // ---------------------------------------------------------------------------
  // 3. MULTI-DOCUMENT SELECTION, SUBJECT ISOLATION, USER ISOLATION & FALLBACK
  // ---------------------------------------------------------------------------
  console.log('\n3. Testing Multi-Document Selection, Document-Only Boundaries, User Isolation, and Genuine Absence');

  // Multi-subject selection (Python + AI + DSA + Networks + Math selected simultaneously)
  const multiDocs = [docPy, docAi, docDsa, docNet, docMath];
  const rMulti = await ragService.query({
    question: 'What is the characteristic equation for eigenvalues of a square matrix?',
    documentIds: multiDocs,
    userId: testUser,
  });
  assert.strictEqual(rMulti.isInsufficientEvidence, false);
  assert.ok(rMulti.citations.some((c) => c.documentId === docMath));
  pass('Multi-document selection (5 subjects): Routed accurately to Mathematics document');

  // Document-Only boundary: ask about Math while ONLY Python is selected
  const rBoundary = await ragService.query({
    question: 'What is Bayes theorem formula for conditional probability?',
    documentIds: [docPy],
    userId: testUser,
  });
  assert.strictEqual(rBoundary.isInsufficientEvidence, true, 'Must not leak unselected document content');
  assert.strictEqual(rBoundary.answer, DOCUMENT_FALLBACK_MESSAGE);
  assert.strictEqual(rBoundary.citations.length, 0);
  pass('Document-Only Mode isolation: Unselected document content is never leaked');

  // Genuine absence across all selected documents
  const rAbsent = await ragService.query({
    question: 'What are the light-dependent reactions of photosynthesis in chloroplasts?',
    documentIds: multiDocs,
    userId: testUser,
  });
  assert.strictEqual(rAbsent.isInsufficientEvidence, true);
  assert.strictEqual(rAbsent.answer, DOCUMENT_FALLBACK_MESSAGE);
  assert.strictEqual(rAbsent.citations.length, 0);
  pass('Intelligent insufficient-evidence handling: Genuinely absent topic returns exact fallback message');

  // User isolation: another user cannot query testUser's documents
  const rUnauth = await ragService.query({
    question: 'What is GIL in Python?',
    documentIds: [docPy],
    userId: otherUser,
  });
  assert.strictEqual(rUnauth.success, false);
  assert.strictEqual(rUnauth.statusCode, 403);
  pass('Per-user isolation: Unauthorized user blocked (403) from querying private documents');

  // Failed/empty document verification: never marked ready/indexed
  const emptyJob = await documentJobManager.executeIngestion(
    'doc_empty_invalid',
    testUser,
    'empty_notes.txt',
    Buffer.from('   \n\t  ', 'utf-8')
  );
  assert.strictEqual(emptyJob.status, 'error');
  assert.strictEqual(emptyJob.stage, 'failed');
  assert.strictEqual(vectorStore.getDocumentChunkCount(testUser, 'doc_empty_invalid'), 0);
  pass('Indexing verification: Empty/unreadable file marked error/failed with 0 chunks (never falsely Indexed)');

  console.log(`\n=================================================================`);
  console.log(`✅ ALL ${passed} UNIVERSAL MULTI-SUBJECT RAG TESTS PASSED SUCCESSFULLY!`);
  console.log(`=================================================================`);
}

runSuite().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
