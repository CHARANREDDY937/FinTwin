<<<<<<< HEAD
// API client for the FinTwinAI backend.
// Network helpers only — the deterministic "local twin" simulation engines
// live in src/lib/twinEngine.js (with SCENARIO_PRESETS/MODEL_OPTIONS etc).
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const TOKEN_KEY = 'fintwinai:token';
const DEFAULT_TIMEOUT = 8000;

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Centralized fetch wrapper: JSON body, AbortController timeout, error
 * normalization, optional Bearer token. Rejects with a descriptive Error.
 */
async function request(path, { method = 'GET', body, timeout = DEFAULT_TIMEOUT, auth = true } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || `Request failed with status ${response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Convert camelCase month objects to snake_case FinancialMonth schema.
=======
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

>>>>>>> be8097af00555534dec710f1a0883e9efc38d2f6
export function toBackendMonth(month) {
  return {
    month: month.month,
    active_income: Number(month.activeIncome) || 0,
    passive_income: Number(month.passiveIncome) || 0,
    credit_score: Number(month.creditScore) || 0,
    loans_outstanding: Number(month.loansOutstanding) || 0,
    emi_monthly: Number(month.emiMonthly) || 0,
    miscellaneous_charges: Number(month.miscellaneousCharges) || 0,
    money_spent: Number(month.moneySpent) || 0,
<<<<<<< HEAD
    transactions: month.transactions || [],
=======
>>>>>>> be8097af00555534dec710f1a0883e9efc38d2f6
  };
}

export async function askChat(question, months, horizon = 12, model = 'xgboost', scenario = 'baseline') {
<<<<<<< HEAD
  return request('/chat', {
    method: 'POST',
    body: { question, months: months.map(toBackendMonth), horizon, model, scenario },
  });
}

export async function simulateScenarioAPI(months, scenario = 'baseline', model = 'xgboost', horizon = 12) {
  return request('/forecast/scenario', {
    method: 'POST',
    body: { months: months.map(toBackendMonth), scenario, model, horizon },
  });
}

export async function registerUser(email, name, password) {
  return request('/auth/register', {
    method: 'POST',
    auth: false,
    body: { email, name, password },
  });
}

export async function loginUser(email, password) {
  return request('/auth/login-json', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
=======
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      months: months.map(toBackendMonth),
      horizon,
      model,
      scenario,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat API failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchTwinProfile(months) {
  const response = await fetch(`${API_BASE}/twin/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(months.map(toBackendMonth)),
  });

  if (!response.ok) {
    throw new Error(`Twin profile API failed with status ${response.status}`);
  }

  return response.json();
}

export async function simulateScenarioAPI(months, scenario = 'baseline', model = 'xgboost', horizon = 12) {
  const response = await fetch(`${API_BASE}/forecast/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      months: months.map(toBackendMonth),
      scenario,
      model,
      horizon,
    }),
  });

  if (!response.ok) {
    throw new Error(`Scenario simulation failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchDatasetsSummary() {
  const response = await fetch(`${API_BASE}/datasets/summary`);
  if (!response.ok) {
    throw new Error(`Datasets summary failed with status ${response.status}`);
  }
  return response.json();
>>>>>>> be8097af00555534dec710f1a0883e9efc38d2f6
}

export async function healthCheck() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return { status: 'error' };
    return response.json();
  } catch {
    return { status: 'offline' };
  }
}

<<<<<<< HEAD
/* ─────────────────────────────────────────────────────────────
   Statement & UPI Ingestion APIs
   ───────────────────────────────────────────────────────────── */

export async function ingestStatementAPI(file, password = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (password) {
    formData.append('password', password);
  }

  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}/financial/ingest`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (netErr) {
    throw new Error(
      `Backend engine is offline (${API_BASE}). Please start the FastAPI backend server (uvicorn app:app --reload --port 8000 in the backend folder) to parse bank statements.`
    );
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Statement ingestion failed with status ${response.status}`);
  }

  return await response.json();
}

