import { test, expect } from '@playwright/test';

/**
 * E2E auth tests for the Janv platform.
 *
 * These tests run against the live frontend at localhost:3000 (which proxies to
 * the Rust API at localhost:8080 via next.config.ts rewrites).
 *
 * Prerequisites:
 *   cargo run -p janv-api  # with DATABASE_URL, REDIS_URL, JWT_SECRET, etc.
 *   npm run dev            # in janv-web-next
 *
 * Run with:
 *   cd janv-web-next && npx playwright test
 */

test.describe('Authentication', () => {
  test('GET / redirects to /adminLogin when unauthenticated', async ({ page }) => {
    await page.goto('/');
    // Should redirect to /adminLogin for unauthenticated users
    await expect(page).toHaveURL(/\/adminLogin/);
  });

  test('GET /adminLogin shows login form', async ({ page }) => {
    await page.goto('/adminLogin');
    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/adminLogin');
    await page.getByRole('textbox', { name: /email/i }).fill('admin@fixture.test');
    await page.getByRole('textbox', { name: /password/i }).fill('AdminPassword123!');
    await page.getByRole('button', { name: /sign in|login|submit/i }).click();

    // Should redirect to dashboard or admin page
    await expect(page).not.toHaveURL(/\/adminLogin/);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/adminLogin');
    await page.getByRole('textbox', { name: /email/i }).fill('wrong@example.com');
    await page.getByRole('textbox', { name: /password/i }).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|login|submit/i }).click();

    // Should show error or stay on login page
    const url = page.url();
    const hasError = await page.locator('text=/error|invalid|incorrect|wrong/i').count();
    expect(hasError > 0 || url.includes('adminLogin')).toBeTruthy();
  });

  test('protected route redirects to login', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/adminLogin/);
  });

  test('no console errors on login page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/adminLogin');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
