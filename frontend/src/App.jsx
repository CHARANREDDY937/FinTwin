import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { askChat, registerUser, loginUser } from './api';

const STORAGE_KEYS = {
  user: 'fintwinai:user',
  months: 'fintwinai:months',
  chat: 'fintwinai:chat',
  theme: 'fintwinai:theme',
};

const defaultLogin = { name: '', email: '', password: '' };
const defaultMonth = {
  month: new Date().toISOString().slice(0, 7),
  activeIncome: '',
  passiveIncome: '',
  creditScore: '',
  loansOutstanding: '',
  emiMonthly: '',
  miscellaneousCharges: '',
  moneySpent: '',
};

const defaultInsight = {
  answer: 'Upload a month of data and ask a question about expenses, EMI, savings, or a big life decision.',
  metric: 'expense',
  title: 'Expense outlook',
};

const graphViews = [
  { id: 'expense', label: 'Expenses', color: '#5f8f88', icon: '💸' },
  { id: 'income', label: 'Income', color: '#779eb2', icon: '💰' },
  { id: 'savings', label: 'Savings', color: '#a97c5e', icon: '🏦' },
  { id: 'netWorth', label: 'Net Worth', color: '#7e8f62', icon: '💎' },
];

const spanOptions = [6, 12, 24, 36];

const demoMonths = [
  { month: '2024-01', activeIncome: 95000, passiveIncome: 12000, creditScore: 760, loansOutstanding: 1800000, emiMonthly: 28000, miscellaneousCharges: 5000, moneySpent: 32000 },
  { month: '2024-02', activeIncome: 95000, passiveIncome: 12000, creditScore: 762, loansOutstanding: 1750000, emiMonthly: 28000, miscellaneousCharges: 4500, moneySpent: 34000 },
  { month: '2024-03', activeIncome: 95000, passiveIncome: 12000, creditScore: 765, loansOutstanding: 1700000, emiMonthly: 28000, miscellaneousCharges: 6200, moneySpent: 31000 },
  { month: '2024-04', activeIncome: 98000, passiveIncome: 12000, creditScore: 768, loansOutstanding: 1650000, emiMonthly: 28000, miscellaneousCharges: 5800, moneySpent: 36000 },
  { month: '2024-05', activeIncome: 98000, passiveIncome: 12000, creditScore: 770, loansOutstanding: 1600000, emiMonthly: 28000, miscellaneousCharges: 5500, moneySpent: 33000 },
  { month: '2024-06', activeIncome: 100000, passiveIncome: 15000, creditScore: 775, loansOutstanding: 1550000, emiMonthly: 28000, miscellaneousCharges: 7000, moneySpent: 35000 },
];

const taglineLines = [
  'Your AI-powered financial twin — predict, plan, and decide with confidence.',
  'Forecast your future finances and simulate life-changing scenarios.',
  'Multi-agent AI that understands spending, investing, risk, and goals.',
];

const suggestedQuestions = [
  'Can I afford a house in 24 months?',
  'What happens to my savings if inflation jumps 8%?',
  'Should I take on a car loan right now?',
  'How much should I be saving each month?',
];

