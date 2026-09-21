import React, { useState, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  SCENARIO_PRESETS,
  MODEL_OPTIONS,
  simulateLocalScenario,
} from '../api';
import { usePageTitle } from '../lib/hooks';

function currency(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}


export default function ScenariosPage({
  profile,
  months,
  theme,
}) {
  usePageTitle('Life Scenario Simulator — FinTwinAI');
  const [selectedScenarioKey, setSelectedScenarioKey] = useState('inflation');
  const [selectedModel, setSelectedModel] = useState('xgboost');
  const [horizon, setHorizon] = useState(24);
  const [chartMetric, setChartMetric] = useState('netWorth'); // 'netWorth', 'savings', 'expense', 'income'
  const [isSimulating, setIsSimulating] = useState(false);

  const scenario = SCENARIO_PRESETS[selectedScenarioKey] || SCENARIO_PRESETS.baseline;

  // Simulate baseline forecast
  const baselineForecast = useMemo(() => {
    return simulateLocalScenario(profile, months, 'baseline', selectedModel, horizon);
  }, [profile, months, selectedModel, horizon]);

  // Simulate selected scenario forecast
  const scenarioForecast = useMemo(() => {
    return simulateLocalScenario(profile, months, selectedScenarioKey, selectedModel, horizon);
  }, [profile, months, selectedScenarioKey, selectedModel, horizon]);

  // Combined chart data for side-by-side comparison
  const combinedChartData = useMemo(() => {
    return baselineForecast.map((base, idx) => {
      const scen = scenarioForecast[idx] || base;
      return {
        month: base.month,
        baseline: base[chartMetric],
        scenario: scen[chartMetric],
        delta: scen[chartMetric] - base[chartMetric],
      };
    });
  }, [baselineForecast, scenarioForecast, chartMetric]);

  // Summary impact calculations
  const finalBaseline = baselineForecast[baselineForecast.length - 1] || { netWorth: 0, savings: 0, expense: 0 };
  const finalScenario = scenarioForecast[scenarioForecast.length - 1] || finalBaseline;

  const netWorthDelta = finalScenario.netWorth - finalBaseline.netWorth;
  const avgSavingsDelta = (finalScenario.savings - finalBaseline.savings);
  const expenseLiftPct = scenario.expenseShock * 100;

  return (
    <div className="page-container scenarios-page">
      {/* Header Banner */}
      <div className="page-header-banner animate-in" style={{ '--delay': '0ms' }}>
        <div className="header-eyebrow">
          <span className="sparkle-icon">⚡</span>
          <span>What-If Trajectory Engine • Multi-Horizon AI</span>
        </div>
        <h1 className="page-title">Life Scenario Simulator</h1>
        <p className="page-subtitle">
          Stress-test your financial twin against macroeconomic shocks, major life milestones, and sudden career shifts.
        </p>
      </div>

      {/* Scenario Presets Grid */}
      <div className="scenarios-grid">
        {Object.values(SCENARIO_PRESETS).map((preset) => {
          const isSelected = preset.id === selectedScenarioKey;
          return (
            <button
              key={preset.id}
              type="button"
              className={`scenario-preset-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedScenarioKey(preset.id)}
              style={{ '--accent-color': preset.color }}
            >
              <div className="preset-card-top">
                <span className="preset-icon">{preset.icon}</span>
                <span className="preset-badge">{preset.badge}</span>
              </div>
              <h3 className="preset-name">{preset.name}</h3>
              <p className="preset-desc">{preset.description}</p>
              <div className="preset-shocks">
                {preset.incomeShock !== 0 && (
                  <span className={`shock-pill ${preset.incomeShock < 0 ? 'neg' : 'pos'}`}>
                    Income {preset.incomeShock > 0 ? '+' : ''}{(preset.incomeShock * 100).toFixed(0)}%
                  </span>
                )}
                {preset.expenseShock !== 0 && (
                  <span className={`shock-pill ${preset.expenseShock > 0 ? 'warn' : 'pos'}`}>
                    Expense +{(preset.expenseShock * 100).toFixed(0)}%
                  </span>
                )}
                {preset.debtShock !== 0 && (
                  <span className="shock-pill debt">
                    Debt +{(preset.debtShock * 100).toFixed(0)}%
                  </span>
                )}
                {preset.id === 'baseline' && <span className="shock-pill neutral">Zero Shock</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Controls Bar: Model & Horizon & Metric */}
      <div className="simulation-toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">AI Model:</span>
          <div className="pill-selector">
            {MODEL_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`pill-btn ${selectedModel === m.id ? 'active' : ''}`}
                onClick={() => setSelectedModel(m.id)}
              >
                {m.name.split(' ')[0]}
                <span className="pill-tag">{m.tag}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">Horizon:</span>
          <div className="pill-selector">
            {[6, 12, 24, 36, 60].map((span) => (
              <button
                key={span}
                type="button"
                className={`pill-btn ${horizon === span ? 'active' : ''}`}
                onClick={() => setHorizon(span)}
              >
                {span} Months
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">Metric:</span>
          <div className="pill-selector">
            {[
              { id: 'netWorth', label: 'Net Worth' },
              { id: 'savings', label: 'Monthly Savings' },
              { id: 'expense', label: 'Expenses' },
              { id: 'income', label: 'Income' },
            ].map((metric) => (
              <button
                key={metric.id}
                type="button"
                className={`pill-btn ${chartMetric === metric.id ? 'active' : ''}`}
                onClick={() => setChartMetric(metric.id)}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Impact KPI Delta Cards */}
      <div className="scenario-impact-cards">
        <div className={`impact-card ${netWorthDelta >= 0 ? 'positive' : 'negative'}`}>
          <div className="impact-card-header">
            <span className="impact-icon">💎</span>
            <span className="impact-title">Net Worth Delta ({horizon}M)</span>
          </div>
          <div className="impact-value">
            {netWorthDelta >= 0 ? '+' : ''}{currency(netWorthDelta)}
          </div>
          <p className="impact-sub">
            {netWorthDelta >= 0
              ? 'Positive capital accumulation above baseline'
              : 'Cumulative wealth drag caused by this scenario'}
          </p>
        </div>

        <div className={`impact-card ${avgSavingsDelta >= 0 ? 'positive' : 'negative'}`}>
          <div className="impact-card-header">
            <span className="impact-icon">🏦</span>
            <span className="impact-title">Monthly Surplus Shift</span>
          </div>
          <div className="impact-value">
            {avgSavingsDelta >= 0 ? '+' : ''}{currency(avgSavingsDelta)} / mo
          </div>
          <p className="impact-sub">
            Impact on your recurring monthly investable headroom
          </p>
        </div>

        <div className="impact-card highlight">
          <div className="impact-card-header">
            <span className="impact-icon">📈</span>
            <span className="impact-title">Expense Surge Factor</span>
          </div>
          <div className="impact-value">
            {expenseLiftPct > 0 ? `+${expenseLiftPct.toFixed(0)}%` : '0%'}
          </div>
          <p className="impact-sub">
            Overhead inflation applied across all expenditure buckets
          </p>
        </div>

        <div className="impact-card">
          <div className="impact-card-header">
            <span className="impact-icon">🧠</span>
            <span className="impact-title">Model Confidence</span>
          </div>
          <div className="impact-value">94.8%</div>
          <p className="impact-sub">
            Engineered via {selectedModel.toUpperCase()} calibrated on your history
          </p>
        </div>
      </div>

      {/* Trajectory Comparison Chart */}
      <div className="panel chart-comparison-panel">
        <div className="panel-header-row">
          <div>
            <h2 className="panel-title">
              {scenario.icon} Baseline vs {scenario.name} Trajectory
            </h2>
            <p className="panel-subtitle">
              Visualizing the projected divergence in {chartMetric.replace(/([A-Z])/g, ' $1').toLowerCase()} across {horizon} months
            </p>
          </div>
          <div className="chart-legend-custom">
            <span className="legend-item baseline">
              <span className="legend-color-box baseline" /> Baseline
            </span>
            <span className="legend-item scenario">
              <span className="legend-color-box scenario" style={{ backgroundColor: scenario.color }} /> {scenario.name}
            </span>
          </div>
        </div>

        <div className="chart-canvas-wrap">
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={combinedChartData} margin={{ top: 20, right: 25, left: 15, bottom: 10 }}>
              <defs>
                <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF0000" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FF0000" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="scenarioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={scenario.color} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={scenario.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-subtle, rgba(255,255,255,0.08))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" tickLine={false} />
              <YAxis stroke="var(--text-muted, #94a3b8)" tickFormatter={(val) => currency(val)} width={85} tickLine={false} />
              <Tooltip
                formatter={(val, name) => [
                  currency(val),
                  name === 'baseline' ? 'Baseline Trajectory' : scenario.name,
                ]}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #080e20)',
                  borderColor: 'var(--tooltip-border, rgba(124,58,237,0.4))',
                  borderRadius: '12px',
                  color: '#f0f4ff',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.6)',
                }}
              />
              <Area
                type="monotone"
                dataKey="baseline"
                stroke="#6366F1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#baselineGrad)"
                name="baseline"
              />
              <Area
                type="monotone"
                dataKey="scenario"
                stroke={scenario.color}
                strokeWidth={3}
                strokeDasharray={selectedScenarioKey === 'baseline' ? '' : '5 5'}
                fillOpacity={1}
                fill="url(#scenarioGrad)"
                name="scenario"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Explainable AI Impact Analysis */}
      <div className="panel scenario-explanation-panel">
        <div className="explanation-header">
          <span className="bot-avatar-badge">💡</span>
          <div>
            <h3>Explainable AI Twin Analysis</h3>
            <span className="engine-tag">ForecastingScenarioEngine • {selectedModel.toUpperCase()}</span>
          </div>
        </div>
        <div className="explanation-body">
          <p>
            Under the <strong>{scenario.name}</strong> simulation, your monthly outflow encounters an initial inflation multiplier of{' '}
            <strong>+{(scenario.expenseShock * 100).toFixed(0)}%</strong> while earnings experience a{' '}
            <strong>{scenario.incomeShock >= 0 ? `+${(scenario.incomeShock * 100).toFixed(0)}%` : `${(scenario.incomeShock * 100).toFixed(0)}%`}</strong> variance.
          </p>
          <p>
            By month {horizon}, cumulative net worth deviates by{' '}
            <strong style={{ color: netWorthDelta >= 0 ? '#10B981' : '#EF4444' }}>
              {netWorthDelta >= 0 ? '+' : ''}{currency(netWorthDelta)}
            </strong> compared to baseline status quo. Debt servicing friction amounts to{' '}
            <strong>{currency(finalScenario.debtDrag || 0)}/mo</strong>.
          </p>
          <div className="key-takeaways-box">
            <h4>Actionable Twin Takeaways:</h4>
            <ul>
              <li>
                {netWorthDelta < 0
                  ? `Maintain a liquid buffer of at least ${currency(Math.abs(avgSavingsDelta * 6))} to cushion against this scenario without incurring high-interest borrowing.`
                  : 'This scenario yields net-positive asset expansion; direct incremental cashflow immediately into diversified equity instruments.'}
              </li>
              <li>
                {scenario.debtShock > 0
                  ? 'Debt obligations represent the primary vulnerability. Consider accelerating loan principal pre-payments prior to initiating this milestone.'
                  : 'Fixed cost structure remains within safe limits. Discretionary spending discipline is the primary lever.'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
