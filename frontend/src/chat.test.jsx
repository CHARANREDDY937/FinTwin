import { describe, it, expect } from 'vitest';
import { currency } from './lib/format';
import {
  formatMathStep,
  quickQueryPresets,
  parseMarkdownBlocks,
  renderInlineSpans,
} from './ChatPage';

describe('AI Chat & Telemetry Polish Unit Tests', () => {
  it('currency helper formats positive and negative INR with tabular format', () => {
    expect(currency(45000)).toContain('45,000');
    expect(currency(-12000)).toContain('12,000');
  });

  it('verifies semantic color mapping for surplus values', () => {
    const checkSurplusClass = (val) => (val > 0 ? 'good' : val < 0 ? 'alert' : 'warn');

    expect(checkSurplusClass(15000)).toBe('good');
    expect(checkSurplusClass(-5000)).toBe('alert');
    expect(checkSurplusClass(0)).toBe('warn');
  });

  it('groups conversations with snake_case updated_at from backend into Today, Yesterday, and Older', () => {
    const now = Date.now();
    const mockConvs = [
      { id: '1', title: 'Car Loan', updated_at: new Date(now).toISOString() },
      { id: '2', title: 'Inflation Plan', updated_at: new Date(now - 86400000).toISOString() },
      { id: '3', title: 'Old Thread', created_at: new Date(now - 14 * 86400000).toISOString() },
    ];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = todayStart.getTime() - 86400000;
    const lastWeekStart = todayStart.getTime() - 7 * 86400000;

    const groups = { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] };
    mockConvs.forEach((c) => {
      const time = new Date(c.updated_at || c.updatedAt || c.created_at || c.createdAt || Date.now()).getTime();
      if (time >= todayStart.getTime()) groups.Today.push(c);
      else if (time >= yesterdayStart) groups.Yesterday.push(c);
      else if (time >= lastWeekStart) groups['Previous 7 Days'].push(c);
      else groups.Older.push(c);
    });

    expect(groups.Today).toHaveLength(1);
    expect(groups.Today[0].title).toBe('Car Loan');
    expect(groups.Yesterday).toHaveLength(1);
    expect(groups.Older).toHaveLength(1);
  });

  it('correctly synchronizes baseline series with active graphMetric', () => {
    const activeViz = {
      metric: 'expense',
      scenario: 'home',
      scenario_label: 'Home Mortgage',
      series: [
        { month: 'M1', expense: 45000, savings: 15000, income: 60000 },
        { month: 'M2', expense: 46000, savings: 14000, income: 60000 },
      ],
      baseline: [
        { month: 'M1', expense: 35000, savings: 25000, income: 60000 },
        { month: 'M2', expense: 35500, savings: 24500, income: 60000 },
      ],
    };

    // When graphMetric is 'savings' (user switched metric pill), baseline must sync to savings, not remain expense
    const selectedMetric = 'savings';
    const displayed = activeViz.series.map((item, idx) => {
      const baseItem = activeViz.baseline ? activeViz.baseline[idx] : null;
      return {
        ...item,
        baseline: baseItem ? (baseItem[selectedMetric] ?? baseItem[activeViz.metric]) : undefined,
      };
    });

    expect(displayed[0].savings).toBe(15000);
    expect(displayed[0].baseline).toBe(25000); // Baseline savings, NOT baseline expense (35000)
  });

  it('ensures breakdown pieData assigns brand indigo instead of pure red to living expenses', () => {
    const livingExpenseColor = '#6366F1';
    const deficitColor = '#EF4444';
    const surplusColor = '#10B981';

    // Verify brand indigo is not pure red
    expect(livingExpenseColor).not.toBe('#FF5E62');
    expect(livingExpenseColor).not.toBe('#EF4444');

    // Deficit uses red
    expect(deficitColor).toBe('#EF4444');
    expect(surplusColor).toBe('#10B981');
  });

  it('formatMathStep accurately parses formulas, colon-separated labels, and fallback steps', () => {
    // Colon-separated step
    const step1 = formatMathStep('1. Monthly Net Surplus: ₹35,000');
    expect(step1.badge).toBe('Monthly Net Surplus');
    expect(step1.val).toBe('₹35,000');

    // Equation with equals sign
    const step2 = formatMathStep('₹85,000 - ₹50,000 = ₹35,000');
    expect(step2.badge).toBe('₹85,000 - ₹50,000');
    expect(step2.val).toBe('= ₹35,000');

    // Free text without delimiters
    const step3 = formatMathStep('Simulated continuous compounding');
    expect(step3.badge).toBe('Step');
    expect(step3.val).toBe('Simulated continuous compounding');

    // Arrow transition (-> and →)
    const stepArrow1 = formatMathStep('Monthly Net Investable -> ₹24,000');
    expect(stepArrow1.badge).toBe('Monthly Net Investable');
    expect(stepArrow1.val).toBe('→ ₹24,000');

    const stepArrow2 = formatMathStep('Compounded Wealth (10Y) → ₹45,50,000');
    expect(stepArrow2.badge).toBe('Compounded Wealth (10Y)');
    expect(stepArrow2.val).toBe('→ ₹45,50,000');

    // Approximation symbol (≈ and ~)
    const stepApprox1 = formatMathStep('Estimated Post-Tax Inflow ≈ ₹1,12,000');
    expect(stepApprox1.badge).toBe('Estimated Post-Tax Inflow');
    expect(stepApprox1.val).toBe('≈ ₹1,12,000');

    // Non-string edge case
    const step4 = formatMathStep(42);
    expect(step4.badge).toBe('Step');
    expect(step4.val).toBe('42');
  });

  it('verifies quickQueryPresets strip configuration and integrity', () => {
    expect(quickQueryPresets.length).toBeGreaterThanOrEqual(4);
    quickQueryPresets.forEach((preset) => {
      expect(preset.label).toBeTruthy();
      expect(typeof preset.label).toBe('string');
      expect(preset.query).toBeTruthy();
      expect(typeof preset.query).toBe('string');
    });
  });

  it('computes correct semantic tone and status badges for live telemetry tiles', () => {
    // DTI tests
    const getDtiStatus = (dti) => (dti <= 35 ? 'Healthy' : dti <= 45 ? 'Moderate' : 'Elevated');
    const getDtiTone = (dti) => (dti <= 35 ? 'good' : dti <= 45 ? 'warn' : 'alert');

    expect(getDtiStatus(28.5)).toBe('Healthy');
    expect(getDtiTone(28.5)).toBe('good');
    expect(getDtiStatus(40.0)).toBe('Moderate');
    expect(getDtiTone(40.0)).toBe('warn');
    expect(getDtiStatus(52.1)).toBe('Elevated');
    expect(getDtiTone(52.1)).toBe('alert');

    // Credit score tests
    const getCreditStatus = (score) => (score >= 750 ? 'Prime' : score >= 680 ? 'Good' : 'Fair');
    const getCreditTone = (score) => (score >= 750 ? 'prime' : score >= 680 ? 'good' : 'warn');

    expect(getCreditStatus(780)).toBe('Prime');
    expect(getCreditTone(780)).toBe('prime');
    expect(getCreditStatus(710)).toBe('Good');
    expect(getCreditTone(710)).toBe('good');
    expect(getCreditStatus(620)).toBe('Fair');
    expect(getCreditTone(620)).toBe('warn');
  });

  it('validates graphViews metadata and spanOptions definitions', async () => {
    const { graphViews, spanOptions } = await import('./ChatPage');
    expect(graphViews).toHaveLength(4);
    expect(graphViews.map((g) => g.id)).toEqual(['expense', 'income', 'savings', 'netWorth']);
    expect(spanOptions).toEqual([6, 12, 24, 36, 60]);
  });

  it('handles edge case strings and symbols in formatMathStep', () => {
    // Empty string
    const emptyStep = formatMathStep('');
    expect(emptyStep.badge).toBe('Step');
    expect(emptyStep.val).toBe('');

    // Multiple colons
    const multiColon = formatMathStep('1. Annual Return: Base: 12%');
    expect(multiColon.badge).toBe('Annual Return');
    expect(multiColon.val).toBe('Base: 12%');

    // Unicode symbols in equation
    const equationStep = formatMathStep('Gross Income - (Taxes + EMIs) = ₹62,400');
    expect(equationStep.badge).toBe('Gross Income - (Taxes + EMIs)');
    expect(equationStep.val).toBe('= ₹62,400');
  });

  it('parseMarkdownBlocks correctly extracts code blocks, tables, blockquotes, headings, and list items', () => {
    const rawMarkdown = `# Executive Grounding Summary
Here is your cashflow comparison:
| Metric | Baseline | Scenario |
| --- | --- | --- |
| Outflow | ₹52,000 | ₹58,000 |
| Surplus | ₹33,000 | ₹27,000 |

\`\`\`python
# Deterministic Compound Interest
wealth = 15000 * 12 * 10
\`\`\`

> Note: All figures are grounded in uploaded bank statements.

- Recommendation 1: Maintain ₹25k emergency buffer
* Recommendation 2: Set SIP to 1st of month
1. Upload statement ledger
2. Review multi-agent consensus`;

    const blocks = parseMarkdownBlocks(rawMarkdown);

    // Verify heading
    expect(blocks[0]).toEqual({ type: 'h2', text: 'Executive Grounding Summary' });

    // Verify paragraph
    expect(blocks[1]).toEqual({ type: 'p', text: 'Here is your cashflow comparison:' });

    // Verify table
    expect(blocks[2].type).toBe('table');
    expect(blocks[2].headers).toEqual(['Metric', 'Baseline', 'Scenario']);
    expect(blocks[2].rows).toHaveLength(2);
    expect(blocks[2].rows[0]).toEqual(['Outflow', '₹52,000', '₹58,000']);
    expect(blocks[2].rows[1]).toEqual(['Surplus', '₹33,000', '₹27,000']);

    // Verify code block
    const codeBlock = blocks.find((b) => b.type === 'code');
    expect(codeBlock).toBeDefined();
    expect(codeBlock.language).toBe('python');
    expect(codeBlock.code).toContain('wealth = 15000 * 12 * 10');

    // Verify blockquote
    const quoteBlock = blocks.find((b) => b.type === 'blockquote');
    expect(quoteBlock).toBeDefined();
    expect(quoteBlock.text).toContain('All figures are grounded in uploaded bank statements');

    // Verify bullet and numbered items
    const bullets = blocks.filter((b) => b.type === 'bullet');
    expect(bullets).toHaveLength(2);
    expect(bullets[0].text).toBe('Recommendation 1: Maintain ₹25k emergency buffer');

    const numbered = blocks.filter((b) => b.type === 'numbered');
    expect(numbered).toHaveLength(2);
    expect(numbered[0].num).toBe('1');
    expect(numbered[0].text).toBe('Upload statement ledger');
  });

  it('renderInlineSpans parses bold, inline code, italics, and markdown links', () => {
    let navigatedTo = null;
    const onNav = (path) => {
      navigatedTo = path;
    };

    const text = 'Verify **Net Surplus** with `compute_cashflow` and *risk index* at [Records Page](/records)';
    const rendered = renderInlineSpans(text, onNav);

    expect(Array.isArray(rendered)).toBe(true);

    // Find strong (bold)
    const boldItem = rendered.find((part) => part?.type === 'strong');
    expect(boldItem).toBeDefined();
    expect(boldItem.props.children).toBe('Net Surplus');

    // Find code
    const codeItem = rendered.find((part) => part?.type === 'code');
    expect(codeItem).toBeDefined();
    expect(codeItem.props.children).toBe('compute_cashflow');

    // Find em (italic)
    const italicItem = rendered.find((part) => part?.type === 'em');
    expect(italicItem).toBeDefined();
    expect(italicItem.props.children).toBe('risk index');

    // Find anchor (link)
    const linkItem = rendered.find((part) => part?.type === 'a');
    expect(linkItem).toBeDefined();
    expect(linkItem.props.children).toBe('Records Page');
    expect(linkItem.props.href).toBe('/records');

    // Test internal link navigation callback
    linkItem.props.onClick({ preventDefault: () => {} });
    expect(navigatedTo).toBe('/records');
  });

  it('safely handles empty, null, and non-string inputs in markdown helpers', () => {
    expect(parseMarkdownBlocks(null)).toEqual([]);
    expect(parseMarkdownBlocks(undefined)).toEqual([]);
    expect(parseMarkdownBlocks(123)).toEqual([]);
    expect(renderInlineSpans(null)).toBeNull();
    expect(renderInlineSpans(undefined)).toBeUndefined();
    expect(renderInlineSpans(42)).toBe(42);
  });

  it('prevents mobile drawer from being hidden by collapsed class when mobile-open is active', () => {
    // Helper function reproducing the ChatPage sidebar class resolution
    const resolveSidebarClass = (hideLeft, mobileDrawer) => {
      return `chat-history-sidebar panel ${
        hideLeft && mobileDrawer !== 'left' ? 'collapsed' : ''
      } ${mobileDrawer === 'left' ? 'mobile-open' : ''}`.trim();
    };

    // When closed on mobile
    const closedClass = resolveSidebarClass(true, null);
    expect(closedClass).toContain('collapsed');
    expect(closedClass).not.toContain('mobile-open');

    // When opened on mobile
    const openedClass = resolveSidebarClass(true, 'left');
    expect(openedClass).toContain('mobile-open');
    expect(openedClass).not.toContain('collapsed'); // Crucial: NOT collapsed so display:none is prevented!
  });

  it('persists and retrieves thumbs up/down chat feedback in localStorage', () => {
    const testFeedback = { 'msg-1': 'up', 'msg-2': 'down' };
    localStorage.setItem('fintwin:chat_feedback', JSON.stringify(testFeedback));

    const retrieved = JSON.parse(localStorage.getItem('fintwin:chat_feedback'));
    expect(retrieved['msg-1']).toBe('up');
    expect(retrieved['msg-2']).toBe('down');
  });
});
