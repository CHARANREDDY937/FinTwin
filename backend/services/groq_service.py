from groq import AsyncGroq
from typing import Optional
from config import settings
from core.currency import ensure_inr


class GroqService:
    def __init__(self):
        self.client = None
        self._initialized = False

    def _get_client(self) -> Optional[AsyncGroq]:
        if not self._initialized:
            if settings.groq_api_key:
                self.client = AsyncGroq(api_key=settings.groq_api_key)
            self._initialized = True
        return self.client

    async def chat_completion(
        self,
        messages: list[dict],
        model: str = "qwen/qwen3.8-27b",
        temperature: float = 0.3,
        max_tokens: int = 1024
    ) -> Optional[str]:
        client = self._get_client()
        if not client:
            return None

        try:
            completion = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            raw = completion.choices[0].message.content
            return ensure_inr(raw) if raw else None
        except Exception as e:
            print(f"Groq API error: {e}")
            return None

    async def answer_financial_question(
        self,
        question: str,
        profile: dict,
        forecast: list[dict],
        agent_outputs: list[dict],
        explanation: dict
    ) -> Optional[str]:
        client = self._get_client()
        if not client:
            return None

        next_month = forecast[0] if forecast else {"expense": 0, "savings": 0, "income": 0}
        top_features = ", ".join(
            f"{item['feature']} ({item['importance']:.0%})"
            for item in explanation.get("feature_importance", [])[:3]
        )
        agents = "; ".join(f"{item['agent']}: {item['signal']}" for item in agent_outputs)

        system_prompt = """You are FinTwinAI, an Indian financial digital twin assistant.
All profile and forecast figures provided are NATIVELY in Indian Rupees (INR, ₹). They are NOT US Dollars.
Exchange rate standard: 1 USD ($) = 95.91 INR (₹) | 1 INR (₹) = 0.0104 USD.
Provide concise, specific financial guidance directly in Indian Rupees (₹).
Keep responses under 3-4 sentences."""

        user_prompt = f"""User financial profile (all figures in Indian Rupees, ₹):
- Monthly income: ₹{profile.get('monthly_income', 0):,.2f}
- Monthly outflow: ₹{profile.get('monthly_outflow', 0):,.2f}
- Monthly surplus: ₹{profile.get('monthly_surplus', 0):,.2f}
- Savings rate: {profile.get('savings_rate', 0):.2%}
- Debt service ratio: {profile.get('debt_service_ratio', 0):.2%}
- Credit score: {profile.get('credit_score', 0):.0f}
- Loan balance: ₹{profile.get('loan_balance', 0):,.2f}

Forecast snapshot (next month):
- Income: ₹{next_month.get('income', 0):,.2f}
- Expense: ₹{next_month.get('expense', 0):,.2f}
- Savings: ₹{next_month.get('savings', 0):,.2f}

Explainability - Top features: {top_features}

Agent views: {agents}

Question: {question}

Answer concisely using their specific numbers."""

        return await self.chat_completion([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ], model="qwen/qwen3.8-27b", temperature=0.3, max_tokens=512)


groq_service = GroqService()