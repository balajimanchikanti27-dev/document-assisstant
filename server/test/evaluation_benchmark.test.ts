import { evaluationEngine } from '../src/eval/evaluationEngine.js';

async function runBenchmark() {
  console.log('\n======================================================');
  console.log('📊 Starting Automated Research Agent Quality Benchmark');
  console.log('======================================================\n');

  console.log('Evaluating 10 representative test archetypes across 10 quality dimensions...\n');

  const summary = await evaluationEngine.evaluateAll();

  console.log('----------------------------------------------------------------------------------------------------------');
  console.log(
    `| ${'Test ID'.padEnd(28)} | ${'Category'.padEnd(24)} | ${'Score'.padEnd(7)} | ${'Latency'.padEnd(8)} | ${'Status'.padEnd(8)} |`
  );
  console.log('----------------------------------------------------------------------------------------------------------');

  for (const res of summary.results) {
    const status = res.passed ? '✓ PASS' : '✗ FAIL';
    console.log(
      `| ${res.testCaseId.padEnd(28)} | ${res.category.padEnd(24)} | ${(
        res.overallScore.toFixed(2)
      ).padEnd(7)} | ${(res.scores.latencyMs + 'ms').padEnd(8)} | ${status.padEnd(8)} |`
    );
    if (!res.passed) {
      for (const reason of res.failureReasons) {
        console.log(`    ↳ Reason: ${reason}`);
      }
    }
  }

  console.log('----------------------------------------------------------------------------------------------------------');
  console.log(`\nBenchmark Summary:`);
  console.log(`- Total Test Cases: ${summary.totalTests}`);
  console.log(`- Passed: ${summary.passedTests} / ${summary.totalTests}`);
  console.log(`- Failed: ${summary.failedTests}`);
  console.log(`- Average Quality Index: ${(summary.averageScore * 100).toFixed(1)}%`);
  console.log(`- Average Latency: ${summary.averageLatencyMs}ms`);
  console.log('======================================================\n');

  if (summary.failedTests > 0) {
    console.error(`Benchmark failed with ${summary.failedTests} regressions.`);
    process.exit(1);
  } else {
    console.log('✓ All 10 evaluation test archetypes passed successfully!');
  }
}

runBenchmark().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
