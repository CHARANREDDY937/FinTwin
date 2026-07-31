from __future__ import annotations

import pandas as pd

from training.agent_training_utils import load_artifact


def build_runtime_features(profile: dict) -> pd.DataFrame:
    monthly_income = profile.get("monthly_income", 0)
    monthly_expenses = profile.get("monthly_outflow", 0)
    savings = max(profile.get("monthly_surplus", 0), 0)
    frame = pd.DataFrame(
        [
            {
                "monthly_income": monthly_income,
                "monthly_expenses": monthly_expenses,
                "monthly_emi": monthly_income * profile.get("debt_service_ratio", 0),
                "loan_balance": profile.get("loan_balance", 0),
                "credit_score": profile.get("credit_score", 680),
                "savings": savings,
                "investments": savings * 0.25,
                "miscellaneous": profile.get("average_misc", 0),
                "debt_to_income_ratio": profile.get("debt_service_ratio", 0),
                "savings_to_income_ratio": profile.get("savings_rate", 0),
                "expense_to_income_ratio": monthly_expenses / max(monthly_income, 1),
                "investable_surplus": max(monthly_income - monthly_expenses, 0),
                "source": "runtime_user_profile",
            }
        ]
    )
    return frame


def predict_with_artifact(name: str, profile: dict):
    artifact = load_artifact(name)
    if artifact is None:
        return None, None
    features = build_runtime_features(profile)
    model = artifact["model"]
    prediction = model.predict(features)[0]
    return prediction, artifact
