import pytest
from pydantic import ValidationError
from schemas import FinancialMonth, ChatRequest, ScenarioRequest


def test_financial_month_valid():
    month = FinancialMonth(
        month="2024-01",
        active_income=100000,
        passive_income=10000,
        credit_score=750,
        loans_outstanding=500000,
        emi_monthly=15000,
        miscellaneous_charges=2000,
        money_spent=30000,
    )
    assert month.month == "2024-01"
    assert month.active_income == 100000
    assert month.credit_score == 750


def test_financial_month_invalid_month_format():
    with pytest.raises(ValidationError):
        FinancialMonth(
            month="01-2024",
            active_income=100000,
        )


def test_financial_month_credit_score_bounds():
    with pytest.raises(ValidationError):
        FinancialMonth(
            month="2024-01",
            active_income=100000,
            credit_score=1000,
        )

    with pytest.raises(ValidationError):
        FinancialMonth(
            month="2024-01",
            active_income=100000,
            credit_score=-1,
        )


def test_chat_request_valid():
    request = ChatRequest(
        question="How much can I save?",
        months=[
            FinancialMonth(
                month="2024-01",
                active_income=100000,
                passive_income=10000,
                credit_score=750,
                loans_outstanding=500000,
                emi_monthly=15000,
                miscellaneous_charges=2000,
                money_spent=30000,
            )
        ],
    )
    assert request.question == "How much can I save?"
    assert len(request.months) == 1


def test_scenario_request_valid():
    request = ScenarioRequest(
        months=[
            FinancialMonth(
                month="2024-01",
                active_income=100000,
                passive_income=10000,
                credit_score=750,
                loans_outstanding=500000,
                emi_monthly=15000,
                miscellaneous_charges=2000,
                money_spent=30000,
            )
        ],
        model="xgboost",
        scenario="inflation",
        horizon=12,
    )
    assert request.model == "xgboost"
    assert request.scenario == "inflation"
    assert request.horizon == 12


def test_scenario_request_invalid_model():
    with pytest.raises(ValidationError):
        ScenarioRequest(
            months=[],
            model="invalid_model",
        )