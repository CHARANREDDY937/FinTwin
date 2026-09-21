import { test, expect } from '@playwright/test';

test.describe('FinTwinAI Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads landing page with hero section', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Financial Twin')).toBeVisible();
  });

  test('has working navigation to auth page', async ({ page }) => {
    await page.click('text=Login');
    await expect(page).toHaveURL(/.*login/);
  });

  test('has working navigation to demo', async ({ page }) => {
    await page.click('text=Demo');
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
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
  });

  test('shows register form when toggled', async ({ page }) => {
    await page.click('text=Register');
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });
});

test.describe('Dashboard Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Login")');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('loads dashboard with summary cards', async ({ page }) => {
    await expect(page.locator('text=Executive Financial Twin Dashboard')).toBeVisible();
    await expect(page.locator('text=Projected Expenses')).toBeVisible();
    await expect(page.locator('text=Projected Inflows')).toBeVisible();
    await expect(page.locator('text=Projected Savings')).toBeVisible();
    await expect(page.locator('text=Projected Net Worth')).toBeVisible();
  });

  test('can switch forecast views', async ({ page }) => {
    await page.click('text=Projected Income');
    await expect(page.locator('text=Projected Income')).toHaveClass(/active/);
  });
});

test.describe('Chat Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
  });

  test('shows chat interface', async ({ page }) => {
    await expect(page.locator('text=FinTwin AI Advisor')).toBeVisible();
    await expect(page.locator('input[placeholder*="expenses"]')).toBeVisible();
  });

  test('can send a question', async ({ page }) => {
    await page.fill('input[placeholder*="expenses"]', 'What are my projected expenses?');
    await page.click('button:has-text("Ask Twin")');
    await expect(page.locator('text=What are my projected expenses?')).toBeVisible();
  });
});