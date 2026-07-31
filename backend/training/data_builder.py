from __future__ import annotations

from typing import Iterable

from datasets import Dataset, concatenate_datasets, load_dataset

from schemas import FinancialMonth
from training.dataset_registry import FINGPT_DATASETS


def _normalize_text(text: str) -> str:
    return " ".join(str(text).split())


def build_personalization_examples(months: list[FinancialMonth]) -> Dataset:
    if not months:
        return Dataset.from_list([])

    latest = sorted(months, key=lambda item: item.month)[-1]
    monthly_income = latest.active_income + latest.passive_income
    monthly_outflow = latest.money_spent + latest.emi_monthly + latest.miscellaneous_charges
    monthly_surplus = monthly_income - monthly_outflow

    rows = [
        {
            "prompt": (
                "User profile: "
                f"active income {latest.active_income}, passive income {latest.passive_income}, "
                f"credit score {latest.credit_score}, loans {latest.loans_outstanding}, "
                f"emi {latest.emi_monthly}, misc {latest.miscellaneous_charges}, spent {latest.money_spent}. "
                "Question: Summarize this user's monthly financial position."
            ),
            "response": (
                f"The user earns {monthly_income:.2f} per month, spends {monthly_outflow:.2f}, "
                f"and has a surplus of {monthly_surplus:.2f}. The credit score is {latest.credit_score:.0f} "
                f"with outstanding loans of {latest.loans_outstanding:.2f}."
            ),
        },
        {
            "prompt": (
                "User profile: "
                f"income {monthly_income}, emi {latest.emi_monthly}, spending {latest.money_spent}, "
                f"misc charges {latest.miscellaneous_charges}. "
                "Question: What is the most important near-term financial recommendation?"
            ),
            "response": (
                "The first recommendation is to protect monthly surplus after EMI and essentials, "
                "then reduce discretionary spending or recurring charges if cash flow is tight."
            ),
        },
    ]
    return Dataset.from_list(rows)


def build_training_dataset(months: list[FinancialMonth], max_samples: int = 2000) -> Dataset:
    qa = _prepare_fiqa(max_samples // 2)
    table_qa = _prepare_convfinqa(max_samples // 4)
    sentiment = _prepare_sentiment(max_samples // 4)
    personalized = build_personalization_examples(months)

    parts = [dataset for dataset in [qa, table_qa, sentiment, personalized] if len(dataset) > 0]
    merged = concatenate_datasets(parts) if parts else Dataset.from_list([])
    return merged.shuffle(seed=42)


def _prepare_fiqa(limit: int) -> Dataset:
    dataset = load_dataset(FINGPT_DATASETS["qa"], split="train")

    def mapper(row: dict) -> dict:
        return {
            "prompt": _normalize_text(row.get("input", "")),
            "response": _normalize_text(row.get("output", "")),
        }

    return _truncate(dataset.map(mapper, remove_columns=dataset.column_names), limit)


def _prepare_convfinqa(limit: int) -> Dataset:
    dataset = load_dataset(FINGPT_DATASETS["table_qa"], split="train")

    def mapper(row: dict) -> dict:
        table = _normalize_text(row.get("table", ""))
        question = _normalize_text(row.get("question", row.get("input", "")))
        answer = _normalize_text(row.get("answer", row.get("output", "")))
        prompt = f"Financial table context: {table}\nQuestion: {question}"
        return {"prompt": prompt, "response": answer}

    return _truncate(dataset.map(mapper, remove_columns=dataset.column_names), limit)


def _prepare_sentiment(limit: int) -> Dataset:
    dataset = load_dataset(FINGPT_DATASETS["sentiment"], split="train")

    def mapper(row: dict) -> dict:
        instruction = _normalize_text(row.get("instruction", ""))
        text = _normalize_text(row.get("input", ""))
        label = _normalize_text(row.get("output", ""))
        prompt = f"{instruction}\nText: {text}"
        return {"prompt": prompt, "response": label}

    return _truncate(dataset.map(mapper, remove_columns=dataset.column_names), limit)


def _truncate(dataset: Dataset, limit: int) -> Dataset:
    if len(dataset) <= limit:
        return dataset
    return dataset.select(range(limit))
