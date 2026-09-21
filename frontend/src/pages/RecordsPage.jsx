import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  UploadCloud,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  FileText,
  Layers,
  ArrowRight,
  Filter,
  Tag,
  Receipt,
} from 'lucide-react';
import { usePageTitle } from '../lib/hooks';
import { ingestStatementAPI, fetchSampleStatementAPI } from '../api';

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

const CATEGORY_OPTIONS = [
  { value: 'active_income', label: 'Active Income', color: '#10B981', type: 'credit' },
  { value: 'passive_income', label: 'Passive Income', color: '#06B6D4', type: 'credit' },
  { value: 'money_spent', label: 'Living Expense', color: '#F43F5E', type: 'debit' },
  { value: 'emi_monthly', label: 'Loan EMI', color: '#F59E0B', type: 'debit' },
  { value: 'miscellaneous_charges', label: 'Misc Charges', color: '#8B5CF6', type: 'debit' },
  { value: 'investment', label: 'Investment / SIP', color: '#3B82F6', type: 'neutral' },
];

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
  backendOnline,
}) {
  usePageTitle('Financial Ledger — FinTwinAI');
  // Manual add/edit modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [monthForm, setMonthForm] = useState(defaultMonth);
  const [filterQuery, setFilterQuery] = useState('');
  const [sortField, setSortField] = useState('month');
  const [sortAsc, setSortAsc] = useState(false);

  // Statement Ingestion State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const fileInputRef = useRef(null);

  // Password Unlock Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [statementPassword, setStatementPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordBankHint, setPasswordBankHint] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

  // Interactive Review Sheet State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [ingestData, setIngestData] = useState(null);
  const [reviewMonths, setReviewMonths] = useState([]);
  const [reviewTransactions, setReviewTransactions] = useState([]);
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewCatFilter, setReviewCatFilter] = useState('all');

  // "View Transactions" Slide-out Drawer State
  const [drawerMonth, setDrawerMonth] = useState(null);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerCatFilter, setDrawerCatFilter] = useState('all');

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (drawerMonth) setDrawerMonth(null);
        else if (showReviewModal) setShowReviewModal(false);
        else if (showPasswordModal) setShowPasswordModal(false);
        else if (showAddModal) setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerMonth, showReviewModal, showPasswordModal, showAddModal]);

  // Form calculations
  const formIncome = toNumber(monthForm.activeIncome) + toNumber(monthForm.passiveIncome);
  const formOutflow =
    toNumber(monthForm.moneySpent) +
    toNumber(monthForm.emiMonthly) +
    toNumber(monthForm.miscellaneousCharges);
  const formSavings = formIncome - formOutflow;
  const formSavingsRate = formIncome > 0 ? ((formSavings / formIncome) * 100).toFixed(1) : 0;

  // Aggregate statistics across recorded ledger
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

  // Latest existing month for carrying forward credit score & loans
  const latestRecordedMonth = useMemo(() => {
    if (!months.length) return null;
    return [...months].sort((a, b) => (a.month < b.month ? 1 : -1))[0];
  }, [months]);

  // -------------------------------------------------------------
  // Ingestion Processing Logic
  // -------------------------------------------------------------
  const processIngestionResult = (result) => {
    if (!result) return;

    if (result.status === 'password_required') {
      setPasswordBankHint(result.bank_detected || result.hint || 'Encrypted PDF');
      setPasswordErrorMessage('');
      setShowPasswordModal(true);
      return;
    }

    if (result.status === 'invalid_password') {
      setPasswordErrorMessage(result.message || 'Incorrect statement password. Please try again.');
      setShowPasswordModal(true);
      return;
    }

    if (result.status === 'error') {
      setUploadError(result.message || 'Failed to parse uploaded statement.');
      return;
    }

    // Success: prepare review sheet
    setShowPasswordModal(false);
    setStatementPassword('');
    setPendingFile(null);
    setIngestData(result);

    const txns = result.transactions || [];
    setReviewTransactions(txns);

    // Prepare monthly review objects with conflict resolution options & loan defaults
    const fallbackCredit = latestRecordedMonth ? latestRecordedMonth.creditScore : 750;
    const fallbackLoans = latestRecordedMonth ? latestRecordedMonth.loansOutstanding : 1500000;

    const initialMonths = (result.monthly_aggregates || []).map((m) => {
      const existing = months.find((em) => em.month === m.month);
      return {
        ...m,
        existingRecord: existing || null,
        // Conflict strategy: 'overwrite' | 'add' | 'keep_existing'
        conflictStrategy: existing ? 'overwrite' : 'add',
        creditScore: existing ? existing.creditScore : fallbackCredit,
        loansOutstanding: existing ? existing.loansOutstanding : fallbackLoans,
      };
    });

    setReviewMonths(initialMonths);
    setShowReviewModal(true);
    setUploadSuccess(`Parsed ${txns.length} transactions from ${result.bank_detected || 'statement'}.`);
    setTimeout(() => setUploadSuccess(null), 6000);
  };

  const handleFileUpload = async (file, password = null) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setPendingFile(file);

    try {
      const result = await ingestStatementAPI(file, password);
      processIngestionResult(result);
    } catch (err) {
      setUploadError(err.message || 'Error processing statement.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleUnlockPassword = async (e) => {
    e.preventDefault();
    if (!pendingFile) return;
    setIsUploading(true);
    setPasswordErrorMessage('');
    try {
      const result = await ingestStatementAPI(pendingFile, statementPassword);
      processIngestionResult(result);
    } catch (err) {
      setPasswordErrorMessage(err.message || 'Failed to decrypt statement.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTrySample = async (sampleType) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await fetchSampleStatementAPI(sampleType);
      processIngestionResult(result);
    } catch (err) {
      setUploadError(err.message || 'Failed to load sample statement.');
    } finally {
      setIsUploading(false);
    }
  };

  // -------------------------------------------------------------
  // Review Sheet Category Override & Aggregation Recalculation
  // -------------------------------------------------------------
  const handleCategoryChange = (txnIndex, newCategory) => {
    setReviewTransactions((prevTxns) => {
      const updated = [...prevTxns];
      const target = { ...updated[txnIndex] };
      const catMeta = CATEGORY_OPTIONS.find((c) => c.value === newCategory);
      target.category = newCategory;
      target.subcategory = catMeta?.label || 'Manual Override';
      target.method = 'manual';
      updated[txnIndex] = target;

      // Re-aggregate monthly totals dynamically
      setReviewMonths((prevMonths) =>
        prevMonths.map((m) => {
          const monthTxns = updated.filter((t) => t.month === m.month);
          let activeInc = 0;
          let passiveInc = 0;
          let spent = 0;
          let emi = 0;
          let misc = 0;
          let invest = 0;

          monthTxns.forEach((t) => {
            const amt = Number(t.amount) || 0;
            if (t.category === 'active_income') activeInc += amt;
            else if (t.category === 'passive_income') passiveInc += amt;
            else if (t.category === 'emi_monthly') emi += amt;
            else if (t.category === 'miscellaneous_charges') misc += amt;
            else if (t.category === 'investment') invest += amt;
            else spent += amt;
          });

          const totalInc = activeInc + passiveInc;
          const totalOut = spent + emi + misc;
          return {
            ...m,
            active_income: activeInc,
            passive_income: passiveInc,
            money_spent: spent,
            emi_monthly: emi,
            miscellaneous_charges: misc,
            investment: invest,
            total_income: totalInc,
            total_outflow: totalOut,
            net_savings: totalInc - totalOut,
            transactions: monthTxns,
          };
        }),
      );

      return updated;
    });
  };

  // -------------------------------------------------------------
  // Commit Months to Digital Twin Ledger
  // -------------------------------------------------------------
  const handleCommitReview = () => {
    setMonths((currentMonths) => {
      let merged = [...currentMonths];

      reviewMonths.forEach((rm) => {
        const monthTxns = reviewTransactions.filter((t) => t.month === rm.month);
        const existing = merged.find((m) => m.month === rm.month);

        if (!existing) {
          // New month record
          merged.push({
            id: `${rm.month}-${Date.now()}`,
            month: rm.month,
            activeIncome: rm.active_income,
            passiveIncome: rm.passive_income,
            moneySpent: rm.money_spent,
            emiMonthly: rm.emi_monthly,
            miscellaneousCharges: rm.miscellaneous_charges,
            creditScore: toNumber(rm.creditScore),
            loansOutstanding: toNumber(rm.loansOutstanding),
            transactions: monthTxns,
          });
        } else {
          // Overlapping month: apply chosen conflict resolution
          if (rm.conflictStrategy === 'keep_existing') {
            // Keep existing as is
            return;
          } else if (rm.conflictStrategy === 'add') {
            // Additive merge
            const combinedTxns = [...(existing.transactions || []), ...monthTxns];
            merged = merged.map((m) =>
              m.month === rm.month
                ? {
                    ...m,
                    activeIncome: toNumber(m.activeIncome) + rm.active_income,
                    passiveIncome: toNumber(m.passiveIncome) + rm.passive_income,
                    moneySpent: toNumber(m.moneySpent) + rm.money_spent,
                    emiMonthly: toNumber(m.emiMonthly) + rm.emi_monthly,
                    miscellaneousCharges: toNumber(m.miscellaneousCharges) + rm.miscellaneous_charges,
                    creditScore: toNumber(rm.creditScore) || m.creditScore,
                    loansOutstanding: toNumber(rm.loansOutstanding) || m.loansOutstanding,
                    transactions: combinedTxns,
                  }
                : m,
            );
          } else {
            // Overwrite existing values with parsed bank statement
            merged = merged.map((m) =>
              m.month === rm.month
                ? {
                    ...m,
                    activeIncome: rm.active_income,
                    passiveIncome: rm.passive_income,
                    moneySpent: rm.money_spent,
                    emiMonthly: rm.emi_monthly,
                    miscellaneousCharges: rm.miscellaneous_charges,
                    creditScore: toNumber(rm.creditScore),
                    loansOutstanding: toNumber(rm.loansOutstanding),
                    transactions: monthTxns,
                  }
                : m,
            );
          }
        }
      });

      return merged.sort((a, b) => (a.month < b.month ? 1 : -1));
    });

    setShowReviewModal(false);
    setUploadSuccess(`Successfully merged statement records into your Financial Twin ledger!`);
    setTimeout(() => setUploadSuccess(null), 5000);
  };

  // -------------------------------------------------------------
  // Manual Add/Edit Handlers
  // -------------------------------------------------------------
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
    const existing = months.find((m) => m.id === editingId || m.month === monthForm.month);
    const entry = {
      ...monthForm,
      activeIncome: toNumber(monthForm.activeIncome),
      passiveIncome: toNumber(monthForm.passiveIncome),
      creditScore: toNumber(monthForm.creditScore),
      loansOutstanding: toNumber(monthForm.loansOutstanding),
      emiMonthly: toNumber(monthForm.emiMonthly),
      miscellaneousCharges: toNumber(monthForm.miscellaneousCharges),
      moneySpent: toNumber(monthForm.moneySpent),
      transactions: existing?.transactions || [],
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

  // Filter transactions in review sheet
  const filteredReviewTxns = useMemo(() => {
    return reviewTransactions.filter((t) => {
      const matchSearch =
        !reviewSearch ||
        t.narration?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        t.date?.includes(reviewSearch);
      const matchCat =
        reviewCatFilter === 'all' || t.category === reviewCatFilter;
      return matchSearch && matchCat;
    });
  }, [reviewTransactions, reviewSearch, reviewCatFilter]);

  // Filter transactions in View Transactions Drawer
  const filteredDrawerTxns = useMemo(() => {
    if (!drawerMonth?.transactions) return [];
    return drawerMonth.transactions.filter((t) => {
      const matchSearch =
        !drawerSearch ||
        t.narration?.toLowerCase().includes(drawerSearch.toLowerCase()) ||
        t.date?.includes(drawerSearch);
      const matchCat =
        drawerCatFilter === 'all' || t.category === drawerCatFilter;
      return matchSearch && matchCat;
    });
  }, [drawerMonth, drawerSearch, drawerCatFilter]);

  return (
    <div className="page-container records-page">
      {/* Header Banner */}
      <div className="page-header-banner animate-in" style={{ '--delay': '0ms' }}>
        <div className="header-eyebrow">
          <FileSpreadsheet size={15} color="#FFD700" />
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
              <span>Manual Entry</span>
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

      {/* Notifications Alert */}
      {uploadSuccess && (
        <div className="statement-alert success animate-in">
          <CheckCircle2 size={18} />
          <span>{uploadSuccess}</span>
        </div>
      )}
      {uploadError && (
        <div className="statement-alert error animate-in">
          <AlertCircle size={18} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Offline Backend Warning */}
      {backendOnline === false && (
        <div className="statement-alert warning animate-in" style={{ marginBottom: '16px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#F59E0B', display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', borderRadius: '8px' }}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Backend Multi-Agent Engine is Offline (http://localhost:8000)</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Real PDF statement parsing and decryption require the Python backend. Run <code style={{ background: 'rgba(0,0,0,0.12)', padding: '2px 6px', borderRadius: '4px' }}>uvicorn app:app --reload --port 8000</code> in the <code style={{ background: 'rgba(0,0,0,0.12)', padding: '2px 6px', borderRadius: '4px' }}>backend</code> directory to parse your bank statement.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          Statement Ingestion Dropzone Card
          ───────────────────────────────────────────────────────────── */}
      <div className="statement-dropzone-wrapper animate-in" style={{ '--delay': '60ms' }}>
        <div
          className={`statement-dropzone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".pdf,.csv,.txt"
            onChange={handleFileSelect}
          />

          <div className="dropzone-icon-ring">
            {isUploading ? (
              <div className="dropzone-spinner" />
            ) : (
              <UploadCloud size={30} className="dropzone-icon" />
            )}
          </div>

          <div className="dropzone-content">
            <h3 className="dropzone-title">
              {isUploading
                ? 'Parsing & Categorizing Statement...'
                : 'Upload Bank Statement (PDF) or UPI Export (CSV)'}
            </h3>
            <p className="dropzone-subtitle">
              Drag and drop your file here, or click to browse. Password-protected PDFs are decrypted in-memory.
            </p>

            <div className="dropzone-badges">
              <span className="drop-badge">HDFC</span>
              <span className="drop-badge">SBI</span>
              <span className="drop-badge">ICICI</span>
              <span className="drop-badge">Axis</span>
              <span className="drop-badge">Kotak</span>
              <span className="drop-badge">PhonePe</span>
              <span className="drop-badge">Google Pay</span>
              <span className="drop-badge">Paytm</span>
            </div>
          </div>

          {/* 1-Click Quick Testing Sample Buttons */}
          <div className="dropzone-actions" onClick={(e) => e.stopPropagation()}>
            <span className="sample-label">Quick Test Fixtures:</span>
            <div className="sample-buttons-row">
              <button
                type="button"
                className="sample-pill-btn"
                onClick={() => handleTrySample('hdfc')}
                disabled={isUploading}
                title="Test parsing an authentic HDFC NetBanking statement"
              >
                <FileText size={13} />
                <span>⚡ Try Sample HDFC PDF</span>
              </button>
              <button
                type="button"
                className="sample-pill-btn"
                onClick={() => handleTrySample('phonepe')}
                disabled={isUploading}
                title="Test parsing PhonePe UPI transactions CSV"
              >
                <Receipt size={13} />
                <span>⚡ Try Sample PhonePe CSV</span>
              </button>
            </div>
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

          <div className="summary-kpi-card" style={{ '--card-accent': '#FF0000', '--card-glow': 'rgba(255, 0, 0, 0.15)' }}>
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

      {/* ─────────────────────────────────────────────────────────────
          Password Unlock Modal Dialog
          ───────────────────────────────────────────────────────────── */}
      {showPasswordModal && (
        <div className="modal-backdrop" onClick={() => setShowPasswordModal(false)}>
          <div
            className="glass-modal-dialog password-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="glass-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="lock-icon-aura">
                  <Lock size={18} color="#34D399" />
                </div>
                <div>
                  <h2 className="panel-title">Unlock Bank Statement</h2>
                  <p className="panel-subtitle">This statement PDF is password-protected by your bank.</p>
                </div>
              </div>
              <button
                type="button"
                className="glass-modal-close-btn"
                onClick={() => setShowPasswordModal(false)}
                title="Close modal (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUnlockPassword} className="glass-modal-body">
              <div className="password-hint-box">
                <ShieldCheck size={16} color="#38BDF8" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Bank Detected: {passwordBankHint || 'Indian Bank PDF'}</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Passwords are decrypted strictly in memory and are never saved to disk or transmitted to external servers.
                  </p>
                </div>
              </div>

              {passwordErrorMessage && (
                <div className="statement-alert error" style={{ margin: '12px 0 0 0' }}>
                  <AlertCircle size={16} />
                  <span>{passwordErrorMessage}</span>
                </div>
              )}

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="input-label" htmlFor="statement-password-input">
                  Statement Password
                </label>
                <div className="password-input-wrap">
                  <input
                    id="statement-password-input"
                    type={showPasswordText ? 'text' : 'password'}
                    className="modal-input"
                    placeholder="Enter password (e.g. DOB DDMMYYYY, PAN, or Customer ID)"
                    value={statementPassword}
                    onChange={(e) => setStatementPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    title={showPasswordText ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="modal-actions-row" style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={!statementPassword.trim() || isUploading}
                >
                  <Unlock size={15} />
                  <span>{isUploading ? 'Decrypting...' : 'Unlock & Parse'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          Interactive Review & Verification Sheet Modal
          ───────────────────────────────────────────────────────────── */}
      {showReviewModal && (
        <div className="modal-backdrop review-sheet-backdrop" onClick={() => setShowReviewModal(false)}>
          <div
            className="glass-modal-dialog review-sheet-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="glass-modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="review-bank-badge">
                    {ingestData?.bank_detected || 'Bank Statement'}
                  </span>
                  <span className="review-count-badge">
                    {reviewTransactions.length} Transactions Parsed
                  </span>
                </div>
                <h2 className="panel-title" style={{ marginTop: '6px' }}>
                  Review Statement & Calibrate Ledger
                </h2>
                <p className="panel-subtitle">
                  Verify detected monthly subtotals, resolve overlapping months, and review auto-categorized transactions before committing to your twin ledger.
                </p>
              </div>
              <button
                type="button"
                className="glass-modal-close-btn"
                onClick={() => setShowReviewModal(false)}
                title="Close review (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            <div className="review-sheet-body">
              {/* Monthly Subtotals & Conflict Strategy Section */}
              <div className="review-section-title">
                <Layers size={16} color="#38BDF8" />
                <span>Detected Monthly Cycles ({reviewMonths.length})</span>
              </div>

              <div className="review-months-grid">
                {reviewMonths.map((rm, idx) => (
                  <div key={rm.month} className="review-month-card">
                    <div className="review-month-header">
                      <div>
                        <span className="month-badge">{formatMonthLabel(rm.month)}</span>
                        <span className="month-raw" style={{ marginLeft: '6px' }}>{rm.month}</span>
                      </div>
                      <span className="review-txn-badge">{rm.transaction_count} txns</span>
                    </div>

                    <div className="review-month-stats">
                      <div className="rm-stat">
                        <span className="rm-label">Income</span>
                        <span className="rm-val in">+{currency(rm.total_income)}</span>
                      </div>
                      <div className="rm-stat">
                        <span className="rm-label">Living Spent</span>
                        <span className="rm-val out">-{currency(rm.money_spent)}</span>
                      </div>
                      <div className="rm-stat">
                        <span className="rm-label">EMI / Loans</span>
                        <span className="rm-val emi">-{currency(rm.emi_monthly)}</span>
                      </div>
                      <div className="rm-stat">
                        <span className="rm-label">Net Surplus</span>
                        <span className={`rm-val ${rm.net_savings >= 0 ? 'pos' : 'neg'}`}>
                          {currency(rm.net_savings)}
                        </span>
                      </div>
                    </div>

                    {/* Conflict Resolution Selector if month already exists */}
                    {rm.existingRecord && (
                      <div className="conflict-box">
                        <div className="conflict-header">
                          <AlertCircle size={13} color="#F59E0B" />
                          <span>Record exists for {rm.month}</span>
                        </div>
                        <div className="conflict-selector">
                          <button
                            type="button"
                            className={`conflict-pill ${rm.conflictStrategy === 'overwrite' ? 'active' : ''}`}
                            onClick={() => {
                              const updated = [...reviewMonths];
                              updated[idx].conflictStrategy = 'overwrite';
                              setReviewMonths(updated);
                            }}
                          >
                            Overwrite
                          </button>
                          <button
                            type="button"
                            className={`conflict-pill ${rm.conflictStrategy === 'add' ? 'active' : ''}`}
                            onClick={() => {
                              const updated = [...reviewMonths];
                              updated[idx].conflictStrategy = 'add';
                              setReviewMonths(updated);
                            }}
                          >
                            Add / Sum
                          </button>
                          <button
                            type="button"
                            className={`conflict-pill ${rm.conflictStrategy === 'keep_existing' ? 'active' : ''}`}
                            onClick={() => {
                              const updated = [...reviewMonths];
                              updated[idx].conflictStrategy = 'keep_existing';
                              setReviewMonths(updated);
                            }}
                          >
                            Keep Existing
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Editable Credit Score & Loan Balance Inputs */}
                    <div className="review-month-inputs">
                      <div className="rm-input-wrap">
                        <label>Credit Score</label>
                        <input
                          type="number"
                          className="rm-mini-input"
                          value={rm.creditScore}
                          onChange={(e) => {
                            const updated = [...reviewMonths];
                            updated[idx].creditScore = e.target.value;
                            setReviewMonths(updated);
                          }}
                          min="300"
                          max="900"
                        />
                      </div>
                      <div className="rm-input-wrap">
                        <label>Outstanding Loans (₹)</label>
                        <input
                          type="number"
                          className="rm-mini-input"
                          value={rm.loansOutstanding}
                          onChange={(e) => {
                            const updated = [...reviewMonths];
                            updated[idx].loansOutstanding = e.target.value;
                            setReviewMonths(updated);
                          }}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Granular Transactions Table Section */}
              <div className="review-section-title" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={16} color="#A78BFA" />
                  <span>Itemized Transactions & Category Overrides</span>
                </div>

                <div className="review-table-filters">
                  <div className="review-search-wrap">
                    <Search size={14} className="search-icon" />
                    <input
                      type="text"
                      className="review-search-input"
                      placeholder="Search merchant or narration..."
                      value={reviewSearch}
                      onChange={(e) => setReviewSearch(e.target.value)}
                    />
                  </div>

                  <div className="review-cat-chips">
                    <button
                      type="button"
                      className={`cat-chip ${reviewCatFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setReviewCatFilter('all')}
                    >
                      All
                    </button>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        className={`cat-chip ${reviewCatFilter === cat.value ? 'active' : ''}`}
                        onClick={() => setReviewCatFilter(cat.value)}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="review-table-container">
                <table className="review-txns-table">
                  <thead>
                    <tr>
                      <th style={{ width: '110px' }}>Date</th>
                      <th>Narration / Merchant</th>
                      <th style={{ width: '90px' }}>Type</th>
                      <th style={{ width: '130px', textAlign: 'right' }}>Amount</th>
                      <th style={{ width: '220px' }}>Category Override</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReviewTxns.map((t, originalIndex) => {
                      const actualIdx = reviewTransactions.indexOf(t);
                      return (
                        <tr key={`${t.date}-${t.narration}-${actualIdx}`}>
                          <td className="rt-date">{t.date}</td>
                          <td className="rt-desc">
                            <span className="rt-narration">{t.narration}</span>
                            {t.subcategory && (
                              <span className="rt-sub">{t.subcategory}</span>
                            )}
                          </td>
                          <td>
                            <span className={`rt-type-pill ${t.type === 'credit' ? 'credit' : 'debit'}`}>
                              {t.type === 'credit' ? 'CREDIT' : 'DEBIT'}
                            </span>
                          </td>
                          <td className={`rt-amount ${t.type === 'credit' ? 'in' : 'out'}`}>
                            {t.type === 'credit' ? '+' : '-'}{currency(t.amount)}
                          </td>
                          <td>
                            <select
                              className="rt-cat-select"
                              value={t.category || 'money_spent'}
                              onChange={(e) => handleCategoryChange(actualIdx, e.target.value)}
                            >
                              {CATEGORY_OPTIONS.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-modal-footer review-sheet-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowReviewModal(false)}
              >
                Discard / Cancel
              </button>
              <button
                type="button"
                className="primary-button commit-btn"
                onClick={handleCommitReview}
              >
                <Check size={16} />
                <span>Commit {reviewMonths.length} Month{reviewMonths.length > 1 ? 's' : ''} to Twin Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          "View Transactions" Slide-Out Drawer
          ───────────────────────────────────────────────────────────── */}
      {drawerMonth && (
        <div className="modal-backdrop drawer-backdrop" onClick={() => setDrawerMonth(null)}>
          <div
            className="transaction-drawer-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="drawer-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="month-badge">{formatMonthLabel(drawerMonth.month)}</span>
                  <span className="drawer-count-pill">
                    {drawerMonth.transactions?.length || 0} Transactions
                  </span>
                </div>
                <h3 className="drawer-title" style={{ marginTop: '6px' }}>
                  Itemized Monthly Ledger
                </h3>
              </div>
              <button
                type="button"
                className="glass-modal-close-btn"
                onClick={() => setDrawerMonth(null)}
                title="Close drawer (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Controls */}
            <div className="drawer-filter-bar">
              <div className="drawer-search-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  className="drawer-search-input"
                  placeholder="Filter transactions..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                />
              </div>

              <div className="drawer-chips-scroll">
                <button
                  type="button"
                  className={`cat-chip ${drawerCatFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setDrawerCatFilter('all')}
                >
                  All
                </button>
                {CATEGORY_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`cat-chip ${drawerCatFilter === c.value ? 'active' : ''}`}
                    onClick={() => setDrawerCatFilter(c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transactions List */}
            <div className="drawer-content-body">
              {filteredDrawerTxns.length === 0 ? (
                <div className="drawer-empty-state">
                  <Receipt size={32} color="var(--text-muted)" />
                  <h4>No Transactions Recorded</h4>
                  <p>
                    No itemized transaction records are attached to this month. Upload a bank statement to populate granular transaction items.
                  </p>
                </div>
              ) : (
                <div className="drawer-txns-list">
                  {filteredDrawerTxns.map((t, i) => {
                    const catInfo = CATEGORY_OPTIONS.find((c) => c.value === t.category);
                    return (
                      <div key={`${t.date}-${i}`} className="drawer-txn-item">
                        <div className="drawer-txn-left">
                          <div
                            className="cat-indicator"
                            style={{ backgroundColor: catInfo?.color || '#38BDF8' }}
                          />
                          <div>
                            <div className="drawer-txn-narration">{t.narration}</div>
                            <div className="drawer-txn-meta">
                              <span>{t.date}</span>
                              {t.subcategory && <span>• {t.subcategory}</span>}
                              {t.method && (
                                <span className="drawer-method-badge">{t.method}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={`drawer-txn-amount ${t.type === 'credit' ? 'in' : 'out'}`}>
                          {t.type === 'credit' ? '+' : '-'}{currency(t.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="drawer-footer">
              <div className="drawer-footer-stat">
                <span>Active Income</span>
                <strong>{currency(drawerMonth.activeIncome)}</strong>
              </div>
              <div className="drawer-footer-stat">
                <span>Total Spent</span>
                <strong>{currency(drawerMonth.moneySpent)}</strong>
              </div>
              <div className="drawer-footer-stat">
                <span>Surplus</span>
                <strong style={{ color: '#34D399' }}>
                  {currency(
                    toNumber(drawerMonth.activeIncome) +
                      toNumber(drawerMonth.passiveIncome) -
                      toNumber(drawerMonth.moneySpent) -
                      toNumber(drawerMonth.emiMonthly) -
                      toNumber(drawerMonth.miscellaneousCharges),
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          Floating Glass Modal for Add/Edit Record
          ───────────────────────────────────────────────────────────── */}
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
                  {editingId ? 'Update Monthly Record' : 'Manual Monthly Record'}
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
                  <div className="preview-stat-val text-income">{currency(formIncome)}</div>
                </div>
                <div>
                  <div className="preview-stat-label">Total Outflow</div>
                  <div className="preview-stat-val text-outflow">{currency(formOutflow)}</div>
                </div>
                <div>
                  <div className="preview-stat-label">Projected Surplus</div>
                  <div className={`preview-stat-val ${formSavings >= 0 ? 'text-income' : 'text-danger'}`}>
                    {currency(formSavings)}
                  </div>
                </div>
                <div>
                  <div className="preview-stat-label">Savings Rate</div>
                  <div className="preview-stat-val text-brand">{formSavingsRate}%</div>
                </div>
              </div>

              <form id="record-form" onSubmit={handleSaveMonth} className="modal-form-grid">
                <div className="form-group full-width">
                  <label className="input-label" htmlFor="month-picker">
                    Billing Cycle Month (YYYY-MM)
                  </label>
                  <div className="input-with-icon">
                    <Calendar size={16} className="input-icon" />
                    <input
                      id="month-picker"
                      type="month"
                      required
                      className="modal-input"
                      value={monthForm.month}
                      onChange={(e) => setMonthForm({ ...monthForm, month: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="input-label" htmlFor="active-income">
                    Active Income (₹)
                  </label>
                  <input
                    id="active-income"
                    type="number"
                    min="0"
                    placeholder="e.g. 95000"
                    className="modal-input"
                    value={monthForm.activeIncome}
                    onChange={(e) => setMonthForm({ ...monthForm, activeIncome: e.target.value })}
                  />
                  <span className="input-helper">Primary salary or consulting revenues</span>
                </div>

                <div className="form-group">
                  <label className="input-label" htmlFor="passive-income">
                    Passive Income (₹)
                  </label>
                  <input
                    id="passive-income"
                    type="number"
                    min="0"
                    placeholder="e.g. 12000"
                    className="modal-input"
                    value={monthForm.passiveIncome}
                    onChange={(e) => setMonthForm({ ...monthForm, passiveIncome: e.target.value })}
                  />
                  <span className="input-helper">Dividends, interest & rental yields</span>
                </div>

                <div className="form-group">
                  <label className="input-label" htmlFor="money-spent">
                    Living Expenses (₹)
                  </label>
                  <input
                    id="money-spent"
                    type="number"
                    min="0"
                    placeholder="e.g. 32000"
                    className="modal-input"
                    value={monthForm.moneySpent}
                    onChange={(e) => setMonthForm({ ...monthForm, moneySpent: e.target.value })}
                  />
                  <span className="input-helper">Rent, groceries, utilities & dining</span>
                </div>

                <div className="form-group">
                  <label className="input-label" htmlFor="emi-monthly">
                    Monthly EMI Payments (₹)
                  </label>
                  <input
                    id="emi-monthly"
                    type="number"
                    min="0"
                    placeholder="e.g. 28000"
                    className="modal-input"
                    value={monthForm.emiMonthly}
                    onChange={(e) => setMonthForm({ ...monthForm, emiMonthly: e.target.value })}
                  />
                  <span className="input-helper">Home loan, car loan & credit cards</span>
                </div>

                <div className="form-group">
                  <label className="input-label" htmlFor="misc-charges">
                    Miscellaneous Charges (₹)
                  </label>
                  <input
                    id="misc-charges"
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    className="modal-input"
                    value={monthForm.miscellaneousCharges}
                    onChange={(e) =>
                      setMonthForm({ ...monthForm, miscellaneousCharges: e.target.value })
                    }
                  />
                  <span className="input-helper">Bank fees, one-off penalties & repairs</span>
                </div>

                <div className="form-group">
                  <label className="input-label" htmlFor="loans-outstanding">
                    Total Loans Outstanding (₹)
                  </label>
                  <input
                    id="loans-outstanding"
                    type="number"
                    min="0"
                    placeholder="e.g. 1800000"
                    className="modal-input"
                    value={monthForm.loansOutstanding}
                    onChange={(e) =>
                      setMonthForm({ ...monthForm, loansOutstanding: e.target.value })
                    }
                  />
                  <span className="input-helper">Total remaining debt liability</span>
                </div>

                <div className="form-group full-width">
                  <label className="input-label" htmlFor="credit-score">
                    CIBIL / Credit Score (300 - 900)
                  </label>
                  <div className="credit-score-slider-wrap">
                    <input
                      id="credit-score"
                      type="range"
                      min="300"
                      max="900"
                      step="1"
                      className="modal-range"
                      value={monthForm.creditScore || 750}
                      onChange={(e) => setMonthForm({ ...monthForm, creditScore: e.target.value })}
                    />
                    <div className="credit-score-readout">
                      <span className="score-value">{monthForm.creditScore || 750}</span>
                      <span
                        className={`score-tier ${
                          (monthForm.creditScore || 750) >= 750
                            ? 'tier-prime'
                            : (monthForm.creditScore || 750) >= 650
                            ? 'tier-good'
                            : 'tier-fair'
                        }`}
                      >
                        {(monthForm.creditScore || 750) >= 750
                          ? 'Prime'
                          : (monthForm.creditScore || 750) >= 650
                          ? 'Good'
                          : 'Fair'}
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="glass-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button type="submit" form="record-form" className="primary-button">
                <Check size={16} />
                <span>{editingId ? 'Update Ledger' : 'Commit to Ledger'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          Main Ledger Table Container
          ───────────────────────────────────────────────────────────── */}
      <div className="ledger-table-card animate-in" style={{ '--delay': '180ms' }}>
        <div className="ledger-table-toolbar">
          <div className="search-box-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="ledger-search-input"
              placeholder="Filter by month (e.g. 2024-04)..."
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
                : 'Upload a bank statement PDF, a UPI CSV, or load demo records to begin.'}
            </p>
            {!filterQuery && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="primary-button" onClick={() => handleTrySample('hdfc')}>
                  <Sparkles size={14} />
                  <span>Try Sample HDFC PDF</span>
                </button>
                <button type="button" className="secondary-button" onClick={handleLoadDemo}>
                  <span>Load Demo History</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="ledger-table-container">
            <div className="table-scroll-hint mobile-only">
              <span>← Swipe horizontally to view all metrics & actions →</span>
            </div>
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
                  <th>Txns</th>
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
                  const txnCount = m.transactions?.length || 0;

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
                      <td>
                        <button
                          type="button"
                          className="view-txns-pill-btn"
                          onClick={() => {
                            setDrawerMonth(m);
                            setDrawerSearch('');
                            setDrawerCatFilter('all');
                          }}
                          title={txnCount > 0 ? 'View itemized transactions' : 'No transactions stored'}
                        >
                          <Receipt size={12} />
                          <span>{txnCount > 0 ? `${txnCount} txns` : '0 txns'}</span>
                        </button>
                      </td>
                      <td className="actions-col" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="edit-row-btn"
                            onClick={() => handleOpenEdit(m)}
                            title="Edit this record"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="delete-row-btn"
                            onClick={() => handleDeleteMonth(m.id, m.month)}
                            title="Delete month record"
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
