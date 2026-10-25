import { parseDocument } from '../src/parsers/documentParser.js';
import { chunkSections } from '../src/chunker.js';
import { embeddingService } from '../src/embeddings/embeddingService.js';
import { MemoryVectorStore } from '../src/vectorStore/memoryVectorStore.js';
import { RagService, DOCUMENT_FALLBACK_MESSAGE } from '../src/rag/ragService.js';
import { DocumentChunk } from '../src/types.js';

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

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting RAG Verification & Retrieval Test Suite');
  console.log('======================================================\n');

  // Create isolated vector store instance for tests
  const testStore = new MemoryVectorStore();

  // Seed sample documents for testing
  const sampleDoc1Text = `
Project Titan Financial Report 2026.
Page 1: In Q3 2026, the company achieved total consolidated revenue of $42.5 million.
Operating expenses were reduced by 14.8% due to cloud infrastructure optimizations.
The net profit margin reached 22.4%, surpassing the initial guidance of 19.0%.

Page 2: The mobile robotics initiative, codenamed Aurora, secured 35 enterprise pilots.
The core sensor package uses LiDAR with a 120-meter effective detection range.
Headcount expanded by 115 engineers across the Tokyo and Seattle offices.
`;

  const sampleDoc2Text = `
Astronomy and Planetary Science Bulletin.
Page 1: The James Webb Space Telescope detected carbon dioxide and methane in the atmosphere of exoplanet K2-18b.
The planet orbits an M-dwarf star located approximately 124 light-years from Earth in the constellation Leo.
`;

  const userA = 'user_alpha_101';
  const userB = 'user_beta_202';
  const doc1Id = 'doc_titan_financial';
  const doc2Id = 'doc_space_astronomy';

  // 1. Ingestion & Chunking
  const sectionsDoc1 = await parseDocument(Buffer.from(sampleDoc1Text, 'utf-8'), 'Titan_Report.txt');
  const chunksDoc1 = chunkSections(sectionsDoc1, doc1Id, userA, 'Titan_Report.txt');
  const embeddingsDoc1 = await embeddingService.getEmbeddingsBatch(chunksDoc1.map((c) => c.text));

  const fullChunksDoc1: DocumentChunk[] = chunksDoc1.map((c, i) => ({
    ...c,
    embedding: embeddingsDoc1[i],
  }));

  // Seed doc 2 belonging to User B
  const sectionsDoc2 = await parseDocument(Buffer.from(sampleDoc2Text, 'utf-8'), 'Astronomy_Bulletin.txt');
  const chunksDoc2 = chunkSections(sectionsDoc2, doc2Id, userB, 'Astronomy_Bulletin.txt');
  const embeddingsDoc2 = await embeddingService.getEmbeddingsBatch(chunksDoc2.map((c) => c.text));

  const fullChunksDoc2: DocumentChunk[] = chunksDoc2.map((c, i) => ({
    ...c,
    embedding: embeddingsDoc2[i],
  }));

  await testStore.addChunks([...fullChunksDoc1, ...fullChunksDoc2]);

  console.log(`Document Ingestion verified:`);
  console.log(`- Doc 1 (User A): ${fullChunksDoc1.length} chunks`);
  console.log(`- Doc 2 (User B): ${fullChunksDoc2.length} chunks\n`);

  // --- TEST 1: Exact Answer Retrieval ---
  console.log('Test 1: Exact Answer Retrieval');
  const q1Embedding = await embeddingService.getEmbedding('What was the total consolidated revenue in Q3 2026?');
  const q1Results = testStore.search(userA, [doc1Id], q1Embedding, 2);
  assert(q1Results.length > 0, 'Retrieves at least one chunk for exact question');
  assert(
    q1Results[0].chunk.text.includes('$42.5 million'),
    'Top chunk contains exact revenue figure ($42.5 million)'
  );
  assert(q1Results[0].score > 0.3, 'Similarity score exceeds threshold');

  // --- TEST 2: Paraphrased Question ---
  console.log('\nTest 2: Paraphrased Question');
  const q2Embedding = await embeddingService.getEmbedding('How much money did Titan bring in during the third quarter?');
  const q2Results = testStore.search(userA, [doc1Id], q2Embedding, 2);
  assert(q2Results.length > 0, 'Retrieves chunk for paraphrased question');
  assert(
    q2Results[0].chunk.text.includes('$42.5 million'),
    'Paraphrased query successfully matches revenue chunk'
  );

  // --- TEST 3: Numeric Facts Retrieval ---
  console.log('\nTest 3: Numeric Facts Retrieval');
  const q3Embedding = await embeddingService.getEmbedding('What is the effective detection range of the Aurora LiDAR sensor?');
  const q3Results = testStore.search(userA, [doc1Id], q3Embedding, 2);
  assert(q3Results.length > 0, 'Finds chunk with numeric sensor specifications');
  assert(
    q3Results[0].chunk.text.includes('120-meter'),
    'Contains exact numeric value (120-meter)'
  );

  // --- TEST 4: Missing Information & Strict Fallback Guarantee ---
  console.log('\nTest 4: Missing Information & Strict Fallback Guarantee');
  const rag = new RagService();
  const q4Res = await rag.query({
    question: 'What is the recipe for chocolate chip cookies?',
    documentIds: [doc1Id],
    userId: userA,
  });
  assert(
    q4Res.answer === DOCUMENT_FALLBACK_MESSAGE,
    'Returns exact mandatory fallback for completely unrelated missing topic'
  );
  assert(q4Res.isInsufficientEvidence === true, 'Sets isInsufficientEvidence to true');
  assert(q4Res.citations.length === 0, 'Does not fabricate citations for missing information');

  // --- TEST 5: Irrelevant Document Selection ---
  console.log('\nTest 5: Irrelevant Document Selection');
  const q5Res = await rag.query({
    question: 'What was the profit margin in Q3?',
    documentIds: [doc2Id], // querying Astronomy doc for financial question
    userId: userB,
  });
  assert(
    q5Res.answer === DOCUMENT_FALLBACK_MESSAGE,
    'Returns fallback when selected document is completely irrelevant to the question'
  );

  // --- TEST 6: Cross-User Access Isolation ---
  console.log('\nTest 6: Cross-User Access Isolation');
  // User B attempts to query User A's document doc1Id
  const crossUserResults = testStore.search(userB, [doc1Id], q1Embedding, 4);
  assert(
    crossUserResults.length === 0,
    'User B cannot retrieve chunks from User A document (Strict Server-Side Isolation)'
  );

  // User A attempts to query User B's document doc2Id
  const qSpaceEmbedding = await embeddingService.getEmbedding('What molecules did James Webb detect?');
  const crossUserResults2 = testStore.search(userA, [doc2Id], qSpaceEmbedding, 4);
  assert(
    crossUserResults2.length === 0,
    'User A cannot retrieve chunks from User B document (Strict Server-Side Isolation)'
  );

  // User B can query their own document
  const validUserBResults = testStore.search(userB, [doc2Id], qSpaceEmbedding, 4);
  assert(
    validUserBResults.length > 0,
    'User B can successfully retrieve their own document chunks'
  );
  assert(
    validUserBResults[0].chunk.text.includes('carbon dioxide'),
    'User B retrieved chunk contains valid content'
  );

  // --- TEST 7: Page Metadata Preservation ---
  console.log('\nTest 7: Page/Slide Metadata Preservation');
  assert(
    q3Results[0].chunk.pageNumber !== undefined || q3Results[0].chunk.slideNumber !== undefined,
    'Chunk maintains page or slide metadata'
  );

  console.log('\n======================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
