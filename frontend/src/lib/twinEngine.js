// Local twin simulation engine - full parity with the backend, used as a
// resilient offline fallback (App.jsx) and for scenario/agent analysis.
// Pure functions, deliberately deterministic so they can be unit-tested.
import { currency, average, toNumber } from './format';

export const demoMonths = [
  { month: '2024-01', activeIncome: 95000, passiveIncome: 12000, creditScore: 760, loansOutstanding: 1800000, emiMonthly: 28000, miscellaneousCharges: 5000, moneySpent: 32000 },
  { month: '2024-02', activeIncome: 95000, passiveIncome: 12000, creditScore: 762, loansOutstanding: 1750000, emiMonthly: 28000, miscellaneousCharges: 4500, moneySpent: 34000 },
  { month: '2024-03', activeIncome: 95000, passiveIncome: 12000, creditScore: 765, loansOutstanding: 1700000, emiMonthly: 28000, miscellaneousCharges: 6200, moneySpent: 31000 },
  { month: '2024-04', activeIncome: 98000, passiveIncome: 12000, creditScore: 768, loansOutstanding: 1650000, emiMonthly: 28000, miscellaneousCharges: 5800, moneySpent: 36000 },
  { month: '2024-05', activeIncome: 98000, passiveIncome: 12000, creditScore: 770, loansOutstanding: 1600000, emiMonthly: 28000, miscellaneousCharges: 5500, moneySpent: 33000 },
  { month: '2024-06', activeIncome: 100000, passiveIncome: 15000, creditScore: 775, loansOutstanding: 1550000, emiMonthly: 28000, miscellaneousCharges: 7000, moneySpent: 35000 },
];

export function buildProfile(months) {
  if (!months.length) {
    return {
      monthsTracked: 0,
      income: 107000,
      outflow: 65000,
      savings: 42000,
      creditScore: 770,
      loanBalance: 1600000,
      avgIncome: 107000,
      avgOutflow: 65000,
      avgSpent: 33500,
      avgMisc: 5600,
      avgEmi: 28000,
      emi: 28000,
      spendingTrend: 0.02,
    };
  }

  const ordered = [...months].sort((a, b) => (a.month < b.month ? -1 : 1));
  const latest = ordered[ordered.length - 1];
  const previous = ordered.length > 1 ? ordered[ordered.length - 2] : latest;

  const income = toNumber(latest.activeIncome) + toNumber(latest.passiveIncome);
  const outflow = toNumber(latest.moneySpent) + toNumber(latest.emiMonthly) + toNumber(latest.miscellaneousCharges);
  const savings = income - outflow;
  const spendingTrend = (toNumber(latest.moneySpent) - toNumber(previous.moneySpent)) / Math.max(1, toNumber(previous.moneySpent));

  return {
    monthsTracked: months.length,
    income,
    outflow,
    savings,
    creditScore: toNumber(latest.creditScore),
    loanBalance: toNumber(latest.loansOutstanding),
    emi: toNumber(latest.emiMonthly),
    avgIncome: average(months.map((item) => toNumber(item.activeIncome) + toNumber(item.passiveIncome))),
    avgOutflow: average(months.map((item) => toNumber(item.moneySpent) + toNumber(item.emiMonthly) + toNumber(item.miscellaneousCharges))),
    avgSpent: average(months.map((item) => toNumber(item.moneySpent))),
    avgMisc: average(months.map((item) => toNumber(item.miscellaneousCharges))),
    avgEmi: average(months.map((item) => toNumber(item.emiMonthly))),
    spendingTrend,
  };
}

export function buildForecast(profile, months, span) {
  const baseIncome = profile.income || profile.avgIncome || 95000;
  const baseExpense = profile.outflow || profile.avgOutflow || 65000;
  const monthlyInflation = 0.065 / 12;
  const behaviorDrift = months.length > 1 ? Math.min(0.02, Math.max(-0.01, profile.spendingTrend / 3)) : 0.005;
  const incomeGrowth = 0.025 / 12;
  let runningNetWorth = Math.max(0, profile.savings) - (profile.loanBalance || 0);

  return Array.from({ length: span }, (_, index) => {
    const monthIndex = index + 1;
    const income = baseIncome * Math.pow(1 + incomeGrowth, monthIndex);
    const expense = baseExpense * Math.pow(1 + monthlyInflation + behaviorDrift, monthIndex);
    const savings = income - expense;
    runningNetWorth += savings;

    return {
      month: `M${monthIndex}`,
      income: Math.round(income),
      expense: Math.round(expense),
      savings: Math.round(savings),
      netWorth: Math.round(runningNetWorth),
    };
  });
}

