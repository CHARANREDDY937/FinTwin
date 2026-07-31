from schemas import FinancialMonth
from agents.agent_runtime import predict_with_artifact


class InvestmentAgent:
    name = "Investment Agent"

    def analyze(self, profile: dict, months: list[FinancialMonth]) -> dict:
        prediction, artifact = predict_with_artifact("investment_agent", profile)
        if prediction is not None:
            income = max(profile["monthly_income"], 1)
            invest_rate = float(prediction) / income
            signal = (
                f"Model-estimated investable amount is {prediction:.0f} per month. "
                "That is the portion of surplus the dataset-driven model sees as sustainable."
            )
            return {
                "agent": self.name,
                "metric": round(invest_rate, 4),
                "signal": signal,
                "model_metrics": artifact.get("metrics", {}),
            }

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
