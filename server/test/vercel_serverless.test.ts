import assert from 'assert';
import http from 'http';
import { EventEmitter } from 'events';

// Set VERCEL environment variable before loading handler
process.env.VERCEL = '1';

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  json(): any;
}

function createMockReqRes(options: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}): { req: any; res: any; wait: () => Promise<MockResponse> } {
  const req = new EventEmitter() as any;
  req.method = options.method;
  req.url = options.url;
  req.headers = {
    'content-type': 'application/json',
    ...(options.headers || {}),
  };
  req.connection = { remoteAddress: '127.0.0.1' };
  req.socket = { remoteAddress: '127.0.0.1' };

  let resolvePromise: (resp: MockResponse) => void;
  const promise = new Promise<MockResponse>((res) => {
    resolvePromise = res;
  });

  const responseHeaders: Record<string, string> = {};
  let responseBody = '';
  let statusCode = 200;

  const res = new EventEmitter() as any;
  res.statusCode = 200;
  res.setHeader = (name: string, val: string) => {
    responseHeaders[name.toLowerCase()] = val;
  };
  res.getHeader = (name: string) => responseHeaders[name.toLowerCase()];
  res.writeHead = (code: number, headers?: any) => {
    statusCode = code;
    if (headers) {
      Object.entries(headers).forEach(([k, v]) => {
        responseHeaders[k.toLowerCase()] = String(v);
      });
    }
    return res;
  };
  res.write = (chunk: any) => {
    if (chunk) responseBody += chunk.toString();
    return true;
  };
  res.end = (chunk?: any) => {
    if (chunk) responseBody += chunk.toString();
    if (res.statusCode) statusCode = res.statusCode;
    resolvePromise({
      statusCode,
      headers: responseHeaders,
      body: responseBody,
      json: () => JSON.parse(responseBody),
    });
    return res;
  };

  // Attach body to req
  if (options.body) {
    req.body = options.body;
  }

  return { req, res, wait: () => promise };
}

async function runTests() {
  process.env.VERCEL = '1';
  const { default: handler } = await import('../../api/index.js');

  console.log('======================================================');
  console.log('🧪 Starting Vercel Serverless Function & Unified Flow Test Suite');
  console.log('======================================================\n');

  // Test 1: Handler function exported
  console.log('Test 1: Handler Function Verification');
  assert.strictEqual(typeof handler, 'function', 'api/index.ts must export a function handler');
  console.log('  ✓ PASS: api/index.ts exports a valid Vercel function handler');

  // Test 2: GET /api/health
  console.log('\nTest 2: GET /api/health through Vercel Serverless Handler');
  const hCall = createMockReqRes({ method: 'GET', url: '/api/health' });
  handler(hCall.req, hCall.res);
  const hRes = await hCall.wait();
  assert.strictEqual(hRes.statusCode, 200, 'Health endpoint should return 200');
  const hJson = hRes.json();
  assert.strictEqual(hJson.status, 'healthy', 'Status should be healthy');
  assert.ok(hJson.providers.gemini, 'Gemini provider status present');
  console.log(`  ✓ PASS: GET /api/health returned 200 (${hJson.status}, model: ${hJson.providers.gemini.model})`);

  // Test 3: Vercel Rewrite URL Restoration via x-matched-path
  console.log('\nTest 3: Vercel Rewrite URL Restoration (x-matched-path)');
  const rewriteCall = createMockReqRes({
    method: 'GET',
    url: '/api', // Vercel internal rewrite destination
    headers: { 'x-matched-path': '/api/health' }, // Original requested path
  });
  handler(rewriteCall.req, rewriteCall.res);
  const rewriteRes = await rewriteCall.wait();
  assert.strictEqual(rewriteRes.statusCode, 200, 'Rewrite should restore path and return 200');
  assert.strictEqual(rewriteRes.json().status, 'healthy');
  console.log('  ✓ PASS: Vercel x-matched-path correctly restored /api/health');

  // Test 4: GET /api/health/integrations
  console.log('\nTest 4: GET /api/health/integrations through Vercel Handler');
  const integCall = createMockReqRes({ method: 'GET', url: '/api/health/integrations' });
  handler(integCall.req, integCall.res);
  const integRes = await integCall.wait();
  assert.strictEqual(integRes.statusCode, 200, 'Integrations health should return 200');
  const integJson = integRes.json();
  assert.ok(integJson.integrations.firebaseAuth, 'Firebase Auth configured in integrations');
  assert.ok(integJson.integrations.gemini, 'Gemini configured in integrations');
  console.log('  ✓ PASS: GET /api/health/integrations reported operational integrations');

  // Test 5: Agent 1 (Document RAG) Input Validation through Vercel Handler
  console.log('\nTest 5: Agent 1 (Document RAG) Validation via Serverless Endpoint');
  const ragCall = createMockReqRes({
    method: 'POST',
    url: '/api/rag/query',
    body: { question: '', documentIds: [] },
  });
  handler(ragCall.req, ragCall.res);
  const ragRes = await ragCall.wait();
  assert.strictEqual(ragRes.statusCode, 400, 'Empty document query should return 400');
  console.log('  ✓ PASS: /api/rag/query properly validates inputs in serverless mode');

  // Test 6: Agent 3 (Web Research) Input Validation through Vercel Handler
  console.log('\nTest 6: Agent 3 (Web Research) Validation via Serverless Endpoint');
  const resCall = createMockReqRes({
    method: 'POST',
    url: '/api/research/query',
    body: { question: '   ' },
  });
  handler(resCall.req, resCall.res);
  const resRes = await resCall.wait();
  assert.strictEqual(resRes.statusCode, 400, 'Empty research query should return 400');
  console.log('  ✓ PASS: /api/research/query properly validates inputs in serverless mode');

  // Test 7: University RAG Status Endpoint through Vercel Handler
  console.log('\nTest 7: University Knowledge Base Status via Serverless Endpoint');
  const uniCall = createMockReqRes({ method: 'GET', url: '/api/university/status' });
  handler(uniCall.req, uniCall.res);
  const uniRes = await uniCall.wait();
  assert.strictEqual(uniRes.statusCode, 200, 'University status should return 200');
  const uniJson = uniRes.json();
  assert.strictEqual(uniJson.success, true, 'University status response success');
  assert.ok(uniJson.status, 'University status object present');
  console.log(`  ✓ PASS: /api/university/status returned 200 (Indexed chunks: ${uniJson.status.totalIndexedChunks || 0})`);

  console.log('\n======================================================');
  console.log('Results: All 7 Vercel Serverless Function Tests Passed!');
  console.log('======================================================');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
