import pytest
from core.grounded_chat_handler import build_grounded_response
from schemas import FinancialMonth


@pytest.fixture
def sample_profile_and_months():
    months = [
        FinancialMonth(
            month="2024-01",
            active_income=120000,
            passive_income=10000,
            credit_score=780,
            loans_outstanding=300000,
            emi_monthly=15000,
            miscellaneous_charges=2000,
            money_spent=35000,
        )
    ]
    profile = {
        "months_tracked": 1,
        "monthly_income": 130000,
        "monthly_outflow": 52000,
        "monthly_surplus": 78000,
        "savings_rate": 0.60,
        "debt_service_ratio": 0.115,
        "credit_score": 780,
        "loan_balance": 300000,
    }
    return profile, months


def test_grounded_home_affordability(sample_profile_and_months):
    profile, months = sample_profile_and_months
    resp = build_grounded_response(
        question="Can I afford a 75 lakh house?",
        profile=profile,
        months=months,
        raw_answer="Based on your profile, you may afford it.",
        source="ensemble",
    )
    assert "verdict" in resp
    assert "verdict_tone" in resp
    assert len(resp["math_steps"]) >= 3
    assert len(resp["key_figures"]) >= 3
    assert resp["viz_payload"] is not None
    assert resp["viz_payload"]["scenario"] == "home"
    assert "disclaimer" in resp


def test_grounded_car_loan_affordability(sample_profile_and_months):
    profile, months = sample_profile_and_months
    resp = build_grounded_response(
        question="Can I get an 8L car loan?",
        profile=profile,
        months=months,
        raw_answer="An 8 lakh car loan is within your range.",
        source="ensemble",
    )
    assert "verdict" in resp
    assert resp["viz_payload"]["scenario"] == "vehicle"
    assert any("Car Loan" in kf["label"] for kf in resp["key_figures"])


def test_grounded_inflation_scenario(sample_profile_and_months):
    profile, months = sample_profile_and_months
    resp = build_grounded_response(
        question="What happens if inflation jumps to 8%?",
        profile=profile,
        months=months,
        raw_answer="Inflation shock analysis shows higher expenses.",
        source="ensemble",
    )
    assert "verdict" in resp
    assert resp["viz_payload"]["scenario"] == "inflation"
    assert len(resp["viz_payload"]["series"]) > 0


def test_grounded_discretionary_cashflow(sample_profile_and_months):
    profile, months = sample_profile_and_months
    resp = build_grounded_response(
        question="How much can I spend on dining out this month?",
        profile=profile,
        months=months,
        raw_answer="Your discretionary headroom is generous.",
        source="ensemble",
    )
    assert "verdict" in resp
    assert any("Monthly Surplus" in kf["label"] or "Savings Rate" in kf["label"] for kf in resp["key_figures"])
