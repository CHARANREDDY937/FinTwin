from schemas import FinancialMonth


SCENARIOS = {
    "baseline": {"income_shock": 0.0, "expense_shock": 0.0, "debt_shock": 0.0},
    "inflation": {"income_shock": -0.01, "expense_shock": 0.12, "debt_shock": 0.03},
    "home": {"income_shock": 0.0, "expense_shock": 0.18, "debt_shock": 0.11},
    "mba": {"income_shock": -0.15, "expense_shock": 0.09, "debt_shock": 0.08},
    "jobloss": {"income_shock": -0.45, "expense_shock": 0.05, "debt_shock": 0.06},
    "downturn": {"income_shock": -0.03, "expense_shock": 0.03, "debt_shock": 0.05},
    "vehicle": {"income_shock": 0.0, "expense_shock": 0.08, "debt_shock": 0.10},
}

MODEL_GROWTH = {
    "xgboost": 0.035,
    "lstm": 0.04,
    "prophet": 0.03,
}


class ForecastingScenarioEngine:
    """Scenario simulator inspired by XGBoost, LSTM, and Prophet workflows."""

    def simulate(
        self,
        profile: dict,
        months: list[FinancialMonth],
        model: str = "xgboost",
        scenario: str = "baseline",
        horizon: int = 12,
    ) -> list[dict]:
        selected_scenario = SCENARIOS.get(scenario, SCENARIOS["baseline"])
        model_growth = MODEL_GROWTH.get(model, MODEL_GROWTH["xgboost"])
        base_income = profile["monthly_income"]
        base_expense = profile["monthly_outflow"]
        trend = profile.get("spending_trend", 0)

        forecast = []
        for index in range(1, horizon + 1):
            inflation_lift = (1 + 0.065 + selected_scenario["expense_shock"]) ** (index / 12)
            behavior_lift = (1 + model_growth + max(-0.03, min(0.08, trend / 2))) ** (index / 12)
            income = base_income * (1 + selected_scenario["income_shock"]) ** (index / 18)
            expense = base_expense * inflation_lift * behavior_lift
            debt_drag = profile["loan_balance"] * selected_scenario["debt_shock"] * 0.02
            savings = income - expense - debt_drag

            forecast.append(
                {
                    "month": index,
                    "income": round(income, 2),
                    "expense": round(expense, 2),
                    "savings": round(savings, 2),
                    "net_worth_proxy": round(max(0, savings) * index - debt_drag, 2),
                }
            )

        return forecast
