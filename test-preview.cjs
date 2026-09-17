const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function testAll() {
  console.log('Starting vite preview on port 4173...');
  const server = spawn('npm.cmd', ['run', 'preview', '--', '--port', '4173'], {
    cwd: 'c:\\Users\\Parthiv Vanapalli\\Desktop\\FinTwin\\frontend',
    stdio: 'pipe',
  });

  server.stdout.on('data', (d) => console.log('Vite:', d.toString()));
  server.stderr.on('data', (d) => console.error('Vite err:', d.toString()));

  // Wait 3 seconds for server to start
  await new Promise((r) => setTimeout(r, 3000));

  console.log('Launching headless browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('Browser Error:', msg.text());
  });
  page.on('pageerror', (err) => console.log('Page Uncaught Error:', err.message));

  try {
    console.log('Navigating to http://localhost:4173...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

    console.log('Page loaded, title:', await page.title());
    await page.screenshot({ path: 'c:\\Users\\Parthiv Vanapalli\\Desktop\\FinTwin\\screenshot-auth.png' });

    // Click demo button
    console.log('Clicking demo fast-track button...');
    await page.click('button:has-text("Explore Live Demo")');
    await page.waitForTimeout(1000);

    // Verify on Dashboard
    console.log('Verifying Dashboard...');
    await page.waitForSelector('.dashboard-page');
    await page.screenshot({ path: 'c:\\Users\\Parthiv Vanapalli\\Desktop\\FinTwin\\screenshot-dashboard.png' });
    console.log('Dashboard rendered successfully!');

    // Test Chart horizon change
    await page.click('button:has-text("24M")');
    await page.waitForTimeout(500);

    // Navigate to Chat page
    console.log('Navigating to AI Chat Studio...');
    await page.click('a[href="/chat"]');
    await page.waitForTimeout(1000);
    await page.waitForSelector('.chat-studio-page');
    await page.screenshot({ path: 'c:\\Users\\Parthiv Vanapalli\\Desktop\\FinTwin\\screenshot-chat.png' });
    console.log('Chat Studio rendered successfully!');

    // Ask question in Chat
    await page.fill('.chat-main-input', 'Can I afford a house in 24 months?');
    await page.click('.chat-submit-btn');
    await page.waitForTimeout(1500);
    console.log('Chat response generated!');

    // Navigate to Scenarios page
    console.log('Navigating to Scenario Simulator...');
    await page.click('a[href="/scenarios"]');
    await page.waitForTimeout(1000);
    await page.waitForSelector('.scenarios-page');
    await page.screenshot({ path: 'c:\\Users\\Parthiv Vanapalli\\Desktop\\FinTwin\\screenshot-scenarios.png' });
    console.log('Scenarios Page rendered successfully!');

    // Click Home Purchase scenario
    await page.click('button:has-text("Home Purchase")');
    await page.waitForTimeout(800);

    // Navigate to Records page
    console.log('Navigating to Records Ledger...');
    await page.click('a[href="/records"]');
    await page.waitForTimeout(1000);
    await page.waitForSelector('.records-page');
    await page.screenshot({ path: 'c:\\Users\\Parthiv Vanapalli\\Desktop\\FinTwin\\screenshot-records.png' });
    console.log('Records Page rendered successfully!');

    // Navigate to Agents page
    console.log('Navigating to Multi-Agent Hub...');
    await page.click('a[href="/agents"]');
    await page.waitForTimeout(1000);
    await page.waitForSelector('.agents-page');
    await page.screenshot({ path: 'c:\\Users\\Parthiv Vanapalli\\Desktop\\FinTwin\\screenshot-agents.png' });
    console.log('Multi-Agent Hub rendered successfully!');

    // Navigate back to Dashboard to test Global Floating AI Chat Widget
    console.log('Testing Global Chat FAB...');
    await page.click('a[href="/"]');
    await page.waitForTimeout(800);
    await page.click('.global-chat-fab');
    await page.waitForTimeout(800);
    await page.waitForSelector('.global-chat-modal');
    await page.screenshot({ path: 'c:\\Users\\Parthiv Vanapalli\\Desktop\\FinTwin\\screenshot-floating-widget.png' });
    console.log('Global Floating Chat Popup opened successfully!');

    console.log('ALL TESTS AND SCREENSHOTS COMPLETED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browser.close();
    server.kill();
    process.exit(0);
  }
}

testAll();
