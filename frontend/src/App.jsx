import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { askChat, healthCheck } from './api';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './DashboardPage';
import ChatPage from './ChatPage';
import ScenariosPage from './pages/ScenariosPage';
import RecordsPage from './pages/RecordsPage';
import AgentsPage from './pages/AgentsPage';

const STORAGE_KEYS = {
  user: 'fintwinai:user',
  months: 'fintwinai:months',
  chat: 'fintwinai:chat',
  theme: 'fintwinai:theme',
};

const defaultInsight = {
  answer: 'Your financial twin profile is calibrated. Ask questions about discretionary expenses, EMI drag, inflation resilience, or life milestones.',
  metric: 'expense',
  title: 'Twin Outlook Baseline',
};

const demoMonths = [
  { month: '2024-01', activeIncome: 95000, passiveIncome: 12000, creditScore: 760, loansOutstanding: 1800000, emiMonthly: 28000, miscellaneousCharges: 5000, moneySpent: 32000 },
  { month: '2024-02', activeIncome: 95000, passiveIncome: 12000, creditScore: 762, loansOutstanding: 1750000, emiMonthly: 28000, miscellaneousCharges: 4500, moneySpent: 34000 },
  { month: '2024-03', activeIncome: 95000, passiveIncome: 12000, creditScore: 765, loansOutstanding: 1700000, emiMonthly: 28000, miscellaneousCharges: 6200, moneySpent: 31000 },
  { month: '2024-04', activeIncome: 98000, passiveIncome: 12000, creditScore: 768, loansOutstanding: 1650000, emiMonthly: 28000, miscellaneousCharges: 5800, moneySpent: 36000 },
  { month: '2024-05', activeIncome: 98000, passiveIncome: 12000, creditScore: 770, loansOutstanding: 1600000, emiMonthly: 28000, miscellaneousCharges: 5500, moneySpent: 33000 },
  { month: '2024-06', activeIncome: 100000, passiveIncome: 15000, creditScore: 775, loansOutstanding: 1550000, emiMonthly: 28000, miscellaneousCharges: 7000, moneySpent: 35000 },
];

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function ensureRupees(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\$\s*(\d[\d,]*(?:\.\d+)?)/g, '₹$1')
    .replace(/\bUSD\s*(\d[\d,]*(?:\.\d+)?)/gi, '₹$1')
    .replace(/(\d[\d,]*(?:\.\d+)?)\s*USD\b/gi, '₹$1')
    .replace(/(\d[\d,]*(?:\.\d+)?)\s*(?:dollars?|bucks?)\b/gi, '₹$1')
    .replace(/\$/g, '₹')
    .replace(/₹\s*₹+/g, '₹');
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function latestByMonth(months) {
  return [...months].sort((a, b) => (a.month > b.month ? -1 : 1))[0] || null;
}

