from groq import AsyncGroq
from typing import Optional
from config import settings


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
        model: str = "llama-3.3-70b-versatile",
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
            return completion.choices[0].message.content
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

        system_prompt = """You are FinTwinAI, a personalized financial digital twin assistant.
Provide concise, specific financial guidance based on the user's actual data.
Use concrete numbers from their profile and forecast. Be practical and actionable.
Keep responses under 3-4 sentences. All monetary values are in Indian rupees (₹)."""

        user_prompt = f"""User financial profile (amounts in Indian rupees, ₹):
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
        ], model="llama-3.3-70b-versatile", temperature=0.3, max_tokens=512)


groq_service = GroqService()