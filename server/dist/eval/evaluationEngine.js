import { EVALUATION_DATASET } from './evaluationDataset.js';
import { researchOrchestrator } from '../research/researchOrchestrator.js';
import { ragService } from '../rag/ragService.js';
import { vectorStore } from '../vectorStore/memoryVectorStore.js';
import { embeddingService } from '../embeddings/embeddingService.js';
/**
 * Automated Evaluation Engine for LLM Research Agent Quality
 */
export class EvaluationEngine {
    async evaluateAll() {
        const results = [];
        for (const testCase of EVALUATION_DATASET) {
            const result = await this.evaluateTestCase(testCase);
            results.push(result);
            await new Promise((r) => setTimeout(r, 300));
        }
        const passedTests = results.filter((r) => r.passed).length;
        const failedTests = results.length - passedTests;
        const averageScore = results.reduce((acc, r) => acc + r.overallScore, 0) / results.length;
        const averageLatencyMs = results.reduce((acc, r) => acc + r.scores.latencyMs, 0) / results.length;
        return {
            timestamp: new Date().toISOString(),
            totalTests: results.length,
            passedTests,
            failedTests,
            averageScore: parseFloat(averageScore.toFixed(3)),
            averageLatencyMs: Math.round(averageLatencyMs),
            results,
        };
    }
    async evaluateTestCase(testCase) {
        const start = Date.now();
        const failureReasons = [];
        let answer = '';
        let citations = [];
        let isInsufficientEvidence = false;
        let mode = testCase.mode;
        // 1. Execute Query Based on Mode
        if (testCase.mode === 'document') {
            const userId = 'eval_user_rag';
            const doc = testCase.sampleDocumentContext;
            // Ingest sample chunk
            const emb = await embeddingService.getEmbedding(doc.text);
            vectorStore.addChunks([
                {
                    id: `chunk_${doc.id}`,
                    documentId: doc.id,
                    userId,
                    documentName: doc.name,
                    pageNumber: 1,
                    text: doc.text,
                    embedding: emb,
                },
            ]);
            const res = await ragService.query({
                question: testCase.question,
                documentIds: [doc.id],
                userId,
            });
            answer = res.answer;
            citations = res.citations;
            isInsufficientEvidence = res.isInsufficientEvidence;
        }
        else {
            // Research Mode
            const res = await researchOrchestrator.executeResearch({
                question: testCase.question,
                sourcePreference: 'both',
                responseLength: 'balanced',
            });
            answer = res.answer;
            citations = res.citations;
            isInsufficientEvidence = res.noSourcesFound;
        }
        const latencyMs = Date.now() - start;
        const lowerAnswer = answer.toLowerCase();
        // 2. Evaluate Criteria 1: Relevance
        const qWords = testCase.question
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 3 && !['what', 'when', 'where', 'which', 'explain'].includes(w));
        const matchedQWords = qWords.filter((w) => lowerAnswer.includes(w)).length;
        const relevance = qWords.length > 0 ? Math.min(1.0, (matchedQWords / qWords.length) + 0.4) : 0.9;
        // 3. Evaluate Criteria 2: Factual Correctness against reference facts
        let factualCorrectness = 1.0;
        if (testCase.referenceFacts.length > 0) {
            const matchedFacts = testCase.referenceFacts.filter((fact) => lowerAnswer.includes(fact.toLowerCase())).length;
            factualCorrectness = matchedFacts / testCase.referenceFacts.length;
            if (factualCorrectness < 0.3) {
                failureReasons.push(`Factual reference mismatch (matched ${matchedFacts}/${testCase.referenceFacts.length} facts)`);
            }
        }
        // 4. Evaluate Criteria 3 & 4: Evidence Support & Citation Correctness
        let citationCorrectness = 1.0;
        let evidenceSupport = 1.0;
        if (testCase.mode === 'research' && !isInsufficientEvidence) {
            if (citations.length === 0) {
                citationCorrectness = 0.4;
                evidenceSupport = 0.5;
                failureReasons.push('Research answer generated with 0 citations');
            }
            else {
                const validUrls = citations.filter((c) => c.url && c.url.startsWith('http')).length;
                citationCorrectness = validUrls / citations.length;
            }
        }
        // 5. Evaluate Criteria 5: Completeness
        const completeness = answer.length > 60 ? 1.0 : answer.length > 25 ? 0.7 : 0.4;
        // 6. Evaluate Criteria 6: Appropriate Uncertainty Handling
        let uncertaintyHandling = 1.0;
        if (testCase.requiresUncertaintyHandling) {
            const hasUncertaintyPhrase = lowerAnswer.includes('cannot be predicted') ||
                lowerAnswer.includes('uncertain') ||
                lowerAnswer.includes('speculative') ||
                lowerAnswer.includes('no verified') ||
                lowerAnswer.includes('did not') ||
                lowerAnswer.includes('not invent') ||
                lowerAnswer.includes('false premise');
            uncertaintyHandling = hasUncertaintyPhrase ? 1.0 : 0.2;
            if (!hasUncertaintyPhrase) {
                failureReasons.push('Failed to appropriately express uncertainty or refute misleading assumption');
            }
        }
        // 7. Evaluate Criteria 7: Mode Separation
        let modeSeparation = 1.0;
        if (testCase.isDocumentOnly) {
            const hasWebCitation = citations.some((c) => c.sourceType !== 'document');
            modeSeparation = hasWebCitation ? 0.0 : 1.0;
            if (hasWebCitation) {
                failureReasons.push('Mode separation failure: Web citations leaked into document-only query');
            }
        }
        // 8. Evaluate Criteria 8: Resistance to Fabricated Facts / Injections
        let fabricationResistance = 1.0;
        if (testCase.prohibitedTerms && testCase.prohibitedTerms.length > 0) {
            for (const term of testCase.prohibitedTerms) {
                if (lowerAnswer.includes(term.toLowerCase())) {
                    fabricationResistance = 0.0;
                    failureReasons.push(`Fabrication failure: Output contained prohibited term "${term}"`);
                    break;
                }
            }
        }
        // 9. Evaluate Criteria 9: Retrieval Relevance
        const retrievalRelevance = citations.length > 0 || isInsufficientEvidence ? 1.0 : 0.5;
        // Calculate Composite Overall Score
        const overallScore = parseFloat((0.20 * relevance +
            0.20 * factualCorrectness +
            0.15 * evidenceSupport +
            0.15 * citationCorrectness +
            0.10 * completeness +
            0.10 * uncertaintyHandling +
            0.05 * modeSeparation +
            0.05 * fabricationResistance).toFixed(3));
        const passed = overallScore >= 0.65 && failureReasons.length === 0;
        return {
            testCaseId: testCase.id,
            category: testCase.category,
            question: testCase.question,
            answerSnippet: answer.slice(0, 160) + (answer.length > 160 ? '...' : ''),
            passed,
            overallScore,
            citationCount: citations.length,
            failureReasons,
            scores: {
                relevance: parseFloat(relevance.toFixed(2)),
                factualCorrectness: parseFloat(factualCorrectness.toFixed(2)),
                evidenceSupport: parseFloat(evidenceSupport.toFixed(2)),
                citationCorrectness: parseFloat(citationCorrectness.toFixed(2)),
                completeness: parseFloat(completeness.toFixed(2)),
                uncertaintyHandling: parseFloat(uncertaintyHandling.toFixed(2)),
                modeSeparation: parseFloat(modeSeparation.toFixed(2)),
                fabricationResistance: parseFloat(fabricationResistance.toFixed(2)),
                retrievalRelevance: parseFloat(retrievalRelevance.toFixed(2)),
                latencyMs,
            },
        };
    }
}
export const evaluationEngine = new EvaluationEngine();
