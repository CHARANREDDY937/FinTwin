from __future__ import annotations

from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.pipeline import Pipeline

from training.agent_training_utils import feature_frame, preprocessing_pipeline, regression_metrics, save_artifact
from training.local_dataset_loader import build_canonical_training_frame


def train_investment_agent() -> dict:
    frame = build_canonical_training_frame()
    frame = frame.sample(n=min(len(frame), 18000), random_state=42)
    frame["target_investment_capacity"] = (
        frame["investable_surplus"].clip(lower=0) * 0.55
        + frame["savings_to_income_ratio"].clip(lower=0) * frame["monthly_income"] * 0.2
        + frame["investments"] * 0.35
    )
    features = feature_frame(frame)
    target = frame["target_investment_capacity"]
    model = Pipeline(
        steps=[
            ("prep", preprocessing_pipeline()),
            ("model", HistGradientBoostingRegressor(random_state=42, max_depth=8)),
        ]
    )
    metrics = regression_metrics(model, features, target)
    model.fit(features, target)
    artifact_path = save_artifact(
        "investment_agent",
        {
            "model": model,
            "metrics": metrics,
            "description": "Estimates investable monthly surplus from income, savings, and expense behavior.",
        },
    )
    return {"artifact_path": artifact_path, "metrics": metrics}


if __name__ == "__main__":
    print(train_investment_agent())