function getGraphView(metric) {
  return graphViews.find((item) => item.id === metric) || graphViews[0];
}

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
      income: 0,
      outflow: 0,
      savings: 0,
      creditScore: 0,
      loanBalance: 0,
      emi: 0,
      spendingTrend: 0,
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
  const baseIncome = profile.income || profile.avgIncome || 0;
  const baseExpense = profile.outflow || profile.avgOutflow || 0;
  const monthlyInflation = 0.065 / 12;
  const behaviorDrift = months.length > 1 ? Math.min(0.02, Math.max(-0.01, profile.spendingTrend / 3)) : 0.005;
  const incomeGrowth = 0.025 / 12;
  let runningNetWorth = Math.max(0, profile.savings) - profile.loanBalance;

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
      title: 'Expense outlook',
      answer: `Your expenses are projected around ${currency(next.expense)} next month and around ${currency(later.expense)} by the later part of the forecast. Inflation plus your recent spending pattern is pushing this line upward.`,
    };
  }

  if (text.includes('income') || text.includes('salary') || text.includes('earn')) {
    return {
      metric: 'income',
      title: 'Income outlook',
      answer: `Your income line is projected near ${currency(next.income)} next month. If current earnings stay steady, the model expects gradual growth, but it still needs to outpace expenses to create breathing room.`,
    };
  }

  if (text.includes('save') || text.includes('surplus') || text.includes('cash')) {
    return {
      metric: 'savings',
      title: 'Savings outlook',
      answer: `Your projected monthly savings is about ${currency(next.savings)} next month. That line matters most for future flexibility, because it shows whether your income is comfortably clearing expenses and EMI.`,
    };
  }

  if (text.includes('loan') || text.includes('emi') || text.includes('debt')) {
    return {
      metric: 'netWorth',
      title: 'Debt and net worth outlook',
      answer: `Your EMI currently takes about ${Math.round(debtRatio * 100)}% of monthly income. If that stays high, net worth improves more slowly because recurring debt service keeps eating into the surplus.`,
    };
  }

  if (text.includes('house') || text.includes('mba') || text.includes('car') || text.includes('vehicle') || text.includes('goal')) {
    return {
      metric: 'savings',
      title: 'Decision impact outlook',
      answer: `For a major decision, the savings line is the first thing to watch. If it stays positive across the full selected tenure, the decision is more manageable. If it turns negative early, the plan needs adjustment.`,
    };
  }

  return {
    metric: 'expense',
    title: 'General outlook',
    answer: `Based on your uploaded data, the model sees income around ${currency(next.income)}, expenses around ${currency(next.expense)}, and savings around ${currency(next.savings)} next month. Ask about a specific topic and I will focus the graph on it.`,
  };
}