function buildProfile(months) {
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

function buildForecast(profile, months, span) {
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

function buildInsight(question, profile, forecast) {
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
      answer: `For significant milestones, sustaining a positive monthly surplus across the full duration is the key prerequisite. Your current trajectory indicates milestone readiness within your timeline.`,
    };
  }

  return {
    metric: 'expense',
    title: 'General Twin Outlook',
    answer: `Based on your ground-truth data, the model projects income around ${currency(next.income)}, expenses around ${currency(next.expense)}, and investable savings of ${currency(next.savings)} next month.`,
  };
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => readJson(STORAGE_KEYS.user, null));
  // Default to demo months if empty so mentors immediately see stunning visualizations!
  const [months, setMonths] = useState(() => {
    const saved = readJson(STORAGE_KEYS.months, null);
    return saved && saved.length > 0 ? saved : demoMonths;
  });
  const [chat, setChat] = useState(() => {
    const raw = readJson(STORAGE_KEYS.chat, []);
    return Array.isArray(raw) ? raw.map((m) => ({ ...m, text: ensureRupees(m.text) })) : [];
  });
  // Default to light heartwarming theme as requested by user
  const [theme, setTheme] = useState(() => readJson(STORAGE_KEYS.theme, 'light'));
  const [question, setQuestion] = useState('');
  const [graphMetric, setGraphMetric] = useState('expense');
  const [graphSpan, setGraphSpan] = useState(12);
  const [graphType, setGraphType] = useState('bar');
  const [latestInsight, setLatestInsight] = useState(defaultInsight);
  const [modelAnswer, setModelAnswer] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => writeJson(STORAGE_KEYS.user, user), [user]);
  useEffect(() => writeJson(STORAGE_KEYS.months, months), [months]);
  useEffect(() => writeJson(STORAGE_KEYS.chat, chat), [chat]);
  useEffect(() => {
    writeJson(STORAGE_KEYS.theme, theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Periodic heartbeat to verify backend health
  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      const res = await healthCheck();
      if (isMounted) {
        setBackendOnline(res.status === 'ok');
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const handleQuickDemo = () => {
    setUser({ name: 'Expo Judge / Mentor', email: 'judge@projectexpo.ai' });
    localStorage.setItem('fintwinai:token', 'demo-token');
    setMonths(demoMonths.map((m) => ({ ...m, id: `${m.month}-${Math.random()}` })));
    navigate('/dashboard');
  };

  const profile = useMemo(() => buildProfile(months), [months]);
  const forecast = useMemo(() => buildForecast(profile, months, graphSpan), [profile, months, graphSpan]);

  const summaryCards = useMemo(() => {
    const first = forecast[0] || { expense: 0, income: 0, savings: 0, netWorth: 0 };
    const last = forecast[forecast.length - 1] || first;
    return [
      { id: 'expense', label: 'Projected Expenses', value: currency(last.expense), sub: `Starts near ${currency(first.expense)}`, icon: '💸' },
      { id: 'income', label: 'Projected Inflows', value: currency(last.income), sub: `Starts near ${currency(first.income)}`, icon: '💰' },
      { id: 'savings', label: 'Projected Savings', value: currency(last.savings), sub: `Starts near ${currency(first.savings)}`, icon: '🏦' },
      { id: 'netWorth', label: 'Projected Net Worth', value: currency(last.netWorth), sub: `Starts near ${currency(first.netWorth)}`, icon: '💎' },
    ];
  }, [forecast]);

  const pieData = useMemo(() => {
    const latest = latestByMonth(months);
    if (!latest) return [];
    const income = toNumber(latest.activeIncome) + toNumber(latest.passiveIncome);
    const moneySpent = toNumber(latest.moneySpent);
    const emi = toNumber(latest.emiMonthly);
    const misc = toNumber(latest.miscellaneousCharges);
    const savings = income - moneySpent - emi - misc;
    return [
      { name: 'Living Expenses', value: moneySpent, color: '#FF5E62' },
      { name: 'EMI Obligations', value: emi, color: '#F59E0B' },
      { name: 'Misc Fees', value: misc, color: '#EC4899' },
      { name: 'Investable Savings', value: Math.max(0, savings), color: '#10B981' },
    ];
  }, [months]);

  const handleQuestionSend = async (event) => {
    if (event && event.preventDefault) event.preventDefault();
    const text = question.trim();
    if (!text) return;

    const localInsight = buildInsight(text, profile, buildForecast(profile, months, graphSpan));
    setLatestInsight(localInsight);
    setChat((current) => [
      ...current,
      { role: 'user', text, date: 'Today' },
    ]);
    setQuestion('');
    setLoading(true);

    let answer = localInsight.answer;
    let metric = localInsight.metric;
    let title = localInsight.title;
    let source = 'Local Twin Engine';

    try {
      const result = await askChat(text, months, graphSpan);
      setBackendOnline(true);
      if (result && result.answer) {
        answer = ensureRupees(result.answer);
        title = `Model Consensus (${result.answer_source || 'multi-agent'})`;
        source = result.answer_source || 'multi-agent';
      }
    } catch {
      setBackendOnline(false);
    }

    const finalAnswer = ensureRupees(answer);
    setLoading(false);
    setModelAnswer({ text: finalAnswer, title, source });
    if (metric) setGraphMetric(metric);
    setChat((current) => [
      ...current,
      { role: 'assistant', text: finalAnswer, metric, title, date: 'Today' },
    ]);
  };

  const activeUser = user || { name: 'Guest Explorer', email: 'guest@fintwin.ai' };

  const commonProps = {
    user: activeUser,
    setUser,
    months,
    setMonths,
    profile,
    chat,
    setChat,
    theme,
    toggleTheme,
    forecast,
    pieData,
    graphMetric,
    setGraphMetric,
    graphSpan,
    setGraphSpan,
    graphType,
    setGraphType,
    summaryCards,
    question,
    setQuestion,
    handleQuestionSend,
    loading,
    backendOnline,
    modelAnswer,
    latestInsight,
    demoMonths,
  };

  return (
    <div className="app-shell main-app-shell">
      {/* Top Floating Glass Navbar */}
      <Navbar
        user={user}
        setUser={setUser}
        theme={theme}
        toggleTheme={toggleTheme}
        backendOnline={backendOnline}
        monthsCount={months.length}
        onQuickDemo={handleQuickDemo}
      />

      {/* Main Multi-Page Route Outlet with Smooth Transitions */}
      <main className="main-content-outlet">
        <Routes>
          <Route path="/" element={<LandingPage {...commonProps} />} />
          <Route path="/dashboard" element={<DashboardPage {...commonProps} />} />
          <Route path="/login" element={<AuthPage user={user} setUser={setUser} setMonths={setMonths} demoMonths={demoMonths} />} />
          <Route path="/auth" element={<AuthPage user={user} setUser={setUser} setMonths={setMonths} demoMonths={demoMonths} />} />
          <Route path="/chat" element={<ChatPage {...commonProps} />} />
          <Route path="/scenarios" element={<ScenariosPage {...commonProps} />} />
          <Route path="/records" element={<RecordsPage {...commonProps} />} />
          <Route path="/agents" element={<AgentsPage {...commonProps} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

    </div>
  );
}
