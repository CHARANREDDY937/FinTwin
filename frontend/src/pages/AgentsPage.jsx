import React, { useMemo } from 'react';
import FinancialHealthGauge from '../components/FinancialHealthGauge';
import { evaluateLocalAgents } from '../api';
import { usePageTitle } from '../lib/hooks';

function currency(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}


export default function AgentsPage({
  profile,
  months,
  backendOnline,
}) {
  const agentsData = useMemo(() => {
    return evaluateLocalAgents(profile, months);
  }, [profile, months]);
  usePageTitle('Multi-Agent Intelligence — FinTwinAI');

  // Overall financial health score
  const healthScore = useMemo(() => {
    const income = Math.max(profile?.income || profile?.avgIncome || 1, 1);
    const savings = Math.max(0, profile?.savings || 0);
    const savingsRate = Math.min(1, savings / income);
    const emi = profile?.emi || 0;
    const dti = Math.min(1, emi / income);
    const credit = Math.min(900, Math.max(300, profile?.creditScore || 750));

    // Weighted composite score: 35% Credit, 40% Savings Rate, 25% Debt headroom
    const creditPart = ((credit - 300) / 600) * 35;
    const savingsPart = Math.min(1, savingsRate / 0.35) * 40;
    const debtPart = Math.max(0, 1 - dti / 0.5) * 25;

    return Math.round(creditPart + savingsPart + debtPart);
  }, [profile]);

  const savingsRate = profile?.income ? (profile?.savings / profile.income) * 100 : 0;
  const dti = profile?.income ? (profile?.emi / profile.income) * 100 : 0;

  return (
    <div className="page-container agents-page">
      {/* Header Banner */}
      <div className="page-header-banner animate-in" style={{ '--delay': '0ms' }}>
        <div className="header-eyebrow">
          <span className="sparkle-icon">🧠</span>
          <span>Multi-Agent Financial Intelligence • 4 Specialized Agents</span>
        </div>
        <h1 className="page-title">Autonomous AI Agent Consensus</h1>
        <p className="page-subtitle">
          Four specialized AI agents concurrently audit your financial digital twin across spending behavior, wealth compounding, debt risk, and horizon goals.
        </p>
      </div>

      {/* Top Overview: Composite Health Gauge & Key Ratios */}
      <div className="agents-top-grid">
        <div className="panel gauge-hero-panel">
          <FinancialHealthGauge
            score={healthScore}
            size={220}
            strokeWidth={16}
            label="Composite Twin Health Index"
          />
        </div>

        <div className="panel key-ratios-panel">
          <h3 className="panel-title">Ground-Truth Core Ratios</h3>
          <p className="panel-subtitle">Key prudential indicators extracted from your monthly financial record ledger</p>

          <div className="ratios-grid">
            <div className="ratio-box">
              <span className="ratio-label">Savings Rate</span>
              <strong className={`ratio-val ${savingsRate >= 20 ? 'good' : 'warn'}`}>
                {savingsRate.toFixed(1)}%
              </strong>
              <small className="ratio-bench">Benchmark: &gt; 20%</small>
            </div>

            <div className="ratio-box">
              <span className="ratio-label">Debt-to-Income (DTI)</span>
              <strong className={`ratio-val ${dti <= 35 ? 'good' : 'alert'}`}>
                {dti.toFixed(1)}%
              </strong>
              <small className="ratio-bench">Ceiling: &lt; 35%</small>
            </div>

            <div className="ratio-box">
              <span className="ratio-label">Credit Rating</span>
              <strong className="ratio-val good">{profile?.creditScore || 750}</strong>
              <small className="ratio-bench">Prime Tier: &gt; 750</small>
            </div>

            <div className="ratio-box">
              <span className="ratio-label">Monthly Surplus</span>
              <strong className="ratio-val good">{currency(profile?.savings || 0)}</strong>
              <small className="ratio-bench">Net investable buffer</small>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Multi-Agent Cards Grid */}
      <div className="agents-cards-grid">
        {agentsData.map((agent, i) => (
          <div
            key={agent.id}
            className="agent-detail-card animate-in"
            style={{ '--agent-color': agent.color, '--delay': `${200 + i * 80}ms` }}
          >
            <div className="agent-card-header">
              <div className="agent-icon-wrap">{agent.icon}</div>
              <div className="agent-title-col">
                <h3 className="agent-name">{agent.name}</h3>
                <span className="agent-headline">{agent.headline}</span>
              </div>
              <div className="agent-score-badge">
                <span className="score-number">{agent.score}</span>
                <span className="score-sub">Score</span>
              </div>
            </div>

            <div className="agent-status-pill-wrap">
              <span className="agent-status-pill">{agent.status}</span>
            </div>

            <div className="agent-analysis-body">
              <h4>Behavioral Analysis</h4>
              <p>{agent.analysis}</p>
            </div>

            <div className="agent-rec-box">
              <div className="rec-header">
                <span className="rec-bulb">💡</span>
                <strong>Agent Prescriptive Action:</strong>
              </div>
              <p>{agent.recommendation}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Explainable AI Consensus Panel */}
      <div className="panel consensus-panel">
        <div className="consensus-header">
          <div className="consensus-icon">🧬</div>
          <div>
            <h3>Explainable AI Twin Consensus Summary</h3>
            <p>Unified verdict computed by combining outputs from all 4 specialized agents</p>
          </div>
        </div>

        <div className="consensus-content">
          <p>
            Your digital twin exhibits a <strong>{healthScore >= 75 ? 'robust and resilient' : 'moderate with growth potential'}</strong> financial profile.
            With a monthly net inflow of <strong>{currency(profile?.income || 0)}</strong> and total monthly obligations of{' '}
            <strong>{currency(profile?.outflow || 0)}</strong>, your retained capital clears expenses with a{' '}
            <strong>{savingsRate.toFixed(1)}%</strong> surplus cushion.
          </p>
          <div className="consensus-pillars">
            <div className="pillar-item">
              <span className="pillar-check">✓</span>
              <span><strong>Spending Discipline:</strong> Outflow is maintained under {profile?.income ? Math.round((profile?.outflow / profile.income) * 100) : 0}% of net earnings.</span>
            </div>
            <div className="pillar-item">
              <span className="pillar-check">✓</span>
              <span><strong>Debt Servicing:</strong> EMI allocations absorb {dti.toFixed(1)}% of income, retaining flexibility for unforeseen liquidity needs.</span>
            </div>
            <div className="pillar-item">
              <span className="pillar-check">✓</span>
              <span><strong>Horizon Readiness:</strong> Current savings rate supports milestone planning without jeopardizing emergency cash buffers.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
