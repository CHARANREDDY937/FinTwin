from __future__ import annotations

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline

from training.agent_training_utils import classification_metrics, feature_frame, preprocessing_pipeline, save_artifact
from training.local_dataset_loader import build_canonical_training_frame


def _goal_label(row: pd.Series) -> str:
    if row["savings_to_income_ratio"] >= 0.2 and row["credit_score"] >= 720 and row["debt_to_income_ratio"] < 0.3:
        return "ready"
    if row["savings_to_income_ratio"] >= 0.1 and row["credit_score"] >= 650:
        return "near_ready"
    return "not_ready"


def train_goal_agent() -> dict:
    frame = build_canonical_training_frame()
    frame["target_goal_readiness"] = frame.apply(_goal_label, axis=1)
    features = feature_frame(frame)
    target = frame["target_goal_readiness"]
    model = Pipeline(
        steps=[
            ("prep", preprocessing_pipeline()),
            ("model", RandomForestClassifier(n_estimators=240, random_state=42)),
        ]
    )
    metrics = classification_metrics(model, features, target)
    model.fit(features, target)
    artifact_path = save_artifact(
        "goal_agent",
        {
            "model": model,
            "metrics": metrics,
            "labels": ["not_ready", "near_ready", "ready"],
            "description": "Classifies readiness for major goals such as home purchase, MBA, or vehicle financing.",
        },
    )
    return {"artifact_path": artifact_path, "metrics": metrics}


if __name__ == "__main__":
    print(train_goal_agent())
