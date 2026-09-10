const { chromium } = require('playwright');

async function runDemo() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('Browser:', msg.text()));
  page.on('pageerror', err => console.log('Page error:', err.message));

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  await page.waitForSelector('.auth-panel', { timeout: 10000 });
  console.log('Auth form loaded');

  await page.fill('input[type="text"]', 'John Doe');
  await page.fill('input[type="email"]', 'john@example.com');
  await page.fill('input[type="password"]', 'password123');
  console.log('Filled login form');

  await page.click('button:has-text("Enter")');
  console.log('Clicked Enter');

  await page.waitForSelector('.workspace', { timeout: 10000 });
  console.log('Workspace loaded');

  // Helper to fill month form - use nth-of-type on the form inputs
  async function fillMonth(data) {
    await page.fill('input[type="month"]', data.month);
    
    // The form has 7 number inputs in order: activeIncome, passiveIncome, creditScore, loansOutstanding, emiMonthly, miscellaneousCharges, moneySpent
    const inputs = page.locator('.month-grid input[type="number"]');
    
    await inputs.nth(0).fill(String(data.activeIncome));
    await inputs.nth(1).fill(String(data.passiveIncome));
    await inputs.nth(2).fill(String(data.creditScore));
    await inputs.nth(3).fill(String(data.loansOutstanding));
    await inputs.nth(4).fill(String(data.emiMonthly));
    await inputs.nth(5).fill(String(data.miscCharges));
    await inputs.nth(6).fill(String(data.moneySpent));
    
    await page.click('button:has-text("Save month")');
    await page.waitForTimeout(800);
  }

  const months = [
    { month: '2024-01', activeIncome: 8000, passiveIncome: 500, creditScore: 750, loansOutstanding: 15000, emiMonthly: 1200, miscCharges: 300, moneySpent: 3500 },
    { month: '2024-02', activeIncome: 8200, passiveIncome: 550, creditScore: 755, loansOutstanding: 14500, emiMonthly: 1200, miscCharges: 280, moneySpent: 3600 },
    { month: '2024-03', activeIncome: 8100, passiveIncome: 600, creditScore: 760, loansOutstanding: 14000, emiMonthly: 1200, miscCharges: 320, moneySpent: 3400 },
  ];

  for (const m of months) {
    console.log(`Adding ${m.month}...`);
    await fillMonth(m);
  }

  // Switch forecast views
  console.log('Switching forecast views...');
  const views = ['Projected expenses', 'Projected income', 'Projected savings', 'Projected net worth'];
  for (const view of views) {
    await page.click(`.output-card:has-text("${view}")`);
    await page.waitForTimeout(400);
  }

  // Change forecast spans
  console.log('Changing forecast spans...');
  for (const span of ['24M', '36M', '12M']) {
    await page.click(`.segment:has-text("${span}")`);
    await page.waitForTimeout(400);
  }

  // Ask questions
  console.log('Asking questions...');
  const questions = [
    "What happens to my expenses in 24 months?",
    "Can I handle a house loan?",
    "What about EMI pressure?",
    "How will my savings look?"
  ];

  for (const question of questions) {
    await page.fill('input[placeholder*="expenses"]', question);
    await page.click('button:has-text("Send")');
    console.log(`Asked: "${question}"`);
    await page.waitForTimeout(1200);
  }

  await page.screenshot({ path: 'fintwinai-demo.png', fullPage: true });
  console.log('Screenshot saved as fintwinai-demo.png');

  await page.waitForTimeout(3000);
  await browser.close();
  console.log('Demo complete!');
}

runDemo().catch(console.error);