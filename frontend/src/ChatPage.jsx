import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  Bot,
  User,
  Search,
  Sparkles,
  Clock,
  Send,
  TrendingUp,
  TrendingDown,
  Landmark,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Percent,
  CheckCircle,
  Calendar,
  Layers,
  ShieldCheck,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Trash2,
  ArrowRight,
  X,
} from 'lucide-react';

function ensureRupees(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\$\s*(\d[\d,]*(?:\.\d+)?)/g, '₹$1')
    .replace(/\bUSD\s*(\d[\d,]*(?:\.\d+)?)/gi, '₹$1')
    .replace(/(\d[\d,]*(?:\.\d+)?)\s*USD\b/gi, '₹$1')
    .replace(/(\d[\d,]*(?:\.\d+)?)\s*(?:dollars?|bucks?)\b/gi, '₹$1')
    .replace(/\$/g, '₹')
    .replace(/₹\s*₹+/g, '₹');
}

const graphViews = [
  { id: 'expense', label: 'Expenses', color: '#FB7185', icon: TrendingDown },
  { id: 'income', label: 'Income', color: '#34D399', icon: TrendingUp },
  { id: 'savings', label: 'Savings', color: '#A78BFA', icon: Landmark },
  { id: 'netWorth', label: 'Net Worth', color: '#38BDF8', icon: Sparkles },
];

const spanOptions = [6, 12, 24, 36, 60];

const suggestedQuestions = [
  'Can I afford a house in 24 months?',
  'What happens to my savings if inflation jumps 8%?',
  'Should I take on a car loan right now?',
  'How much should I be saving each month?',
  'What is my projected net worth in 3 years?',
  'How can I optimize my monthly expenses and EMI?',
];

function currency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
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
            style={{ backgroundColor: data.color || data.fill || '#A78BFA' }}
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

function InlineChart({ data, metric, type, color, span }) {
  if (!data || data.length === 0) return null;

  const chartHeight = 180;
  const showYAxis = span > 12;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      {type === 'line' ? (
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: showYAxis ? 20 : 5 }}>
          <CartesianGrid stroke="var(--border-subtle, rgba(255,255,255,0.08))" strokeDasharray="2 2" vertical={false} />
          <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" tickLine={false} tick={{ fontSize: 10 }} interval={span > 12 ? 'preserveStartEnd' : 0} />
          <YAxis
            stroke="var(--text-muted, #94a3b8)"
            tickFormatter={(v) => currency(v)}
            width={showYAxis ? 55 : 0}
            tickLine={false}
            tick={{ fontSize: 10 }}
            hide={!showYAxis}
          />
          <Tooltip content={<CustomGlassTooltip />} />
          <Line
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: color }}
          />
        </LineChart>
      ) : (
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: showYAxis ? 20 : 5 }}>
          <CartesianGrid stroke="var(--border-subtle, rgba(255,255,255,0.08))" strokeDasharray="2 2" vertical={false} />
          <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" tickLine={false} tick={{ fontSize: 10 }} interval={span > 12 ? 'preserveStartEnd' : 0} />
          <YAxis
            stroke="var(--text-muted, #94a3b8)"
            tickFormatter={(v) => currency(v)}
            width={showYAxis ? 55 : 0}
            tickLine={false}
            tick={{ fontSize: 10 }}
            hide={!showYAxis}
          />
          <Tooltip content={<CustomGlassTooltip />} />
          <Bar
            dataKey={metric}
            fill={color}
            radius={[3, 3, 0, 0]}
            maxBarWidth={30}
          />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

