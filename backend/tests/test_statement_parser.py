import pytest
from services.bank_statement_parser import (
    bank_statement_parser,
    sanitize_pii,
    clean_amount,
    parse_indian_date,
)
from services.categorizer import (
    categorizer,
    CAT_ACTIVE_INCOME,
    CAT_PASSIVE_INCOME,
    CAT_MONEY_SPENT,
    CAT_EMI,
    CAT_MISC,
    CAT_INVESTMENT,
)


def test_clean_amount_and_date_parsing():
    assert clean_amount("₹ 1,24,500.00") == 124500.0
    assert clean_amount("500.50 Cr") == 500.50
    assert clean_amount("1,000.00 DR") == 1000.00
    assert clean_amount("-") == 0.0

    dt = parse_indian_date("15/05/2024")
    assert dt is not None
    assert dt.strftime("%Y-%m-%d") == "2024-05-15"

    dt2 = parse_indian_date("01-Jan-2024")
    assert dt2 is not None
    assert dt2.strftime("%Y-%m-%d") == "2024-01-01"


def test_sanitize_pii():
    raw_narration = "UPI/9876543210@paytm/Payment from 123456789012 PAN ABCDE1234F"
    cleaned = sanitize_pii(raw_narration)
    assert "9876543210" not in cleaned
    assert "123456789012" not in cleaned
    assert "ABCDE1234F" not in cleaned
    assert "[PHONE_MASKED]" in cleaned or "[UPI_MASKED]" in cleaned
    assert "[ACCT_MASKED]" in cleaned
    assert "[PAN_MASKED]" in cleaned


def test_balance_continuity_verification_perfect():
    txns = [
        {"date": "2024-05-01", "narration": "Salary", "type": "credit", "amount": 100000.0, "balance": 100000.0},
        {"date": "2024-05-02", "narration": "Rent", "type": "debit", "amount": 25000.0, "balance": 75000.0},
        {"date": "2024-05-05", "narration": "Groceries", "type": "debit", "amount": 5000.0, "balance": 70000.0},
        {"date": "2024-05-10", "narration": "Dividends", "type": "credit", "amount": 2000.0, "balance": 72000.0},
    ]
    res = bank_statement_parser.verify_balance_continuity(txns)
    assert res["balance_verified"] is True
    assert res["matched_transitions"] == 3
    assert len(res["anomalies"]) == 0


def test_balance_continuity_verification_with_anomaly():
    txns = [
        {"date": "2024-05-01", "narration": "Salary", "type": "credit", "amount": 100000.0, "balance": 100000.0},
        {"date": "2024-05-02", "narration": "Rent", "type": "debit", "amount": 25000.0, "balance": 75000.0},
        # Missing transaction between 75000 and 50000
        {"date": "2024-05-05", "narration": "Groceries", "type": "debit", "amount": 5000.0, "balance": 50000.0},
    ]
    res = bank_statement_parser.verify_balance_continuity(txns)
    assert len(res["anomalies"]) > 0
    assert res["anomalies"][0]["actual_balance"] == 50000.0
    assert res["anomalies"][0]["expected_balance"] == 70000.0


def test_sample_hdfc_statement_ingest():
    sample = bank_statement_parser.get_sample_hdfc_statement()
    assert sample["status"] == "success"
    assert sample["transaction_count"] > 10
    assert "verification" in sample
    assert sample["verification"]["balance_verified"] is True
    assert len(sample["monthly_aggregates"]) == 2


def test_sample_phonepe_csv_ingest():
    sample = bank_statement_parser.get_sample_phonepe_csv()
    assert sample["status"] == "success"
    assert sample["transaction_count"] == 10
    assert len(sample["monthly_aggregates"]) == 1


def test_categorizer_deterministic_rules():
    res_sal = categorizer.categorize_single_deterministic("ACH/INFOSYS LTD/SALARY", "credit", 100000)
    assert res_sal is not None
    assert res_sal["category"] == CAT_ACTIVE_INCOME

    res_emi = categorizer.categorize_single_deterministic("NACH/HDFC HOME LOAN/EMI-1234", "debit", 30000)
    assert res_emi is not None
    assert res_emi["category"] == CAT_EMI

    res_inv = categorizer.categorize_single_deterministic("ACH/ZERODHA BROKING/KITE-SIP", "debit", 15000)
    assert res_inv is not None
    assert res_inv["category"] == CAT_INVESTMENT

    res_ins = categorizer.categorize_single_deterministic("STAR HEALTH INSURANCE PREMIUM", "debit", 12000)
    assert res_ins is not None
    assert res_ins["category"] == CAT_MONEY_SPENT


def test_categorizer_adaptive_feedback():
    pattern = "CUSTOM_MYSTERY_CAFE_BANGALORE"
    feedback = categorizer.record_user_feedback(pattern, CAT_MONEY_SPENT, "Dining Out")
    assert feedback["status"] == "success"

    # Now testing transaction containing pattern
    res = categorizer.categorize_single_deterministic(f"UPI/POS/{pattern}/1234", "debit", 450)
    assert res is not None
    assert res["category"] == CAT_MONEY_SPENT
    assert res["subcategory"] == "Dining Out"
    assert res["method"] == "adaptive_user_rule"
