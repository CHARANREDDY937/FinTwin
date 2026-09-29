import pytest
from core.finance_grounding import (
    compute_cashflow,
    compute_affordability,
    compute_inflation_scenario,
    generate_suggested_prompts,
)


def test_compute_cashflow():
    profile = {
        "monthly_income": 100000,
        "monthly_outflow": 65000,
        "debt_service_ratio": 0.28,
    }
    cf = compute_cashflow(profile)
    assert cf["monthly_surplus"] == 35000
    assert cf["savings_rate_pct"] == 35.0
    assert cf["is_deficit"] is False

    deficit_profile = {
        "monthly_income": 50000,
        "monthly_outflow": 60000,
        "debt_service_ratio": 0.40,
    }
    dcf = compute_cashflow(deficit_profile)
    assert dcf["monthly_surplus"] == -10000
    assert dcf["is_deficit"] is True


def test_compute_affordability():
    profile = {
        "monthly_income": 100000,
        "monthly_outflow": 40000,
        "monthly_surplus": 60000,
        "debt_service_ratio": 0.15,
    }
    aff = compute_affordability(profile, principal=800000, annual_interest_rate=0.09, tenure_years=5)
    assert aff["estimated_emi"] > 0
    assert "verdict" in aff
    assert len(aff["math_steps"]) == 4


def test_compute_inflation_scenario():
    profile = {
        "monthly_income": 100000,
        "monthly_outflow": 50000,
    }
    inf = compute_inflation_scenario(profile, inflation_rate=0.08, horizon=12)
    assert len(inf["baseline"]) == 12
    assert len(inf["series"]) == 12
    assert inf["end_shock_expense"] > inf["end_baseline_expense"]


def test_generate_suggested_prompts_negative_surplus():
    profile = {
        "monthly_income": 50000,
        "monthly_outflow": 60000,
        "monthly_surplus": -10000,
        "debt_service_ratio": 0.45,
    }
    prompts = generate_suggested_prompts(profile)
    assert len(prompts) == 4
    assert any("negative" in p["text"].lower() for p in prompts)
