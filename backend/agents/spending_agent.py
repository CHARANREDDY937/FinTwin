from __future__ import annotations

from schemas import FinancialMonth

from agents.base_agent import Agent
from agents.agent_runtime import predict_with_artifact


class SpendingAgent(Agent):
    name = "Spending Agent"

    def _system_prompt(self) -> str:
        return """You are FinTwinAI's Spending Agent. You analyze a user's spending patterns and financial outflows to assess spending pressure and provide guidance.
You evaluate expense ratios, spending trends, and identify potential areas of concern.
Return ONLY a valid JSON object with these fields:
- "pressure": a decimal (e.g. 0.75) representing spending pressure (outflow as fraction of income)
- "metric": a number between 0 and 1 representing spending pressure level (higher = more pressure)
- "signal": a short, actionable sentence about spending habits in Indian rupee (₹) context"

Respond with ONLY the JSON, no markdown formatting, no extra text."""

    def _user_prompt(self, profile: dict, prediction: Any, artifact: Any) -> str:
        model_context = ""
        if prediction is not None:
            pressure = prediction / max(profile["monthly_income"], 1)
            model_context = f"""Model prediction context: The trained model predicts next-month spending of ₹{prediction:,.0f}, giving a pressure ratio of {pressure:.2%}.
Model metrics: {artifact.get('metrics', {}) if artifact else {}}."""

        return f"""Analyze this user's spending patterns and financial outflows (all amounts in Indian rupees, ₹):

Financial Data:
- Monthly income: ₹{profile.get('monthly_income', 0):,.2f}
- Monthly outflow: ₹{profile.get('monthly_outflow', 0):,.2f}
- Monthly surplus: ₹{profile.get('monthly_surplus', 0):,.2f}
- Savings rate: {profile.get('savings_rate', 0):.2%}
- Debt service ratio: {profile.get('debt_service_ratio', 0):.2%}
- Credit score: {profile.get('credit_score', 0):.0f}
- Loan balance: ₹{profile.get('loan_balance', 0):,.2f}
- Spending trend: {profile.get('spending_trend', 0):.2%}
- Emergency buffer (months): {profile.get('emergency_buffer_months', 0):.1f}
- Months tracked: {profile.get('months_tracked', 0)}

{model_context}

Provide a spending analysis based on this data."""

    def analyze(self, profile: dict, months: list[FinancialMonth]) -> dict:
        prediction, artifact = predict_with_artifact("spending_agent", profile)

        system_prompt = self._system_prompt()
        user_prompt = self._user_prompt(profile, prediction, artifact)
        response = self._chat_sync(system_prompt, user_prompt)

        if response:
            try:
                import json
                parsed = json.loads(response.strip())
                return {
                    "agent": self.name,
                    "metric": round(parsed.get("metric", parsed.get("pressure", 0)), 4),
                    "signal": parsed.get("signal", ""),
                    "model_metrics": artifact.get("metrics", {}) if artifact else {},
                }
            except (json.JSONDecodeError, ValueError):
                pass

        pressure = profile["monthly_outflow"] / max(profile["monthly_income"], 1)
        trend = profile["spending_trend"]

        if pressure > 0.75:
            signal = "High spending pressure. Review subscriptions, lifestyle inflation, and discretionary categories."
        elif trend > 0.1:
            signal = "Spending is rising faster than expected. Compare this month with the previous upload."
        else:
            signal = "Spending is stable. Continue monthly uploads to detect drift early."

        return {
            "agent": self.name,
            "metric": round(pressure, 4),
            "signal": signal,
        }