export function buildInsight(question, profile, forecast) {
  const text = question.toLowerCase();
  const next = forecast[0] || { income: 0, expense: 0, savings: 0, netWorth: 0 };
  const later = forecast[Math.min(forecast.length - 1, 11)] || next;
  const debtRatio = profile.income ? profile.emi / profile.income : 0;

  if (text.includes('expense') || text.includes('spend') || text.includes('inflation')) {
    return {
      metric: 'expense',
      title: 'Expense & Drift Outlook',
      answer: `Your projected living outflow is estimated at ${currency(next.expense)} next month, progressing toward ${currency(later.expense)} across the horizon. Core inflation plus recent spending velocity indicate manageable drift.`,
    };
  }

  if (text.includes('income') || text.includes('salary') || text.includes('earn')) {
    return {
      metric: 'income',
      title: 'Inflow & Earnings Capacity',
      answer: `Active and passive revenue lines total ${currency(next.income)} next month. Compounding surplus hinges on maintaining positive wage growth above the 6.5% baseline inflation index.`,
    };
  }

  if (text.includes('save') || text.includes('surplus') || text.includes('cash')) {
    return {
      metric: 'savings',
      title: 'Surplus & Savings Runway',
      answer: `Your projected monthly surplus is ${currency(next.savings)}. This retained capital forms your primary compounding lever and easily covers recurring debt service.`,
    };
  }

  if (text.includes('loan') || text.includes('emi') || text.includes('debt')) {
    return {
      metric: 'netWorth',
      title: 'Leverage & Debt Servicing Drag',
      answer: `Recurring debt service takes approximately ${Math.round(debtRatio * 100)}% of monthly inflows. Maintaining DTI under 35% ensures rapid net worth acceleration.`,
    };
  }

  if (text.includes('house') || text.includes('mba') || text.includes('car') || text.includes('vehicle') || text.includes('goal')) {
    return {
      metric: 'savings',
      title: 'Milestone Horizon Viability',
      answer: 'For significant milestones, sustaining a positive monthly surplus across the full duration is the key prerequisite. Your current trajectory indicates milestone readiness within your timeline.',
    };
  }

  return {
    metric: 'expense',
    title: 'General Twin Outlook',
    answer: `Based on your ground-truth data, the model projects income around ${currency(next.income)}, expenses around ${currency(next.expense)}, and investable savings of ${currency(next.savings)} next month.`,
  };
}

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
    icon: '🏠',
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
    debtShock: 0.1,
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
  const emi = profile.emi || 0;
  const trend = profile.spendingTrend || 0;

  const spendingRatio = outflow / income;
  const savingsRate = savings / income;
  const dtiRatio = emi / income;

  return [
    {
      id: 'spending',
      name: 'Spending Intelligence Agent',
      icon: '💰',
      color: '#F59E0B',
      score: Math.max(20, Math.min(98, Math.round((1 - spendingRatio) * 100 + 40))),
      status: spendingRatio > 0.75 ? 'Elevated Pressure' : spendingRatio > 0.6 ? 'Moderate' : 'Optimal Control',
      headline: `${(spendingRatio * 100).toFixed(1)}% Income Burn Rate`,
      analysis:
        spendingRatio > 0.75
          ? 'Spending pressure is in the upper quartile. High discretionary burn and lifestyle inflation are compressing surplus capacity.'
          : trend > 0.08
          ? 'Spending velocity is accelerating and must be reined in to preserve the surplus runway.'
          : 'Spending pattern is steady and controlled, leaving adequate breathing room.',
      recommendation:
        spendingRatio > 0.75
          ? 'Cap miscellaneous charges and review discretionary categories to free up at least 10% cashflow.'
          : 'Maintain current budget discipline and channel predictable surpluses directly to high-yield vehicles.',
    },
    {
      id: 'investment',
      name: 'Investment & Wealth Agent',
      icon: '💳',
      color: '#10B981',
      score: Math.max(15, Math.min(99, Math.round(savingsRate * 150 + 20))),
      status: savingsRate > 0.25 ? 'High Compounding' : savingsRate > 0.1 ? 'Active Accumulation' : 'Constrained',
      headline: `${(savingsRate * 100).toFixed(1)}% Monthly Savings Rate`,
      analysis:
        savingsRate > 0.25
          ? 'Strong investable surplus. Your projected monthly surplus allows aggressive compounding across index and equity allocations.'
          : savingsRate > 0.1
          ? 'Healthy surplus trajectory. Systematic monthly investments will build a stable wealth foundation within 24 months.'
          : 'Tight surplus margin. Cashflow is primarily absorbed by lifestyle and debt obligations, delaying asset accumulation.',
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
          ? 'Prime credit profile with strong repayment stability. Loan exposure is well-managed with minimal distress likelihood.'
          : 'Credit score at moderate range. Manageable leverage, but maintaining zero late payments is critical to secure competitive borrowing rates.',
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
