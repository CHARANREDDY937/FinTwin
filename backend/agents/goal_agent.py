from __future__ import annotations

from schemas import FinancialMonth

from agents.base_agent import Agent
from agents.agent_runtime import predict_with_artifact


class GoalAgent(Agent):
    name = "Goal Agent"

    def _system_prompt(self) -> str:
        return """You are FinTwinAI's Goal Agent. You assess a user's readiness for major financial goals like home purchase, MBA, vehicle financing, or retirement planning.
You evaluate savings strength, creditworthiness, debt levels, and overall financial stability.
Return ONLY a valid JSON object with these fields:
- "goal_readiness": one of "ready", "near_ready", or "not_ready"
- "metric": a number between 0 and 1 representing goal readiness (higher = more ready)
- "signal": a short, actionable sentence about goal planning in Indian rupee (₹) context"

Respond with ONLY the JSON, no markdown formatting, no extra text."""

    def _user_prompt(self, profile: dict, prediction: Any, artifact: Any) -> str:
        model_context = ""
        if prediction is not None:
            model_context = f"""Model prediction context: The trained model sees this profile as '{prediction}' for goal readiness.
Model metrics: {artifact.get('metrics', {}) if artifact else {}}."""

        return f"""Assess this user's readiness for major financial goals (all amounts in Indian rupees, ₹):

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

Provide a goal readiness assessment based on this data."""

    def analyze(self, profile: dict, months: list[FinancialMonth]) -> dict:
        prediction, artifact = predict_with_artifact("goal_agent", profile)

        system_prompt = self._system_prompt()
        user_prompt = self._user_prompt(profile, prediction, artifact)
        response = self._chat_sync(system_prompt, user_prompt)

        if response:
            try:
                import json
                parsed = json.loads(response.strip())
                metric_map = {"ready": 0.85, "near_ready": 0.55, "not_ready": 0.25}
                return {
                    "agent": self.name,
                    "metric": metric_map.get(parsed.get("goal_readiness"), parsed.get("metric", 0)),
                    "signal": parsed.get("signal", ""),
                    "goal_readiness": parsed.get("goal_readiness", "unknown"),
                    "model_metrics": artifact.get("metrics", {}) if artifact else {},
                }
            except (json.JSONDecodeError, ValueError):
                pass

        credit_score = profile["credit_score"]
        savings_rate = profile["savings_rate"]

        if credit_score >= 720 and savings_rate >= 0.2:
            signal = "House, MBA, vehicle, and retirement goals can be compared with moderate confidence."
        elif savings_rate < 0.1:
            signal = "Delay large goals until monthly surplus improves."
        else:
            signal = "Use scenario simulation before committing to a major goal."

        return {
            "agent": self.name,
            "metric": round(savings_rate, 4),
            "signal": signal,
        }
