import fs from 'fs';
import path from 'path';
import { embeddingService } from '../embeddings/embeddingService.js';
import { getStorageDataDir } from '../utils/paths.js';
const STOPWORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
    'will', 'with', 'what', 'where', 'which', 'who', 'when', 'how', 'why', 'can',
    'does', 'did', 'do', 'explain', 'tell', 'show', 'describe', 'find', 'give',
    'about', 'this', 'these', 'those', 'document', 'documents', 'slide', 'slides'
]);
export function isUserAuthorized(chunkUserId, requestedUserId) {
    if (chunkUserId === requestedUserId)
        return true;
    const isGuest = (u) => !u || u === 'anonymous' || u === 'guest_user' || u === 'guest';
    if (isGuest(chunkUserId) && isGuest(requestedUserId))
        return true;
    return false;
}
export class MemoryVectorStore {
    chunks = new Map();
    storageFilePath;
    constructor(storageDir) {
        const resolvedDir = storageDir || getStorageDataDir();
        if (!fs.existsSync(resolvedDir)) {
            try {
                fs.mkdirSync(resolvedDir, { recursive: true });
            }
            catch (e) { }
        }
        this.storageFilePath = path.join(resolvedDir, 'vector_index.json');
        this.loadFromDisk();
        // Also check if secondary cwd location has data if primary was empty
        if (this.chunks.size === 0) {
            const altPath = path.resolve(process.cwd(), 'data', 'vector_index.json');
            if (altPath !== this.storageFilePath && fs.existsSync(altPath)) {
                this.loadFromFile(altPath);
            }
        }
    }
    async addChunks(chunks) {
        for (const chunk of chunks) {
            this.chunks.set(chunk.id, chunk);
        }
        this.saveToDisk();
    }
    deleteDocumentChunks(userId, documentId) {
        let deletedCount = 0;
        for (const [id, chunk] of this.chunks.entries()) {
            const docMatch = !documentId || chunk.documentId === documentId;
            const userMatch = !userId || chunk.userId === userId || isUserAuthorized(chunk.userId, userId);
            if (docMatch && userMatch) {
                this.chunks.delete(id);
                deletedCount++;
            }
        }
        if (deletedCount > 0) {
            this.saveToDisk();
        }
        return deletedCount;
    }
    getDocumentChunkCount(userId, documentId) {
        let count = 0;
        for (const chunk of this.chunks.values()) {
            if (isUserAuthorized(chunk.userId, userId) && chunk.documentId === documentId) {
                count++;
            }
        }
        return count;
    }
    hasDocumentChunks(userId, documentId) {
        return this.getDocumentChunkCount(userId, documentId) > 0;
    }
    getUserDocumentIds(userId) {
        const ids = new Set();
        for (const chunk of this.chunks.values()) {
            if (isUserAuthorized(chunk.userId, userId)) {
                ids.add(chunk.documentId);
            }
        }
        return Array.from(ids);
    }
    getChunksForDocument(userId, documentId) {
        const list = [];
        for (const chunk of this.chunks.values()) {
            if (isUserAuthorized(chunk.userId, userId) && chunk.documentId === documentId) {
                list.push(chunk);
            }
        }
        return list;
    }
    /**
     * Universal Hybrid Search:
     * Combines high-dimensional semantic cosine similarity with BM25 / token-overlap keyword scoring,
     * heading boosts, and multi-document candidate balancing.
     */
    search(userId, documentIds, queryEmbedding, queryTextOrTopK, topKParam) {
        let queryText = '';
        let topK = 8;
        if (typeof queryTextOrTopK === 'number') {
            topK = queryTextOrTopK;
        }
        else if (typeof queryTextOrTopK === 'string') {
            queryText = queryTextOrTopK;
            if (typeof topKParam === 'number') {
                topK = topKParam;
            }
        }
        const docIdSet = new Set(documentIds);
        const candidateChunks = [];
        // 1. Server-Side Access Control & Document Filter
        for (const chunk of this.chunks.values()) {
            if (!isUserAuthorized(chunk.userId, userId))
                continue;
            if (!docIdSet.has(chunk.documentId))
                continue;
            candidateChunks.push(chunk);
        }
        if (candidateChunks.length === 0) {
            return [];
        }
        // 2. Prepare Query Keywords, Plural/Singular Expansion, and Intent
        const rawTokens = (queryText || '')
            .toLowerCase()
            .replace(/[^a-z0-9_.\-#]/g, ' ')
            .split(/\s+/)
            .filter((t) => t.length > 1);
        const keyTerms = rawTokens.filter((t) => !STOPWORDS.has(t));
        // Expand search terms with singular and plural variants
        const expandedTerms = new Set(keyTerms);
        for (const t of keyTerms) {
            if (t.endsWith('s') && t.length > 3) {
                expandedTerms.add(t.slice(0, -1));
            }
            else if (!t.endsWith('s') && t.length > 2) {
                expandedTerms.add(t + 's');
                expandedTerms.add(t + 'es');
            }
        }
        const queryPhrases = [];
        if (rawTokens.length >= 2) {
            for (let i = 0; i < rawTokens.length - 1; i++) {
                queryPhrases.push(`${rawTokens[i]} ${rawTokens[i + 1]}`);
            }
        }
        // Check definitional intent (e.g. "what is X", "define X", "meaning of X")
        const isDefinitional = /^(?:what\s+is|what\s+are|define|meaning\s+of|explain\s+what\s+is)\b/i.test(queryText.trim());
        const defMatch = (queryText || '').match(/^(?:what\s+is(?:\s+an?)?|define|meaning\s+of(?:\s+an?)?)\s+([a-z0-9_\-\s]+)/i);
        let defTarget = '';
        if (defMatch) {
            let rawTarget = defMatch[1].trim().toLowerCase();
            rawTarget = rawTarget.replace(/^(?:an?|the)\s+/, '');
            const cutoff = rawTarget.split(/\b(?:in|and|with|that|which|for|of)\b/)[0].trim();
            defTarget = cutoff || keyTerms[0] || '';
        }
        else {
            defTarget = keyTerms[0] || '';
        }
        // Check if query targets a specific slide or page (e.g. "slide 2", "page 3")
        const slideMatch = (queryText || '').match(/slide\s*(\d+)/i);
        const targetSlide = slideMatch ? parseInt(slideMatch[1], 10) : undefined;
        const pageMatch = (queryText || '').match(/page\s*(\d+)/i);
        const targetPage = pageMatch ? parseInt(pageMatch[1], 10) : undefined;
        // 3. Score Each Candidate Chunk
        const scoredList = candidateChunks.map((chunk) => {
            // A. Semantic Cosine Similarity
            const cosine = embeddingService.cosineSimilarity(queryEmbedding, chunk.embedding);
            // B. Keyword / BM25-style Overlap & Heading Matching
            let keywordPoints = 0;
            let hasDefinitionalCopula = false;
            const textLower = chunk.text.toLowerCase();
            const headingLower = (chunk.heading || '').toLowerCase();
            if (expandedTerms.size > 0) {
                for (const term of expandedTerms) {
                    if (textLower.includes(term)) {
                        keywordPoints += term.length > 4 || /[0-9_]/.test(term) ? 1.5 : 1.0;
                    }
                    if (headingLower.includes(term)) {
                        keywordPoints += 2.5; // Heading match bonus
                    }
                }
                // Phrase match bonus
                for (const phrase of queryPhrases) {
                    if (textLower.includes(phrase)) {
                        keywordPoints += 2.5;
                    }
                    if (headingLower.includes(phrase)) {
                        keywordPoints += 3.5;
                    }
                }
                // Definitional intent boosting
                if (isDefinitional && defTarget) {
                    const targetSingular = defTarget.endsWith('s') ? defTarget.slice(0, -1) : defTarget;
                    const targetPlural = defTarget.endsWith('s') ? defTarget : `${defTarget}s`;
                    // Check if heading matches "What is X" or is named after target
                    if (headingLower.includes(`what is ${targetSingular}`) || headingLower.includes(`what is an ${targetSingular}`) ||
                        headingLower.includes(`what is a ${targetSingular}`) || headingLower.includes(targetSingular)) {
                        keywordPoints += 4.0;
                    }
                    // Check for definitional copula in text: "X is an unwanted event...", "X refers to...", "X is defined as..."
                    const copulaPattern = new RegExp(`(?:\\b${targetSingular}\\b|\\b${targetPlural}\\b)\\s+(?:is\\s+an?|are|refers\\s+to|is\\s+defined\\s+as|means)\\s+([a-z0-9_\\-\\s]{3,40})`, 'i');
                    if (copulaPattern.test(textLower)) {
                        keywordPoints += 5.5;
                        hasDefinitionalCopula = true;
                    }
                    // Roadmap / Syllabus / Table of Contents demotion for direct definition questions
                    if (/roadmap|syllabus|what\s+we\s+will\s+cover|table\s+of\s+contents/i.test(headingLower)) {
                        keywordPoints -= 2.5;
                    }
                }
                // Location match bonus (e.g. "slide 2")
                if (targetSlide !== undefined && chunk.slideNumber === targetSlide) {
                    keywordPoints += 5.0;
                }
                if (targetPage !== undefined && chunk.pageNumber === targetPage) {
                    keywordPoints += 5.0;
                }
                // Normalize keyword score to [0, 1] range
                const maxPossible = Math.max(expandedTerms.size * 2.0 + queryPhrases.length * 2.5 + (isDefinitional ? 5.0 : 0), 1.0);
                var normKeyword = Math.min(Math.max(keywordPoints / maxPossible, 0), 1.0);
            }
            else {
                var normKeyword = 0;
            }
            // C. Hybrid Score Synthesis
            let finalScore = 0;
            if (expandedTerms.size > 0 && normKeyword === 0) {
                finalScore = cosine * 0.25;
            }
            else if (cosine > 0 && normKeyword > 0) {
                finalScore = 0.45 * cosine + 0.55 * normKeyword;
            }
            else if (normKeyword > 0) {
                finalScore = normKeyword * 0.85;
            }
            else {
                finalScore = cosine;
            }
            // Definitional ground boost: If chunk defines the requested concept, elevate score
            if (isDefinitional && hasDefinitionalCopula) {
                finalScore = Math.min(finalScore + 0.15, 1.0);
            }
            return {
                chunk,
                score: finalScore,
                cosineScore: cosine,
                keywordScore: normKeyword,
            };
        });
        // 4. Multi-Document Balanced Candidate Allocation
        if (docIdSet.size > 1) {
            scoredList.sort((a, b) => b.score - a.score);
            const selectedChunks = [];
            // 1. Ensure each selected document with genuine relevant evidence (score >= 0.20) gets represented
            for (const dId of docIdSet) {
                const bestForDoc = scoredList.find((item) => item.chunk.documentId === dId && item.score >= 0.20);
                if (bestForDoc) {
                    selectedChunks.push(bestForDoc);
                }
            }
            // 2. Fill the remaining slots with the globally highest-scoring chunks across all documents
            for (const item of scoredList) {
                if (selectedChunks.length >= topK)
                    break;
                if (!selectedChunks.some((s) => s.chunk.id === item.chunk.id)) {
                    selectedChunks.push(item);
                }
            }
            selectedChunks.sort((a, b) => b.score - a.score);
            return selectedChunks.slice(0, topK);
        }
        // Single document: Sort descending by final score
        scoredList.sort((a, b) => b.score - a.score);
        return scoredList.slice(0, topK);
    }
    totalChunks() {
        return this.chunks.size;
    }
    clear() {
        this.chunks.clear();
        this.saveToDisk();
    }
    saveToDisk() {
        try {
            const arr = Array.from(this.chunks.values());
            fs.writeFileSync(this.storageFilePath, JSON.stringify(arr, null, 2), 'utf-8');
        }
        catch (err) {
            console.warn('Could not persist vector store to disk:', err.message);
        }
    }
    loadFromDisk() {
        this.loadFromFile(this.storageFilePath);
    }
    loadFromFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf-8');
                const arr = JSON.parse(raw);
                for (const c of arr) {
                    this.chunks.set(c.id, c);
                }
            }
        }
        catch (err) {
            console.warn('Could not load vector store from disk:', err.message);
        }
    }
}
export const vectorStore = new MemoryVectorStore();
