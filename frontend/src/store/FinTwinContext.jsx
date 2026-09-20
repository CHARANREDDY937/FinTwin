import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { askChat, healthCheck } from '../api';
import { ensureRupees, currency, latestByMonth, toNumber, STORAGE_KEYS, loadStoredValue, storeValue } from '../lib/format';
import { buildProfile, buildForecast, buildInsight, demoMonths } from '../lib/twinEngine';

const FinTwinContext = createContext(null);

const defaultInsight = {
  answer: 'Your financial twin profile is calibrated. Ask questions about discretionary expenses, EMI drag, inflation resilience, or life milestones.',
  metric: 'expense',
  title: 'Twin Outlook Baseline',
};

export function FinTwinProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => loadStoredValue(STORAGE_KEYS.user, null));
  const [months, setMonths] = useState(() => {
    const saved = loadStoredValue(STORAGE_KEYS.months, null);
    return saved && saved.length > 0 ? saved : demoMonths;
  });
  const [chat, setChat] = useState(() => {
    const raw = loadStoredValue(STORAGE_KEYS.chat, []);
    return Array.isArray(raw) ? raw.map((m) => ({ ...m, text: ensureRupees(m.text) })) : [];
  });
  const [theme, setTheme] = useState(() => loadStoredValue(STORAGE_KEYS.theme, 'light'));
  const [question, setQuestion] = useState('');
  const [graphMetric, setGraphMetric] = useState('expense');
  const [graphSpan, setGraphSpan] = useState(12);
  const [graphType, setGraphType] = useState('bar');
  const [latestInsight, setLatestInsight] = useState(defaultInsight);
  const [modelAnswer, setModelAnswer] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => storeValue(STORAGE_KEYS.user, user), [user]);
  useEffect(() => storeValue(STORAGE_KEYS.months, months), [months]);
  useEffect(() => storeValue(STORAGE_KEYS.chat, chat), [chat]);
  useEffect(() => {
    storeValue(STORAGE_KEYS.theme, theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      const res = await healthCheck();
      if (isMounted) setBackendOnline(res.status === 'ok');
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
    localStorage.setItem(STORAGE_KEYS.token, 'demo-token');
    setMonths(demoMonths.map((m) => ({ ...m, id: `${m.month}-${Math.random()}` })));
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.token);
    } catch {
      // ignore.
    }
  };

  const profile = useMemo(() => buildProfile(months), [months]);
  const forecast = useMemo(() => buildForecast(profile, months, graphSpan), [profile, months, graphSpan]);

  const summaryCards = useMemo(() => {
    const first = forecast[0] || { expense: 0, income: 0, savings: 0, netWorth: 0 };
    const last = forecast[forecast.length - 1] || first;
    return [
      { id: 'expense', label: 'Projected Expenses', value: currency(last.expense), sub: `Starts near ${currency(first.expense)}`, icon: '💸' },
      { id: 'income', label: 'Projected Inflows', value: currency(last.income), sub: `Starts near ${currency(first.income)}`, icon: '💰' },
      { id: 'savings', label: 'Projected Savings', value: currency(last.savings), sub: `Starts near ${currency(first.savings)}`, icon: '🐘' },
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
    setChat((current) => [...current, { role: 'user', text, date: 'Today' }]);
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
    setChat((current) => [...current, { role: 'assistant', text: finalAnswer, metric, title, date: 'Today' }]);
  };

  const value = {
    user, setUser,
    months, setMonths,
    profile,
    chat, setChat,
    theme, toggleTheme,
    forecast,
    pieData,
    graphMetric, setGraphMetric,
    graphSpan, setGraphSpan,
    graphType, setGraphType,
    summaryCards,
    question, setQuestion,
    handleQuestionSend,
    loading, backendOnline,
    modelAnswer, latestInsight,
    handleQuickDemo, handleLogout,
    demoMonths,
  };

  return <FinTwinContext.Provider value={value}>{children}</FinTwinContext.Provider>;
}

export function useFinTwin() {
  const ctx = useContext(FinTwinContext);
  if (!ctx) {
    throw new Error('useFinTwin must be used within a <FinTwinProvider>.');
  }
  return ctx;
}