export default function ChatPage({
  user,
  chat = [],
  setChat,
  months = [],
  profile,
  forecast,
  pieData,
  graphMetric,
  setGraphMetric,
  graphSpan,
  setGraphSpan,
  graphType,
  setGraphType,
  question,
  setQuestion,
  handleQuestionSend,
  loading,
  backendOnline,
  modelAnswer,
  latestInsight,
}) {
  const isMobileInitial = typeof window !== 'undefined' && window.innerWidth < 1024;
  const [searchHistory, setSearchHistory] = useState('');
  const [hideLeft, setHideLeft] = useState(isMobileInitial);
  const [hideRight, setHideRight] = useState(isMobileInitial);
  const [mobileDrawer, setMobileDrawer] = useState(null); // 'left' | 'right' | null
  const messagesEndRef = useRef(null);

  const activeView = graphViews.find((v) => v.id === graphMetric) || graphViews[0];
  const streamRef = useRef(null);

  // Auto-scroll inside chat stream container without scrolling window
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [chat, loading]);

  // Filtered user questions for history list
  const userMessages = useMemo(() => {
    return chat
      .map((msg, index) => ({ ...msg, originalIndex: index }))
      .filter((m) => m.role === 'user');
  }, [chat]);

  const filteredHistory = useMemo(() => {
    if (!searchHistory.trim()) return userMessages;
    return userMessages.filter((m) =>
      m.text.toLowerCase().includes(searchHistory.toLowerCase()),
    );
  }, [userMessages, searchHistory]);

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear your conversation history?')) {
      setChat([]);
    }
  };

  const currentMonth = months.length ? [...months].sort((a, b) => (a.month > b.month ? -1 : 1))[0] : null;

  return (
    <div className="page-container chat-studio-page">
      {/* Three Column Chat Studio Workspace with Responsive Collapsible Columns */}
      <div
        className={`chat-studio-layout ${
          hideLeft && hideRight ? 'hide-both' : hideLeft ? 'hide-left' : hideRight ? 'hide-right' : ''
        }`}
      >
        {/* ================= LEFT COLUMN: HISTORY & PROMPTS ================= */}
        <aside className={`chat-history-sidebar panel ${hideLeft ? 'collapsed' : ''} ${mobileDrawer === 'left' ? 'mobile-open' : ''}`}>
          <div className="sidebar-top">
            <div className="sidebar-heading-row">
              <span className="sidebar-icon">
                <Clock size={16} color="#A78BFA" />
              </span>
              <h3>Conversation History</h3>
            </div>
            <div className="sidebar-top-actions">
              {chat.length > 0 && (
                <button
                  type="button"
                  className="clear-history-btn"
                  onClick={clearChat}
                  title="Clear all conversation messages"
                >
                  <Trash2 size={12} />
                  <span>Clear</span>
                </button>
              )}
              <button
                type="button"
                className="mobile-close-drawer-btn mobile-only"
                onClick={() => setMobileDrawer(null)}
                title="Close History Drawer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="history-search-wrap">
            <span className="search-ico">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
            />
          </div>

          {/* History message list */}
          <div className="history-items-container">
            {filteredHistory.length === 0 ? (
              <div className="history-empty">
                <span className="empty-ico">
                  <Clock size={24} color="var(--text-muted)" />
                </span>
                <p>{searchHistory ? 'No matching queries' : 'No chat history yet'}</p>
                <span className="history-empty-sub">Ask a question below to start</span>
              </div>
            ) : (
              filteredHistory.map((msg, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="history-query-pill"
                  onClick={() => setQuestion(msg.text)}
                  title="Click to reload this query"
                >
                  <span className="query-avatar">
                    <User size={13} />
                  </span>
                  <span className="query-text">{msg.text}</span>
                </button>
              ))
            )}
          </div>

          {/* Preset Prompts Section */}
          <div className="suggested-prompts-section">
            <div className="prompts-title">
              <span className="prompts-icon">
                <Sparkles size={14} color="#FB923C" />
              </span>
              <span>Suggested Twin Queries</span>
            </div>
            <div className="prompts-chips-list">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="prompt-chip-btn"
                  onClick={() => setQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ================= CENTER COLUMN: CONVERSATION STREAM ================= */}
        <main className="chat-feed-center panel">
          {/* Feed Header with Sidebar Toggles */}
          <div className="chat-feed-header">
            <div className="feed-header-meta">
              <button
                type="button"
                className={`sidebar-toggle-btn ${(!hideLeft || mobileDrawer === 'left') ? 'active' : ''}`}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setMobileDrawer(mobileDrawer === 'left' ? null : 'left');
                  } else {
                    setHideLeft(!hideLeft);
                  }
                }}
                title={hideLeft ? 'Expand History Sidebar' : 'Collapse History Sidebar'}
              >
                {hideLeft && mobileDrawer !== 'left' ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                <span className="sidebar-btn-label">History</span>
              </button>

              <div className="bot-pulse-avatar">
                <Bot size={20} />
              </div>
              <div className="feed-header-text">
                <h2 className="feed-title">FinTwin AI Advisor</h2>
                <div className="feed-status-row">
                  <span className={`status-dot ${backendOnline === true ? 'online' : 'ready'}`} />
                  <span className="feed-status-text">
                    {backendOnline === true ? 'FastAPI Engine' : 'Local Twin (XGBoost)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="feed-header-chips">
              <span className="months-badge desktop-only">{months.length}M Tracked</span>

              <button
                type="button"
                className={`sidebar-toggle-btn ${(!hideRight || mobileDrawer === 'right') ? 'active' : ''}`}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setMobileDrawer(mobileDrawer === 'right' ? null : 'right');
                  } else {
                    setHideRight(!hideRight);
                  }
                }}
                title={hideRight ? 'Expand Forecast Panel' : 'Collapse Forecast Panel'}
              >
                <BarChart3 size={14} />
                <span className="sidebar-btn-label">Forecast</span>
                {hideRight && mobileDrawer !== 'right' ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="chat-messages-stream" ref={streamRef}>
            {chat.length === 0 ? (
              <div className="chat-stream-welcome">
                <div className="welcome-emblem">
                  <Sparkles size={34} color="#A78BFA" />
                </div>
                <h3>Welcome to your AI Financial Twin Studio</h3>
                <p>
                  I analyze your monthly income, expenditure drift, debt burden, and milestone horizons with explainable AI.
                </p>
                <div className="welcome-prompts-grid">
                  {suggestedQuestions.slice(0, 4).map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="welcome-prompt-card"
                      onClick={() => setQuestion(q)}
                    >
                      <span className="card-arrow">
                        <ArrowRight size={14} />
                      </span>
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chat.map((msg, index) => (
                <div
                  key={index}
                  className={`chat-bubble-row ${msg.role === 'user' ? 'user-side' : 'assistant-side'} animate-in`}
                  style={{ '--delay': `${Math.min(index * 30, 200)}ms` }}
                >
                  <div className="message-avatar">
                    {msg.role === 'user' ? <User size={15} /> : <Bot size={16} />}
                  </div>
                  <div className={`chat-message-bubble ${msg.role}`}>
                    {msg.title && (
                      <div className="bubble-header-tag">
                        <span className="tag-icon">
                          <Sparkles size={12} />
                        </span>
                        <span>{msg.title}</span>
                      </div>
                    )}
                    <div className="bubble-text-content">{ensureRupees(msg.text)}</div>
                    {msg.metric && (
                      <>
                        <div className="bubble-metric-hint">
                          <span>Graph synchronized to: </span>
                          <strong>{msg.metric.toUpperCase()}</strong>
                        </div>
                        <div className="bubble-chart-container">
                          <InlineChart
                            data={forecast}
                            metric={msg.metric}
                            type={graphType}
                            color={activeView.color}
                            span={graphSpan}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="chat-bubble-row assistant-side">
                <div className="message-avatar">
                  <Bot size={16} />
                </div>
                <div className="chat-message-bubble assistant loading-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="loading-text">Simulating financial twin trajectory...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Strip */}
          <div className="chat-quick-query-strip">
            {suggestedQuestions.slice(0, 3).map((q) => (
              <button
                key={q}
                type="button"
                className="strip-quick-btn"
                onClick={() => setQuestion(q)}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form className="chat-input-form" onSubmit={handleQuestionSend}>
            <input
              type="text"
              className="chat-main-input"
              placeholder="Ask about expenses, loans, inflation, or life decisions..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="chat-submit-btn"
              disabled={loading || !question.trim()}
            >
              <span>Ask Twin</span>
              <Send size={14} />
            </button>
          </form>
        </main>

        {/* ================= RIGHT COLUMN: SYNCHRONIZED CHARTS ================= */}
        <aside className={`chat-charts-sidebar panel ${hideRight ? 'collapsed' : ''} ${mobileDrawer === 'right' ? 'mobile-open' : ''}`}>
          <div className="charts-sidebar-top">
            <div className="charts-sidebar-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="charts-icon">
                  <BarChart3 size={18} color="#38BDF8" />
                </span>
                <div>
                  <h3>Synchronized Forecast</h3>
                  <span className="charts-sub">Adapts in real-time to chat topics</span>
                </div>
              </div>
              <button
                type="button"
                className="mobile-close-drawer-btn mobile-only"
                onClick={() => setMobileDrawer(null)}
                title="Close Forecast Drawer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="chart-type-tabs">
              <button
                type="button"
                className={`tab-btn ${graphType === 'bar' ? 'active' : ''}`}
                onClick={() => setGraphType('bar')}
              >
                <BarChart3 size={13} />
                <span>Bars</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${graphType === 'line' ? 'active' : ''}`}
                onClick={() => setGraphType('line')}
              >
                <LineChartIcon size={13} />
                <span>Line</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${graphType === 'pie' ? 'active' : ''}`}
                onClick={() => setGraphType('pie')}
              >
                <PieChartIcon size={13} />
                <span>Pie</span>
              </button>
            </div>
          </div>

          {/* Metric Selector Pills */}
          <div className="metric-pills-row">
            {graphViews.map((v) => {
              const MetricIcon = v.icon;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`metric-pill ${graphMetric === v.id ? 'active' : ''}`}
                  onClick={() => setGraphMetric(v.id)}
                  style={{ '--pill-color': v.color }}
                >
                  <MetricIcon size={13} />
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>

          {/* Horizon Selector */}
          <div className="span-selector-row">
            <span className="span-label">Projection Horizon:</span>
            <div className="span-pills">
              {spanOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`span-pill ${graphSpan === opt ? 'active' : ''}`}
                  onClick={() => setGraphSpan(opt)}
                >
                  {opt >= 12 && opt % 12 === 0 ? `${opt / 12}Y` : `${opt}M`}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Graphic Area */}
          <div className="chart-display-container">
            {graphType === 'pie' ? (
              pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
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
              ) : (
                <div className="empty-chart-side">
                  <p>No monthly data uploaded yet.</p>
                </div>
              )
            ) : graphType === 'bar' ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={forecast} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="var(--border-subtle, rgba(255,255,255,0.08))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" tickLine={false} />
                  <YAxis stroke="var(--text-muted, #94a3b8)" tickFormatter={(v) => currency(v)} width={75} tickLine={false} />
                  <Tooltip content={<CustomGlassTooltip />} />
                  <Bar
                    dataKey={graphMetric}
                    name={activeView.label}
                    fill={activeView.color}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={forecast} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="var(--border-subtle, rgba(255,255,255,0.08))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" tickLine={false} />
                  <YAxis stroke="var(--text-muted, #94a3b8)" tickFormatter={(v) => currency(v)} width={75} tickLine={false} />
                  <Tooltip content={<CustomGlassTooltip />} />
                  <Line
                    type="monotone"
                    dataKey={graphMetric}
                    name={activeView.label}
                    stroke={activeView.color}
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="charts-sidebar-metrics">
            <div className="mini-metric-tile">
              <span className="tile-label">Monthly Outflow</span>
              <strong className="tile-val">{currency(profile.outflow || 0)}</strong>
            </div>
            <div className="mini-metric-tile">
              <span className="tile-label">Monthly Surplus</span>
              <strong className="tile-val good">{currency(profile.savings || 0)}</strong>
            </div>
            <div className="mini-metric-tile">
              <span className="tile-label">DTI Ratio</span>
              <strong className="tile-val">{profile.income ? ((profile.emi / profile.income) * 100).toFixed(0) : 0}%</strong>
            </div>
            <div className="mini-metric-tile">
              <span className="tile-label">Credit Score</span>
              <strong className="tile-val prime">{profile.creditScore || 'N/A'}</strong>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileDrawer && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobileDrawer(null)}
        />
      )}
    </div>
  );
}
