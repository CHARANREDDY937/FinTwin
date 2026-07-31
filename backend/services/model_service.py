from __future__ import annotations

from pathlib import Path

from config import settings

try:
    from transformers import pipeline
except Exception:  # pragma: no cover - optional at runtime
    pipeline = None


class PersonalizedFinanceModelService:
    """Loads a personalized model when present and falls back to a grounded responder."""

    def __init__(self) -> None:
        self._generator = None
        self._loaded_from: str | None = None
        self._loaded_kind: str | None = None

    def answer(
        self,
        question: str,
        profile: dict,
        forecast: list[dict],
        explanation: dict,
        fallback_answer: str,
        agent_outputs: list[dict],
    ) -> dict:
        prompt = self._build_prompt(question, profile, forecast, explanation, agent_outputs)
        generator = self._get_generator()

        if generator is None:
            return {
                "answer": fallback_answer,
                "answer_source": "rule_based_fallback",
                "model_name": None,
            }

        try:
            generated = generator(
                prompt,
                max_new_tokens=220,
                do_sample=True,
                temperature=0.25,
                top_p=0.9,
                return_full_text=False,
            )
            text = generated[0]["generated_text"].strip()
            if not text:
                raise ValueError("Empty model response")
            return {
                "answer": text,
                "answer_source": self._loaded_kind or "model",
                "model_name": self._loaded_from,
            }
        except Exception:
            return {
                "answer": fallback_answer,
                "answer_source": "rule_based_fallback",
                "model_name": self._loaded_from,
            }

    def _get_generator(self):
        if self._generator is not None:
            return self._generator

        if pipeline is None:
            return None

        candidate = Path(settings.personalized_model_dir)
        use_personalized = candidate.exists()
        model_ref = str(candidate) if use_personalized else settings.base_model_name

        try:
            self._generator = pipeline("text-generation", model=model_ref, tokenizer=model_ref)
            self._loaded_from = model_ref
            self._loaded_kind = "personalized_model" if use_personalized else "base_model"
        except Exception:
            self._generator = None
            self._loaded_from = None
            self._loaded_kind = None

        return self._generator

    def _build_prompt(
        self,
        question: str,
        profile: dict,
        forecast: list[dict],
        explanation: dict,
        agent_outputs: list[dict],
    ) -> str:
        next_month = forecast[0] if forecast else {"expense": 0, "savings": 0, "income": 0}
        top_features = ", ".join(
            f"{item['feature']} ({item['importance']:.0%})"
            for item in explanation.get("feature_importance", [])[:3]
        )
        agents = "; ".join(f"{item['agent']}: {item['signal']}" for item in agent_outputs)

        return f"""You are FinTwinAI, a personalized financial digital twin assistant.

User financial profile:
- Monthly income: {profile.get('monthly_income', 0):.2f}
- Monthly outflow: {profile.get('monthly_outflow', 0):.2f}
- Monthly surplus: {profile.get('monthly_surplus', 0):.2f}
- Savings rate: {profile.get('savings_rate', 0):.2%}
- Debt service ratio: {profile.get('debt_service_ratio', 0):.2%}
- Credit score: {profile.get('credit_score', 0):.0f}
- Loan balance: {profile.get('loan_balance', 0):.2f}

Forecast snapshot:
- Next month income: {next_month.get('income', 0):.2f}
- Next month expense: {next_month.get('expense', 0):.2f}
- Next month savings: {next_month.get('savings', 0):.2f}

Explainability:
- Top features: {top_features}

Agent views:
- {agents}

Answer the user's question in concise plain English, using the profile and forecast rather than generic advice.

Question: {question}
"""
