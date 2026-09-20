// Shared formatting helpers — single source of truth for the frontend.

export const STORAGE_KEYS = {
  user: 'fintwinai:user',
  months: 'fintwinai:months',
  chat: 'fintwinai:chat',
  theme: 'fintwinai:theme',
  token: 'fintwinai:token',
};

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function currency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatMonthLabel(monthValue) {
  if (!monthValue) return 'Unknown';
  const [year, month] = monthValue.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
}

export function formatMonthLong(monthValue) {
  if (!monthValue) return 'No data yet';
  const [year, month] = monthValue.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
}

export function ensureRupees(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\$\s*(\d[\d,]*(?:\.\d+)?)/g, '₹$1')
    .replace(/\bUSD\s*(\d[\d,]*(?:\.\d+)?)/gi, '₹$1')
    .replace(/(\d[\d,]*(?:\.\d+)?)\s*USD\b/gi, '₹$1')
    .replace(/(\d[\d,]*(?:\.\d+)?)\s*(?:dollars?|bucks?)\b/gi, '₹$1')
    .replace(/\$/g, '₹')
    .replace(/₹\s*₹+/g, '₹');
}

export function average(values) {
  if (!values || !values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function latestByMonth(months) {
  return [...months].sort((a, b) => (a.month > b.month ? -1 : 1))[0] || null;
}

export function sortByMonthAsc(months) {
  return [...months].sort((a, b) => (a.month < b.month ? -1 : 1));
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage may be unavailable (private mode, quota) — never crash the app.
  }
}

export function loadStoredValue(key, fallback) {
  return readJson(key, fallback);
}

export function storeValue(key, value) {
  writeJson(key, value);
}