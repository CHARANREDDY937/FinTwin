import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Sparkles,
  Download,
  Search,
  Edit3,
  Trash2,
  X,
  Check,
  Calendar,
  ArrowUpDown,
  Wallet,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Landmark,
  FileSpreadsheet,
} from 'lucide-react';

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

function formatMonthLabel(monthValue) {
  if (!monthValue) return 'Unknown';
  const [year, month] = monthValue.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
}

export default function RecordsPage({
  months = [],
  setMonths,
  demoMonths = [],
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [monthForm, setMonthForm] = useState(defaultMonth);
  const [filterQuery, setFilterQuery] = useState('');
  const [sortField, setSortField] = useState('month');
  const [sortAsc, setSortAsc] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showAddModal) {
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  // Live preview calculations for form
  const formIncome = toNumber(monthForm.activeIncome) + toNumber(monthForm.passiveIncome);
  const formOutflow =
    toNumber(monthForm.moneySpent) +
    toNumber(monthForm.emiMonthly) +
    toNumber(monthForm.miscellaneousCharges);
  const formSavings = formIncome - formOutflow;
  const formSavingsRate = formIncome > 0 ? ((formSavings / formIncome) * 100).toFixed(1) : 0;

  // Aggregate statistics across all tracked records
  const stats = useMemo(() => {
    if (!months.length) return { avgIncome: 0, avgOutflow: 0, avgSavings: 0, avgRate: 0 };
    let totalInc = 0;
    let totalOut = 0;
    months.forEach((m) => {
      const inc = toNumber(m.activeIncome) + toNumber(m.passiveIncome);
      const out = toNumber(m.moneySpent) + toNumber(m.emiMonthly) + toNumber(m.miscellaneousCharges);
      totalInc += inc;
      totalOut += out;
    });
    const avgIncome = totalInc / months.length;
    const avgOutflow = totalOut / months.length;
    const avgSavings = avgIncome - avgOutflow;
    const avgRate = avgIncome > 0 ? (avgSavings / avgIncome) * 100 : 0;
    return { avgIncome, avgOutflow, avgSavings, avgRate };
  }, [months]);

  const handleOpenAdd = () => {
    setMonthForm(defaultMonth);
    setEditingId(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (record) => {
    setMonthForm({
      month: record.month,
      activeIncome: record.activeIncome,
      passiveIncome: record.passiveIncome,
      creditScore: record.creditScore,
      loansOutstanding: record.loansOutstanding,
      emiMonthly: record.emiMonthly,
      miscellaneousCharges: record.miscellaneousCharges,
      moneySpent: record.moneySpent,
    });
    setEditingId(record.id || record.month);
    setShowAddModal(true);
  };

  const handleSaveMonth = (e) => {
    e.preventDefault();
    const entry = {
      ...monthForm,
      activeIncome: toNumber(monthForm.activeIncome),
      passiveIncome: toNumber(monthForm.passiveIncome),
      creditScore: toNumber(monthForm.creditScore),
      loansOutstanding: toNumber(monthForm.loansOutstanding),
      emiMonthly: toNumber(monthForm.emiMonthly),
      miscellaneousCharges: toNumber(monthForm.miscellaneousCharges),
      moneySpent: toNumber(monthForm.moneySpent),
      id: editingId || `${monthForm.month}-${Date.now()}`,
    };

    setMonths((current) => {
      const filtered = current.filter(
        (item) => (editingId ? item.id !== editingId && item.month !== entry.month : item.month !== entry.month),
      );
      return [entry, ...filtered].sort((a, b) => (a.month < b.month ? 1 : -1));
    });

    setMonthForm(defaultMonth);
    setEditingId(null);
    setShowAddModal(false);
  };

  const handleDeleteMonth = (monthId, monthName) => {
    if (window.confirm(`Are you sure you want to remove the record for ${monthName}?`)) {
      setMonths((current) => current.filter((m) => m.id !== monthId && m.month !== monthName));
    }
  };

  const handleLoadDemo = () => {
    setMonths(
      demoMonths.map((item) => ({
        ...item,
        id: `${item.month}-${Math.random()}`,
      })),
    );
  };

  const handleExportCSV = () => {
    if (!months.length) return;
    const headers = [
      'Month',
      'Active Income',
      'Passive Income',
      'Money Spent',
      'EMI Monthly',
      'Misc Charges',
      'Loans Outstanding',
      'Credit Score',
      'Net Savings',
    ];
    const rows = months.map((m) => {
      const inc = toNumber(m.activeIncome) + toNumber(m.passiveIncome);
      const out = toNumber(m.moneySpent) + toNumber(m.emiMonthly) + toNumber(m.miscellaneousCharges);
      return [
        m.month,
        m.activeIncome,
        m.passiveIncome,
        m.moneySpent,
        m.emiMonthly,
        m.miscellaneousCharges,
        m.loansOutstanding,
        m.creditScore,
        inc - out,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fintwin-records-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and sort records
  const processedMonths = useMemo(() => {
    return [...months]
      .filter((m) => m.month.toLowerCase().includes(filterQuery.toLowerCase()))
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
  }, [months, filterQuery, sortField, sortAsc]);

  return (
    <div className="page-container records-page">
      {/* Header Banner */}
      <div className="page-header-banner animate-in" style={{ '--delay': '0ms' }}>
        <div className="header-eyebrow">
          <FileSpreadsheet size={15} color="#A78BFA" />
          <span>Financial Data Ledger • Ground Truth</span>
        </div>
        <div className="header-flex-row">
          <div>
            <h1 className="page-title">Monthly Financial Records</h1>
            <p className="page-subtitle">
              Manage the ground-truth monthly ledger that fuels your digital twin profile, agent audits, and forecasting models.
            </p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="primary-button add-record-btn"
              onClick={handleOpenAdd}
            >
              <Plus size={16} />
              <span>Ingest New Month</span>
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleLoadDemo}
              title="Load 6 months of demo financial history"
            >
              <Sparkles size={14} />
              <span>Load Demo Dataset</span>
            </button>
            {months.length > 0 && (
              <button
                type="button"
                className="secondary-button export-btn"
                onClick={handleExportCSV}
                title="Download CSV spreadsheet"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Aggregate Stats Bar */}
      {months.length > 0 && (
        <div className="summary-cards-grid animate-in" style={{ '--delay': '120ms' }}>
          <div className="summary-kpi-card" style={{ '--card-accent': '#38BDF8', '--card-glow': 'rgba(56, 189, 248, 0.15)' }}>
            <div className="card-top">
              <div className="card-icon-wrap">
                <Calendar size={18} />
              </div>
              <span className="card-label">Tracked History</span>
            </div>
            <div className="card-value">{months.length} Months</div>
            <div className="card-sub">Recorded Ground-Truth</div>
          </div>

          <div className="summary-kpi-card" style={{ '--card-accent': '#34D399', '--card-glow': 'rgba(52, 211, 153, 0.15)' }}>
            <div className="card-top">
              <div className="card-icon-wrap">
                <TrendingUp size={18} />
              </div>
              <span className="card-label">Avg Monthly Inflow</span>
            </div>
            <div className="card-value">{currency(stats.avgIncome)}</div>
            <div className="card-sub">Active + Passive</div>
          </div>

          <div className="summary-kpi-card" style={{ '--card-accent': '#FB7185', '--card-glow': 'rgba(251, 113, 133, 0.15)' }}>
            <div className="card-top">
              <div className="card-icon-wrap">
                <TrendingDown size={18} />
              </div>
              <span className="card-label">Avg Monthly Outflow</span>
            </div>
            <div className="card-value">{currency(stats.avgOutflow)}</div>
            <div className="card-sub">Living + EMI + Misc</div>
          </div>

          <div className="summary-kpi-card" style={{ '--card-accent': '#A78BFA', '--card-glow': 'rgba(167, 139, 250, 0.15)' }}>
            <div className="card-top">
              <div className="card-icon-wrap">
                <Landmark size={18} />
              </div>
              <span className="card-label">Avg Net Surplus</span>
            </div>
            <div className="card-value">{currency(stats.avgSavings)}</div>
            <div className={`card-trend-badge ${stats.avgRate >= 20 ? 'positive' : 'neutral'}`}>
              <span>{stats.avgRate.toFixed(1)}% savings rate</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Glass Modal for Add/Edit Record */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="glass-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="glass-modal-header">
              <div>
                <h2 className="panel-title">
                  {editingId ? 'Update Monthly Record' : 'Ingest Monthly Record'}
                </h2>
                <p className="panel-subtitle">
                  Enter cash inflows, debt obligations, and expenditures for this cycle.
                </p>
              </div>
              <button
                type="button"
                className="glass-modal-close-btn"
                onClick={() => setShowAddModal(false)}
                title="Close modal (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            <div className="glass-modal-body">
              {/* Live Preview Card inside Modal */}
              <div className="modal-live-preview-banner">
                <div>
                  <div className="preview-stat-label">Total Inflow</div>
                  <div className="preview-stat-value" style={{ color: '#34D399' }}>
                    {currency(formIncome)}
                  </div>
                </div>
                <div>
                  <div className="preview-stat-label">Total Outflow</div>
                  <div className="preview-stat-value" style={{ color: '#FB7185' }}>
                    {currency(formOutflow)}
                  </div>
                </div>
                <div>
                  <div className="preview-stat-label">Net Surplus ({formSavingsRate}%)</div>
                  <div
                    className="preview-stat-value"
                    style={{ color: formSavings >= 0 ? '#34D399' : '#FB7185' }}
                  >
                    {currency(formSavings)}
                  </div>
                </div>
              </div>

              <form className="record-form-grid" onSubmit={handleSaveMonth}>
                <div className="form-group">
                  <label>Month (YYYY-MM)</label>
                  <input
                    type="month"
                    value={monthForm.month}
                    onChange={(e) => setMonthForm((c) => ({ ...c, month: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Active Earnings (Salary / Primary)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 95000"
                    value={monthForm.activeIncome}
                    onChange={(e) => setMonthForm((c) => ({ ...c, activeIncome: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Passive Earnings (Investments / Side)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 12000"
                    value={monthForm.passiveIncome}
                    onChange={(e) => setMonthForm((c) => ({ ...c, passiveIncome: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Credit Score (300 - 900)</label>
                  <input
                    type="number"
                    min="300"
                    max="900"
                    placeholder="e.g. 760"
                    value={monthForm.creditScore}
                    onChange={(e) => setMonthForm((c) => ({ ...c, creditScore: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Loans Outstanding (Total Principal)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1800000"
                    value={monthForm.loansOutstanding}
                    onChange={(e) => setMonthForm((c) => ({ ...c, loansOutstanding: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Monthly EMI Payment</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 24000"
                    value={monthForm.emiMonthly}
                    onChange={(e) => setMonthForm((c) => ({ ...c, emiMonthly: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Miscellaneous Charges / Fees</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 4500"
                    value={monthForm.miscellaneousCharges}
                    onChange={(e) => setMonthForm((c) => ({ ...c, miscellaneousCharges: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Money Spent (Discretionary & Living)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 32000"
                    value={monthForm.moneySpent}
                    onChange={(e) => setMonthForm((c) => ({ ...c, moneySpent: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-actions-full">
                  <button type="submit" className="primary-button">
                    <Check size={16} />
                    <span>{editingId ? 'Update Twin Record' : 'Commit & Update Twin Profile'}</span>
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table Panel */}
      <div className="panel ledger-panel animate-in" style={{ '--delay': '200ms' }}>
        <div className="ledger-toolbar">
          <div className="search-bar">
            <span className="search-icon">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Filter by month (e.g. 2024)..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>

          <div className="ledger-summary-stats">
            <span>
              Total Records: <strong>{months.length}</strong>
            </span>
          </div>
        </div>

        {processedMonths.length === 0 ? (
          <div className="ledger-empty-state">
            <div className="empty-icon">
              <Calendar size={32} color="var(--text-muted)" />
            </div>
            <h3>No Monthly Records Found</h3>
            <p>
              {filterQuery
                ? 'No months match your search criteria.'
                : 'Upload your first month of finances or load the demo dataset to begin.'}
            </p>
            {!filterQuery && (
              <button type="button" className="primary-button" onClick={handleLoadDemo}>
                <Sparkles size={14} />
                <span>Load 6-Month Demo Dataset</span>
              </button>
            )}
          </div>
        ) : (
          <div className="ledger-table-container">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th onClick={() => { setSortField('month'); setSortAsc(!sortAsc); }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span>Month</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>Active In</th>
                  <th>Passive In</th>
                  <th>Total Income</th>
                  <th>Living Spent</th>
                  <th>Monthly EMI</th>
                  <th>Misc</th>
                  <th>Net Surplus</th>
                  <th>Loan Balance</th>
                  <th>Credit Score</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedMonths.map((m) => {
                  const income = toNumber(m.activeIncome) + toNumber(m.passiveIncome);
                  const outflow =
                    toNumber(m.moneySpent) +
                    toNumber(m.emiMonthly) +
                    toNumber(m.miscellaneousCharges);
                  const surplus = income - outflow;

                  return (
                    <tr key={m.id || m.month}>
                      <td className="month-col">
                        <span className="month-badge">{formatMonthLabel(m.month)}</span>
                        <span className="month-raw">{m.month}</span>
                      </td>
                      <td>{currency(m.activeIncome)}</td>
                      <td>{currency(m.passiveIncome)}</td>
                      <td className="highlight-income">{currency(income)}</td>
                      <td>{currency(m.moneySpent)}</td>
                      <td>{currency(m.emiMonthly)}</td>
                      <td>{currency(m.miscellaneousCharges)}</td>
                      <td className={`surplus-col ${surplus >= 0 ? 'pos' : 'neg'}`}>
                        {currency(surplus)}
                      </td>
                      <td className="debt-col">{currency(m.loansOutstanding)}</td>
                      <td>
                        <span
                          className={`credit-pill ${
                            m.creditScore >= 750 ? 'prime' : m.creditScore >= 650 ? 'good' : 'fair'
                          }`}
                        >
                          {m.creditScore}
                        </span>
                      </td>
                      <td className="actions-col" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="edit-row-btn"
                            onClick={() => handleOpenEdit(m)}
                            title="Edit this record"
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-surface-hover)',
                              color: 'var(--text-secondary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="delete-row-btn"
                            onClick={() => handleDeleteMonth(m.id, m.month)}
                            title="Delete month record"
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-surface-hover)',
                              color: '#FB7185',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
