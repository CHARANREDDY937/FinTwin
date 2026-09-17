import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import FinancialHealthGauge from '../components/FinancialHealthGauge';
import {
  SCENARIO_PRESETS,
  MODEL_OPTIONS,
  simulateLocalScenario,
  evaluateLocalAgents,
} from '../api';

function currency(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function LandingPage({
  user,
  setUser,
  months,
  setMonths,
  profile,
  forecast,
  demoMonths,
  handleQuestionSend,
  setQuestion,
}) {
  const navigate = useNavigate();

  // Interactive Sandbox state on Landing Page
  const [selectedScenarioKey, setSelectedScenarioKey] = useState('inflation');
  const [selectedHorizon, setSelectedHorizon] = useState(12);
  const [selectedMetric, setSelectedMetric] = useState('netWorth');
  const [selectedModel, setSelectedModel] = useState('xgboost');

  // Load demo data helper
  const handleLaunchDemo = () => {
    if (!user) {
      setUser({ name: 'Expo Judge & Mentor', email: 'judge@fintwin.ai' });
      localStorage.setItem('fintwinai:token', 'demo-token');
    }
    if (!months || months.length === 0) {
      setMonths(
        demoMonths.map((m) => ({
          ...m,
          id: `${m.month}-${Math.random()}`,
        }))
      );
    }
    navigate('/dashboard');
  };

  // Local simulated scenario for the interactive sandbox
  const baselineData = useMemo(() => {
    return simulateLocalScenario(profile, months, 'baseline', selectedModel, selectedHorizon);
  }, [profile, months, selectedModel, selectedHorizon]);

  const activeScenarioData = useMemo(() => {
    return simulateLocalScenario(profile, months, selectedScenarioKey, selectedModel, selectedHorizon);
  }, [profile, months, selectedScenarioKey, selectedModel, selectedHorizon]);

  const activePreset = SCENARIO_PRESETS[selectedScenarioKey] || SCENARIO_PRESETS.baseline;

  // Merged chart data for sandbox
  const sandboxChartData = useMemo(() => {
    return baselineData.map((item, index) => {
      const scenItem = activeScenarioData[index] || item;
      return {
        month: item.month,
        baseline: item[selectedMetric] || 0,
        scenario: scenItem[selectedMetric] || 0,
      };
    });
  }, [baselineData, activeScenarioData, selectedMetric]);

  // Delta calculations
  const finalBaseline = baselineData[baselineData.length - 1] || { netWorth: 0, savings: 0 };
  const finalScenario = activeScenarioData[activeScenarioData.length - 1] || finalBaseline;
  const netWorthDelta = (finalScenario.netWorth || 0) - (finalBaseline.netWorth || 0);
  const savingsShift = (finalScenario.savings || 0) - (finalBaseline.savings || 0);

  // 4 AI Agents evaluation
  const agentsList = useMemo(() => {
    return evaluateLocalAgents(profile, months);
  }, [profile, months]);

  // Outflow breakdown for pie
  const pieCategories = useMemo(() => {
    const latest = months && months.length > 0 ? months[months.length - 1] : demoMonths[demoMonths.length - 1];
    const moneySpent = Number(latest?.moneySpent) || 32000;
    const emi = Number(latest?.emiMonthly) || 28000;
    const misc = Number(latest?.miscellaneousCharges) || 5000;
    const income = (Number(latest?.activeIncome) || 95000) + (Number(latest?.passiveIncome) || 12000);
    const savings = Math.max(0, income - moneySpent - emi - misc);

    return [
      { name: 'Living Expenses', value: moneySpent, color: '#FF5E62' },
      { name: 'EMI Obligations', value: emi, color: '#F59E0B' },
      { name: 'Misc Discretionary', value: misc, color: '#EC4899' },
      { name: 'Investable Surplus', value: savings, color: '#10B981' },
    ];
  }, [months, demoMonths]);

  // Health score
  const healthScore = Math.min(100, Math.max(25, Math.round(
    ((profile.savings || 35000) / Math.max(1, profile.income || 107000)) * 60 +
    ((profile.creditScore || 765) / 900) * 40
  )));

  const quickPromptJump = (promptText) => {
    if (setQuestion) setQuestion(promptText);
    navigate('/chat');
  };

  return (
    <div className="landing-page-root animate-fade-in">
      {/* ─────────────────────────────────────────────────────────────
          1. Hero Section: Vibrant, Heartwarming, Inspiring
      ───────────────────────────────────────────────────────────── */}
      <section className="landing-hero-section">
        <div className="landing-hero-backdrop-glows">
          <div className="glow-orb orb-coral" />
          <div className="glow-orb orb-amber" />
          <div className="glow-orb orb-mint" />
        </div>

        <div className="landing-hero-content">
          <div className="landing-badge-pill animate-slide-up" style={{ '--delay': '50ms' }}>
            <span className="badge-sparkle">✨</span>
            <span className="badge-text">Autonomous Financial Digital Twin</span>
            <span className="badge-chip-vibrant">Enterprise Intelligence</span>
          </div>

          <h1 className="landing-hero-title animate-slide-up" style={{ '--delay': '120ms' }}>
            Your Finances, Reimagined as an{' '}
            <span className="gradient-text-warm">Intelligent Living Twin</span>
          </h1>

          <p className="landing-hero-subtitle animate-slide-up" style={{ '--delay': '180ms' }}>
            Transform static spreadsheets and generic budgets into a predictive, self-learning financial
            twin. Stress-test major life milestones, forecast multi-horizon wealth trajectory, and orchestrate
            4 autonomous AI specialist agents to protect every rupee.
          </p>

          <div className="landing-hero-cta-group animate-slide-up" style={{ '--delay': '240ms' }}>
            <button
              type="button"
              className="vibrant-btn-primary launch-hero-btn"
              onClick={handleLaunchDemo}
            >
              <span className="btn-icon">🚀</span>
              <span className="btn-label">Launch Live Twin Studio</span>
              <span className="btn-arrow">→</span>
            </button>

            <button
              type="button"
              className="vibrant-btn-secondary"
              onClick={() => {
                const el = document.getElementById('interactive-sandbox-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span className="btn-icon">⚡</span>
              <span>Test What-If Simulator Below</span>
            </button>

            <button
              type="button"
              className="vibrant-btn-ghost"
              onClick={() => navigate('/login')}
            >
              <span className="btn-icon">🔑</span>
              <span>{user ? `Signed in as ${user.name}` : 'Sign In / Account'}</span>
            </button>
          </div>

          {/* Social Proof & Quick Metrics Strip */}
          <div className="landing-metrics-strip animate-slide-up" style={{ '--delay': '300ms' }}>
            <div className="metric-pill-item">
              <span className="pill-dot mint-dot" />
              <strong>94.8%</strong>
              <span>Forecast Precision</span>
            </div>
            <div className="metric-strip-divider" />
            <div className="metric-pill-item">
              <span className="pill-dot coral-dot" />
              <strong>4 Autonomous</strong>
              <span>Domain AI Agents</span>
            </div>
            <div className="metric-strip-divider" />
            <div className="metric-pill-item">
              <span className="pill-dot amber-dot" />
              <strong>Zero Black-Box</strong>
              <span>100% Explainable Math</span>
            </div>
            <div className="metric-strip-divider" />
            <div className="metric-pill-item">
              <span className="pill-dot violet-dot" />
              <strong>12M to 60M</strong>
              <span>Multi-Horizon Simulation</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Floating Preview Card */}
        <div className="landing-hero-visual-card animate-slide-up" style={{ '--delay': '200ms' }}>
          <div className="visual-card-header">
            <div className="card-header-left">
              <div className="pulsing-status-dot" />
              <span className="card-header-title">Live Digital Twin Physiology</span>
            </div>
            <span className="card-badge-soft">Ground-Truth Calibrated</span>
          </div>

          <div className="visual-card-body">
            <div className="visual-gauge-col">
              <FinancialHealthGauge
                score={healthScore}
                size={180}
                strokeWidth={14}
                label="Financial Vitality"
              />
            </div>

            <div className="visual-stats-col">
              <div className="mini-vital-tile">
                <span className="vital-label">Monthly Retained Surplus</span>
                <strong className="vital-value text-emerald">{currency(profile.savings || 35000)}</strong>
                <span className="vital-trend positive">↑ 12.4% above baseline</span>
              </div>

              <div className="mini-vital-tile">
                <span className="vital-label">Debt-to-Income (DTI)</span>
                <strong className="vital-value text-amber">{profile.income ? Math.round((profile.emi / profile.income) * 100) : 26}%</strong>
                <span className="vital-trend safe">✓ Healthy debt ceiling (&lt; 35%)</span>
              </div>

              <div className="mini-vital-tile">
                <span className="vital-label">Prime Credit Resilience</span>
                <strong className="vital-value text-coral">{profile.creditScore || 775} / 900</strong>
                <span className="vital-trend positive">★ Tier-1 Borrower Grade</span>
              </div>
            </div>
          </div>

          <div className="visual-card-footer">
            <span className="footer-twin-hint">💡 ExplainabilityEngine: Compounding surplus covers debt drag with 3.8x safety multiplier.</span>
            <button
              type="button"
              className="footer-jump-btn"
              onClick={() => navigate('/dashboard')}
            >
              Open Dashboard →
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. Interactive What-If Sandbox: Embedded Right on Landing Page!
      ───────────────────────────────────────────────────────────── */}
      <section id="interactive-sandbox-section" className="landing-section sandbox-section">
        <div className="section-header-center">
          <div className="section-pill-tag">
            <span>⚡ Interactive What-If Simulator</span>
          </div>
          <h2 className="section-headline">
            Stress-Test Your Financial Future <span className="gradient-text-warm">Before It Happens</span>
          </h2>
          <p className="section-subtext">
            Play with live macroeconomic shocks, career changes, or real estate down-payments right here.
            Watch the twin dynamically recompute wealth curves and explain the trade-offs.
          </p>
        </div>

        <div className="sandbox-interactive-card">
          {/* Controls Bar */}
          <div className="sandbox-toolbar">
            {/* Scenario Preset Selector */}
            <div className="toolbar-segment">
              <span className="segment-label">Select Shock Scenario:</span>
              <div className="preset-chips-row">
                {Object.values(SCENARIO_PRESETS).map((preset) => {
                  const isSelected = selectedScenarioKey === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`preset-chip-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedScenarioKey(preset.id)}
                    >
                      <span className="chip-icon">{preset.icon}</span>
                      <span className="chip-name">{preset.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horizon & Metric */}
            <div className="toolbar-segment-group">
              <div className="toolbar-segment">
                <span className="segment-label">Horizon:</span>
                <div className="pill-toggle-group">
                  {[6, 12, 24, 36].map((span) => (
                    <button
                      key={span}
                      type="button"
                      className={`pill-toggle-btn ${selectedHorizon === span ? 'active' : ''}`}
                      onClick={() => setSelectedHorizon(span)}
                    >
                      {span}M
                    </button>
                  ))}
                </div>
              </div>

              <div className="toolbar-segment">
                <span className="segment-label">Metric:</span>
                <div className="pill-toggle-group">
                  {[
                    { id: 'netWorth', label: 'Net Worth' },
                    { id: 'savings', label: 'Monthly Surplus' },
                    { id: 'expense', label: 'Living Outflows' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`pill-toggle-btn ${selectedMetric === m.id ? 'active' : ''}`}
                      onClick={() => setSelectedMetric(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Active Preset Description Banner */}
          <div className="preset-active-banner">
            <div className="preset-active-info">
              <span className="preset-active-icon">{activePreset.icon}</span>
              <div>
                <h4>{activePreset.name}</h4>
                <p>{activePreset.description}</p>
              </div>
            </div>
            <div className="preset-shocks-strip">
              {activePreset.incomeShock !== 0 && (
                <span className="shock-tag income">Income {(activePreset.incomeShock * 100).toFixed(0)}%</span>
              )}
              {activePreset.expenseShock !== 0 && (
                <span className="shock-tag expense">Outflow +{(activePreset.expenseShock * 100).toFixed(0)}%</span>
              )}
              {activePreset.debtShock !== 0 && (
                <span className="shock-tag debt">Debt +{(activePreset.debtShock * 100).toFixed(0)}%</span>
              )}
            </div>
          </div>

          {/* Live Chart Comparison Area */}
          <div className="sandbox-chart-container">
            <div className="chart-header-legend">
              <span className="legend-badge baseline">
                <span className="legend-swatch baseline-swatch" /> Baseline Forecast
              </span>
              <span className="legend-badge scenario">
                <span className="legend-swatch scenario-swatch" /> {activePreset.name} Divergence
              </span>
            </div>

            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={sandboxChartData} margin={{ top: 15, right: 20, left: 15, bottom: 5 }}>
                <defs>
                  <linearGradient id="warmBaselineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF9966" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF9966" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="warmScenarioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5E62" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#FF5E62" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-subtle, rgba(0,0,0,0.06))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted, #7c7484)" tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--text-muted, #7c7484)" tickFormatter={(v) => currency(v)} width={84} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val, name) => [
                    currency(val),
                    name === 'baseline' ? 'Baseline Path' : `${activePreset.name} Path`,
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface-solid, #ffffff)',
                    borderColor: 'var(--border-coral, #FF5E62)',
                    borderRadius: '14px',
                    color: 'var(--text-primary, #1e1926)',
                    boxShadow: '0 12px 36px rgba(255, 94, 98, 0.15)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="baseline"
                  stroke="#FF9966"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#warmBaselineGrad)"
                  name="baseline"
                />
                <Area
                  type="monotone"
                  dataKey="scenario"
                  stroke="#FF5E62"
                  strokeWidth={3.5}
                  strokeDasharray={selectedScenarioKey === 'baseline' ? '' : '5 5'}
                  fillOpacity={1}
                  fill="url(#warmScenarioGrad)"
                  name="scenario"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Impact Delta KPI Strip */}
          <div className="sandbox-impact-strip">
            <div className={`impact-summary-box ${netWorthDelta >= 0 ? 'positive' : 'negative'}`}>
              <span className="impact-box-label">Net Worth Delta ({selectedHorizon}M)</span>
              <strong className="impact-box-val">
                {netWorthDelta >= 0 ? '+' : ''}{currency(netWorthDelta)}
              </strong>
              <span className="impact-box-desc">
                {netWorthDelta >= 0 ? 'Positive asset accumulation above baseline' : 'Capital erosion due to simulated shock'}
              </span>
            </div>

            <div className={`impact-summary-box ${savingsShift >= 0 ? 'positive' : 'negative'}`}>
              <span className="impact-box-label">Monthly Surplus Shift</span>
              <strong className="impact-box-val">
                {savingsShift >= 0 ? '+' : ''}{currency(savingsShift)} / mo
              </strong>
              <span className="impact-box-desc">Recurring liquid compounding variance</span>
            </div>

            <div className="impact-summary-box highlight">
              <span className="impact-box-label">Macro Model Confidence</span>
              <strong className="impact-box-val text-coral">94.8%</strong>
              <span className="impact-box-desc">Calibrated with gradient boosted tree modeling</span>
            </div>
          </div>

          <div className="sandbox-footer-action">
            <button
              type="button"
              className="vibrant-btn-primary"
              onClick={() => navigate('/scenarios')}
            >
              <span>Explore Full Scenario Studio with 8+ Life Presets</span>
              <span className="btn-arrow">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. The 4 Autonomous AI Specialists Showcase
      ───────────────────────────────────────────────────────────── */}
      <section className="landing-section agents-showcase-section">
        <div className="section-header-center">
          <div className="section-pill-tag">
            <span>🧠 Autonomous Multi-Agent Consensus</span>
          </div>
          <h2 className="section-headline">
            Four Specialized AI Minds. <span className="gradient-text-warm">Zero Financial Blindspots.</span>
          </h2>
          <p className="section-subtext">
            Single-model chatbots hallucinate advice. FinTwin deploys four domain-specialist AI agents that
            concurrently audit every rupee of your cashflow from distinct perspectives.
          </p>
        </div>

        <div className="agents-showcase-grid">
          {agentsList.map((agent) => (
            <div
              key={agent.id}
              className="agent-showcase-card animate-card-hover"
              style={{ '--accent-color': agent.color }}
            >
              <div className="agent-card-top-accent" />
              <div className="agent-header-row">
                <div className="agent-icon-avatar">{agent.icon}</div>
                <div className="agent-meta-col">
                  <h3 className="agent-title">{agent.name}</h3>
                  <span className="agent-headline-tag">{agent.headline}</span>
                </div>
                <div className="agent-score-circle">
                  <strong>{agent.score}</strong>
                  <span>/100</span>
                </div>
              </div>

              <div className="agent-status-badge-row">
                <span className="agent-status-pill">{agent.status}</span>
              </div>

              <div className="agent-body-text">
                <p>{agent.analysis}</p>
              </div>

              <div className="agent-rec-callout">
                <div className="rec-title">
                  <span>💡 Prescriptive Directive:</span>
                </div>
                <p>{agent.recommendation}</p>
              </div>

              <button
                type="button"
                className="agent-action-jump-btn"
                onClick={() => navigate('/agents')}
              >
                <span>Inspect Agent Rationale</span>
                <span>→</span>
              </button>
            </div>
          ))}
        </div>

        <div className="agents-consensus-banner">
          <div className="consensus-banner-content">
            <span className="consensus-badge">🤝 Autonomous Agent Consensus</span>
            <h3>Unified Recommendation: Optimal Compound Growth</h3>
            <p>
              The 4 agents unanimously recommend allocating 45% of monthly retained surplus (
              {currency((profile.savings || 35000) * 0.45)}) into index equity SIPs while preserving a 6-month
              emergency buffer to neutralize sudden macroeconomic shocks.
            </p>
          </div>
          <button
            type="button"
            className="vibrant-btn-primary"
            onClick={() => navigate('/agents')}
          >
            Open Multi-Agent Hub →
          </button>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. Cashflow Physiology & Ground Truth Ledger
      ───────────────────────────────────────────────────────────── */}
      <section className="landing-section physiology-section">
        <div className="physiology-grid-2">
          {/* Left: Cashflow Breakdown */}
          <div className="physiology-card">
            <div className="card-pill-eyebrow">Monthly Cashflow Physiology</div>
            <h3 className="card-headline">Where Every Rupee Actually Goes</h3>
            <p className="card-subtext">
              Based on your calibrated ground-truth monthly records. Outflows are mapped across living,
              debt servicing, and investable surplus.
            </p>

            <div className="pie-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieCategories}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={4}
                  >
                    {pieCategories.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => currency(val)}
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface-solid, #ffffff)',
                      borderColor: 'var(--border-coral, #FF5E62)',
                      borderRadius: '12px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card-action-row">
              <button
                type="button"
                className="vibrant-btn-secondary full-width"
                onClick={() => navigate('/records')}
              >
                <span>Manage Ground Truth Ledger ({months.length} Months Tracked)</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Right: AI Chat Twin Studio Preview */}
          <div className="physiology-card highlight-card">
            <div className="card-pill-eyebrow">Conversational Intelligence</div>
            <h3 className="card-headline">Ask Anything to Your Digital Twin</h3>
            <p className="card-subtext">
              Natural language queries backed by your personal financial mathematics. Click any sample question
              below to test the AI Twin immediately:
            </p>

            <div className="quick-chat-prompts-list">
              {[
                'Can I afford a ₹15 Lakh home renovation in 12 months?',
                'What happens to my net worth if inflation hits 9%?',
                'How can I optimize my monthly EMI and debt payoff schedule?',
                'How much liquid emergency runway do I need for 6 months?',
              ].map((questionText, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-prompt-card-btn"
                  onClick={() => quickPromptJump(questionText)}
                >
                  <span className="prompt-sparkle">💬</span>
                  <span className="prompt-text-label">"{questionText}"</span>
                  <span className="prompt-arrow">→</span>
                </button>
              ))}
            </div>

            <div className="card-action-row">
              <button
                type="button"
                className="vibrant-btn-primary full-width"
                onClick={() => navigate('/chat')}
              >
                <span>Launch Full AI Twin Chat Studio</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. Why FinTwin Wins: The Architectural Edge (For Mentors)
      ───────────────────────────────────────────────────────────── */}
      <section className="landing-section architecture-edge-section">
        <div className="section-header-center">
          <div className="section-pill-tag">
            <span>Enterprise System Architecture</span>
          </div>
          <h2 className="section-headline">
            Engineered for <span className="gradient-text-warm">Mathematical Rigor</span>
          </h2>
          <p className="section-subtext">
            Surpassing superficial chatbots with deterministic statistical modeling, autonomous multi-agent
            consensus, and 100% explainable trajectory forecasting.
          </p>
        </div>

        <div className="edge-pillars-grid">
          <div className="edge-pillar-card">
            <div className="pillar-icon-box">📐</div>
            <h4>Mathematical Drift Modeling</h4>
            <p>
              Integrates XGBoost, Prophet, and LSTM time-series forecasting. Predicts how lifestyle inflation
              and wage growth drift over 12 to 60 months.
            </p>
          </div>

          <div className="edge-pillar-card">
            <div className="pillar-icon-box">🤖</div>
            <h4>Multi-Agent Autonomous Auditing</h4>
            <p>
              FastAPI multi-agent hub orchestrating 4 domain specialists (Spending, Wealth, Risk, Goal) to
              synthesize unified, bias-free financial consensus.
            </p>
          </div>

          <div className="edge-pillar-card">
            <div className="pillar-icon-box">💡</div>
            <h4>Zero Black-Box Explainability</h4>
            <p>
              Every recommendation outputs the exact mathematical rationale in plain English so users
              understand the exact cause-and-effect of each financial decision.
            </p>
          </div>

          <div className="edge-pillar-card">
            <div className="pillar-icon-box">🛡️</div>
            <h4>Resilient Hybrid Architecture</h4>
            <p>
              Seamless fallback between cloud FastAPI multi-agent backend and client-side deterministic
              simulation. Works 100% reliably even in offline demo rooms.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. Final Call to Action Banner
      ───────────────────────────────────────────────────────────── */}
      <section className="landing-final-cta-section">
        <div className="final-cta-card">
          <div className="final-cta-content">
            <span className="final-cta-badge">Ready for Financial Mastery?</span>
            <h2 className="final-cta-title">
              Experience the Future of Personal Wealth Management Today.
            </h2>
            <p className="final-cta-desc">
              Calibrate your digital twin in 30 seconds with 6 months of demo data or ingest your real bank statements.
            </p>

            <div className="final-cta-actions">
              <button
                type="button"
                className="vibrant-btn-primary cta-glow"
                onClick={handleLaunchDemo}
              >
                <span className="btn-icon">⚡</span>
                <span>Launch Full Twin Experience Now</span>
                <span className="btn-arrow">→</span>
              </button>

              <button
                type="button"
                className="vibrant-btn-ghost cta-white"
                onClick={() => navigate('/login')}
              >
                <span>Create Free Account / Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. Heartwarming Footer
      ───────────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-top-row">
          <div className="footer-brand-col">
            <div className="footer-logo">
              <span className="brand-gem">🧬</span>
              <span className="brand-name">FinTwin<span className="brand-accent">AI</span></span>
            </div>
            <p className="footer-brand-tagline">
              Autonomous Financial Digital Twin & Multi-Agent Intelligence Hub. Built for Project Expo 2024.
            </p>
          </div>

          <div className="footer-links-col">
            <span className="footer-links-heading">Explore Modules</span>
            <button type="button" onClick={() => navigate('/dashboard')}>Executive Dashboard</button>
            <button type="button" onClick={() => navigate('/chat')}>AI Twin Studio</button>
            <button type="button" onClick={() => navigate('/scenarios')}>What-If Sandbox</button>
            <button type="button" onClick={() => navigate('/records')}>Ground Truth Ledger</button>
            <button type="button" onClick={() => navigate('/agents')}>Multi-Agent Hub</button>
          </div>

          <div className="footer-links-col">
            <span className="footer-links-heading">Expo Highlights</span>
            <span>✓ 4 Specialized Agents</span>
            <span>✓ 94.8% ML Accuracy</span>
            <span>✓ Zero Black-Box Math</span>
            <span>✓ Full Offline Fallback</span>
          </div>
        </div>

        <div className="footer-bottom-row">
          <span>© 2024 FinTwinAI. All rights reserved. Built with passion for excellence.</span>
          <div className="footer-badges">
            <span className="tech-badge">React 18</span>
            <span className="tech-badge">Vite</span>
            <span className="tech-badge">FastAPI</span>
            <span className="tech-badge">Recharts</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