export async function fetchSampleStatementAPI(type) {
  try {
    const data = await request(`/financial/sample-statements/${type}`, { auth: false });
    return data;
  } catch (err) {
    console.warn('Backend sample statement unreachable, using local fixture:', err);
    return getLocalSampleStatement(type);
  }
}

export function getLocalSampleStatement(type = 'hdfc') {
  if (type === 'phonepe' || type === 'upi' || type === 'csv') {
    const txns = [
      { date: '2024-06-01', month: '2024-06', narration: 'Payment to Swiggy via PhonePe UPI', type: 'debit', amount: 420, category: 'money_spent', subcategory: 'Food & Dining', confidence: 0.95 },
      { date: '2024-06-03', month: '2024-06', narration: 'Payment to Blinkit Quick Mart', type: 'debit', amount: 890, category: 'money_spent', subcategory: 'Groceries & Essentials', confidence: 0.95 },
      { date: '2024-06-05', month: '2024-06', narration: 'Payment to Uber India Rides', type: 'debit', amount: 310, category: 'money_spent', subcategory: 'Transport & Travel', confidence: 0.95 },
      { date: '2024-06-07', month: '2024-06', narration: 'Monthly Rent Transfer to Landlord Sharma', type: 'debit', amount: 22000, category: 'money_spent', subcategory: 'Rent & Living', confidence: 0.95 },
      { date: '2024-06-10', month: '2024-06', narration: 'Payment to Groww Investment UPI', type: 'debit', amount: 10000, category: 'investment', subcategory: 'Investments & Mutual Funds', confidence: 0.95 },
      { date: '2024-06-12', month: '2024-06', narration: 'Payment to BESCOM Electricity billdesk', type: 'debit', amount: 1850, category: 'money_spent', subcategory: 'Utilities & Bills', confidence: 0.95 },
      { date: '2024-06-15', month: '2024-06', narration: 'Payment to D-Mart Hypermarket Grocery', type: 'debit', amount: 5400, category: 'money_spent', subcategory: 'Groceries & Essentials', confidence: 0.95 },
      { date: '2024-06-18', month: '2024-06', narration: 'Money received from Client Consulting Stipend', type: 'credit', amount: 45000, category: 'active_income', subcategory: 'Salary / Professional Income', confidence: 0.95 },
      { date: '2024-06-22', month: '2024-06', narration: 'Payment to Netflix India Subscription', type: 'debit', amount: 649, category: 'money_spent', subcategory: 'Entertainment & Subscriptions', confidence: 0.95 },
      { date: '2024-06-25', month: '2024-06', narration: 'Payment to Bharat Petroleum Petrol Fuel', type: 'debit', amount: 2200, category: 'money_spent', subcategory: 'Transport & Travel', confidence: 0.95 },
    ];

    return {
      status: 'success',
      bank_detected: 'PhonePe UPI (Sample CSV)',
      filename: 'sample_phonepe_upi_export.csv',
      transaction_count: txns.length,
      transactions: txns,
      monthly_aggregates: [
        {
          month: '2024-06',
          active_income: 45000,
          passive_income: 0,
          money_spent: 33719,
          emi_monthly: 0,
          miscellaneous_charges: 0,
          investment: 10000,
          total_income: 45000,
          total_outflow: 33719,
          net_savings: 11281,
          transaction_count: 10,
          transactions: txns,
        },
      ],
    };
  }

  // Default: HDFC Multi-month statement
  const hdfcTxns = [
    { date: '2024-05-01', month: '2024-05', narration: 'ACH/INFOSYS LTD/SALARY/MAY2024', type: 'credit', amount: 105000, balance: 145000, category: 'active_income', subcategory: 'Salary / Professional Income', confidence: 0.98 },
    { date: '2024-05-02', month: '2024-05', narration: 'NACH/HDFC HOME LOAN/EMI-4091823', type: 'debit', amount: 28500, balance: 116500, category: 'emi_monthly', subcategory: 'Loan EMI / Credit Payment', confidence: 0.95 },
    { date: '2024-05-03', month: '2024-05', narration: 'UPI/SWIGGY/4058291039/FOOD', type: 'debit', amount: 540, balance: 115960, category: 'money_spent', subcategory: 'Food & Dining', confidence: 0.95 },
    { date: '2024-05-05', month: '2024-05', narration: 'UPI/ZEPTO/382910382/GROCERY', type: 'debit', amount: 1250, balance: 114710, category: 'money_spent', subcategory: 'Groceries & Essentials', confidence: 0.95 },
    { date: '2024-05-08', month: '2024-05', narration: 'UPI/UBER INDIA/RIDE-TRIP-92', type: 'debit', amount: 380, balance: 114330, category: 'money_spent', subcategory: 'Transport & Travel', confidence: 0.95 },
    { date: '2024-05-10', month: '2024-05', narration: 'ACH/ZERODHA BROKING/KITE-SIP', type: 'debit', amount: 15000, balance: 99330, category: 'investment', subcategory: 'Investments & Mutual Funds', confidence: 0.95 },
    { date: '2024-05-12', month: '2024-05', narration: 'UPI/BESCOM ELECTRICITY BILL/BANGALORE', type: 'debit', amount: 2400, balance: 96930, category: 'money_spent', subcategory: 'Utilities & Bills', confidence: 0.95 },
    { date: '2024-05-15', month: '2024-05', narration: 'UPI/AMAZON SELLER SERVICES/SHOPPING', type: 'debit', amount: 4200, balance: 92730, category: 'money_spent', subcategory: 'Shopping & E-Commerce', confidence: 0.93 },
    { date: '2024-05-18', month: '2024-05', narration: 'UPI/ZOMATO RESTAURANT/DINING', type: 'debit', amount: 1450, balance: 91280, category: 'money_spent', subcategory: 'Food & Dining', confidence: 0.95 },
    { date: '2024-05-20', month: '2024-05', narration: 'DIVIDEND CREDIT/TCS LIMITED/DIV2024', type: 'credit', amount: 3500, balance: 94780, category: 'passive_income', subcategory: 'Dividends & Interest', confidence: 0.95 },
    { date: '2024-05-25', month: '2024-05', narration: 'DEBIT CARD ANNUAL MAINTENANCE CHARGES + GST', type: 'debit', amount: 590, balance: 94190, category: 'miscellaneous_charges', subcategory: 'Bank Charges & Penalties', confidence: 0.94 },
    { date: '2024-05-28', month: '2024-05', narration: 'UPI/APOLLO PHARMACY/HEALTH', type: 'debit', amount: 890, balance: 93300, category: 'money_spent', subcategory: 'Groceries & Essentials', confidence: 0.95 },

    { date: '2024-06-01', month: '2024-06', narration: 'ACH/INFOSYS LTD/SALARY/JUNE2024', type: 'credit', amount: 105000, balance: 198300, category: 'active_income', subcategory: 'Salary / Professional Income', confidence: 0.98 },
    { date: '2024-06-02', month: '2024-06', narration: 'NACH/HDFC HOME LOAN/EMI-4091823', type: 'debit', amount: 28500, balance: 169800, category: 'emi_monthly', subcategory: 'Loan EMI / Credit Payment', confidence: 0.95 },
    { date: '2024-06-04', month: '2024-06', narration: 'UPI/BLINKIT/QUICK COMMERCE', type: 'debit', amount: 1100, balance: 168700, category: 'money_spent', subcategory: 'Groceries & Essentials', confidence: 0.95 },
    { date: '2024-06-06', month: '2024-06', narration: 'UPI/AIRTEL BROADBAND/FIBER BILL', type: 'debit', amount: 1179, balance: 167521, category: 'money_spent', subcategory: 'Utilities & Bills', confidence: 0.95 },
    { date: '2024-06-09', month: '2024-06', narration: 'ACH/ZERODHA BROKING/KITE-SIP', type: 'debit', amount: 15000, balance: 152521, category: 'investment', subcategory: 'Investments & Mutual Funds', confidence: 0.95 },
    { date: '2024-06-11', month: '2024-06', narration: 'UPI/DECATHLON SPORTS/FITNESS', type: 'debit', amount: 3400, balance: 149121, category: 'money_spent', subcategory: 'Shopping & E-Commerce', confidence: 0.93 },
    { date: '2024-06-14', month: '2024-06', narration: 'UPI/SWIGGY/492018301/DINNER', type: 'debit', amount: 720, balance: 148401, category: 'money_spent', subcategory: 'Food & Dining', confidence: 0.95 },
    { date: '2024-06-16', month: '2024-06', narration: 'UPI/HPCL PETROL BUNK/FUEL', type: 'debit', amount: 2800, balance: 145601, category: 'money_spent', subcategory: 'Transport & Travel', confidence: 0.95 },
    { date: '2024-06-20', month: '2024-06', narration: 'FD INTEREST CREDITED/HDFC BANK FD-8921', type: 'credit', amount: 4200, balance: 149801, category: 'passive_income', subcategory: 'Dividends & Interest', confidence: 0.95 },
    { date: '2024-06-24', month: '2024-06', narration: 'SMS CHARGES QUARTERLY + GST', type: 'debit', amount: 23.6, balance: 149777.4, category: 'miscellaneous_charges', subcategory: 'Bank Charges & Penalties', confidence: 0.94 },
    { date: '2024-06-27', month: '2024-06', narration: 'UPI/ZOMATO RESTAURANT/FOOD', type: 'debit', amount: 650, balance: 149127.4, category: 'money_spent', subcategory: 'Food & Dining', confidence: 0.95 },
  ];

  return {
    status: 'success',
    bank_detected: 'HDFC Bank (Sample E-Statement)',
    filename: 'sample_hdfc_bank_statement.pdf',
    transaction_count: hdfcTxns.length,
    transactions: hdfcTxns,
    monthly_aggregates: [
      {
        month: '2024-06',
        active_income: 105000,
        passive_income: 4200,
        money_spent: 9849,
        emi_monthly: 28500,
        miscellaneous_charges: 23.6,
        investment: 15000,
        total_income: 109200,
        total_outflow: 38372.6,
        net_savings: 70827.4,
        transaction_count: 11,
        transactions: hdfcTxns.filter((t) => t.month === '2024-06'),
      },
      {
        month: '2024-05',
        active_income: 105000,
        passive_income: 3500,
        money_spent: 11110,
        emi_monthly: 28500,
        miscellaneous_charges: 590,
        investment: 15000,
        total_income: 108500,
        total_outflow: 40200,
        net_savings: 68300,
        transaction_count: 12,
        transactions: hdfcTxns.filter((t) => t.month === '2024-05'),
      },
    ],
  };
}

export async function localParseStatement(file, password = null) {
  const isPdf = file?.name?.toLowerCase().endsWith('.pdf');
  if (isPdf && !password) {
    return {
      status: 'password_required',
      bank_detected: 'Encrypted Indian Bank Statement',
      hint: 'HDFC / SBI / ICICI password format (e.g. DOB DDMMYYYY or Customer ID).',
    };
  }
  return isPdf ? getLocalSampleStatement('hdfc') : getLocalSampleStatement('phonepe');
}

// Local-exports remain available for imports that haven't migrated yet.
export { SCENARIO_PRESETS, MODEL_OPTIONS, simulateLocalScenario, evaluateLocalAgents, demoMonths } from './lib/twinEngine';
=======
export async function registerUser(email, name, password) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Register failed with status ${response.status}`);
  }
  return data;
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/auth/login-json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Login failed with status ${response.status}`);
  }
  return data;
}
>>>>>>> be8097af00555534dec710f1a0883e9efc38d2f6
