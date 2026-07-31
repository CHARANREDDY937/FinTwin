from __future__ import annotations

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline

from training.agent_training_utils import classification_metrics, feature_frame, preprocessing_pipeline, save_artifact
from training.local_dataset_loader import build_canonical_training_frame


def _risk_label(row: pd.Series) -> str:
    if row["debt_to_income_ratio"] > 0.45 or row["credit_score"] < 580:
        return "high"
    if row["debt_to_income_ratio"] > 0.25 or row["credit_score"] < 680:
        return "medium"
    return "low"


def train_risk_agent() -> dict:
    frame = build_canonical_training_frame()
    frame["target_risk_level"] = frame.apply(_risk_label, axis=1)
    features = feature_frame(frame)
    target = frame["target_risk_level"]
    model = Pipeline(
        steps=[
            ("prep", preprocessing_pipeline()),
            ("model", RandomForestClassifier(n_estimators=240, random_state=42)),
        ]
    )
    metrics = classification_metrics(model, features, target)
    model.fit(features, target)
    artifact_path = save_artifact(
        "risk_agent",
        {
            "model": model,
            "metrics": metrics,
            "labels": ["low", "medium", "high"],
            "description": "Classifies financial risk from debt pressure, credit score, and savings strength.",
        },
    )
    return {"artifact_path": artifact_path, "metrics": metrics}


if __name__ == "__main__":
    print(train_risk_agent())
