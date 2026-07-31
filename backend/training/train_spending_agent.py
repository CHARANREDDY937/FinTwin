from __future__ import annotations

from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.pipeline import Pipeline

from training.agent_training_utils import feature_frame, preprocessing_pipeline, regression_metrics, save_artifact
from training.local_dataset_loader import build_canonical_training_frame, build_transaction_reference


def train_spending_agent() -> dict:
    frame = build_canonical_training_frame()
    frame = frame.sample(n=min(len(frame), 18000), random_state=42)
    transactions = build_transaction_reference()
    category_weights = (
        transactions[transactions["transaction_type"] == "expense"]
        .groupby("category")["amount"]
        .mean()
        .sort_values(ascending=False)
        .head(5)
        .to_dict()
    )
    frame["target_spending_next_month"] = frame["monthly_expenses"] * (
        1.02 + frame["expense_to_income_ratio"].clip(lower=0.4, upper=1.6) * 0.04
    )
    features = feature_frame(frame)
    target = frame["target_spending_next_month"]
    model = Pipeline(
        steps=[
            ("prep", preprocessing_pipeline()),
            ("model", HistGradientBoostingRegressor(random_state=42, max_depth=8)),
        ]
    )
    metrics = regression_metrics(model, features, target)
    model.fit(features, target)
    artifact_path = save_artifact(
        "spending_agent",
        {
            "model": model,
            "metrics": metrics,
            "category_weights": category_weights,
            "description": "Predicts next-month total spending from structured monthly finance data.",
        },
    )
    return {"artifact_path": artifact_path, "metrics": metrics}


if __name__ == "__main__":
    print(train_spending_agent())
