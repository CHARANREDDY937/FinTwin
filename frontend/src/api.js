const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Convert camelCase month objects to snake_case FinancialMonth schema for the backend
export function toBackendMonth(month) {
  return {
    month: month.month,
    active_income: Number(month.activeIncome) || 0,
    passive_income: Number(month.passiveIncome) || 0,
    credit_score: Number(month.creditScore) || 0,
    loans_outstanding: Number(month.loansOutstanding) || 0,
    emi_monthly: Number(month.emiMonthly) || 0,
    miscellaneous_charges: Number(month.miscellaneousCharges) || 0,
    money_spent: Number(month.moneySpent) || 0,
  };
}

export async function askChat(question, months, horizon = 12, model = 'xgboost', scenario = 'baseline') {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      months: months.map(toBackendMonth),
      horizon,
      model,
      scenario,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat API failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchTwinProfile(months) {
  const response = await fetch(`${API_BASE}/twin/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(months.map(toBackendMonth)),
  });

  if (!response.ok) {
    throw new Error(`Twin profile API failed with status ${response.status}`);
  }

  return response.json();
}

export async function simulateScenarioAPI(months, scenario = 'baseline', model = 'xgboost', horizon = 12) {
  const response = await fetch(`${API_BASE}/forecast/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      months: months.map(toBackendMonth),
      scenario,
      model,
      horizon,
    }),
  });

  if (!response.ok) {
    throw new Error(`Scenario simulation failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchDatasetsSummary() {
  const response = await fetch(`${API_BASE}/datasets/summary`);
  if (!response.ok) {
    throw new Error(`Datasets summary failed with status ${response.status}`);
  }
  return response.json();
}

export async function healthCheck() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return { status: 'error' };
    return response.json();
  } catch {
    return { status: 'offline' };
  }
}

export async function registerUser(email, name, password) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Register failed with status ${response.status}`);
  }
  return data;
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/auth/login-json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Login failed with status ${response.status}`);
  }
  return data;
}

/* ─────────────────────────────────────────────────────────────
   Resilient Local Simulation Engines (Full Parity with Backend)
───────────────────────────────────────────────────────────── */

export const SCENARIO_PRESETS = {
  baseline: {
    id: 'baseline',
    name: 'Baseline Projection',
    badge: 'Standard',
    icon: '📊',
    color: '#6366F1',
    description: 'Current trajectory assuming steady earnings, standard 6.5% inflation, and regular spending habits.',
    incomeShock: 0.0,
    expenseShock: 0.0,
    debtShock: 0.0,
  },
  inflation: {
    id: 'inflation',
    name: 'Inflation Surge (+12%)',
    badge: 'Macro Shock',
    icon: '📈',
    color: '#F59E0B',
    description: 'Simulates severe consumer price inflation driving up living costs and squeezing discretionary cashflow.',
    incomeShock: -0.01,
    expenseShock: 0.12,
    debtShock: 0.03,
  },
  home: {
    id: 'home',
    name: 'Home Purchase & Mortgage',
    badge: 'Milestone',
    icon: '🏡',
    color: '#10B981',
    description: 'Down-payment and long-term home mortgage addition, increasing recurring debt service and living overhead.',
    incomeShock: 0.0,
    expenseShock: 0.18,
    debtShock: 0.11,
  },
  mba: {
    id: 'mba',
    name: 'Higher Education / MBA',
    badge: 'Career Investment',
    icon: '🎓',
    color: '#8B5CF6',
    description: 'Temporary 15% reduction in active earnings paired with tuition debt and educational living costs.',
    incomeShock: -0.15,
    expenseShock: 0.09,
    debtShock: 0.08,
  },
  jobloss: {
    id: 'jobloss',
    name: 'Income Shock / Career Break',
    badge: 'Stress Test',
    icon: '💼',
    color: '#EF4444',
    description: 'Emergency stress test: 45% drop in monthly income while essential expenses and loan obligations persist.',
    incomeShock: -0.45,
    expenseShock: 0.05,
    debtShock: 0.06,
  },
  downturn: {
    id: 'downturn',
    name: 'Market Downturn',
    badge: 'Macro Shock',
    icon: '📉',
    color: '#EC4899',
    description: 'Economic contraction with stagnant wage growth, modest living price hikes, and credit tightening.',
    incomeShock: -0.03,
    expenseShock: 0.03,
    debtShock: 0.05,
  },
  vehicle: {
    id: 'vehicle',
    name: 'Vehicle Purchase (Auto Loan)',
    badge: 'Asset Purchase',
    icon: '🚗',
    color: '#06B6D4',
    description: 'New vehicle down payment, monthly auto loan EMI, plus recurring fuel and maintenance costs.',
    incomeShock: 0.0,
    expenseShock: 0.08,
    debtShock: 0.10,
  },
};

export const MODEL_OPTIONS = [
  { id: 'xgboost', name: 'XGBoost Gradient Boosted', tag: 'Balanced', speed: '< 20ms' },
  { id: 'lstm', name: 'LSTM Recurrent Neural Net', tag: 'Trend Sensitive', speed: '< 45ms' },
  { id: 'prophet', name: 'Meta Prophet Time-Series', tag: 'Seasonal', speed: '< 30ms' },
];

export function simulateLocalScenario(profile, months, scenarioKey = 'baseline', modelKey = 'xgboost', horizon = 12) {
  const scenario = SCENARIO_PRESETS[scenarioKey] || SCENARIO_PRESETS.baseline;
  const growthRate = modelKey === 'lstm' ? 0.04 : modelKey === 'prophet' ? 0.03 : 0.035;

  const baseIncome = profile.income || profile.avgIncome || 95000;
  const baseExpense = profile.outflow || profile.avgOutflow || 65000;
  const trend = profile.spendingTrend || 0;
  const loanBalance = profile.loanBalance || 0;

  let runningNetWorth = Math.max(0, profile.savings) - loanBalance;
  const forecast = [];

  for (let index = 1; index <= horizon; index++) {
    const inflationLift = Math.pow(1 + 0.065 + scenario.expenseShock, index / 12);
    const behaviorLift = Math.pow(1 + growthRate + Math.max(-0.03, Math.min(0.08, trend / 2)), index / 12);
    const income = Math.round(baseIncome * Math.pow(1 + scenario.incomeShock, index / 18));
    const expense = Math.round(baseExpense * inflationLift * behaviorLift);
    const debtDrag = Math.round(loanBalance * scenario.debtShock * 0.02);
    const savings = Math.round(income - expense - debtDrag);
    runningNetWorth += savings;

    forecast.push({
      month: `M${index}`,
      index,
      income,
      expense,
      savings,
      netWorth: Math.round(runningNetWorth),
      debtDrag,
    });
  }

  return forecast;
}

export function evaluateLocalAgents(profile, months) {
  const income = Math.max(profile.income || profile.avgIncome || 1, 1);
  const outflow = profile.outflow || profile.avgOutflow || 0;
  const savings = profile.savings !== undefined ? profile.savings : income - outflow;
  const creditScore = profile.creditScore || 750;
  const loanBalance = profile.loanBalance || 0;
  const emi = profile.emi || 0;
  const trend = profile.spendingTrend || 0;

  const spendingRatio = outflow / income;
  const savingsRate = savings / income;
  const dtiRatio = emi / income;

  return [
    {
      id: 'spending',
      name: 'Spending Intelligence Agent',
      icon: '💸',
      color: '#F59E0B',
      score: Math.max(20, Math.min(98, Math.round((1 - spendingRatio) * 100 + 40))),
      status: spendingRatio > 0.75 ? 'Elevated Pressure' : spendingRatio > 0.6 ? 'Moderate' : 'Optimal Control',
      headline: `${(spendingRatio * 100).toFixed(1)}% Income Burn Rate`,
      analysis:
        spendingRatio > 0.75
          ? 'Spending pressure is in the upper quartile. High discretionary burn and lifestyle inflation are compressing surplus capacity.'
          : trend > 0.08
          ? 'Spending is trending upward faster than baseline projections. Audit recurring subscriptions and miscellaneous charges.'
          : 'Spending velocity is disciplined and well-calibrated against inflows, leaving adequate breathing room.',
      recommendation:
        spendingRatio > 0.75
          ? 'Cap miscellaneous charges and review discretionary categories to free up at least 10% cashflow.'
          : 'Maintain current budget discipline and channel predictable surpluses directly to high-yield vehicles.',
    },
    {
      id: 'investment',
      name: 'Investment & Wealth Agent',
      icon: '💰',
      color: '#10B981',
      score: Math.max(15, Math.min(99, Math.round(savingsRate * 150 + 20))),
      status: savingsRate > 0.25 ? 'High Compounding' : savingsRate > 0.1 ? 'Active Accumulation' : 'Constrained',
      headline: `${(savingsRate * 100).toFixed(1)}% Monthly Savings Rate`,
      analysis:
        savingsRate > 0.25
          ? `Strong investable surplus. Your projected monthly surplus allows aggressive compounding across index and equity allocations.`
          : savingsRate > 0.1
          ? `Healthy surplus trajectory. Systematic monthly investments will build a stable wealth foundation within 24 months.`
          : `Tight surplus margin. Cashflow is primarily absorbed by lifestyle and debt obligations, delaying asset accumulation.`,
      recommendation:
        savingsRate > 0.2
          ? 'Automate monthly SIP transfers into broad index ETFs on salary credit day to eliminate idle cash drag.'
          : 'Focus on retiring high-interest debt first to instantly unlock recurring investment firepower.',
    },
    {
      id: 'risk',
      name: 'Risk & Exposure Agent',
      icon: '🛡️',
      color: '#6366F1',
      score: Math.max(25, Math.min(99, Math.round((creditScore / 900) * 60 + (1 - Math.min(1, dtiRatio)) * 40))),
      status: dtiRatio > 0.4 ? 'Elevated Debt Drag' : creditScore >= 750 ? 'Prime Risk Tier' : 'Moderate Exposure',
      headline: `DTI: ${(dtiRatio * 100).toFixed(1)}% • Credit Score: ${creditScore}`,
      analysis:
        dtiRatio > 0.4
          ? `Debt-to-Income is ${Math.round(dtiRatio * 100)}%, exceeding the recommended 35% ceiling. A significant portion of cashflow is locked in debt service.`
          : creditScore >= 750
          ? `Prime credit profile with strong repayment stability. Loan exposure is well-managed with minimal distress likelihood.`
          : `Credit score at ${creditScore}. Manageable leverage, but maintaining zero late payments is critical to secure competitive borrowing rates.`,
      recommendation:
        dtiRatio > 0.35
          ? 'Target accelerated principal pre-payments on your largest EMI to lower interest drag.'
          : 'Maintain credit card utilization under 30% to push credit rating above 800.',
    },
    {
      id: 'goal',
      name: 'Milestone & Horizon Agent',
      icon: '🎯',
      color: '#8B5CF6',
      score: Math.max(30, Math.min(96, Math.round(Math.min(1, Math.max(0, savings * 12) / 300000) * 100))),
      status: savings > 25000 ? 'Milestone Ready' : 'Phased Progression',
      headline: `${savings > 0 ? 'Surplus Positive' : 'Deficit Risk'} Over 12M Horizon`,
      analysis:
        savings > 25000
          ? 'Trajectory confirms solid viability for mid-term targets such as home down payment, higher education, or emergency cushion.'
          : 'Major life decisions requiring upfront capital expenditure will require debt financing or timeline postponement.',
      recommendation:
        savings > 20000
          ? 'Ring-fence a dedicated 6-month liquid emergency fund before committing capital to illiquid assets.'
          : 'Postpone large non-essential purchases until monthly surplus consistently clears 15% of net income.',
    },
  ];
}