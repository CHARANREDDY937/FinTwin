import React, { useState, useMemo } from 'react';

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [monthForm, setMonthForm] = useState(defaultMonth);
  const [filterQuery, setFilterQuery] = useState('');
  const [sortField, setSortField] = useState('month');
  const [sortAsc, setSortAsc] = useState(false);

  // Live preview calculations for form
  const formIncome = toNumber(monthForm.activeIncome) + toNumber(monthForm.passiveIncome);
  const formOutflow =
    toNumber(monthForm.moneySpent) +
    toNumber(monthForm.emiMonthly) +
    toNumber(monthForm.miscellaneousCharges);
  const formSavings = formIncome - formOutflow;

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
      id: `${monthForm.month}-${Date.now()}`,
    };

    setMonths((current) => {
      const filtered = current.filter((item) => item.month !== entry.month);
      return [entry, ...filtered].sort((a, b) => (a.month < b.month ? 1 : -1));
    });

    setMonthForm(defaultMonth);
    setShowAddForm(false);
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
          <span className="sparkle-icon">📑</span>
          <span>Financial Data Ledger • Ground Truth</span>
        </div>
        <div className="header-flex-row">
          <div>
            <h1 className="page-title">Monthly Financial Records</h1>
            <p className="page-subtitle">
              Manage the ground-truth monthly data that fuels your digital twin profile, agent simulations, and forecasts.
            </p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="primary-button add-record-btn"
              onClick={() => setShowAddForm((v) => !v)}
            >
              {showAddForm ? '✕ Close Form' : '+ Ingest New Month'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleLoadDemo}
              title="Load 6 months of demo financial history"
            >
              ⚡ Load Demo Dataset
            </button>
            {months.length > 0 && (
              <button
                type="button"
                className="secondary-button export-btn"
                onClick={handleExportCSV}
                title="Download CSV spreadsheet"
              >
                📥 Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Month Modal / Collapsible Form */}
      {showAddForm && (
        <div className="panel add-month-panel">
          <div className="panel-header-row">
            <div>
              <h2 className="panel-title">Ingest Monthly Record</h2>
              <p className="panel-subtitle">Enter all cash inflows, debt obligations, and expenditures for the month</p>
            </div>
            <div className="form-preview-pill">
              <span>Preview Surplus: </span>
              <strong style={{ color: formSavings >= 0 ? '#10B981' : '#EF4444' }}>
                {currency(formSavings)}
              </strong>
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
              <label>EMI Paid Monthly</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 28000"
                value={monthForm.emiMonthly}
                onChange={(e) => setMonthForm((c) => ({ ...c, emiMonthly: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>Miscellaneous / Fees</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 5000"
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
                Commit & Update Twin Profile
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ledger Table Panel */}
      <div className="panel ledger-panel">
        <div className="ledger-toolbar">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
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
            <div className="empty-icon">📂</div>
            <h3>No Monthly Records Found</h3>
            <p>
              {filterQuery
                ? 'No months match your search criteria.'
                : 'Upload your first month of finances or load the demo dataset to begin.'}
            </p>
            {!filterQuery && (
              <button type="button" className="primary-button" onClick={handleLoadDemo}>
                Load 6-Month Demo Dataset
              </button>
            )}
          </div>
        ) : (
          <div className="ledger-table-container">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th onClick={() => { setSortField('month'); setSortAsc(!sortAsc); }}>
                    Month {sortField === 'month' ? (sortAsc ? '▲' : '▼') : ''}
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
                  <th>Actions</th>
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
                      <td className="actions-col">
                        <button
                          type="button"
                          className="delete-row-btn"
                          onClick={() => handleDeleteMonth(m.id, m.month)}
                          title="Delete month record"
                        >
                          🗑️
                        </button>
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
