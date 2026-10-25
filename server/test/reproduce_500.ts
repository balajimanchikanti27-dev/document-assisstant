import { questionAnalyzer } from '../src/research/questionAnalyzer.js';
import { vectorStore } from '../src/vectorStore/memoryVectorStore.js';
import { ragService } from '../src/rag/ragService.js';
import { documentJobManager } from '../src/jobs/documentJobManager.js';
import { geminiService } from '../src/services/gemini.service.js';

async function test() {
  const q = 'Summarize the key insights from my selected document.';
  const analysis = questionAnalyzer.analyze(q, []);
  console.log('Analysis:', JSON.stringify(analysis, null, 2));

  // Let's test with a real 5-page text document
  const sampleDocText = `
Page 1: Executive Summary
The Global Energy Transition Initiative report outlines key strategic priorities for 2026-2030.
Solar and wind capacity grew by 35% year-over-year, leading to record clean generation.
Grid modernization and battery storage investments reached $120 billion globally.

Page 2: Key Insights and Challenges
Key insights indicate that transmission bottlenecks remain the primary operational constraint.
Interconnection queues in North America and Europe exceed 1,500 gigawatts of pending capacity.
Regulatory streamlining and high-voltage direct current (HVDC) transmission lines are required.

Page 3: Technological Advancements
Solid-state lithium batteries demonstrated 450 Wh/kg energy density in pilot manufacturing.
Smart inverter algorithms enabled microsecond-level grid frequency stabilization.
Green hydrogen production costs dropped below $2.50 per kilogram in optimal solar regions.

Page 4: Strategic Recommendations
1. Accelerate permitting processes for cross-border transmission corridors.
2. Mandate long-duration energy storage targets in regional grid planning.
3. Foster public-private partnerships to de-risk next-generation geothermal and tidal power.

Page 5: Conclusion
The decarbonization pathway is economically viable and accelerating. 
Urgent policy alignment is essential to eliminate grid interconnection delays and sustain momentum.
  `.trim();

  const docId = 'doc_energy_report';
  const userId = 'test_user_summary';
  const job = await documentJobManager.executeIngestion(
    docId,
    userId,
    'energy_report.txt',
    Buffer.from(sampleDocText)
  );
  console.log('Ingestion status:', job.status, 'chunks:', job.chunkCount);

  // Now run rag query:
  try {
    const result = await ragService.query({
      question: q,
      documentIds: [docId],
      userId,
    });
    console.log('RAG Query Result:', JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('RAG Query Error:', err.message, err.stack);
  }
}

test();