function formatMonthLabel(monthValue) {
  if (!monthValue) return 'Unknown month';
  const [year, month] = monthValue.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export default function App() {
  const [user, setUser] = useState(() => readJson(STORAGE_KEYS.user, null));
  const [months, setMonths] = useState(() => readJson(STORAGE_KEYS.months, []));
  const [chat, setChat] = useState(() => readJson(STORAGE_KEYS.chat, []));
  const [theme, setTheme] = useState(() => readJson(STORAGE_KEYS.theme, 'light'));
  const [login, setLogin] = useState(defaultLogin);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [monthForm, setMonthForm] = useState(defaultMonth);
  const [question, setQuestion] = useState('');
  const [graphMetric, setGraphMetric] = useState('expense');
  const [graphSpan, setGraphSpan] = useState(12);
  const [graphType, setGraphType] = useState('bar');
  const [latestInsight, setLatestInsight] = useState(defaultInsight);
  const [modelAnswer, setModelAnswer] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);

  useEffect(() => writeJson(STORAGE_KEYS.user, user), [user]);
  useEffect(() => writeJson(STORAGE_KEYS.months, months), [months]);
  useEffect(() => writeJson(STORAGE_KEYS.chat, chat), [chat]);
  useEffect(() => {
    writeJson(STORAGE_KEYS.theme, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTaglineIndex((current) => (current + 1) % taglineLines.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const profile = useMemo(() => buildProfile(months), [months]);
  const forecast = useMemo(() => buildForecast(profile, months, graphSpan), [profile, months, graphSpan]);
  const currentMonth = latestByMonth(months);
  const summaryCards = useMemo(() => {
    const first = forecast[0] || { expense: 0, income: 0, savings: 0, netWorth: 0 };
    const last = forecast[forecast.length - 1] || first;
    return [
      { id: 'expense', label: 'Projected expenses', value: currency(last.expense), sub: `Starts near ${currency(first.expense)}`, icon: '💸' },
      { id: 'income', label: 'Projected income', value: currency(last.income), sub: `Starts near ${currency(first.income)}`, icon: '💰' },
      { id: 'savings', label: 'Projected savings', value: currency(last.savings), sub: `Starts near ${currency(first.savings)}`, icon: '🏦' },
      { id: 'netWorth', label: 'Projected net worth', value: currency(last.netWorth), sub: `Starts near ${currency(first.netWorth)}`, icon: '💎' },
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
      { name: 'Money Spent', value: moneySpent, color: '#5f8f88' },
      { name: 'EMI', value: emi, color: '#779eb2' },
      { name: 'Misc', value: misc, color: '#a97c5e' },
      { name: 'Savings', value: Math.max(0, savings), color: '#7e8f62' },
    ];
  }, [months]);

  const handleMonthSave = (event) => {
    event.preventDefault();
    const entry = {
      ...monthForm,
      id: `${monthForm.month}-${Date.now()}`,
    };
    setMonths((current) => {
      const next = [entry, ...current.filter((item) => item.month !== entry.month)];
      return next.sort((a, b) => (a.month < b.month ? 1 : -1));
    });
    setMonthForm(defaultMonth);
  };

  const handleQuestionSend = async (event) => {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;

    const localInsight = buildInsight(text, profile, buildForecast(profile, months, graphSpan));
    setLatestInsight(localInsight);
    setChat((current) => [
      ...current,
      { role: 'user', text },
    ]);
    setQuestion('');
    setLoading(true);

    let answer = localInsight.answer;
    let metric = localInsight.metric;
    let title = localInsight.title;
    let source = 'local';

    try {
      const result = await askChat(text, months, graphSpan);
      setBackendOnline(true);
      if (result && result.answer) {
        answer = result.answer;
        title = `Model answer (${result.answer_source || 'model'})`;
        source = result.answer_source || 'model';
      }
    } catch {
      setBackendOnline(false);
    }

    setLoading(false);
    setModelAnswer({ text: answer, title, source });
    if (metric) setGraphMetric(metric);
    setChat((current) => [
      ...current,
      { role: 'assistant', text: answer, metric, title },
    ]);
  };

  if (!user) {
    const isLogin = authMode === 'login';
    const handleSubmit = async (event) => {
      event.preventDefault();
      setAuthError('');
      try {
        if (isLogin) {
          const data = await loginUser(login.email, login.password);
          localStorage.setItem('fintwinai:token', data.access_token);
          setUser({ name: login.email.split('@')[0], email: login.email });
        } else {
          const data = await registerUser(login.email, login.name, login.password);
          localStorage.setItem('fintwinai:token', data.access_token);
          setUser({ name: login.name, email: login.email });
        }
      } catch (error) {
        setAuthError(error.message || 'Authentication failed');
      }
    };

    return (
      <div className="app-shell auth-shell">
        <section className="auth-panel">
          <div className="auth-copy">
            <div className="eyebrow">FinTwinAI</div>
            <p className="tagline">{taglineLines[taglineIndex]}</p>
            <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
            <p className="auth-subtitle">
              {isLogin
                ? 'Sign in to your financial workspace and continue tracking your months.'
                : 'Register to start uploading monthly finances and asking the model.'}
            </p>
            <ul className="feature-list">
              <li><span>🤖</span> 4 specialized AI agents analyze your finances</li>
              <li><span>📊</span> Scenario forecasts for life decisions</li>
              <li><span>💡</span> Explainable insights in plain language</li>
            </ul>
            <div className="auth-toggle">
              <button
                type="button"
                className={isLogin ? 'toggle active' : 'toggle'}
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
              >
                Login
              </button>
              <button
                type="button"
                className={isLogin ? 'toggle' : 'toggle active'}
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
              >
                Register
              </button>
            </div>
          </div>
          <form className="form-card" onSubmit={handleSubmit}>
            {!isLogin && (
              <label>
                Name
                <input
                  type="text"
                  value={login.name || ''}
                  onChange={(event) => setLogin((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Your name"
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={login.email}
                onChange={(event) => setLogin((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={login.password}
                onChange={(event) => setLogin((current) => ({ ...current, password: event.target.value }))}
                placeholder={isLogin ? 'Your password' : 'Create a password'}
                required
              />
            </label>
            {authError && <div className="auth-error">{authError}</div>}
            <button className="primary-button wide" type="submit">
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
            <button
              className="demo-button wide"
              type="button"
              onClick={() => {
                setUser({ name: 'Demo User', email: 'demo@fintwin.ai' });
                localStorage.setItem('fintwinai:token', 'demo-token');
                setMonths(demoMonths.map((item) => ({ ...item, id: `${item.month}-${Math.random()}` })));
              }}
            >
              Try the demo (no backend needed)
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">FinTwinAI</div>
          <h1>{user.name}'s Financial Workspace</h1>
          <p className="subtitle">Upload the month, ask the question, inspect the graph.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="secondary-button"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="secondary-button" type="button" onClick={() => setUser(null)}>Log out</button>
        </div>
      </header>

      <main className="workspace compact-workspace">
        <section className="panel form-panel">
          <div className="section-title">
            <h2>Monthly Upload</h2>
            <span>{months.length} month{months.length === 1 ? '' : 's'} stored</span>
          </div>
          <form className="month-grid" onSubmit={handleMonthSave}>
            <label>
              Month
              <input type="month" value={monthForm.month} onChange={(event) => setMonthForm((current) => ({ ...current, month: event.target.value }))} required />
            </label>
            <label>
              Active earnings
              <input type="number" min="0" value={monthForm.activeIncome} onChange={(event) => setMonthForm((current) => ({ ...current, activeIncome: event.target.value }))} required />
            </label>
            <label>
              Passive earnings
              <input type="number" min="0" value={monthForm.passiveIncome} onChange={(event) => setMonthForm((current) => ({ ...current, passiveIncome: event.target.value }))} required />
            </label>
            <label>
              Credit score
              <input type="number" min="300" max="900" value={monthForm.creditScore} onChange={(event) => setMonthForm((current) => ({ ...current, creditScore: event.target.value }))} required />
            </label>
            <label>
              Loans outstanding
              <input type="number" min="0" value={monthForm.loansOutstanding} onChange={(event) => setMonthForm((current) => ({ ...current, loansOutstanding: event.target.value }))} required />
            </label>
            <label>
              EMI paid monthly
              <input type="number" min="0" value={monthForm.emiMonthly} onChange={(event) => setMonthForm((current) => ({ ...current, emiMonthly: event.target.value }))} required />
            </label>
            <label>
              Miscellaneous charges
              <input type="number" min="0" value={monthForm.miscellaneousCharges} onChange={(event) => setMonthForm((current) => ({ ...current, miscellaneousCharges: event.target.value }))} required />
            </label>
            <label>
              Money spent
              <input type="number" min="0" value={monthForm.moneySpent} onChange={(event) => setMonthForm((current) => ({ ...current, moneySpent: event.target.value }))} required />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit">Save month</button>
              <button className="secondary-button" type="button" onClick={() => setMonths(demoMonths.map((item) => ({ ...item, id: `${item.month}-${Math.random()}` })))}>Load demo data</button>
              <span>{currentMonth ? `Latest upload: ${formatMonthLabel(currentMonth.month)}` : 'No uploads yet'}</span>
            </div>
          </form>
        </section>

        <section className="panel outputs-panel">
          <div className="section-title">
            <h2>Forecast Outputs</h2>
            <span>Click any output to change the graph</span>
          </div>
          <div className="output-grid">
            {summaryCards.map((card) => (
              <button
                key={card.id}
                type="button"
                className={card.id === graphMetric ? 'output-card active' : 'output-card'}
                onClick={() => setGraphMetric(card.id)}
              >
                 <span>{card.icon} {card.label}</span>
                 <strong>{card.value}</strong>
                <small>{card.sub}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="panel chart-panel">
          <div className="section-title">
            <h2>{graphViews.find((item) => item.id === graphMetric)?.icon} {graphViews.find((item) => item.id === graphMetric)?.label} Graph</h2>
            <div className="segmented">
              {spanOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={graphSpan === option ? 'segment active' : 'segment'}
                  onClick={() => setGraphSpan(option)}
                >
                  {option}M
                </button>
              ))}
              <button
                type="button"
                className={graphType === 'bar' ? 'segment active' : 'segment'}
                onClick={() => setGraphType('bar')}
              >
                ■ Bars
              </button>
              <button
                type="button"
                className={graphType === 'line' ? 'segment active' : 'segment'}
                onClick={() => setGraphType('line')}
              >
                ▰ Line
              </button>
              <button
                type="button"
                className={graphType === 'pie' ? 'segment active' : 'segment'}
                onClick={() => setGraphType('pie')}
              >
                🥧 Pie
              </button>
            </div>
          </div>
          <div className="chart-wrap">
            {graphType === 'pie' ? (
              pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={360}>
                  <PieChart data={pieData}>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={130}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => currency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-chart">
                  <p>No monthly data uploaded yet. Add a month to see the breakdown.</p>
                </div>
              )
            ) : graphType === 'bar' ? (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={forecast}>
                  <CartesianGrid stroke="#dbe5e1" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="#617570" />
                  <YAxis stroke="#617570" tickFormatter={(value) => currency(value)} width={72} />
                  <Tooltip formatter={(value) => currency(value)} />
                  <Legend />
                  <Bar
                    dataKey={graphMetric}
                    name={graphViews.find((item) => item.id === graphMetric)?.label || graphMetric}
                    fill={graphViews.find((item) => item.id === graphMetric)?.color || '#5f8f88'}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={forecast}>
                  <CartesianGrid stroke="#dbe5e1" strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="#617570" />
                  <YAxis stroke="#617570" tickFormatter={(value) => currency(value)} width={72} />
                  <Tooltip formatter={(value) => currency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={graphMetric}
                    name={graphViews.find((item) => item.id === graphMetric)?.label || graphMetric}
                    stroke={graphViews.find((item) => item.id === graphMetric)?.color || '#5f8f88'}
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="panel chat-panel">
          <div className="section-title">
            <h2>Ask the Model</h2>
            <span className={backendOnline === false ? 'offline' : ''}>
              {backendOnline === false ? 'Backend offline - using local model' : (backendOnline ? 'Backend connected' : 'Model ready')}
            </span>
          </div>
          <div className="chat-thread">
            {chat.length === 0 ? (
              <div className="empty-chat">
                <p>{defaultInsight.answer}</p>
                <div className="suggested-grid">
                  {suggestedQuestions.map((q) => (
                    <button key={q} type="button" className="suggested-question" onClick={() => setQuestion(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chat.map((message, index) => {
                const messageGraph = message.metric ? getGraphView(message.metric) : null;

                return (
                  <React.Fragment key={`${message.role}-${index}`}>
                    <button
                      type="button"
                      className={`chat-bubble ${message.role}`}
                      onClick={() => message.metric && setGraphMetric(message.metric)}
                    >
                      {message.text}
                    </button>
                    {message.role === 'assistant' && messageGraph && (
                       <div className="chat-result-graph">
                         <div className="chat-result-title">
                           <strong>{message.title || `${messageGraph.label} Prediction`}</strong>
                           <span>{graphSpan} month forecast</span>
                         </div>
                         <div className="chat-chart-wrap">
                           <ResponsiveContainer width="100%" height={190}>
                             <BarChart data={forecast}>
                               <CartesianGrid stroke="#dbe5e1" strokeDasharray="3 3" vertical={false} />
                               <XAxis dataKey="month" stroke="#617570" hide={forecast.length > 12} />
                               <YAxis stroke="#617570" width={72} tickFormatter={(value) => currency(value)} />
                               <Tooltip formatter={(value) => currency(value)} />
                               <Bar
                                 dataKey={message.metric}
                                 name={messageGraph.label}
                                 fill={messageGraph.color}
                                 radius={[3, 3, 0, 0]}
                               />
                             </BarChart>
                           </ResponsiveContainer>
                         </div>
                       </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
          {loading && (
            <div className="chat-bubble assistant typing-indicator">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
              <span>FinTwin is thinking...</span>
            </div>
          )}
          <form className="chat-form" onSubmit={handleQuestionSend}>
            <input
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What happens to my expenses in 24 months? ..."
              disabled={loading}
            />
            <button className="primary-button" type="submit" disabled={loading}>Send</button>
          </form>
          {!loading && chat.length > 0 && (
            <div className="suggested-bar">
              {suggestedQuestions.map((q) => (
                <button key={q} type="button" className="suggested-question small" onClick={() => setQuestion(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}
          {modelAnswer && (
            <div className="model-answer-panel">
              <div className="model-answer-title">
                <span className="agent-avatar">🤖</span>
                <strong>{modelAnswer.title}</strong>
                <span className="model-answer-source">{modelAnswer.source}</span>
              </div>
              <p className="model-answer-text">{modelAnswer.text}</p>
            </div>
          )}
          <div className="insight-strip">
            <strong>{latestInsight.title}</strong>
            <span>{latestInsight.answer}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
