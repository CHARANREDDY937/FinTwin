import { describe, it, expect } from 'vitest';
import {
  toBackendMonth,
  getLocalSampleStatement,
  localParseStatement,
  fetchSampleStatementAPI,
} from './api';

describe('API Ingestion & Data Transformation Utilities', () => {
  it('toBackendMonth converts camelCase to snake_case and preserves transactions', () => {
    const input = {
      month: '2024-06',
      activeIncome: 95000,
      passiveIncome: 5000,
      creditScore: 780,
      loansOutstanding: 1200000,
      emiMonthly: 25000,
      miscellaneousCharges: 1000,
      moneySpent: 30000,
      transactions: [{ date: '2024-06-01', amount: 450, narration: 'Swiggy' }],
    };

    const backend = toBackendMonth(input);
    expect(backend.month).toBe('2024-06');
    expect(backend.active_income).toBe(95000);
    expect(backend.money_spent).toBe(30000);
    expect(backend.transactions).toHaveLength(1);
    expect(backend.transactions[0].narration).toBe('Swiggy');
  });

  it('getLocalSampleStatement generates valid HDFC statement sample', () => {
    const hdfc = getLocalSampleStatement('hdfc');
    expect(hdfc.status).toBe('success');
    expect(hdfc.bank_detected).toContain('HDFC');
    expect(hdfc.transaction_count).toBeGreaterThan(15);
    expect(hdfc.monthly_aggregates.length).toBeGreaterThanOrEqual(2);

    const firstMonth = hdfc.monthly_aggregates[0];
    expect(firstMonth.active_income).toBeGreaterThan(0);
    expect(firstMonth.total_income).toBeGreaterThan(0);
    expect(firstMonth.transactions.length).toBeGreaterThan(0);
  });

  it('getLocalSampleStatement generates valid PhonePe UPI CSV sample', () => {
    const phonepe = getLocalSampleStatement('phonepe');
    expect(phonepe.status).toBe('success');
    expect(phonepe.bank_detected).toContain('PhonePe');
    expect(phonepe.transaction_count).toBe(10);
    expect(phonepe.monthly_aggregates).toHaveLength(1);
  });

  it('localParseStatement handles encrypted PDF without password', async () => {
    const mockPdf = { name: 'statement.pdf' };
    const res = await localParseStatement(mockPdf);
    expect(res.status).toBe('password_required');
    expect(res.hint).toBeDefined();
  });
});
