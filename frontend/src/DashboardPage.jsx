import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Bot,
  FileText,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Target,
  Zap,
  Cpu,
} from 'lucide-react';
import { usePageTitle } from './lib/hooks';

const graphViews = [
  { id: 'expense', label: 'Expenses', color: '#FF0000', icon: TrendingDown },
  { id: 'income', label: 'Income', color: '#FFD700', icon: TrendingUp },
  { id: 'savings', label: 'Savings', color: '#FFD700', icon: Landmark },
  { id: 'netWorth', label: 'Net Worth', color: '#FF0000', icon: Sparkles },
];

const cardMeta = {
  expense: {
    icon: TrendingDown,
    accent: '#FF0000',
    glow: 'rgba(255, 0, 0, 0.22)',
    trend: 'Controlled burn rate',
    trendType: 'neutral',
  },
  income: {
    icon: TrendingUp,
    accent: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.22)',
    trend: '+8.4% projected trend',
    trendType: 'positive',
  },
  savings: {
    icon: Landmark,
    accent: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.22)',
    trend: 'Positive surplus rate',
    trendType: 'positive',
  },
  netWorth: {
    icon: Sparkles,
    accent: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.22)',
    trend: 'Compounding trajectory',
    trendType: 'info',
  },
};

const spanOptions = [6, 12, 24, 36];

function currency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMonthLabel(monthValue) {
  if (!monthValue) return 'No data yet';
  const [year, month] = monthValue.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
}

function CustomGlassTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="custom-glass-tooltip">
        <div className="tooltip-month">{label || data.name}</div>
        <div className="tooltip-row">
          <span
            className="tooltip-indicator"
            style={{ backgroundColor: data.color || data.fill || (data.payload && data.payload.color) || '#A78BFA' }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
            {data.name || 'Value'}:
          </span>
          <span>{currency(data.value)}</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function DashboardPage({
  user,
  months = [],
  setMonths,
  profile,
  forecast,
  pieData,
  graphMetric,
  setGraphMetric,
  graphSpan,
  setGraphSpan,
  graphType,
  setGraphType,
  summaryCards,
  latestInsight,
  demoMonths = [],
}) {
  const navigate = useNavigate();
  usePageTitle('Dashboard — FinTwinAI');
  const latestMonth = months.length ? [...months].sort((a, b) => (a.month > b.month ? -1 : 1))[0] : null;

  const activeView = graphViews.find((v) => v.id === graphMetric) || graphViews[0];
  const ActiveIcon = activeView.icon;
  const savingsRate = profile?.income ? ((profile.savings / profile.income) * 100).toFixed(1) : 0;
  const dti = profile?.income ? ((profile.emi / profile.income) * 100).toFixed(1) : 0;

  const handleLoadDemo = () => {
    setMonths(
      demoMonths.map((item) => ({
        ...item,
        id: `${item.month}-${Math.random()}`,
      })),
    );
  };

  return (
    <div className="page-container dashboard-page animate-in">
      {/* Hero Welcome & Twin State Banner */}
      <div className="dashboard-hero-banner">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <span className="pulse-beacon" />
            <span>Digital Twin Active • {user.name}'s Financial Profile</span>
          </div>
          <h1 className="hero-heading">Executive Financial Twin Dashboard</h1>
          <p className="hero-desc">
            Your personalized AI model forecasts multi-horizon trajectory, tracks spending drift, and models life decisions with explainable AI.
          </p>
          <div className="hero-metrics-strip">
            <div className="strip-item">
              <span className="strip-label">Tracked History</span>
              <strong className="strip-val">{months.length} Months</strong>
            </div>
            <div className="strip-divider" />
            <div className="strip-item">
              <span className="strip-label">Monthly Surplus Rate</span>
              <strong className="strip-val good">{savingsRate}%</strong>
            </div>
            <div className="strip-divider" />
            <div className="strip-item">
              <span className="strip-label">Debt-to-Income (DTI)</span>
              <strong className="strip-val">{dti}%</strong>
            </div>
            <div className="strip-divider" />
            <div className="strip-item">
              <span className="strip-label">Credit Rating</span>
              <strong className="strip-val good">{profile?.creditScore || 'N/A'}</strong>
            </div>
          </div>
        </div>

        <div className="hero-right-actions">
          <button
            type="button"
            className="hero-action-btn primary"
            onClick={() => navigate('/chat')}
          >
            <span className="action-icon">
              <Bot size={17} />
            </span>
            <span>Ask AI Twin Studio</span>
            <span className="action-arrow">
              <ArrowRight size={15} />
            </span>
          </button>

          <button
            type="button"
            className="hero-action-btn secondary"
            onClick={() => navigate('/scenarios')}
          >
            <span className="action-icon">
              <Zap size={17} />
            </span>
            <span>Simulate Life Scenarios</span>
            <span className="action-arrow">
              <ArrowRight size={15} />
            </span>
          </button>

          <button
            type="button"
            className="hero-action-btn tertiary"
            onClick={() => navigate('/records')}
          >
            <span className="action-icon">
              <FileText size={17} />
            </span>
            <span>Manage Records Ledger</span>
            <span className="action-arrow">
              <ArrowRight size={15} />
            </span>
          </button>
        </div>
      </div>

      {/* No Data Callout Banner if 0 months */}
      {months.length === 0 && (
        <div className="demo-prompt-banner">
          <div className="prompt-icon">
            <Sparkles size={20} color="#FFD700" />
          </div>
          <div className="prompt-text">
            <h4>No financial months uploaded yet</h4>
            <p>Load the 6-month pre-calibrated demo dataset to immediately inspect full forecasting charts and multi-agent analytics.</p>
          </div>
          <button type="button" className="primary-button" onClick={handleLoadDemo}>
            <Sparkles size={14} />
            <span>Load 6-Month Demo Data</span>
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards — Staggered entry */}
      <div className="summary-cards-grid">
        {summaryCards.map((card, i) => {
          const isSelected = card.id === graphMetric;
          const meta = cardMeta[card.id] || cardMeta.savings;
          const CardIcon = meta.icon;

          return (
            <button
              key={card.id}
              type="button"
              className={`summary-kpi-card animate-in${isSelected ? ' active' : ''}`}
              style={{
                '--delay': `${80 + i * 60}ms`,
                '--card-accent': meta.accent,
                '--card-glow': meta.glow,
              }}
              onClick={() => setGraphMetric(card.id)}
            >
              <div className="card-top">
                <div className="card-icon-wrap">
                  <CardIcon size={18} />
                </div>
                <span className="card-label">{card.label}</span>
                {isSelected && <span className="active-dot-indicator" />}
              </div>
              <div className="card-value">{card.value}</div>
              <div className="card-sub">{card.sub}</div>
              <div className={`card-trend-badge ${meta.trendType}`}>
                {meta.trendType === 'positive' && <TrendingUp size={11} />}
                {meta.trendType === 'negative' && <TrendingDown size={11} />}
                <span>{meta.trend}</span>
              </div>
              <div className="card-click-hint">
                <span>Focus graph</span>
                <ArrowRight size={12} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Forecast Studio Panel */}
      <div className={`panel chart-studio-panel animate-in${graphMetric ? ' panel-glow' : ''}`} style={{ '--delay': '320ms' }}>
        <div className="studio-header">
          <div className="studio-title-col">
            <div className="studio-badge">Interactive Forecast Studio</div>
            <h2 className="studio-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ActiveIcon size={22} color={activeView.color} />
              <span>{activeView.label} Trajectory ({graphSpan} Months)</span>
            </h2>
          </div>

          <div className="studio-controls">
            {/* Horizon Selector */}
            <div className="segmented-group">
              <span className="group-label desktop-only">Horizon:</span>
              {spanOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`segment-btn ${graphSpan === opt ? 'active' : ''}`}
                  onClick={() => setGraphSpan(opt)}
                >
                  {opt}M
                </button>
              ))}
            </div>

            {/* Chart Type Selector */}
            <div className="segmented-group">
              <button
                type="button"
                className={`segment-btn ${graphType === 'bar' ? 'active' : ''}`}
                onClick={() => setGraphType('bar')}
                title="Bar Chart"
              >
                <BarChart3 size={14} />
                <span>Bars</span>
              </button>
              <button
                type="button"
                className={`segment-btn ${graphType === 'line' ? 'active' : ''}`}
                onClick={() => setGraphType('line')}
                title="Line Chart"
              >
                <LineChartIcon size={14} />
                <span>Line</span>
              </button>
              <button
                type="button"
                className={`segment-btn ${graphType === 'pie' ? 'active' : ''}`}
                onClick={() => setGraphType('pie')}
                title="Pie Breakdown"
              >
                <PieChartIcon size={14} />
                <span>Pie Breakdown</span>
              </button>
            </div>
          </div>
        </div>

        {/* Chart Canvas Area */}
        <div className="chart-canvas-area">
          {graphType === 'pie' ? (
            pieData.length > 0 ? (
              <div className="pie-chart-container">
                <div className="pie-headline">
                  <h3>Monthly Cashflow Outflow Breakdown</h3>
                  <p>Based on {latestMonth ? formatMonthLabel(latestMonth.month) : 'latest records'}</p>
                </div>
                <ResponsiveContainer width="100%" height={360}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={135}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomGlassTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-chart-state">
                <p>No monthly data uploaded yet. Ingest a month to see the category breakdown.</p>
                <button type="button" className="primary-button" onClick={handleLoadDemo}>
                  Load Demo Data
                </button>
              </div>
            )
          ) : graphType === 'bar' ? (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={forecast} margin={{ top: 20, right: 20, left: 15, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={activeView.color} stopOpacity={0.92} />
                    <stop offset="100%" stopColor={activeView.color} stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-subtle, rgba(255,255,255,0.08))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" tickLine={false} />
                <YAxis stroke="var(--text-muted, #94a3b8)" tickFormatter={(v) => currency(v)} width={80} tickLine={false} />
                <Tooltip content={<CustomGlassTooltip />} />
                <Legend />
                <Bar
                  dataKey={graphMetric}
                  name={activeView.label}
                  fill="url(#barGrad)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={forecast} margin={{ top: 20, right: 20, left: 15, bottom: 5 }}>
                <CartesianGrid stroke="var(--border-subtle, rgba(255,255,255,0.08))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" tickLine={false} />
                <YAxis stroke="var(--text-muted, #94a3b8)" tickFormatter={(v) => currency(v)} width={80} tickLine={false} />
                <Tooltip content={<CustomGlassTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={graphMetric}
                  name={activeView.label}
                  stroke={activeView.color}
                  strokeWidth={3.5}
                  dot={{ r: 4, fill: activeView.color }}
                  activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Two Column Bottom Grid: Explainable Insight & Quick Jump Hub */}
      <div className="dashboard-bottom-grid">
        {/* Latest AI Twin Explainability Strip */}
        <div className="panel insight-panel">
          <div className="insight-header">
            <span className="insight-badge-icon">
              <Sparkles size={16} color="#A78BFA" />
            </span>
            <div>
              <h3>{latestInsight?.title || 'Financial Twin Outlook'}</h3>
              <span className="engine-source-pill">ExplainabilityEngine Active</span>
            </div>
          </div>
          <div className="insight-body">
            <p>{latestInsight?.answer}</p>
          </div>
          <div className="insight-actions">
            <button
              type="button"
              className="chat-jump-btn"
              onClick={() => navigate('/chat')}
            >
              <span>Open in AI Chat Studio</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Multi-Agent Quick Jump Card */}
        <div className="panel agent-preview-panel">
          <div className="agent-preview-header">
            <span className="agent-badge-icon">
              <Cpu size={18} color="#38BDF8" />
            </span>
            <div>
              <h3>Autonomous 4-Agent Consensus</h3>
              <span className="agent-sub">Real-time financial audits</span>
            </div>
          </div>

          <div className="agent-mini-cards">
            <div className="mini-agent-row">
              <span className="mini-icon">
                <TrendingDown size={15} color="#FB7185" />
              </span>
              <div className="mini-info">
                <strong>Spending Agent:</strong>
                <span>{savingsRate > 20 ? 'Controlled burn rate' : 'Elevated spending pressure'}</span>
              </div>
            </div>
            <div className="mini-agent-row">
              <span className="mini-icon">
                <TrendingUp size={15} color="#34D399" />
              </span>
              <div className="mini-info">
                <strong>Investment Agent:</strong>
                <span>{currency(profile?.savings || 0)} monthly investable surplus</span>
              </div>
            </div>
            <div className="mini-agent-row">
              <span className="mini-icon">
                <ShieldCheck size={15} color="#38BDF8" />
              </span>
              <div className="mini-info">
                <strong>Risk Agent:</strong>
                <span>DTI {dti}% • Prime score {profile?.creditScore || 750}</span>
              </div>
            </div>
            <div className="mini-agent-row">
              <span className="mini-icon">
                <Target size={15} color="#A78BFA" />
              </span>
              <div className="mini-info">
                <strong>Goal Agent:</strong>
                <span>12M milestone trajectory positive</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="secondary-button wide"
            onClick={() => navigate('/agents')}
          >
            <span>Explore Multi-Agent Intelligence Hub</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
