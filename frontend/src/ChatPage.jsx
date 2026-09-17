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

const graphViews = [
  { id: 'expense', label: 'Expenses', color: '#EF4444', icon: '💸' },
  { id: 'income', label: 'Income', color: '#10B981', icon: '💰' },
  { id: 'savings', label: 'Savings', color: '#6366F1', icon: '🏦' },
  { id: 'netWorth', label: 'Net Worth', color: '#06B6D4', icon: '💎' },
];

const spanOptions = [6, 12, 24, 36];

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
  const [searchHistory, setSearchHistory] = useState('');
  const [activeRightTab, setActiveRightTab] = useState('chart'); // 'chart', 'breakdown', 'metrics'
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
      {/* Three Column Chat Studio Workspace */}
      <div className="chat-studio-layout">
        {/* ================= LEFT COLUMN: HISTORY & PROMPTS ================= */}
        <aside className="chat-history-sidebar panel">
          <div className="sidebar-top">
            <div className="sidebar-heading-row">
              <span className="sidebar-icon">📜</span>
              <h3>Conversation History</h3>
            </div>
            {chat.length > 0 && (
              <button
                type="button"
                className="clear-history-btn"
                onClick={clearChat}
                title="Clear all conversation messages"
              >
                Clear
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="history-search-wrap">
            <span className="search-ico">🔍</span>
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
                <span className="empty-ico">💬</span>
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
                  <span className="query-avatar">👤</span>
                  <span className="query-text">{msg.text}</span>
                </button>
              ))
            )}
          </div>

          {/* Preset Prompts Section */}
          <div className="suggested-prompts-section">
            <div className="prompts-title">
              <span className="prompts-icon">💡</span>
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
          {/* Feed Header */}
          <div className="chat-feed-header">
            <div className="feed-header-meta">
              <div className="bot-pulse-avatar">🤖</div>
              <div>
                <h2 className="feed-title">FinTwin AI Advisor</h2>
                <div className="feed-status-row">
                  <span className={`status-dot ${backendOnline === true ? 'online' : 'ready'}`} />
                  <span className="feed-status-text">
                    {backendOnline === true ? 'Connected to FastAPI Multi-Agent Engine' : 'Resilient Local Twin Engine'}
                  </span>
                </div>
              </div>
            </div>

            <div className="feed-header-chips">
              <span className="engine-badge">Model: XGBoost + Explainability</span>
              <span className="months-badge">{months.length} Months Tracked</span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="chat-messages-stream" ref={streamRef}>
            {chat.length === 0 ? (
              <div className="chat-stream-welcome">
                <div className="welcome-emblem">🧬</div>
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
                      <span className="card-arrow">→</span>
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
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className={`chat-message-bubble ${msg.role}`}>
                    {msg.title && (
                      <div className="bubble-header-tag">
                        <span className="tag-icon">⚡</span>
                        <span>{msg.title}</span>
                      </div>
                    )}
                    <div className="bubble-text-content">{msg.text}</div>
                    {msg.metric && (
                      <div className="bubble-metric-hint">
                        <span>Graph synchronized to: </span>
                        <strong>{msg.metric.toUpperCase()}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="chat-bubble-row assistant-side">
                <div className="message-avatar">🤖</div>
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
              <span className="send-arrow">➤</span>
            </button>
          </form>
        </main>

        {/* ================= RIGHT COLUMN: SYNCHRONIZED CHARTS ================= */}
        <aside className="chat-charts-sidebar panel">
          <div className="charts-sidebar-top">
            <div className="charts-sidebar-title">
              <span className="charts-icon">📊</span>
              <div>
                <h3>Synchronized Forecast</h3>
                <span className="charts-sub">Adapts in real-time to chat topics</span>
              </div>
            </div>

            <div className="chart-type-tabs">
              <button
                type="button"
                className={`tab-btn ${graphType === 'bar' ? 'active' : ''}`}
                onClick={() => setGraphType('bar')}
              >
                Bars
              </button>
              <button
                type="button"
                className={`tab-btn ${graphType === 'line' ? 'active' : ''}`}
                onClick={() => setGraphType('line')}
              >
                Line
              </button>
              <button
                type="button"
                className={`tab-btn ${graphType === 'pie' ? 'active' : ''}`}
                onClick={() => setGraphType('pie')}
              >
                Pie
              </button>
            </div>
          </div>

          {/* Metric Selector Pills */}
          <div className="metric-pills-row">
            {graphViews.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`metric-pill ${graphMetric === v.id ? 'active' : ''}`}
                onClick={() => setGraphMetric(v.id)}
                style={{ '--pill-color': v.color }}
              >
                <span>{v.icon}</span>
                <span>{v.label}</span>
              </button>
            ))}
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
                  {opt}M
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
                    <Tooltip formatter={(v) => currency(v)} />
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
                  <Tooltip
                    formatter={(v) => currency(v)}
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, #080e20)',
                      borderColor: 'var(--tooltip-border, rgba(124,58,237,0.4))',
                      borderRadius: '12px',
                      color: '#f0f4ff',
                    }}
                  />
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
                  <Tooltip
                    formatter={(v) => currency(v)}
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, #080e20)',
                      borderColor: 'var(--tooltip-border, rgba(124,58,237,0.4))',
                      borderRadius: '12px',
                      color: '#f0f4ff',
                    }}
                  />
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
    </div>
  );
}
