from schemas import FinancialMonth
from agents.agent_runtime import predict_with_artifact


class GoalAgent:
    name = "Goal Agent"

    def analyze(self, profile: dict, months: list[FinancialMonth]) -> dict:
        prediction, artifact = predict_with_artifact("goal_agent", profile)
        if prediction is not None:
            signal_map = {
                "ready": "Model sees the profile as ready for structured goal planning like a home, MBA, or vehicle purchase.",
                "near_ready": "Model sees partial readiness. A stronger savings buffer would make major goals more comfortable.",
                "not_ready": "Model sees low readiness. Improve monthly surplus before taking on a large goal.",
            }
            metric_map = {"ready": 0.85, "near_ready": 0.55, "not_ready": 0.25}
            return {
                "agent": self.name,
                "metric": metric_map.get(prediction, round(profile["savings_rate"], 4)),
                "signal": signal_map.get(prediction, "Goal model returned an unknown label."),
                "goal_readiness": prediction,
                "model_metrics": artifact.get("metrics", {}),
            }

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
