const { chromium } = require('playwright');

async function runDemo() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
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

  // Helper to fill month form
  async function fillMonth(data) {
    await page.fill('input[type="month"]', data.month);
    
    const inputs = page.locator('.month-grid input[type="number"]');
    
    await inputs.nth(0).fill(String(data.activeIncome));
    await inputs.nth(1).fill(String(data.passiveIncome));
    await inputs.nth(2).fill(String(data.creditScore));
    await inputs.nth(3).fill(String(data.loansOutstanding));
    await inputs.nth(4).fill(String(data.emiMonthly));
    await inputs.nth(5).fill(String(data.miscCharges));
    await inputs.nth(6).fill(String(data.moneySpent));
    
    await page.click('button:has-text("Save month")');
    await page.waitForTimeout(300);
  }

  // Generate 24 months of realistic data (Jan 2023 - Dec 2024)
  const months = [];
  let baseIncome = 7500;
  let baseSpent = 3200;
  let basePassive = 400;
  let baseCredit = 720;
  let baseLoans = 18000;
  let baseEmi = 1100;
  let baseMisc = 250;

  for (let i = 0; i < 24; i++) {
    const year = 2023 + Math.floor(i / 12);
    const month = (i % 12) + 1;
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;

    // Add some realistic variation
    const incomeVariation = (Math.random() - 0.5) * 400;
    const spentVariation = (Math.random() - 0.5) * 500;
    const passiveGrowth = i * 15;
    const creditImprovement = Math.min(30, i * 1.2);
    const loanPaydown = i * 150;

    months.push({
      month: monthStr,
      activeIncome: Math.round(baseIncome + incomeVariation + i * 25),
      passiveIncome: Math.round(basePassive + passiveGrowth),
      creditScore: Math.min(800, Math.round(baseCredit + creditImprovement)),
      loansOutstanding: Math.max(5000, Math.round(baseLoans - loanPaydown)),
      emiMonthly: baseEmi,
      miscCharges: Math.round(baseMisc + (Math.random() - 0.5) * 100),
      moneySpent: Math.round(baseSpent + spentVariation + i * 20),
    });
  }

  console.log(`Adding ${months.length} months of data...`);
  for (const m of months) {
    console.log(`  Adding ${m.month}: Income=$${m.activeIncome}, Spent=$${m.moneySpent}, EMI=$${m.emiMonthly}, Credit=${m.creditScore}, Loans=$${m.loansOutstanding}`);
    await fillMonth(m);
  }

  console.log('All 24 months added!');

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
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: 'fintwinai-2year-demo.png', fullPage: true });
  console.log('Screenshot saved as fintwinai-2year-demo.png');

  await page.waitForTimeout(3000);
  await browser.close();
  console.log('Demo complete!');
}

runDemo().catch(console.error);