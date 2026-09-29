import { test, expect } from '@playwright/test';

test.describe('FinTwinAI Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads landing page with hero section', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Financial Twin').first()).toBeVisible();
  });

  test('has working navigation to auth page', async ({ page }) => {
    await page.click('button:has-text("Sign In"):visible');
    await expect(page).toHaveURL(/.*login/);
  });

  test('has working navigation to demo', async ({ page }) => {
    await page.click('button:has-text("Launch Live Twin Studio")');
    await expect(page).toHaveURL(/.*dashboard/);
  });
});

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows login form', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In to Workspace")')).toBeVisible();
  });

  test('shows register form when toggled', async ({ page }) => {
    await page.click('button:has-text("Create Account")');
    await expect(page.locator('#auth-name')).toBeVisible();
    await expect(page.locator('button:has-text("Create Free Account")')).toBeVisible();
  });
});

test.describe('Dashboard Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Instant 6-Month Calibration")');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('loads dashboard with summary cards', async ({ page }) => {
    await expect(page.locator('text=Executive Financial Twin Dashboard')).toBeVisible();
    await expect(page.locator('text=Projected Expenses').first()).toBeVisible();
    await expect(page.locator('text=Projected Inflows').first()).toBeVisible();
    await expect(page.locator('text=Projected Savings').first()).toBeVisible();
    await expect(page.locator('text=Projected Net Worth').first()).toBeVisible();
  });

  test('can switch forecast views', async ({ page }) => {
    await page.click('button.summary-kpi-card:has-text("Projected Inflows")');
    await expect(page.locator('button.summary-kpi-card:has-text("Projected Inflows")')).toHaveClass(/active/);
  });
});

test.describe('Chat Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
  });

  test('shows chat interface', async ({ page }) => {
    await expect(page.locator('text=FinTwin').first()).toBeVisible();
    await expect(page.locator('[placeholder*="expenses"]')).toBeVisible();
  });

  test('can send a question', async ({ page }) => {
    await page.fill('[placeholder*="expenses"]', 'What are my projected expenses?');
    await page.click('button:has-text("Ask Twin")');
    await expect(page.locator('text=What are my projected expenses?').first()).toBeVisible();
  });
});