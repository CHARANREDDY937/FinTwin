from schemas import FinancialMonth
from agents.agent_runtime import predict_with_artifact


class SpendingAgent:
    name = "Spending Agent"

    def analyze(self, profile: dict, months: list[FinancialMonth]) -> dict:
        prediction, artifact = predict_with_artifact("spending_agent", profile)
        if prediction is not None:
            pressure = prediction / max(profile["monthly_income"], 1)
            signal = (
                f"Model-predicted next-month spending is {prediction:.0f}. "
                "Recurring lifestyle categories are likely to be the biggest source of drift."
            )
            return {
                "agent": self.name,
                "metric": round(float(pressure), 4),
                "signal": signal,
                "model_metrics": artifact.get("metrics", {}),
            }

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
