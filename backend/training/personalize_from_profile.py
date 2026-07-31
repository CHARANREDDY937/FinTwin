from __future__ import annotations

import json
from pathlib import Path

from schemas import FinancialMonth
from training.data_builder import build_personalization_examples


def export_personalization_data(months: list[FinancialMonth], output_path: str) -> str:
    dataset = build_personalization_examples(months)
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in dataset:
            handle.write(json.dumps(row) + "\n")
    return str(path)
