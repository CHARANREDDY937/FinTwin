from __future__ import annotations

from schemas import FinancialMonth

from agents.base_agent import Agent
from agents.agent_runtime import predict_with_artifact


class RiskAgent(Agent):
    name = "Risk Agent"

    def _system_prompt(self) -> str:
        return """You are FinTwinAI's Risk Agent. You analyze a user's financial profile and assess their risk level.
You evaluate debt burden, credit strength, savings buffer, and overall financial stability.
Return ONLY a valid JSON object with these fields:
- "risk_level": one of "low", "medium", or "high"
- "metric": a number between 0 and 1 representing risk severity (higher = riskier)
- "signal": a short, actionable sentence explaining the risk assessment in Indian rupee (₹) context"

Respond with ONLY the JSON, no markdown formatting, no extra text."""

    def _user_prompt(self, profile: dict, prediction: Any, artifact: Any) -> str:
        model_context = ""
        if prediction is not None:
            model_context = f"""Model prediction context: The trained model classified this profile as '{prediction}' risk level.
Model metrics: {artifact.get('metrics', {}) if artifact else {}}."""

        return f"""Analyze this user's financial risk profile (all amounts in Indian rupees, ₹):

Financial Data:
- Monthly income: ₹{profile.get('monthly_income', 0):,.2f}
- Monthly outflow: ₹{profile.get('monthly_outflow', 0):,.2f}
- Monthly surplus: ₹{profile.get('monthly_surplus', 0):,.2f}
- Savings rate: {profile.get('savings_rate', 0):.2%}
- Debt service ratio (EMI/income): {profile.get('debt_service_ratio', 0):.2%}
- Credit score: {profile.get('credit_score', 0):.0f}
- Loan balance: ₹{profile.get('loan_balance', 0):,.2f}
- Emergency buffer (months): {profile.get('emergency_buffer_months', 0):.1f}
- Months tracked: {profile.get('months_tracked', 0)}

{model_context}

Provide a risk assessment based on this data."""

    def analyze(self, profile: dict, months: list[FinancialMonth]) -> dict:
        prediction, artifact = predict_with_artifact("risk_agent", profile)

        system_prompt = self._system_prompt()
        user_prompt = self._user_prompt(profile, prediction, artifact)
        response = self._chat_sync(system_prompt, user_prompt)

        if response:
            try:
                import json
                parsed = json.loads(response.strip())
                return {
                    "agent": self.name,
                    "metric": parsed.get("metric", 0),
                    "signal": parsed.get("signal", ""),
                    "risk_level": parsed.get("risk_level", "unknown"),
                    "model_metrics": artifact.get("metrics", {}) if artifact else {},
                }
            except (json.JSONDecodeError, ValueError):
                pass

        debt_service = profile["debt_service_ratio"]
        emergency_buffer = profile["emergency_buffer_months"]

        if debt_service > 0.35:
            signal = "Debt burden is high. Avoid new loans and prioritize EMI reduction."
        elif emergency_buffer < 3:
            signal = "Emergency buffer is thin. Build savings before taking larger financial risks."
        else:
            signal = "Risk profile is manageable. Maintain EMI discipline and emergency reserves."

        return {
            "agent": self.name,
            "metric": round(debt_service, 4),
            "signal": signal,
        }
