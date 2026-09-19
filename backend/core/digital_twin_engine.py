from __future__ import annotations

from schemas import FinancialMonth
from services.groq_service import GroqService
from core.currency import ensure_inr


class FinancialDigitalTwinEngine:
    """Builds the user's live financial profile from monthly uploads."""

    name = "Financial Twin"

    def __init__(self) -> None:
        self._groq: GroqService | None = None

    @property
    def groq(self) -> GroqService | None:
        if self._groq is None:
            self._groq = GroqService()
        return self._groq if __import__("config").settings.groq_api_key else None

    def build_profile(self, months: list[FinancialMonth]) -> dict:
        if not months:
            return self._empty_profile()

        sorted_months = sorted(months, key=lambda m: m.month)
        latest = sorted_months[-1]

        monthly_income = latest.active_income + latest.passive_income
        monthly_outflow = latest.money_spent + latest.emi_monthly + latest.miscellaneous_charges
        monthly_surplus = monthly_income - monthly_outflow
        savings_rate = monthly_surplus / max(monthly_income, 1)
        debt_service_ratio = latest.emi_monthly / max(monthly_income, 1)
        loan_balance = latest.loans_outstanding
        credit_score = latest.credit_score
        passive_income = latest.passive_income

        spending_trend = 0.0
        if len(sorted_months) >= 2:
            prev = sorted_months[-2]
            prev_outflow = prev.money_spent + prev.emi_monthly + prev.miscellaneous_charges
            curr_outflow = monthly_outflow
            if prev_outflow > 0:
                spending_trend = (curr_outflow - prev_outflow) / prev_outflow

        emergency_buffer_months = 0.0
        if monthly_outflow > 0:
            emergency_buffer_months = (monthly_income * 3) / monthly_outflow

        return {
            "monthly_income": monthly_income,
            "monthly_outflow": monthly_outflow,
            "monthly_surplus": monthly_surplus,
            "savings_rate": savings_rate,
            "debt_service_ratio": debt_service_ratio,
            "credit_score": credit_score,
            "loan_balance": loan_balance,
            "passive_income": passive_income,
            "spending_trend": spending_trend,
            "months_tracked": len(months),
            "emergency_buffer_months": emergency_buffer_months,
            "average_misc": sum(m.miscellaneous_charges for m in months) / len(months),
        }

    def _empty_profile(self) -> dict:
        return {
            "monthly_income": 0,
            "monthly_outflow": 0,
            "monthly_surplus": 0,
            "savings_rate": 0,
            "debt_service_ratio": 0,
            "credit_score": 0,
            "loan_balance": 0,
            "passive_income": 0,
            "spending_trend": 0,
            "months_tracked": 0,
            "emergency_buffer_months": 0,
            "average_misc": 0,
        }

    def _chat_sync(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = "qwen/qwen3.8-27b",
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> str | None:
        import asyncio

        client = self.groq
        if client is None:
            return None
        try:
            return asyncio.run(
                client.chat_completion(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
            )
        except Exception as e:
            print(f"[{self.name}] Groq API error: {e}")
            return None

    def _system_prompt(self) -> str:
        return """You are FinTwinAI, a personalized financial digital twin assistant.
Analyze the user's financial data and provide clear, actionable insights in Indian rupees (₹).
Be concise and specific. Use actual numbers from the data provided.
Return a plain text answer (not JSON), under 3-4 sentences."""

    def _user_prompt(
        self,
        question: str,
        profile: dict,
        forecast: list[dict],
        explanation: dict,
    ) -> str:
        next_month = forecast[0] if forecast else {"income": 0, "expense": 0, "savings": 0}
        top_features = explanation.get("feature_importance", [])[:5]
        features_text = "\n".join(
            f"  - {f['feature']}: {f['importance']:.1%}" for f in top_features
        )

        return f"""User financial profile (all amounts in Indian rupees, ₹):
- Monthly income: ₹{profile.get('monthly_income', 0):,.2f}
- Monthly outflow: ₹{profile.get('monthly_outflow', 0):,.2f}
- Monthly surplus: ₹{profile.get('monthly_surplus', 0):,.2f}
- Savings rate: {profile.get('savings_rate', 0):.2%}
- Debt service ratio: {profile.get('debt_service_ratio', 0):.2%}
- Credit score: {profile.get('credit_score', 0):.0f}
- Loan balance: ₹{profile.get('loan_balance', 0):,.2f}
- Months tracked: {profile.get('months_tracked', 0)}

Forecast snapshot (next month):
- Income: ₹{next_month.get('income', 0):,.2f}
- Expense: ₹{next_month.get('expense', 0):,.2f}
- Savings: ₹{next_month.get('savings', 0):,.2f}

Key drivers (explainability):
{features_text}

Question: {question}

Answer concisely using the user's specific data."""

    def answer_question(
        self,
        question: str,
        profile: dict,
        forecast: list[dict],
        explanation: dict,
    ) -> str:
        system_prompt = self._system_prompt()
        user_prompt = self._user_prompt(question, profile, forecast, explanation)
        response = self._chat_sync(system_prompt, user_prompt)

        if response:
            return ensure_inr(response)

        question_text = question.lower()
        next_month = forecast[0] if forecast else {"expense": 0, "savings": 0}
        top_driver = (
            explanation["feature_importance"][0]["feature"]
            if explanation.get("feature_importance")
            else "monthly spending"
        )

        if "dollar" in question_text or "usd" in question_text or "exchange rate" in question_text or "in $" in question_text:
            usd_income = profile.get('monthly_income', 0) / 95.91
            usd_savings = next_month.get('savings', 0) / 95.91
            return (
                f"At the standard exchange rate of 1 USD = ₹95.91 INR: "
                f"Your monthly income of ₹{profile.get('monthly_income', 0):,.0f} equates to approximately ${usd_income:,.2f} USD, "
                f"and next month's projected surplus of ₹{next_month.get('savings', 0):,.0f} is approx ${usd_savings:,.2f} USD."
            )

        if "inflation" in question_text or "expense" in question_text:
            return (
                f"Your next-month expense forecast is ₹{next_month['expense']:.0f}. "
                f"The strongest driver is {top_driver}, so controlling that factor will improve the forecast fastest."
            )
        if "loan" in question_text or "emi" in question_text or "debt" in question_text:
            return (
                f"Your EMI burden is {profile['debt_service_ratio']:.1%} of monthly income. "
                "The risk agent recommends lowering debt pressure before adding new loans."
            )
        if "credit" in question_text:
            return (
                f"Your latest credit score is {profile['credit_score']:.0f}. "
                "Keeping EMI stable and paying on time should improve future borrowing readiness."
            )
        if "goal" in question_text or "house" in question_text or "mba" in question_text:
            return (
                f"Your projected monthly savings is ₹{next_month['savings']:.0f}. "
                "Large goals are safer when this value stays positive after EMI and essentials."
            )

        return (
            f"I see {profile['months_tracked']} uploaded month(s). "
            f"Your monthly income is ₹{profile['monthly_income']:.0f}, outflow is ₹{profile['monthly_outflow']:.0f}, "
            f"and the top forecast driver is {top_driver}."
        )
