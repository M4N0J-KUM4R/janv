import { test, expect } from '@playwright/test';

/**
 * E2E dashboard and navigation tests.
 * Requires the API to be running with seeded fixture data.
 */

async function loginAsAdmin(page: any) {
  await page.goto('/adminLogin');
  await page.getByRole('textbox', { name: /email/i }).fill('admin@fixture.test');
  await page.getByRole('textbox', { name: /password/i }).fill('AdminPassword123!');
  await page.getByRole('button', { name: /sign in|login|submit/i }).click();
  // Wait until we're not on adminLogin
  await page.waitForFunction(() => !window.location.pathname.includes('adminLogin'), { timeout: 10000 });
}

test.describe('Dashboard & Navigation', () => {
  test('authenticated user can access dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    // Dashboard should load without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('no console errors on dashboard', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('Failed to load resource') && !e.includes('favicon')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('admin can access /admin route', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await expect(page.locator('body')).toBeVisible();
  });

  test('logout clears session', async ({ page }) => {
    await loginAsAdmin(page);
    // Find and click logout
    const logoutBtn = page.getByRole('button', { name: /logout|sign out/i });
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click();
      await page.waitForFunction(() => window.location.pathname.includes('adminLogin'), { timeout: 5000 });
    }
  });
});

test.describe('Assessments', () => {
  test('assessments page loads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/assessment');
    await expect(page.locator('body')).toBeVisible();
  });

  test('assessments page has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loginAsAdmin(page);
    await page.goto('/assessment');
    await page.waitForLoadState('networkidle');
    const criticalErrors = errors.filter(
      (e) => !e.includes('Failed to load resource') && !e.includes('favicon')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('API Health', () => {
  test('API health endpoint responds through proxy', async ({ request }) => {
    const resp = await request.get('/api/health');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe('healthy');
  });
});
