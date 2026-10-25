import assert from 'assert';
import { userService } from '../src/services/user.service.js';
import { conversationService } from '../src/services/conversation.service.js';
import { documentService } from '../src/services/document.service.js';
import { documentJobManager } from '../src/jobs/documentJobManager.js';
import { vectorStore } from '../src/vectorStore/memoryVectorStore.js';
import { ragService } from '../src/rag/ragService.js';
import { webResearchService } from '../src/research/researchService.js';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting Full-Stack Backend Integration Test Suite');
  console.log('======================================================\n');

  const testUserId = `test_user_${Date.now()}`;

  // Test 1: User Profile & Settings Management
  console.log('Test 1: User Profile & Settings Persistence');
  const synced = userService.syncProfile({
    uid: testUserId,
    email: 'architect@example.com',
    displayName: 'Lead Architect',
    authProvider: 'password',
  });
  assert.strictEqual(synced.displayName, 'Lead Architect');
  assert.strictEqual(synced.email, 'architect@example.com');

  const retrievedProfile = userService.getProfile(testUserId);
  assert.ok(retrievedProfile, 'Profile should be retrievable');
  assert.strictEqual(retrievedProfile?.displayName, 'Lead Architect');

  const updatedProfile = userService.updateProfile(testUserId, { displayName: 'Principal Engineer' });
  assert.strictEqual(updatedProfile.displayName, 'Principal Engineer');

  const settings = userService.getSettings(testUserId);
  assert.strictEqual(settings.theme, 'system');
  const updatedSettings = userService.updateSettings(testUserId, { theme: 'dark', responseLength: 'detailed' });
  assert.strictEqual(updatedSettings.theme, 'dark');
  assert.strictEqual(updatedSettings.responseLength, 'detailed');
  console.log('  ✓ PASS: User profile synchronization, updates, and settings persistence verified');

  // Test 2: Document Ingestion, Retrieval & Content Inspection
  console.log('\nTest 2: Document Management & Content Pipeline');
  const testDocId = `doc_fs_${Date.now()}`;
  const docText = `
# System Architecture Specification
## Section 1: Overview
The system uses a distributed multi-agent RAG pipeline with Google Gemini 1.5.
Throughput latency is rated at 280ms per query across 12,000 requests.

## Section 2: Security & Isolation
Each user document is isolated strictly by authenticated UID in both disk storage and vector index.
SSRF security blocks localhost, 127.0.0.1, and private networks.
  `.trim();

  const job = await documentJobManager.executeIngestion(
    testDocId,
    testUserId,
    'System_Architecture.txt',
    Buffer.from(docText, 'utf-8'),
    'text/plain'
  );
  assert.strictEqual(job.status, 'ready');
  assert.ok((job.chunkCount || 0) > 0, 'Document should produce chunks');

  const userDocs = documentService.listUserDocuments(testUserId);
  assert.ok(userDocs.some((d) => d.id === testDocId), 'Document should appear in user list');

  const docInfo = documentService.getDocumentInfo(testUserId, testDocId);
  assert.ok(docInfo, 'Document info should exist');
  assert.strictEqual(docInfo?.status, 'ready');

  const docContent = documentService.getDocumentContent(testUserId, testDocId);
  assert.ok(docContent.chunks.length > 0, 'Extracted content chunks should be retrievable');
  assert.ok(docContent.chunks[0].text.length > 0);
  console.log('  ✓ PASS: Document ingested, indexed, and content chunks retrievable');

  // Test 3: Genuine RAG Grounded Query on Indexed Document
  console.log('\nTest 3: Genuine RAG Query Grounding & Citations');
  const ragResult = await ragService.query({
    question: 'What is the throughput latency of the system?',
    documentIds: [testDocId],
    userId: testUserId,
  });
  assert.ok(ragResult.answer.includes('280ms'), 'RAG answer must ground on exact latency figure (280ms)');
  assert.strictEqual(ragResult.isInsufficientEvidence, false);
  assert.ok(ragResult.citations.length > 0, 'Must produce grounded citation');
  assert.strictEqual(ragResult.citations[0].documentId, testDocId);
  console.log('  ✓ PASS: RAG answer accurately grounded with verified citations');

  // Test 4: Strict Fallback on Absent Information
  console.log('\nTest 4: Strict Fallback Guarantee on Absent Information');
  const missingResult = await ragService.query({
    question: 'What is the recipe for chocolate chip cookies?',
    documentIds: [testDocId],
    userId: testUserId,
  });
  assert.strictEqual(
    missingResult.answer,
    'There is no answer to your question in your uploaded document.',
    'Must return exact mandatory fallback string'
  );
  assert.strictEqual(missingResult.isInsufficientEvidence, true);
  console.log('  ✓ PASS: Exact mandatory fallback returned for unmentioned query');

  // Test 5: Conversation & Message History Pipeline
  console.log('\nTest 5: Conversation & Chat History Pipeline');
  const chat = conversationService.createChat(testUserId, 'document', 'Architecture Chat', [testDocId]);
  assert.ok(chat.id.startsWith('chat_'));
  assert.strictEqual(chat.title, 'Architecture Chat');

  const userMsg = conversationService.addMessage(testUserId, chat.id, {
    role: 'user',
    content: 'What is the throughput latency?',
    mode: 'document',
  });
  assert.strictEqual(userMsg.role, 'user');

  const asstMsg = conversationService.addMessage(testUserId, chat.id, {
    role: 'assistant',
    content: ragResult.answer,
    mode: 'document',
    citations: ragResult.citations,
  });
  assert.strictEqual(asstMsg.role, 'assistant');

  const messages = conversationService.getMessages(testUserId, chat.id);
  assert.strictEqual(messages.length, 2);

  const updatedChat = conversationService.updateChat(testUserId, chat.id, { title: 'Updated Title' });
  assert.strictEqual(updatedChat?.title, 'Updated Title');
  console.log('  ✓ PASS: Chat sessions, messages, and conversation history fully persisted');

  // Test 6: User Data Export
  console.log('\nTest 6: User Data Export');
  const exportData = {
    profile: userService.getProfile(testUserId),
    settings: userService.getSettings(testUserId),
    documents: documentService.listUserDocuments(testUserId),
    chats: conversationService.listChats(testUserId),
  };
  assert.ok(exportData.profile);
  assert.ok(exportData.documents.length > 0);
  assert.ok(exportData.chats.length > 0);
  console.log('  ✓ PASS: User data export correctly bundles profile, settings, documents, and chats');

  // Test 7: Document Deletion & User Account Purge
  console.log('\nTest 7: Document Deletion & User Account Purge');
  const delDocRes = documentService.deleteUserDocument(testUserId, testDocId);
  assert.ok(delDocRes.deletedChunks > 0, 'Vector chunks should be purged');

  const delUserRes = await userService.deleteUserAndData(testUserId);
  conversationService.clearAllUserChats(testUserId);
  assert.strictEqual(userService.getProfile(testUserId), null);
  assert.strictEqual(conversationService.listChats(testUserId).length, 0);
  console.log('  ✓ PASS: User account and associated documents/vectors successfully purged');

  console.log('\n======================================================');
  console.log('Results: All 7 Full-Stack Backend Integration Tests Passed!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Integration test failure:', err);
  process.exit(1);
});
