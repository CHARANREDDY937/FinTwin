from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from config import settings


FEATURE_COLUMNS = [
    "monthly_income",
    "monthly_expenses",
    "monthly_emi",
    "loan_balance",
    "credit_score",
    "savings",
    "investments",
    "miscellaneous",
    "debt_to_income_ratio",
    "savings_to_income_ratio",
    "expense_to_income_ratio",
    "investable_surplus",
    "source",
]


def feature_frame(frame: pd.DataFrame) -> pd.DataFrame:
    return frame[FEATURE_COLUMNS].copy()


def preprocessing_pipeline() -> ColumnTransformer:
    numeric_columns = [column for column in FEATURE_COLUMNS if column != "source"]
    return ColumnTransformer(
        transformers=[
            (
                "numeric",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                numeric_columns,
            ),
            (
                "categorical",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                ["source"],
            ),
        ]
    )


def save_artifact(name: str, payload: dict) -> str:
    artifact_dir = Path(settings.agent_artifacts_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)
    target = artifact_dir / f"{name}.joblib"
    joblib.dump(payload, target)
    return str(target)


def load_artifact(name: str):
    target = Path(settings.agent_artifacts_dir) / f"{name}.joblib"
    if not target.exists():
        return None
    return joblib.load(target)


def regression_metrics(model, features, target) -> dict:
    train_x, test_x, train_y, test_y = train_test_split(features, target, test_size=0.2, random_state=42)
    model.fit(train_x, train_y)
    predictions = model.predict(test_x)
    return {
        "mae": float(mean_absolute_error(test_y, predictions)),
        "samples": int(len(features)),
    }


def classification_metrics(model, features, target) -> dict:
    train_x, test_x, train_y, test_y = train_test_split(
        features,
        target,
        test_size=0.2,
        random_state=42,
        stratify=target,
    )
    model.fit(train_x, train_y)
    predictions = model.predict(test_x)
    return {
        "accuracy": float(accuracy_score(test_y, predictions)),
        "samples": int(len(features)),
    }
