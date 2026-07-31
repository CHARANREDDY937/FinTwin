FINGPT_DATASETS = {
    "qa": "FinGPT/fingpt-fiqa_qa",
    "table_qa": "FinGPT/fingpt-convfinqa",
    "sentiment": "FinGPT/fingpt-sentiment-train",
}


def dataset_summary() -> list[dict]:
    return [
        {
            "name": "FinGPT/fingpt-fiqa_qa",
            "purpose": "financial question answering",
            "used_for": ["chat", "goal guidance", "general finance reasoning"],
        },
        {
            "name": "FinGPT/fingpt-convfinqa",
            "purpose": "financial numerical and table question answering",
            "used_for": ["reasoning over structured monthly data", "explanations"],
        },
        {
            "name": "FinGPT/fingpt-sentiment-train",
            "purpose": "financial sentiment learning",
            "used_for": ["investment context", "risk and news awareness"],
        },
    ]
