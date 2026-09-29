import pytest
from core.digital_twin_engine import FinancialDigitalTwinEngine
from core.forecasting_engine import ForecastingScenarioEngine
from core.explainability_engine import ExplainabilityEngine
from core.currency import ensure_inr
from schemas import FinancialMonth


def test_zero_income_profile():
    engine = FinancialDigitalTwinEngine()
    months = [
        FinancialMonth(
            month="2024-01",
            active_income=0,
            passive_income=0,
            credit_score=600,
            loans_outstanding=100000,
            emi_monthly=5000,
            miscellaneous_charges=1000,
            money_spent=20000,
        )
    ]
    profile = engine.build_profile(months)
    assert profile["monthly_income"] == 0
    assert profile["monthly_outflow"] == 26000
    assert profile["monthly_surplus"] == -26000
    assert profile["savings_rate"] == 0  # No division by zero!
    assert profile["debt_service_ratio"] == 0


def test_deficit_profile_cashflow():
    engine = FinancialDigitalTwinEngine()
    months = [
        FinancialMonth(
            month="2024-01",
            active_income=40000,
            passive_income=0,
            credit_score=650,
            loans_outstanding=200000,
            emi_monthly=15000,
            miscellaneous_charges=5000,
            money_spent=30000,
        )
    ]
    profile = engine.build_profile(months)
    assert profile["monthly_income"] == 40000
    assert profile["monthly_outflow"] == 50000
    assert profile["monthly_surplus"] == -10000
    assert profile["savings_rate"] == -0.25


def test_large_numbers_currency_formatting():
    large_amount = 12500000000.50
    formatted = ensure_inr(f"Your portfolio is {large_amount}")
    assert "₹" in formatted


def test_forecasting_empty_profile():
    forecasting = ForecastingScenarioEngine()
    profile = {
        "monthly_income": 0,
        "monthly_outflow": 0,
        "monthly_surplus": 0,
        "savings_rate": 0,
        "debt_service_ratio": 0,
        "credit_score": 0,
        "loan_balance": 0,
    }
    forecast = forecasting.simulate(profile, [], model="xgboost", scenario="baseline", horizon=6)
    assert len(forecast) == 6
    for point in forecast:
        assert point["income"] == 0
        assert point["expense"] == 0


def test_explainability_empty_profile():
    explainer = ExplainabilityEngine()
    profile = {
        "monthly_income": 0,
        "monthly_outflow": 0,
        "monthly_surplus": 0,
        "savings_rate": 0,
        "debt_service_ratio": 0,
    }
    res = explainer.explain(profile)
    assert "summary" in res
    assert "debt" in res
