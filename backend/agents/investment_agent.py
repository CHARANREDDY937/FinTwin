from __future__ import annotations

from schemas import FinancialMonth

from agents.base_agent import Agent
from agents.agent_runtime import predict_with_artifact


class InvestmentAgent(Agent):
    name = "Investment Agent"

    def _system_prompt(self) -> str:
        return """You are FinTwinAI's Investment Agent. You analyze a user's financial profile and advise on investment capacity and strategy.
You assess savings patterns, income stability, surplus available for investment, and recommend investment approach.
Return ONLY a valid JSON object with these fields:
- "invest_rate": a decimal (e.g. 0.25) representing the fraction of income suitable for investment
- "metric": a number between 0 and 1 representing investment readiness (higher = more ready)
- "signal": a short, actionable sentence about investment strategy in Indian rupee (₹) context"

Respond with ONLY the JSON, no markdown formatting, no extra text."""

    def _user_prompt(self, profile: dict, prediction: Any, artifact: Any) -> str:
        model_context = ""
        if prediction is not None:
            model_context = f"""Model prediction context: The trained model estimates an investable amount of ₹{prediction:,.0f} per month.
Model metrics: {artifact.get('metrics', {}) if artifact else {}}."""

        return f"""Analyze this user's investment capacity based on their financial profile (all amounts in Indian rupees, ₹):

Financial Data:
- Monthly income: ₹{profile.get('monthly_income', 0):,.2f}
- Monthly outflow: ₹{profile.get('monthly_outflow', 0):,.2f}
- Monthly surplus: ₹{profile.get('monthly_surplus', 0):,.2f}
- Savings rate: {profile.get('savings_rate', 0):.2%}
- Debt service ratio: {profile.get('debt_service_ratio', 0):.2%}
- Credit score: {profile.get('credit_score', 0):.0f}
- Loan balance: ₹{profile.get('loan_balance', 0):,.2f}
- Emergency buffer (months): {profile.get('emergency_buffer_months', 0):.1f}
- Months tracked: {profile.get('months_tracked', 0)}

{model_context}

Provide an investment assessment based on this data."""

    def analyze(self, profile: dict, months: list[FinancialMonth]) -> dict:
        prediction, artifact = predict_with_artifact("investment_agent", profile)

        system_prompt = self._system_prompt()
        user_prompt = self._user_prompt(profile, prediction, artifact)
        response = self._chat_sync(system_prompt, user_prompt)

        if response:
            try:
                import json
                parsed = json.loads(response.strip())
                metric = parsed.get("metric", parsed.get("invest_rate"))
                if isinstance(metric, (int, float)):
                    metric = round(float(metric), 4)
                else:
                    metric = round(profile.get("savings_rate", 0), 4)
                return {
                    "agent": self.name,
                    "metric": metric,
                    "signal": parsed.get("signal", ""),
                    "model_metrics": artifact.get("metrics", {}) if artifact else {},
                }
            except (json.JSONDecodeError, ValueError, ZeroDivisionError):
                pass

        savings_rate = profile["savings_rate"]

        if savings_rate > 0.25:
            signal = "Strong investable surplus. Consider long-term allocation toward retirement and wealth goals."
        elif savings_rate > 0.1:
            signal = "Moderate surplus. Increase recurring investments after emergency reserves are stable."
        else:
            signal = "Low surplus. Improve cash flow before increasing investment commitments."

        return {
            "agent": self.name,
            "metric": round(savings_rate, 4),
            "signal": signal,
        }
