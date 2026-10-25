import { webScrapingEvaluator } from '../src/eval/webScrapingEvaluator.js';

async function runBenchmark() {
  console.log('\n======================================================');
  console.log('🌐 Starting 50-Question Web Scraping Agent Evaluation');
  console.log('======================================================\n');
  console.log('Benchmarking 50 questions across Categories A, B, C, D, and E...\n');

  const summary = await webScrapingEvaluator.evaluateAll('fixture');

  console.log('-------------------------------------------------------------------------------------------------------------------------');
  console.log(
    `| ${'ID'.padEnd(7)} | ${'Cat'.padEnd(5)} | ${'Question Snippet'.padEnd(46)} | ${'Score'.padEnd(7)} | ${'URLs'.padEnd(5)} | ${'Extract'.padEnd(8)} | ${'Status'.padEnd(8)} |`
  );
  console.log('-------------------------------------------------------------------------------------------------------------------------');

  for (const r of summary.results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    const qSnippet = r.question.length > 44 ? r.question.slice(0, 41) + '...' : r.question;
    console.log(
      `| ${r.questionId.padEnd(7)} | [${r.categoryCode}]   | ${qSnippet.padEnd(46)} | ${(
        r.overallScore.toFixed(2)
      ).padEnd(7)} | ${(r.retrievedUrlCount + '').padEnd(5)} | ${(r.extractedContentLength + 'B').padEnd(8)} | ${status.padEnd(8)} |`
    );
    if (!r.passed) {
      for (const reason of r.failureReasons) {
        console.log(`    ↳ Reason: ${reason}`);
      }
    }
  }

  console.log('-------------------------------------------------------------------------------------------------------------------------');
  console.log('\n📊 Evaluation Metrics & Category Breakdown:');
  console.log(`- Total Questions Evaluated: ${summary.totalQuestions}`);
  console.log(`- Passed: ${summary.passedCount} / ${summary.totalQuestions}`);
  console.log(`- Failed: ${summary.failedCount}`);
  console.log(`- Average Agent Quality Index: ${(summary.averageScore * 100).toFixed(1)}%`);
  console.log(`- URL Retrieval Success Rate: ${summary.metrics.urlRetrievalSuccessRate}%`);
  console.log(`- Content Extraction Rate: ${summary.metrics.contentExtractionSuccessRate}%`);
  console.log(`- Retrieval Relevance: ${summary.metrics.averageRelevance}%`);
  console.log(`- Answer Correctness: ${summary.metrics.averageCorrectness}%`);
  console.log(`- Citation Validity: ${summary.metrics.citationValidityRate}%`);
  console.log(`- Evidence Support Grounding: ${summary.metrics.evidenceSupportRate}%`);
  console.log(`- Average Latency: ${summary.metrics.averageLatencyMs}ms`);

  console.log('\nCategory Performance:');
  for (const [code, cat] of Object.entries(summary.categoryBreakdown)) {
    console.log(`  - Category ${code}: ${cat.passed}/${cat.total} Passed (Average Score: ${cat.avgScore}%)`);
  }
  console.log('======================================================\n');

  if (summary.failedCount > 0) {
    console.error(`Evaluation failed with ${summary.failedCount} failed questions.`);
    process.exit(1);
  } else {
    console.log('✓ All 50 Web-Scraping Evaluation Questions Passed Successfully!');
  }
}

runBenchmark().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
