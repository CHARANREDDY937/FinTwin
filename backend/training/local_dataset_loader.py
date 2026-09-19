from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

from config import settings
from core.currency import USD_TO_INR_RATE


def _clean_columns(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    frame.columns = [
        re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", str(column).strip().lower())).strip("_")
        for column in frame.columns
    ]
    return frame


def _read_csv(path: Path) -> pd.DataFrame:
    return _clean_columns(pd.read_csv(path))


def load_monthly_spending_dataset() -> pd.DataFrame:
    frame = _read_csv(Path(settings.dataset_dir) / "monthly_spending_dataset_2020_2025.csv")
    rename_map = {
        "groceries_a": "groceries",
        "rent_a": "rent",
        "transportation_a": "transportation",
        "gym_a": "gym",
        "utilities_a": "utilities",
        "healthcare_a": "healthcare",
        "investments_a": "investments",
        "savings_a": "savings",
        "emi_loans_a": "emi_loans",
        "dining_entertainment_a": "dining_entertainment",
        "shopping_wants_a": "shopping_wants",
        "total_expenditure_a": "total_expenditure",
        "income_a": "income",
    }
    frame = frame.rename(columns=rename_map)
    return frame


def load_synthetic_personal_finance_dataset() -> pd.DataFrame:
    return _read_csv(Path(settings.dataset_dir) / "synthetic_personal_finance_dataset.csv")


def load_budget_optimizer_dataset() -> pd.DataFrame:
    return _read_csv(Path(settings.dataset_dir) / "data.csv")


def load_budgetwise_finance_dataset() -> pd.DataFrame:
    return _read_csv(Path(settings.dataset_dir) / "budgetwise_finance_dataset.csv")


def load_budgetwise_dirty_dataset() -> pd.DataFrame:
    frame = _read_csv(Path(settings.dataset_dir) / "budgetwise_synthetic_dirty.csv")
    frame["amount"] = (
        frame["amount"]
        .astype(str)
        .str.replace("$", "", regex=False)
        .str.replace(",", "", regex=False)
        .str.strip()
    )
    frame["amount"] = pd.to_numeric(frame["amount"], errors="coerce")
    return frame


def build_canonical_training_frame() -> pd.DataFrame:
    monthly = load_monthly_spending_dataset()
    monthly_frame = pd.DataFrame(
        {
            "monthly_income": pd.to_numeric(monthly.get("income", 0), errors="coerce"),
            "monthly_expenses": pd.to_numeric(monthly.get("total_expenditure", 0), errors="coerce"),
            "monthly_emi": pd.to_numeric(monthly.get("emi_loans", 0), errors="coerce").fillna(0),
            "loan_balance": pd.to_numeric(monthly.get("emi_loans", 0), errors="coerce").fillna(0) * 18,
            "credit_score": 680,
            "savings": pd.to_numeric(monthly.get("savings", 0), errors="coerce").fillna(0),
            "investments": pd.to_numeric(monthly.get("investments", 0), errors="coerce").fillna(0),
            "miscellaneous": (
                pd.to_numeric(monthly.get("dining_entertainment", 0), errors="coerce").fillna(0)
                + pd.to_numeric(monthly.get("shopping_wants", 0), errors="coerce").fillna(0)
                + pd.to_numeric(monthly.get("gym", 0), errors="coerce").fillna(0)
            ),
            "source": "monthly_spending_dataset",
        }
    )

    synthetic = load_synthetic_personal_finance_dataset()
    synthetic_frame = pd.DataFrame(
        {
            "monthly_income": pd.to_numeric(synthetic.get("monthly_income_usd", 0), errors="coerce") * USD_TO_INR_RATE,
            "monthly_expenses": pd.to_numeric(synthetic.get("monthly_expenses_usd", 0), errors="coerce") * USD_TO_INR_RATE,
            "monthly_emi": pd.to_numeric(synthetic.get("monthly_emi_usd", 0), errors="coerce").fillna(0) * USD_TO_INR_RATE,
            "loan_balance": pd.to_numeric(synthetic.get("loan_amount_usd", 0), errors="coerce").fillna(0) * USD_TO_INR_RATE,
            "credit_score": pd.to_numeric(synthetic.get("credit_score", 680), errors="coerce").fillna(680),
            "savings": pd.to_numeric(synthetic.get("savings_usd", 0), errors="coerce").fillna(0) * USD_TO_INR_RATE,
            "investments": pd.to_numeric(synthetic.get("savings_usd", 0), errors="coerce").fillna(0) * USD_TO_INR_RATE * 0.18,
            "miscellaneous": pd.to_numeric(synthetic.get("monthly_expenses_usd", 0), errors="coerce").fillna(0) * USD_TO_INR_RATE * 0.1,
            "source": "synthetic_personal_finance_dataset",
        }
    )

    optimizer = load_budget_optimizer_dataset()
    expense_columns = [
        "rent",
        "loan_repayment",
        "insurance",
        "groceries",
        "transport",
        "eating_out",
        "entertainment",
        "utilities",
        "healthcare",
        "education",
        "miscellaneous",
    ]
    optimizer_frame = pd.DataFrame(
        {
            "monthly_income": pd.to_numeric(optimizer.get("income", 0), errors="coerce"),
            "monthly_expenses": optimizer[expense_columns].apply(pd.to_numeric, errors="coerce").fillna(0).sum(axis=1),
            "monthly_emi": pd.to_numeric(optimizer.get("loan_repayment", 0), errors="coerce").fillna(0),
            "loan_balance": pd.to_numeric(optimizer.get("loan_repayment", 0), errors="coerce").fillna(0) * 20,
            "credit_score": 670,
            "savings": pd.to_numeric(optimizer.get("desired_savings", 0), errors="coerce").fillna(0),
            "investments": pd.to_numeric(optimizer.get("desired_savings", 0), errors="coerce").fillna(0) * 0.2,
            "miscellaneous": pd.to_numeric(optimizer.get("miscellaneous", 0), errors="coerce").fillna(0),
            "source": "budget_optimizer_dataset",
        }
    )

    combined = pd.concat([monthly_frame, synthetic_frame, optimizer_frame], ignore_index=True)
    combined = combined.fillna(0)
    combined["debt_to_income_ratio"] = combined["monthly_emi"] / combined["monthly_income"].clip(lower=1)
    combined["savings_to_income_ratio"] = combined["savings"] / combined["monthly_income"].clip(lower=1)
    combined["expense_to_income_ratio"] = combined["monthly_expenses"] / combined["monthly_income"].clip(lower=1)
    combined["investable_surplus"] = (combined["monthly_income"] - combined["monthly_expenses"]).clip(lower=0)
    return combined


def build_transaction_reference() -> pd.DataFrame:
    clean = load_budgetwise_finance_dataset()
    dirty = load_budgetwise_dirty_dataset()
    frame = pd.concat([clean, dirty], ignore_index=True)
    frame["amount"] = pd.to_numeric(frame["amount"], errors="coerce").fillna(0)
    frame["transaction_type"] = frame["transaction_type"].astype(str).str.lower()
    frame["category"] = frame["category"].astype(str).str.lower()
    return frame
