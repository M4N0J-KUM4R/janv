/**
 * Comprehensive Frontend & API Integration Test Suite
 * Tests all key frontend functionalities, auth flows, routing, and backend integrations.
 * Outputs detailed error diagnostics with stack traces and HTTP bodies for easy debugging.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://localhost:8080';

const results = [];

async function runTest(suite, name, fn) {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    results.push({
      suite,
      name,
      status: 'PASSED',
      durationMs,
      details: typeof details === 'string' ? details : undefined,
    });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
  } catch (err) {
    const durationMs = Date.now() - start;
    results.push({
      suite,
      name,
      status: 'FAILED',
      durationMs,
      error: {
        message: err.message || String(err),
        status: err.status,
        responseBody: err.responseBody,
        stack: err.stack,
      },
    });
    console.error(`  ✗ [FAIL] ${name} (${durationMs}ms)`);
    console.error(`     Reason: ${err.message}`);
    if (err.status) console.error(`     HTTP Status: ${err.status}`);
    if (err.responseBody) console.error(`     Response Body: ${JSON.stringify(err.responseBody)}`);
  }
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    const error = new Error(`Request to ${url} failed with status ${res.status}`);
    error.status = res.status;
    error.responseBody = json;
    throw error;
  }

  return { status: res.status, headers: res.headers, data: json };
}

async function main() {
  console.log('\n================================================================');
  console.log('🚀 JANV FRONTEND & BACKEND FULL INTEGRATION TEST SUITE');
  console.log(`   Frontend Target: ${BASE_URL}`);
  console.log(`   Backend Target:  ${BACKEND_URL}`);
  console.log('================================================================\n');

  let adminToken = '';

  // 1. Next.js Routing & Page Rendering
  console.log('📁 Suite 1: Frontend Route Rendering & SSR Checks');

  await runTest('Frontend Routing', 'GET /adminLogin renders institutional login page', async () => {
    const res = await request(`${BASE_URL}/adminLogin`);
    if (typeof res.data !== 'string' || !res.data.includes('Institutions Admin')) {
      throw new Error('Page did not contain expected heading "Institutions Admin"');
    }
    return 'HTML rendered with correct login form markup';
  });

  await runTest('Frontend Routing', 'GET /login redirects to /adminLogin (308 Redirect)', async () => {
    const res = await fetch(`${BASE_URL}/login`, { redirect: 'manual' });
    if (res.status !== 308) {
      throw new Error(`Expected redirect 308, got ${res.status}`);
    }
    const location = res.headers.get('location');
    if (location !== '/adminLogin') {
      throw new Error(`Expected redirect location "/adminLogin", got "${location}"`);
    }
    return 'Redirects smoothly to /adminLogin';
  });

  await runTest('Frontend Routing', 'GET /learn/dashboard returns 200 and renders HTML', async () => {
    const res = await request(`${BASE_URL}/learn/dashboard`);
    if (typeof res.data !== 'string') {
      throw new Error('Expected HTML string response');
    }
    return 'Dashboard SSR rendered';
  });

  await runTest('Frontend Routing', 'GET /assessment/myTests returns 200', async () => {
    const res = await request(`${BASE_URL}/assessment/myTests`);
    if (typeof res.data !== 'string') {
      throw new Error('Expected HTML string response');
    }
    return 'MyTests page rendered';
  });

  await runTest('Frontend Routing', 'GET /assessment/userTestReport returns 200', async () => {
    const res = await request(`${BASE_URL}/assessment/userTestReport`);
    if (typeof res.data !== 'string') {
      throw new Error('Expected HTML string response');
    }
    return 'UserTestReport page rendered';
  });

  // 2. Authentication & Proxying Tests
  console.log('\n🔐 Suite 2: Authentication & Next.js API Proxying');

  await runTest('Authentication', 'POST /api/auth/login with invalid credentials returns 401', async () => {
    try {
      await request(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@janv.dev', password: 'wrongpassword' }),
      });
      throw new Error('Expected login to fail with 401, but it succeeded');
    } catch (err) {
      if (err.status !== 401) {
        throw new Error(`Expected HTTP 401, received ${err.status}: ${JSON.stringify(err.responseBody)}`);
      }
      return 'Rejected invalid credentials with 401 Unauthorized';
    }
  });

  await runTest('Authentication', 'POST /api/auth/login with Super Admin credentials succeeds', async () => {
    const res = await request(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@janv.dev', password: 'admin123' }),
    });

    if (!res.data.access_token) {
      throw new Error('Missing access_token in login response');
    }
    if (res.data.user.role !== 'super_admin') {
      throw new Error(`Expected user role super_admin, got ${res.data.user.role}`);
    }
    adminToken = res.data.access_token;
    return `Authenticated as ${res.data.user.email} (${res.data.user.role})`;
  });

  await runTest('Authentication', 'GET /api/auth/me returns valid user claims with Bearer token', async () => {
    if (!adminToken) throw new Error('Cannot run test without adminToken');
    const res = await request(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.data.email !== 'admin@janv.dev') {
      throw new Error(`Expected email admin@janv.dev, got ${res.data.email}`);
    }
    return `Verified user: ${res.data.full_name} <${res.data.email}>`;
  });

  // 3. Core Assessment & Question Management
  console.log('\n📊 Suite 3: Assessment & Question Management via Proxy');

  let testBankId = null;

  await runTest('Question Bank API', 'GET /api/assessments/banks returns question banks', async () => {
    if (!adminToken) throw new Error('Cannot run test without adminToken');
    const res = await request(`${BASE_URL}/api/assessments/banks`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!Array.isArray(res.data)) {
      throw new Error('Expected array of question banks');
    }
    return `Retrieved ${res.data.length} question banks`;
  });

  await runTest('Question Bank API', 'POST /api/assessments/banks creates a question bank', async () => {
    if (!adminToken) throw new Error('Cannot run test without adminToken');
    const res = await request(`${BASE_URL}/api/assessments/banks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Algorithms & Data Structures Test Bank',
        description: 'Automated test bank for integration testing',
        tags: ['dsa', 'algorithms'],
      }),
    });
    if (!res.data.id) {
      throw new Error('Failed to create bank, missing ID in response');
    }
    testBankId = res.data.id;
    return `Created Question Bank ID: ${testBankId}`;
  });

  await runTest('Assessments API', 'POST /api/assessments creates a new assessment', async () => {
    if (!adminToken) throw new Error('Cannot run test without adminToken');
    const res = await request(`${BASE_URL}/api/assessments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Full Stack Developer Skill Assessment',
        description: 'Comprehensive test covering coding, MCQs and system design',
        duration_mins: 60,
        total_marks: 100,
        pass_percentage: 60.0,
      }),
    });
    if (!res.data.id) {
      throw new Error('Failed to create assessment, missing ID in response');
    }
    return `Created Assessment ID: ${res.data.id} ("${res.data.title}")`;
  });

  await runTest('Assessments API', 'GET /api/assessments returns paginated list with newly created assessment', async () => {
    if (!adminToken) throw new Error('Cannot run test without adminToken');
    const res = await request(`${BASE_URL}/api/assessments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (typeof res.data.total !== 'number' || !Array.isArray(res.data.data)) {
      throw new Error('Response does not match PaginatedResponse structure');
    }
    return `Found ${res.data.total} assessments (page ${res.data.page})`;
  });

  await runTest('Practice API', 'GET /api/practice returns coding problems list', async () => {
    if (!adminToken) throw new Error('Cannot run test without adminToken');
    const res = await request(`${BASE_URL}/api/practice`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!Array.isArray(res.data)) {
      throw new Error('Expected array of problems');
    }
    return `Retrieved ${res.data.length} practice problems`;
  });

  await runTest('Leaderboard API', 'GET /api/assessments/leaderboard/global returns leaderboard', async () => {
    if (!adminToken) throw new Error('Cannot run test without adminToken');
    const res = await request(`${BASE_URL}/api/assessments/leaderboard/global`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!Array.isArray(res.data.leaderboard)) {
      throw new Error('Expected array of leaderboard rows in res.data.leaderboard');
    }
    return `Global leaderboard active (${res.data.leaderboard.length} entries, page ${res.data.page})`;
  });

  // Final Summary Report
  console.log('\n================================================================');
  console.log('📋 TEST EXECUTION SUMMARY');
  console.log('================================================================');

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;

  console.log(`Total Scenarios: ${total} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    console.error('❌ FAILED TEST DETAILS:');
    results
      .filter((r) => r.status === 'FAILED')
      .forEach((r) => {
        console.error(`\n----------------------------------------------------------------`);
        console.error(`• [${r.suite}] ${r.name}`);
        console.error(`  Error: ${r.error?.message}`);
        if (r.error?.status) console.error(`  HTTP Status: ${r.error.status}`);
        if (r.error?.responseBody) console.error(`  Response: ${JSON.stringify(r.error.responseBody, null, 2)}`);
        if (r.error?.stack) console.error(`  Stack:\n${r.error.stack}`);
      });
    process.exit(1);
  } else {
    console.log('🎉 ALL 12 FRONTEND & BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!');
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
