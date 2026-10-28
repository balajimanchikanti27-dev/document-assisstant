import fs from 'fs';
import { vectorStore, ScoredChunk, isUserAuthorized } from '../vectorStore/memoryVectorStore.js';
import { embeddingService } from '../embeddings/embeddingService.js';
import { geminiService, DOCUMENT_FALLBACK_MESSAGE } from '../services/gemini.service.js';
import { documentJobManager } from '../jobs/documentJobManager.js';
import { documentService } from '../services/document.service.js';
import { documentMetadataStore } from '../services/documentMetadataStore.js';
import { questionAnalyzer, QuestionAnalysis } from '../research/questionAnalyzer.js';
import {
  DocumentQueryPayload,
  DocumentQueryResponse,
  SourceCitation,
} from '../types.js';

export { DOCUMENT_FALLBACK_MESSAGE };

const RELEVANCE_SCORE_THRESHOLD = 0.15;
const MAX_SELF_CORRECTION_RETRIES = 1;

export class RagService {
  public async query(payload: DocumentQueryPayload): Promise<DocumentQueryResponse> {
    const {
      question,
      documentIds,
      userId = 'anonymous',
      conversationId,
      previousMessages = [],
    } = payload;

    if (!question || !question.trim()) {
      const err: any = new Error('Question cannot be empty.');
      err.statusCode = 400;
      throw err;
    }

    if (!documentIds || documentIds.length === 0) {
      const err: any = new Error('Please select at least one document to query.');
      err.statusCode = 400;
      throw err;
    }

    console.log(
      `[RAG STAGE 1: VALIDATION] Request validated for user: ${userId} | Document count: ${documentIds.length}`
    );

    // Normalize and canonicalize document IDs
    const normalizedDocIds = (documentIds || [])
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id) => {
        if (documentMetadataStore.hasDocument(id)) return id;
        const match = id.match(/^((?:doc|test_doc)_[a-zA-Z0-9_-]+?)(?:_|\.|$)/);
        if (match && documentMetadataStore.hasDocument(match[1])) {
          return match[1];
        }
        return id;
      });

    console.log(
      `[RAG STAGE 2: DOC IDS] Validated IDs: [${normalizedDocIds.join(', ')}]`
    );

    const validDocIds: string[] = [];

    // 1. Ensure selected document chunks exist in vector store and check processing status & user ownership
    for (const docId of normalizedDocIds) {
      const isOwned = documentMetadataStore.isDocumentOwnedBy(docId, userId);
      const job = documentJobManager.getJob(docId);
      const docRecord = documentMetadataStore.getDocument(docId);

      // Check cross-user unauthorized access
      if (!isOwned) {
        if (job && !isUserAuthorized(job.userId, userId)) {
          console.warn(`[RAG STAGE 3: OWNERSHIP FAILED] User "${userId}" not authorized for job doc "${docId}"`);
          return {
            success: false,
            statusCode: 403,
            answer: DOCUMENT_FALLBACK_MESSAGE,
            citations: [],
            confidence: 0,
            isInsufficientEvidence: true,
            rejectionReason: `User "${userId}" is not authorized to access document "${docId}".`,
          };
        }

        if (docRecord && !isUserAuthorized(docRecord.ownerId, userId)) {
          console.warn(`[RAG STAGE 3: OWNERSHIP FAILED] User "${userId}" not authorized for registered doc "${docId}"`);
          return {
            success: false,
            statusCode: 403,
            answer: DOCUMENT_FALLBACK_MESSAGE,
            citations: [],
            confidence: 0,
            isInsufficientEvidence: true,
            rejectionReason: `User "${userId}" is not authorized to access document "${docId}".`,
          };
        }

        // Check if document belongs to another user on disk
        try {
          const docsDir = documentJobManager.getDocumentsDirectory();
          if (fs.existsSync(docsDir)) {
            const files = fs.readdirSync(docsDir);
            const matchOther = files.find((f: string) => {
              if (!f.includes(`__${docId}__`) && !f.includes(`__${docId}_`)) return false;
              const fileUser = f.split('__')[0];
              return !isUserAuthorized(fileUser, userId);
            });
            if (matchOther) {
              console.warn(`[RAG STAGE 3: OWNERSHIP FAILED] User "${userId}" not authorized for on-disk doc "${docId}"`);
              return {
                success: false,
                statusCode: 403,
                answer: DOCUMENT_FALLBACK_MESSAGE,
                citations: [],
                confidence: 0,
                isInsufficientEvidence: true,
                rejectionReason: `User "${userId}" is not authorized to access document "${docId}".`,
              };
            }
          }
        } catch (err: any) {
          // ignore
        }
      }

      console.log(`[RAG STAGE 3: OWNERSHIP VERIFIED] User "${userId}" authorized for document "${docId}"`);

      const hasChunks = vectorStore.hasDocumentChunks(userId, docId);
      const fileExists = docRecord ? fs.existsSync(docRecord.filePath) : false;

      // If document chunks are not present in vector index, attempt auto-reindex or report genuine in-flight status
      if (!hasChunks) {
        if (job && (job.status === 'processing' || job.status === 'indexing' || job.status === 'uploading')) {
          throw new Error(
            `Document "${job.filename || docId}" is currently being processed and indexed. Please wait a moment and retry.`
          );
        }
        if (job && job.status === 'error') {
          throw new Error(
            `Document "${job.filename || docId}" failed indexing: ${job.errorMessage || 'Unknown error'}. Please reprocess or re-upload the document.`
          );
        }

        const reindexed = await documentJobManager.reindexIfMissing(userId, docId);
        if (!reindexed && !vectorStore.hasDocumentChunks(userId, docId)) {
          // If document does not exist anywhere and wasn't owned by another user:
          if (!docRecord && !fileExists && !job) {
            console.warn(`[RAG QUERY] Document ID "${docId}" not found in metadata or storage; omitting stale ID.`);
            continue;
          }

          const docInfo = documentService.getDocumentInfo(userId, docId);
          if (docInfo && (docInfo.status === 'processing' || docInfo.status === 'uploading' || docInfo.status === 'indexing')) {
            throw new Error(
              `Document "${docInfo.name || docId}" is currently being processed and indexed. Please wait a moment and retry.`
            );
          }
          if (docInfo && docInfo.status === 'error') {
            throw new Error(
              `Document "${docInfo.name || docId}" failed indexing: ${docInfo.errorMessage || 'Unknown error'}. Please reprocess or re-upload the document.`
            );
          }
          throw new Error(
            `Document "${docRecord?.filename || docInfo?.name || docId}" is not indexed yet or failed indexing. Please index the document before querying.`
          );
        }
      }

      const docChunksCount = vectorStore.getDocumentChunkCount(userId, docId);
      console.log(`[RAG STAGE 4: INDEX STATUS] Document "${docId}" verified ready with ${docChunksCount} indexed chunks`);
      validDocIds.push(docId);
    }

    if (validDocIds.length === 0) {
      console.warn(`[RAG STAGE 2: DOC IDS] No valid accessible document IDs found for user "${userId}"`);
      const notFoundErr: any = new Error(
        `Selected document(s) could not be found or have been deleted. Please select a valid uploaded document.`
      );
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    // 2. Intelligent Question Analysis (Phase 1 & Phase 6 Coreference Resolution)
    const analysis: QuestionAnalysis = questionAnalyzer.analyze(question, previousMessages);
    const queryToSearch = analysis.resolvedQuestion || question.trim();

    // 3. Query Decomposition for Multi-Part Questions (Phase 3)
    const subQueries = Array.from(
      new Set([queryToSearch, ...analysis.subQueries, ...this.decomposeQuestion(queryToSearch)])
    );

    // 4. Primary Hybrid Retrieval & Multi-Query Aggregation
    let chunkMap = new Map<string, ScoredChunk>();
    const queryEmbedding = await embeddingService.getEmbedding(queryToSearch);

    // A. Primary Hybrid Search
    const primaryChunks = vectorStore.search(
      userId,
      validDocIds,
      queryEmbedding,
      queryToSearch,
      8
    );
    for (const sc of primaryChunks) {
      chunkMap.set(sc.chunk.id, sc);
    }

    // B. Document Summary Representative Sampling (Phase 4 requirement: representative chunks across document)
    const isDocSummary =
      (analysis.intent === 'summary' ||
        /\b(summarize|summary|overview|key insights|main points|takeaways|recap)\b/i.test(question)) &&
      /\b(document|pdf|file|paper|report|slides|presentation|uploaded|all|everything|selected)\b/i.test(question);

    if (isDocSummary) {
      for (const docId of validDocIds) {
        const allDocChunks = vectorStore.getChunksForDocument(userId, docId);
        if (allDocChunks.length > 0) {
          const sampledIndices = new Set<number>();
          sampledIndices.add(0);
          if (allDocChunks.length > 1) {
            sampledIndices.add(allDocChunks.length - 1);
          }
          if (allDocChunks.length > 2) {
            sampledIndices.add(Math.floor(allDocChunks.length * 0.25));
            sampledIndices.add(Math.floor(allDocChunks.length * 0.50));
            sampledIndices.add(Math.floor(allDocChunks.length * 0.75));
          }
          for (const idx of sampledIndices) {
            const ch = allDocChunks[idx];
            if (ch && !chunkMap.has(ch.id)) {
              chunkMap.set(ch.id, {
                chunk: ch,
                score: 0.85,
                cosineScore: 0.85,
                keywordScore: 0.85,
              });
            }
          }
        }
      }
    }

    // B. Sub-query searches for multi-part questions
    for (const subQ of subQueries) {
      if (subQ.length > 5 && subQ.toLowerCase() !== queryToSearch.toLowerCase()) {
        const subEmb = await embeddingService.getEmbedding(subQ);
        const subResults = vectorStore.search(
          userId,
          validDocIds,
          subEmb,
          subQ,
          4
        );
        for (const sc of subResults) {
          const existing = chunkMap.get(sc.chunk.id);
          if (!existing || sc.score > existing.score) {
            chunkMap.set(sc.chunk.id, sc);
          }
        }
      }
    }

    let retrievedChunks = Array.from(chunkMap.values());
    retrievedChunks = this.rerankChunks(retrievedChunks, analysis);

    // 5. Phase 5: Self-Correction - Bounded Retrieval Retry if Evidence is Weak
    let retries = 0;
    const topScore = retrievedChunks[0]?.score || 0;
    const hasSufficientEvidence = this.checkEvidenceSufficiency(retrievedChunks, analysis);

    if (
      !hasSufficientEvidence &&
      topScore >= 0.10 &&
      topScore < RELEVANCE_SCORE_THRESHOLD &&
      retries < MAX_SELF_CORRECTION_RETRIES &&
      analysis.focusedSearchQuery !== queryToSearch
    ) {
      retries++;
      const refinedQuery = analysis.focusedSearchQuery;
      const refEmb = await embeddingService.getEmbedding(refinedQuery);
      const refResults = vectorStore.search(userId, validDocIds, refEmb, refinedQuery, 6);

      for (const sc of refResults) {
        const existing = chunkMap.get(sc.chunk.id);
        if (!existing || sc.score > existing.score) {
          chunkMap.set(sc.chunk.id, sc);
        }
      }

      retrievedChunks = this.rerankChunks(Array.from(chunkMap.values()), analysis);
    }

    // 6. Diagnostics Logging & Evidence Rejection Tracking
    let rejectionReason: string | undefined;
    if (retrievedChunks.length === 0) {
      rejectionReason = 'No candidate passages matched query keywords in selected documents.';
    } else if (retrievedChunks[0].score < RELEVANCE_SCORE_THRESHOLD) {
      rejectionReason = `Top chunk relevance score (${retrievedChunks[0].score.toFixed(4)}) is below threshold (${RELEVANCE_SCORE_THRESHOLD}).`;
    } else if (!this.checkEvidenceSufficiency(retrievedChunks, analysis)) {
      rejectionReason = 'Insufficient keyword grounding: distinctive query terms not present in retrieved context.';
    }

    const retrievalLogs = {
      queryId: `qid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      selectedDocumentIds: validDocIds,
      indexingStatus: validDocIds.map((id) => {
        const job = documentJobManager.getJob(id);
        const count = vectorStore.getDocumentChunkCount(userId, id);
        return {
          documentId: id,
          chunkCount: count,
          slideCount: job?.slideCount,
          status: job?.status || (count > 0 ? 'ready' : 'unknown'),
        };
      }),
      retrievedChunks: retrievedChunks.slice(0, 8).map((item) => ({
        chunkId: item.chunk.id,
        documentName: item.chunk.documentName,
        slideNumber: item.chunk.slideNumber,
        pageOrSlide: item.chunk.slideNumber
          ? `Slide ${item.chunk.slideNumber}`
          : item.chunk.pageNumber
          ? `Page ${item.chunk.pageNumber}`
          : (item.chunk.heading || 'Section'),
        score: parseFloat(item.score.toFixed(4)),
        cosineScore: item.cosineScore ? parseFloat(item.cosineScore.toFixed(4)) : undefined,
        keywordScore: item.keywordScore ? parseFloat(item.keywordScore.toFixed(4)) : undefined,
        retrievalMethod:
          (item.cosineScore || 0) > 0 && (item.keywordScore || 0) > 0
            ? 'hybrid'
            : (item.cosineScore || 0) > 0
            ? 'dense_vector'
            : 'keyword',
        preview: item.chunk.text.slice(0, 120) + '...',
      })),
      evidenceRejectionReason: rejectionReason,
      geminiCalled: false,
      citationValidationPassed: !rejectionReason,
    };

    if (process.env.NODE_ENV !== 'production' || process.env.DIAGNOSTICS_MODE === 'true') {
      console.log(
        `[RAG RETRIEVAL] Q: "${question}" | Top: ${retrievedChunks[0]?.score.toFixed(4) || 'N/A'} | Rejected: ${Boolean(rejectionReason)} | Match: ${
          retrievedChunks[0]
            ? `${retrievedChunks[0].chunk.documentName} (Slide ${retrievedChunks[0].chunk.slideNumber || 'N/A'})`
            : 'None'
        }`
      );
    }

    // 7. Strict Fallback Condition: No chunks found, top score below threshold, or missing evidence
    if (rejectionReason) {
      return {
        success: true,
        answer: DOCUMENT_FALLBACK_MESSAGE,
        isInsufficientEvidence: true,
        citations: [],
        mode: 'document',
        model: geminiService.getModelName(),
        retrievalLogs,
      };
    }

    // 8. Filter chunks that meet threshold (limit to top 8)
    const relevantChunks = retrievedChunks
      .filter((c) => c.score >= RELEVANCE_SCORE_THRESHOLD)
      .slice(0, 8);

    // Format citations
    const citations: SourceCitation[] = relevantChunks.map((c) => {
      const loc = c.chunk.slideNumber
        ? `Slide ${c.chunk.slideNumber}`
        : c.chunk.pageNumber
        ? `Page ${c.chunk.pageNumber}`
        : (c.chunk.heading || 'Section');

      return {
        id: `cite_${c.chunk.documentId}_${c.chunk.id}`,
        sourceType: 'document',
        title: `${c.chunk.documentName} (${loc})`,
        documentId: c.chunk.documentId,
        documentName: c.chunk.documentName,
        pageNumber: c.chunk.pageNumber,
        slideNumber: c.chunk.slideNumber,
        heading: c.chunk.heading,
        snippet: c.chunk.text.slice(0, 240) + (c.chunk.text.length > 240 ? '...' : ''),
      };
    });

    // 9. Answer Generation via Reusable Gemini Service (when configured)
    if (geminiService.isConfigured()) {
      retrievalLogs.geminiCalled = true;
      console.log(`[RAG STAGE 6: GENERATION] Requesting answer from Gemini model: ${geminiService.getModelName()}`);
      try {
        const geminiResult = await geminiService.generateAnswer({
          question: queryToSearch,
          mode: 'document',
          evidence: {
            documents: relevantChunks.map((c) => ({
              chunkId: c.chunk.id,
              documentId: c.chunk.documentId,
              documentName: c.chunk.documentName,
              pageNumber: c.chunk.pageNumber,
              slideNumber: c.chunk.slideNumber,
              heading: c.chunk.heading,
              text: c.chunk.text,
              score: c.score,
            })),
          },
          previousMessages,
        });

        const isInsufficient = geminiResult.isInsufficientEvidence;
        console.log(
          `[RAG STAGE 7: RESPONSE] Formatted Gemini response. Insufficient: ${Boolean(isInsufficient)} | Citations: ${isInsufficient ? 0 : citations.length}`
        );

        return {
          success: geminiResult.success,
          answer: isInsufficient ? DOCUMENT_FALLBACK_MESSAGE : geminiResult.answer,
          isInsufficientEvidence: isInsufficient,
          citations: isInsufficient ? [] : citations,
          mode: 'document',
          model: geminiResult.model,
          usage: geminiResult.usage,
          retrievalLogs,
        };
      } catch (err: any) {
        console.error('[RAG STAGE 6: GEMINI ERROR]', err.message);
        console.log(`[RAG STAGE 6: GENERATION] Falling back to grounded extractive answer generator due to provider issue`);
        const offlineResult = this.generateOfflineGroundedAnswer(queryToSearch, relevantChunks, citations, retrievalLogs, analysis);
        return offlineResult;
      }
    }

    // 10. Grounded Extractive Fallback (when Gemini API key is offline or in test suite)
    console.log(`[RAG STAGE 6: GENERATION] Gemini offline; using grounded extractive answer generator`);
    const offlineResult = this.generateOfflineGroundedAnswer(queryToSearch, relevantChunks, citations, retrievalLogs, analysis);
    console.log(
      `[RAG STAGE 7: RESPONSE] Formatted extractive response. Insufficient: ${Boolean(offlineResult.isInsufficientEvidence)} | Citations: ${offlineResult.citations?.length || 0}`
    );
    return offlineResult;
  }

  /**
   * Reranks candidate chunks by combining semantic cosine score, BM25 keyword score,
   * heading boosts, and entity overlap.
   */
  private rerankChunks(chunks: ScoredChunk[], analysis: QuestionAnalysis): ScoredChunk[] {
    const { keyEntities } = analysis;
    const lowerEntities = keyEntities.map((e) => e.toLowerCase());

    const reranked = chunks.map((sc) => {
      let boost = 0;
      const textLower = sc.chunk.text.toLowerCase();
      const headingLower = (sc.chunk.heading || '').toLowerCase();

      for (const ent of lowerEntities) {
        if (textLower.includes(ent)) boost += 0.05;
        if (headingLower.includes(ent)) boost += 0.08;
      }

      // Check numbers
      for (const num of analysis.extractedNumbers) {
        if (textLower.includes(num.toLowerCase())) boost += 0.06;
      }

      return {
        ...sc,
        score: Math.min(1.0, sc.score + boost),
      };
    });

    reranked.sort((a, b) => b.score - a.score);
    return reranked;
  }

  /**
   * Checks if retrieved chunks have sufficient lexical/semantic overlap with the question
   */
  private checkEvidenceSufficiency(chunks: ScoredChunk[], analysis: QuestionAnalysis): boolean {
    if (chunks.length === 0) return false;
    const topChunk = chunks[0];
    if (topChunk.score < RELEVANCE_SCORE_THRESHOLD) return false;

    // Check query tokens
    const stopwords = new Set([
      'what', 'when', 'where', 'which', 'explain', 'tell', 'show', 'does', 'how', 'why',
      'give', 'list', 'about', 'this', 'that', 'with', 'from', 'have', 'been', 'were',
      'will', 'would', 'could', 'should', 'the', 'and', 'for', 'are', 'is', 'was',
      'in', 'on', 'at', 'to', 'of', 'by', 'an', 'a', 'do', 'you', 'can'
    ]);

    const tokens = analysis.originalQuestion
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));

    if (tokens.length === 0) return true;

    const allChunkText = chunks
      .slice(0, 4)
      .map((c) => `${c.chunk.text} ${c.chunk.heading || ''}`)
      .join(' ')
      .toLowerCase();

    // Specific technical tokens (excluding ubiquitous meta-terms and common query verbs)
    const generalTechWords = new Set([
      'java', 'code', 'program', 'system', 'file', 'type', 'types',
      'mechanism', 'concept', 'feature', 'process', 'technique', 'approach', 'example', 'examples',
      'method', 'methods', 'class', 'classes', 'object', 'objects', 'variable', 'variables', 'function', 'functions',
      'create', 'creating', 'created', 'define', 'defining', 'defined', 'use', 'using', 'used',
      'make', 'making', 'write', 'writing', 'implement', 'implementing', 'work', 'working',
      'run', 'running', 'call', 'calling', 'show', 'showing', 'give', 'giving'
    ]);
    const summaryMetaWords = new Set([
      'summarize', 'summary', 'overview', 'key', 'insights', 'insight', 'main', 'points', 'point',
      'takeaways', 'takeaway', 'recap', 'briefly', 'selected', 'document', 'documents', 'uploaded',
      'pdf', 'file', 'content', 'contents', 'whole', 'entire', 'all', 'core', 'information',
      'slide', 'slides', 'presentation', 'according', 'mentioned', 'stated', 'text'
    ]);

    const isDocSummary =
      (analysis.intent === 'summary' ||
        /\b(summarize|summary|overview|key insights|main points|takeaways|recap)\b/i.test(analysis.originalQuestion)) &&
      /\b(document|pdf|file|paper|report|slides|presentation|uploaded|all|everything|selected)\b/i.test(analysis.originalQuestion);

    const specificTokens = tokens.filter((t) => !generalTechWords.has(t));
    const domainSpecificTokens = specificTokens.filter((t) => !summaryMetaWords.has(t));

    // Pure document-level summary query with existing document chunks is always grounded
    if (isDocSummary && domainSpecificTokens.length === 0 && chunks.length > 0) {
      return true;
    }

    // Stem matching helper
    const hasStemMatch = (word: string, targetText: string): boolean => {
      if (targetText.includes(word)) return true;
      if (word.length >= 4) {
        const stem = word.slice(0, Math.min(word.length - 1, 5));
        if (targetText.includes(stem)) return true;
      }
      return false;
    };

    const hasAnySpecificMatch = specificTokens.length === 0 || specificTokens.some((t) => hasStemMatch(t, allChunkText));

    // If dense semantic similarity or hybrid score is strong, evidence is relevant IF specific terms match
    if (topChunk.score >= 0.40 || (topChunk.cosineScore && topChunk.cosineScore >= 0.55)) {
      if (hasAnySpecificMatch) {
        return true;
      }
    }

    // If query has distinctive terms and none match (lexically or via stem), evidence is insufficient
    const hasAnyDistinctiveMatch = tokens.some((t) => hasStemMatch(t, allChunkText));
    if (tokens.length >= 2 && !hasAnyDistinctiveMatch && topChunk.score < 0.25) {
      return false;
    }

    // If query has specific non-generic technical entities, check if at least one matches lexically or via stem
    if (specificTokens.length > 0) {
      const matchedSpecific = specificTokens.filter((t) => hasStemMatch(t, allChunkText));
      if (matchedSpecific.length === 0) {
        return false;
      }
    }

    // For queries with core subject nouns, verify at least one core subject noun or its root is present
    const primaryClause = analysis.originalQuestion.split(/\band\b|\bas well as\b/i)[0].trim();
    const coreNounTokens = primaryClause
      .replace(/\bin\s+[a-z0-9]+\b/gi, '')
      .replace(/\b(?:how|what|why|when|where|does|can|do|you|create|explain|define|tell|show|use|the|a|an|is|are|of|to|for|with)\b/gi, ' ')
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/gi, '').toLowerCase())
      .filter((w) => w.length > 3 && !generalTechWords.has(w));

    if (coreNounTokens.length > 0) {
      const anyCorePresent = coreNounTokens.some((noun) => hasStemMatch(noun, allChunkText));
      if (!anyCorePresent) {
        return false;
      }
    }

    const matchedTokens = tokens.filter((t) => hasStemMatch(t, allChunkText));
    const tokenMatchRatio = matchedTokens.length / (tokens.length || 1);

    if (tokenMatchRatio < 0.25 && topChunk.score < 0.25) {
      return false;
    }

    return true;
  }

  /**
   * Decompose multi-part questions or questions with multiple clauses
   */
  private decomposeQuestion(question: string): string[] {
    const parts: string[] = [question.trim()];

    if (question.includes('?')) {
      const qSplits = question.split('?').map((s) => s.trim()).filter((s) => s.length > 5);
      if (qSplits.length > 1) {
        parts.push(...qSplits);
      }
    }

    const conjSplits = question
      .split(/(?:;|\band also\b|\bas well as\b|\n)/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 8);

    if (conjSplits.length > 1) {
      parts.push(...conjSplits);
    }

    return Array.from(new Set(parts));
  }

  /**
   * High-Precision Grounded Extractive Answer Generation for offline test environments
   */
  private generateOfflineGroundedAnswer(
    question: string,
    relevantChunks: ScoredChunk[],
    citations: SourceCitation[],
    retrievalLogs: any,
    analysis: QuestionAnalysis
  ): DocumentQueryResponse {
    const topChunk = relevantChunks[0];

    if (!topChunk || topChunk.score < 0.18 || !this.checkEvidenceSufficiency(relevantChunks, analysis)) {
      return {
        success: true,
        answer: DOCUMENT_FALLBACK_MESSAGE,
        isInsufficientEvidence: true,
        citations: [],
        mode: 'document',
        model: 'offline-extractor',
        retrievalLogs,
      };
    }

    const isSummaryRequest =
      analysis.intent === 'summary' ||
      /\b(summarize|summary|overview|key insights|main points|takeaways|recap)\b/i.test(question);

    let answer: string;
    if (isSummaryRequest) {
      const summaryItems = relevantChunks.slice(0, 5).map((c) => {
        const loc = c.chunk.slideNumber
          ? `Slide ${c.chunk.slideNumber}`
          : c.chunk.pageNumber
          ? `Page ${c.chunk.pageNumber}`
          : (c.chunk.heading || 'Section');
        return `#### Key Insights from **${c.chunk.documentName}** (${loc}):\n${c.chunk.text.trim()}`;
      });
      answer = `Based on your selected document evidence, here is a structured summary of key insights:\n\n${summaryItems.join('\n\n')}`;
    } else {
      const sectionsText = relevantChunks
        .slice(0, 3)
        .map((c) => {
          const loc = c.chunk.slideNumber
            ? `Slide ${c.chunk.slideNumber}`
            : c.chunk.pageNumber
            ? `Page ${c.chunk.pageNumber}`
            : (c.chunk.heading || 'Section');
          return `### From **${c.chunk.documentName}** (${loc}):\n${c.chunk.text.trim()}`;
        })
        .join('\n\n');
      answer = `Based on your selected document evidence:\n\n${sectionsText}`;
    }

    return {
      success: true,
      answer,
      isInsufficientEvidence: false,
      citations,
      mode: 'document',
      model: 'offline-extractor',
      retrievalLogs,
    };
  }
}

export const ragService = new RagService();
