import pytest
from datetime import date
from core.digital_twin_engine import FinancialDigitalTwinEngine
from core.forecasting_engine import ForecastingScenarioEngine
from core.explainability_engine import ExplainabilityEngine
from schemas import FinancialMonth


@pytest.fixture
def sample_months():
    return [
        FinancialMonth(
            month="2024-01",
            active_income=100000,
            passive_income=10000,
            credit_score=750,
            loans_outstanding=500000,
            emi_monthly=15000,
            miscellaneous_charges=2000,
            money_spent=30000,
        ),
        FinancialMonth(
            month="2024-02",
            active_income=100000,
            passive_income=10000,
            credit_score=755,
            loans_outstanding=480000,
            emi_monthly=15000,
            miscellaneous_charges=1500,
            money_spent=32000,
        ),
    ]


def test_digital_twin_engine_build_profile(sample_months):
    engine = FinancialDigitalTwinEngine()
    profile = engine.build_profile(sample_months)

    assert profile["months_tracked"] == 2
    assert profile["monthly_income"] == 110000
    assert profile["monthly_outflow"] == 47000
    assert profile["monthly_surplus"] == 63000
    assert profile["savings_rate"] == pytest.approx(63000 / 110000, rel=0.01)
    assert profile["debt_service_ratio"] == pytest.approx(15000 / 110000, rel=0.01)
    assert profile["credit_score"] == 755
    assert profile["loan_balance"] == 480000


def test_digital_twin_engine_empty_profile():
    engine = FinancialDigitalTwinEngine()
    profile = engine.build_profile([])

    assert profile["months_tracked"] == 0
    assert profile["monthly_income"] == 0
    assert profile["monthly_outflow"] == 0
    assert profile["savings_rate"] == 0


def test_forecasting_engine_baseline(sample_months):
    engine = FinancialDigitalTwinEngine()
    profile = engine.build_profile(sample_months)

    forecast_engine = ForecastingScenarioEngine()
    forecast = forecast_engine.simulate(
        profile=profile,
        months=sample_months,
        model="xgboost",
        scenario="baseline",
        horizon=6,
    )

    assert len(forecast) == 6
    for i, month in enumerate(forecast):
        assert month["month"] == i + 1
        assert "income" in month
        assert "expense" in month
        assert "savings" in month
        assert "net_worth_proxy" in month


def test_forecasting_engine_different_scenarios(sample_months):
    engine = FinancialDigitalTwinEngine()
    profile = engine.build_profile(sample_months)

    forecast_engine = ForecastingScenarioEngine()

    baseline = forecast_engine.simulate(profile, sample_months, scenario="baseline", horizon=3)
    inflation = forecast_engine.simulate(profile, sample_months, scenario="inflation", horizon=3)
    jobloss = forecast_engine.simulate(profile, sample_months, scenario="jobloss", horizon=3)

    assert inflation[0]["expense"] > baseline[0]["expense"]
    assert jobloss[0]["income"] < baseline[0]["income"]


def test_forecasting_engine_different_models(sample_months):
    engine = FinancialDigitalTwinEngine()
    profile = engine.build_profile(sample_months)

    forecast_engine = ForecastingScenarioEngine()

    xgboost = forecast_engine.simulate(profile, sample_months, model="xgboost", horizon=3)
    lstm = forecast_engine.simulate(profile, sample_months, model="lstm", horizon=3)
    prophet = forecast_engine.simulate(profile, sample_months, model="prophet", horizon=3)

    assert len(xgboost) == len(lstm) == len(prophet) == 3


def test_explainability_engine(sample_months):
    engine = FinancialDigitalTwinEngine()
    profile = engine.build_profile(sample_months)

    explain_engine = ExplainabilityEngine()
    explanation = explain_engine.explain(profile)

    assert "method" in explanation
    assert "feature_importance" in explanation
    assert "recommendation" in explanation
    assert len(explanation["feature_importance"]) > 0

    total_importance = sum(f["importance"] for f in explanation["feature_importance"])
    assert total_importance == pytest.approx(1.0, rel=0.01)

    features = [f["feature"] for f in explanation["feature_importance"]]
    assert "Monthly spending" in features
    assert "EMI load" in features
    assert "Credit score" in features