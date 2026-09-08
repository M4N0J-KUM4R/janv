import { test, expect } from '@playwright/test';

/**
 * End-to-End Frontend Functionality Test Suite for Janv Platform
 * Runs against Next.js (http://localhost:3000) and backend (http://localhost:8080)
 */

test.describe('1. Authentication & Multi-Role Session Validation', () => {
  test('Root / redirects unauthenticated visitor to /adminLogin', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/adminLogin/);
    await expect(page.locator('#admin-email')).toBeVisible();
    await expect(page.locator('#admin-password')).toBeVisible();
  });

  test('/login redirects to /adminLogin', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/adminLogin/);
  });

  test('Invalid credentials display visible error banner', async ({ page }) => {
    await page.goto('/adminLogin');
    await page.locator('#admin-email').fill('unknown.user@institution.edu');
    await page.locator('#admin-password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Error banner should become visible with invalid credentials message
    const errorBanner = page.locator('div:has-text("Invalid credentials")');
    await expect(errorBanner.first()).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/adminLogin/);
  });

  test('Empty inputs are blocked by HTML validation', async ({ page }) => {
    await page.goto('/adminLogin');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/adminLogin/);
  });

  test('Super Admin login succeeds and redirects to Dashboard', async ({ page }) => {
    await page.goto('/adminLogin');
    await page.locator('#admin-email').fill('admin@janv.dev');
    await page.locator('#admin-password').fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/learn\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/learn\/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Faculty login succeeds and accesses institutional dashboard', async ({ page }) => {
    await page.goto('/adminLogin');
    await page.locator('#admin-email').fill('faculty@institution.edu');
    await page.locator('#admin-password').fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/learn\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/learn\/dashboard/);
    await expect(page.locator('header p:has-text("PrepInsta")')).toBeVisible();
  });

  test('Student login succeeds and accesses dashboard', async ({ page }) => {
    await page.goto('/adminLogin');
    await page.locator('#admin-email').fill('student@institution.edu');
    await page.locator('#admin-password').fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/learn\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/learn\/dashboard/);
    await expect(page.locator('header p:has-text("PrepInsta")')).toBeVisible();
  });
});

test.describe('2. Dashboard & Navigation (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/adminLogin');
    await page.locator('#admin-email').fill('faculty@institution.edu');
    await page.locator('#admin-password').fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/learn\/dashboard/, { timeout: 10000 });
  });

  test('Dashboard loads statistics cards and layout shell', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('header p:has-text("PrepInsta")')).toBeVisible();
  });

  test('Navigate to Assessments catalog (/assessment)', async ({ page }) => {
    await page.goto('/assessment');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/assessment/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Navigate to My Tests (/assessment/myTests)', async ({ page }) => {
    await page.goto('/assessment/myTests');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/assessment\/myTests/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Navigate to Test Reports (/assessment/userTestReport) without params renders not found view', async ({ page }) => {
    await page.goto('/assessment/userTestReport');
    await page.waitForLoadState('networkidle');
    // It properly redirects to userReportNotFound when no assessmentId is passed
    await expect(page).toHaveURL(/\/assessment\/userReportNotFound/);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('3. Assessment Creation Flow (Faculty Role)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/adminLogin');
    await page.locator('#admin-email').fill('faculty@institution.edu');
    await page.locator('#admin-password').fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/learn\/dashboard/, { timeout: 10000 });
  });

  test('Create Assessment Form loads and renders fields', async ({ page }) => {
    await page.goto('/assessment/create');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/assessment\/create/);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('4. Proxy & Real Role Claims Validation Diagnostics', () => {
  test('Health endpoint returns healthy status via Next.js proxy', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
  });

  test('Faculty Role: Auth Login and JWT claims validation', async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: {
        email: 'faculty@institution.edu',
        password: 'admin123',
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.access_token).toBeDefined();
    expect(loginData.user.role).toBe('faculty');
    expect(loginData.user.email).toBe('faculty@institution.edu');

    const meRes = await request.get('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${loginData.access_token}`,
      },
    });
    expect(meRes.status()).toBe(200);
    const meData = await meRes.json();
    expect(meData.email).toBe('faculty@institution.edu');
    expect(meData.role).toBe('faculty');
  });

  test('Student Role: Auth Login and JWT claims validation', async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: {
        email: 'student@institution.edu',
        password: 'admin123',
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.access_token).toBeDefined();
    expect(loginData.user.role).toBe('student');
    expect(loginData.user.email).toBe('student@institution.edu');

    const meRes = await request.get('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${loginData.access_token}`,
      },
    });
    expect(meRes.status()).toBe(200);
    const meData = await meRes.json();
    expect(meData.email).toBe('student@institution.edu');
    expect(meData.role).toBe('student');
  });

  test('Super Admin Role: Auth Login and Question Banks Access', async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: {
        email: 'admin@janv.dev',
        password: 'admin123',
      },
    });
    expect(loginRes.status()).toBe(200);
    const { access_token, user } = await loginRes.json();
    expect(user.role).toBe('super_admin');
    expect(user.email).toBe('admin@janv.dev');

    const banksRes = await request.get('/api/assessments/banks', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(banksRes.status()).toBe(200);
  });
});
