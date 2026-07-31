class ExplainabilityEngine:
    """Produces SHAP/LIME-style feature importance for the forecast."""

    def explain(self, profile: dict) -> dict:
        spend_pressure = profile["monthly_outflow"] / max(profile["monthly_income"], 1)
        debt_pressure = profile["debt_service_ratio"]
        credit_pressure = max(0, 1 - (profile["credit_score"] - 300) / 600) if profile["credit_score"] else 0.5
        passive_support = profile["passive_income"] / max(profile["monthly_income"], 1)
        inflation_signal = 0.25 + max(0, profile["spending_trend"])
        loan_exposure = min(1, profile["loan_balance"] / max(profile["monthly_income"] * 8, 1))

        raw = [
            {"feature": "Monthly spending", "weight": spend_pressure * 0.35 + 0.18},
            {"feature": "EMI load", "weight": debt_pressure * 0.45 + 0.12},
            {"feature": "Credit score", "weight": credit_pressure * 0.22 + 0.08},
            {"feature": "Passive earnings", "weight": passive_support * 0.20 + 0.06},
            {"feature": "Inflation trend", "weight": inflation_signal * 0.16 + 0.05},
            {"feature": "Loan exposure", "weight": loan_exposure * 0.15 + 0.04},
        ]
        total = sum(item["weight"] for item in raw) or 1
        feature_importance = sorted(
            [{"feature": item["feature"], "importance": round(item["weight"] / total, 4)} for item in raw],
            key=lambda item: item["importance"],
            reverse=True,
        )

        return {
            "method": "SHAP/LIME-inspired feature importance",
            "feature_importance": feature_importance,
            "recommendation": self._recommend(profile, feature_importance),
        }

    def _recommend(self, profile: dict, feature_importance: list[dict]) -> str:
        top_feature = feature_importance[0]["feature"] if feature_importance else "Monthly spending"
        if profile["debt_service_ratio"] > 0.3:
            return "Reduce EMI burden before adding new long-term goals."
        if profile["savings_rate"] < 0.15:
            return f"Improve savings rate by focusing first on {top_feature.lower()}."
        return "The current profile can support moderate long-term planning with continued monthly uploads."
