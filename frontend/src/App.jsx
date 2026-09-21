import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { askChat, fetchTwinProfile, healthCheck, simulateScenarioAPI } from './api';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './DashboardPage';
import ChatPage from './ChatPage';
import ScenariosPage from './pages/ScenariosPage';
import RecordsPage from './pages/RecordsPage';
import AgentsPage from './pages/AgentsPage';
import {
  readJson,
  writeJson,
  STORAGE_KEYS,
  defaultInsight,
  graphViews,
  spanOptions,
  suggestedQuestions,
  toNumber,
  currency,
  ensureRupees,
  average,
  latestByMonth,
} from './lib/utils';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => readJson(STORAGE_KEYS.user, null));
  const [months, setMonths] = useState(() => {
    const saved = readJson(STORAGE_KEYS.months, null);
    return saved && saved.length > 0 ? saved : [];
  });
  const [chat, setChat] = useState(() => {
    const raw = readJson(STORAGE_KEYS.chat, []);
    return Array.isArray(raw) ? raw.map((m) => ({ ...m, text: ensureRupees(m.text) })) : [];
  });
  const [theme, setTheme] = useState(() => readJson(STORAGE_KEYS.theme, 'light'));
  const [question, setQuestion] = useState('');
  const [graphMetric, setGraphMetric] = useState('expense');
  const [graphSpan, setGraphSpan] = useState(12);
  const [graphType, setGraphType] = useState('bar');
  const [latestInsight, setLatestInsight] = useState(defaultInsight);
  const [modelAnswer, setModelAnswer] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [pieData, setPieData] = useState([]);

  useEffect(() => writeJson(STORAGE_KEYS.user, user), [user]);
  useEffect(() => writeJson(STORAGE_KEYS.months, months), [months]);
  useEffect(() => writeJson(STORAGE_KEYS.chat, chat), [chat]);
  useEffect(() => {
    writeJson(STORAGE_KEYS.theme, theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

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

  const fetchProfileAndForecast = useCallback(async () => {
    if (!months.length) {
      setProfile(null);
      setForecast([]);
      setPieData([]);
      return;
    }
    try {
      const [profileRes, forecastRes] = await Promise.all([
        fetchTwinProfile(months),
        simulateScenarioAPI(months, 'baseline', 'xgboost', graphSpan),
      ]);
      if (profileRes) setProfile(profileRes);
      if (forecastRes && forecastRes.forecast) setForecast(forecastRes.forecast);
    } catch (err) {
      console.error('Failed to fetch profile/forecast:', err);
      setBackendOnline(false);
    }
  }, [months, graphSpan]);

  useEffect(() => {
    fetchProfileAndForecast();
  }, [fetchProfileAndForecast]);

  useEffect(() => {
    const latest = latestByMonth(months);
    if (!latest) {
      setPieData([]);
      return;
    }
    const income = toNumber(latest.activeIncome) + toNumber(latest.passiveIncome);
    const moneySpent = toNumber(latest.moneySpent);
    const emi = toNumber(latest.emiMonthly);
    const misc = toNumber(latest.miscellaneousCharges);
    const savings = income - moneySpent - emi - misc;
    setPieData([
      { name: 'Living Expenses', value: moneySpent, color: '#FF0000' },
      { name: 'EMI Obligations', value: emi, color: '#FFD700' },
      { name: 'Misc Fees', value: misc, color: '#FF3333' },
      { name: 'Investable Savings', value: Math.max(0, savings), color: '#FFC107' },
    ]);
  }, [months]);

  const handleQuickDemo = () => {
    const demoMonths = [
      { month: '2024-01', activeIncome: 95000, passiveIncome: 12000, creditScore: 760, loansOutstanding: 1800000, emiMonthly: 28000, miscellaneousCharges: 5000, moneySpent: 32000 },
      { month: '2024-02', activeIncome: 95000, passiveIncome: 12000, creditScore: 762, loansOutstanding: 1750000, emiMonthly: 28000, miscellaneousCharges: 4500, moneySpent: 34000 },
      { month: '2024-03', activeIncome: 95000, passiveIncome: 12000, creditScore: 765, loansOutstanding: 1700000, emiMonthly: 28000, miscellaneousCharges: 6200, moneySpent: 31000 },
      { month: '2024-04', activeIncome: 98000, passiveIncome: 12000, creditScore: 768, loansOutstanding: 1650000, emiMonthly: 28000, miscellaneousCharges: 5800, moneySpent: 36000 },
      { month: '2024-05', activeIncome: 98000, passiveIncome: 12000, creditScore: 770, loansOutstanding: 1600000, emiMonthly: 28000, miscellaneousCharges: 5500, moneySpent: 33000 },
      { month: '2024-06', activeIncome: 100000, passiveIncome: 15000, creditScore: 775, loansOutstanding: 1550000, emiMonthly: 28000, miscellaneousCharges: 7000, moneySpent: 35000 },
    ];
    setUser({ name: 'Expo Judge / Mentor', email: 'judge@projectexpo.ai' });
    localStorage.setItem('fintwinai:token', 'demo-token');
    setMonths(demoMonths.map((m) => ({ ...m, id: `${m.month}-${Math.random()}` })));
    navigate('/dashboard');
  };

  const summaryCards = useMemo(() => {
    if (!forecast.length) return [];
    const first = forecast[0] || { expense: 0, income: 0, savings: 0, netWorth: 0 };
    const last = forecast[forecast.length - 1] || first;
    return [
      { id: 'expense', label: 'Projected Expenses', value: currency(last.expense), sub: `Starts near ${currency(first.expense)}`, icon: '💸' },
      { id: 'income', label: 'Projected Inflows', value: currency(last.income), sub: `Starts near ${currency(first.income)}`, icon: '💰' },
      { id: 'savings', label: 'Projected Savings', value: currency(last.savings), sub: `Starts near ${currency(first.savings)}`, icon: '🏦' },
      { id: 'netWorth', label: 'Projected Net Worth', value: currency(last.netWorth), sub: `Starts near ${currency(first.netWorth)}`, icon: '💎' },
    ];
  }, [forecast]);

  const handleQuestionSend = async (event) => {
    if (event && event.preventDefault) event.preventDefault();
    const text = question.trim();
    if (!text) return;

    setChat((current) => [...current, { role: 'user', text, date: 'Today' }]);
    setQuestion('');
    setLoading(true);

    let answer = '';
    let metric = '';
    let title = '';
    let source = 'Local Twin Engine';

    try {
      const result = await askChat(text, months, graphSpan);
      setBackendOnline(true);
      if (result && result.answer) {
        answer = ensureRupees(result.answer);
        title = `Model Consensus (${result.answer_source || 'multi-agent'})`;
        source = result.answer_source || 'multi-agent';
        if (result.metric) metric = result.metric;
      }
    } catch {
      setBackendOnline(false);
    }

    const finalAnswer = ensureRupees(answer);
    setLoading(false);
    setModelAnswer({ text: finalAnswer, title, source });
    if (metric) setGraphMetric(metric);
    setChat((current) => [...current, { role: 'assistant', text: finalAnswer, metric, title, date: 'Today' }]);
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
    suggestedQuestions,
    graphViews,
    spanOptions,
    demoMonths: [
      { month: '2024-01', activeIncome: 95000, passiveIncome: 12000, creditScore: 760, loansOutstanding: 1800000, emiMonthly: 28000, miscellaneousCharges: 5000, moneySpent: 32000 },
      { month: '2024-02', activeIncome: 95000, passiveIncome: 12000, creditScore: 762, loansOutstanding: 1750000, emiMonthly: 28000, miscellaneousCharges: 4500, moneySpent: 34000 },
      { month: '2024-03', activeIncome: 95000, passiveIncome: 12000, creditScore: 765, loansOutstanding: 1700000, emiMonthly: 28000, miscellaneousCharges: 6200, moneySpent: 31000 },
      { month: '2024-04', activeIncome: 98000, passiveIncome: 12000, creditScore: 768, loansOutstanding: 1650000, emiMonthly: 28000, miscellaneousCharges: 5800, moneySpent: 36000 },
      { month: '2024-05', activeIncome: 98000, passiveIncome: 12000, creditScore: 770, loansOutstanding: 1600000, emiMonthly: 28000, miscellaneousCharges: 5500, moneySpent: 33000 },
      { month: '2024-06', activeIncome: 100000, passiveIncome: 15000, creditScore: 775, loansOutstanding: 1550000, emiMonthly: 28000, miscellaneousCharges: 7000, moneySpent: 35000 },
    ],
    MODEL_OPTIONS: [
      { id: 'xgboost', name: 'XGBoost Gradient Boosted', tag: 'Balanced', speed: '< 20ms' },
      { id: 'lstm', name: 'LSTM Recurrent Neural Net', tag: 'Trend Sensitive', speed: '< 45ms' },
      { id: 'prophet', name: 'Meta Prophet Time-Series', tag: 'Seasonal', speed: '< 30ms' },
    ],
    SCENARIO_PRESETS: {
      baseline: { id: 'baseline', name: 'Baseline Projection', badge: 'Standard', icon: '📊', color: '#FF0000', description: 'Current trajectory assuming steady earnings, standard 6.5% inflation, and regular spending habits.', incomeShock: 0.0, expenseShock: 0.0, debtShock: 0.0 },
      inflation: { id: 'inflation', name: 'Inflation Surge (+12%)', badge: 'Macro Shock', icon: '📈', color: '#FFD700', description: 'Simulates severe consumer price inflation driving up living costs and squeezing discretionary cashflow.', incomeShock: -0.01, expenseShock: 0.12, debtShock: 0.03 },
      home: { id: 'home', name: 'Home Purchase & Mortgage', badge: 'Milestone', icon: '🏡', color: '#FF0000', description: 'Down-payment and long-term home mortgage addition, increasing recurring debt service and living overhead.', incomeShock: 0.0, expenseShock: 0.18, debtShock: 0.11 },
      mba: { id: 'mba', name: 'Higher Education / MBA', badge: 'Career Investment', icon: '🎓', color: '#FFD700', description: 'Temporary 15% reduction in active earnings paired with tuition debt and educational living costs.', incomeShock: -0.15, expenseShock: 0.09, debtShock: 0.08 },
      jobloss: { id: 'jobloss', name: 'Income Shock / Career Break', badge: 'Stress Test', icon: '💼', color: '#FF0000', description: 'Emergency stress test: 45% drop in monthly income while essential expenses and loan obligations persist.', incomeShock: -0.45, expenseShock: 0.05, debtShock: 0.06 },
      downturn: { id: 'downturn', name: 'Market Downturn', badge: 'Macro Shock', icon: '📉', color: '#FFD700', description: 'Economic contraction with stagnant wage growth, modest living price hikes, and credit tightening.', incomeShock: -0.03, expenseShock: 0.03, debtShock: 0.05 },
      vehicle: { id: 'vehicle', name: 'Vehicle Purchase (Auto Loan)', badge: 'Asset Purchase', icon: '🚗', color: '#FF0000', description: 'New vehicle down payment, monthly auto loan EMI, plus recurring fuel and maintenance costs.', incomeShock: 0.0, expenseShock: 0.08, debtShock: 0.10 },
    },
  };

  return (
    <div className="app-shell main-app-shell">
      <Navbar
        user={user}
        setUser={setUser}
        theme={theme}
        toggleTheme={toggleTheme}
        backendOnline={backendOnline}
        monthsCount={months.length}
        onQuickDemo={handleQuickDemo}
      />

      <main className="main-content-outlet">
        <Routes>
          <Route path="/" element={<LandingPage {...commonProps} />} />
          <Route path="/dashboard" element={<DashboardPage {...commonProps} />} />
          <Route path="/login" element={<AuthPage user={user} setUser={setUser} setMonths={setMonths} />} />
          <Route path="/auth" element={<AuthPage user={user} setUser={setUser} setMonths={setMonths} />} />
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