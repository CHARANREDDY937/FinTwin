from schemas import FinancialMonth
from agents.agent_runtime import predict_with_artifact


class RiskAgent:
    name = "Risk Agent"

    def analyze(self, profile: dict, months: list[FinancialMonth]) -> dict:
        prediction, artifact = predict_with_artifact("risk_agent", profile)
        if prediction is not None:
            signal_map = {
                "low": "Model sees the current profile as low risk. Keep the debt load stable and preserve savings discipline.",
                "medium": "Model sees moderate risk. Debt pressure or savings softness needs monitoring before larger commitments.",
                "high": "Model sees high risk. EMI burden, credit weakness, or loan exposure is too heavy right now.",
            }
            metric_map = {"low": 0.2, "medium": 0.5, "high": 0.85}
            return {
                "agent": self.name,
                "metric": metric_map.get(prediction, round(profile["debt_service_ratio"], 4)),
                "signal": signal_map.get(prediction, "Risk model returned an unknown label."),
                "risk_level": prediction,
                "model_metrics": artifact.get("metrics", {}),
            }

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
