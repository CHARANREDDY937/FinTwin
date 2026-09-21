const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  };
}

export async function askChat(question, months, horizon = 12, model = 'xgboost', scenario = 'baseline') {
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