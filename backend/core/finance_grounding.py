from __future__ import annotations

from typing import Dict, Any, List, Optional
from schemas import FinancialMonth
import math


def compute_cashflow(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Compute deterministic cashflow breakdown and surplus."""
    income = float(profile.get("monthly_income", 0))
    outflow = float(profile.get("monthly_outflow", 0))
    surplus = income - outflow
    savings_rate = (surplus / income) if income > 0 else 0.0
    debt_service_ratio = float(profile.get("debt_service_ratio", 0))

    return {
        "monthly_income": round(income, 2),
        "monthly_outflow": round(outflow, 2),
        "monthly_surplus": round(surplus, 2),
        "savings_rate_pct": round(savings_rate * 100, 2),
        "debt_service_ratio_pct": round(debt_service_ratio * 100, 2),
        "is_deficit": surplus < 0,
    }


def compute_affordability(
    profile: Dict[str, Any],
    principal: float = 7500000.0,
    annual_interest_rate: float = 0.085,
    tenure_years: int = 20,
) -> Dict[str, Any]:
    """Compute loan affordability, EMI, and post-loan DTI deterministically."""
    monthly_rate = annual_interest_rate / 12.0
    num_months = tenure_years * 12

    if monthly_rate > 0:
        emi = principal * monthly_rate * ((1 + monthly_rate) ** num_months) / (((1 + monthly_rate) ** num_months) - 1)
    else:
        emi = principal / num_months

    current_income = float(profile.get("monthly_income", 0))
    current_emi = float(profile.get("monthly_outflow", 0)) * float(profile.get("debt_service_ratio", 0))
    current_surplus = float(profile.get("monthly_surplus", 0))

    total_new_emi = current_emi + emi
    new_dti = (total_new_emi / current_income) if current_income > 0 else 1.0
    new_surplus = current_surplus - emi

    is_feasible = new_dti <= 0.45 and new_surplus >= 0

    if new_dti > 0.50 or new_surplus < -5000:
        verdict = "High Risk - Unaffordable"
        verdict_tone = "alert"
    elif not is_feasible:
        verdict = "Stretched - Budget Adjustment Required"
        verdict_tone = "warn"
    else:
        verdict = "Feasible & Affordable"
        verdict_tone = "good"

    return {
        "principal": round(principal, 2),
        "estimated_emi": round(emi, 2),
        "tenure_years": tenure_years,
        "annual_interest_rate_pct": round(annual_interest_rate * 100, 2),
        "current_dti_pct": round(float(profile.get("debt_service_ratio", 0)) * 100, 1),
        "projected_dti_pct": round(new_dti * 100, 1),
        "projected_surplus": round(new_surplus, 2),
        "is_feasible": is_feasible,
        "verdict": verdict,
        "verdict_tone": verdict_tone,
        "math_steps": [
            f"1. EMI Formula: P × r × (1+r)^n / ((1+r)^n - 1) for ₹{principal:,.0f} at {annual_interest_rate*100:.1f}% over {tenure_years}Y = ₹{emi:,.0f}/month.",
            f"2. Debt Burden: Existing EMI ₹{current_emi:,.0f} + New EMI ₹{emi:,.0f} = Total EMI ₹{total_new_emi:,.0f}.",
            f"3. DTI Impact: ₹{total_new_emi:,.0f} / ₹{current_income:,.0f} income = {new_dti*100:.1f}% (Prudent benchmark ceiling is 45%).",
            f"4. Remaining Surplus: ₹{current_surplus:,.0f} - ₹{emi:,.0f} = ₹{new_surplus:,.0f}/month.",
        ],
    }


def compute_inflation_scenario(
    profile: Dict[str, Any],
    inflation_rate: float = 0.08,
    horizon: int = 12,
) -> Dict[str, Any]:
    """Simulate inflation pressure across the horizon."""
    base_income = float(profile.get("monthly_income", 0))
    base_expense = float(profile.get("monthly_outflow", 0))

    monthly_inflation = inflation_rate / 12.0
    baseline_inflation = 0.065 / 12.0

    baseline_series = []
    shock_series = []

    for m in range(1, horizon + 1):
        bl_exp = base_expense * ((1 + baseline_inflation) ** m)
        bl_inc = base_income * ((1 + 0.025 / 12.0) ** m)
        baseline_series.append({
            "month": f"M{m}",
            "income": round(bl_inc, 0),
            "expense": round(bl_exp, 0),
            "savings": round(bl_inc - bl_exp, 0),
        })

        sk_exp = base_expense * ((1 + monthly_inflation) ** m)
        sk_inc = base_income * ((1 + 0.015 / 12.0) ** m)
        shock_series.append({
            "month": f"M{m}",
            "income": round(sk_inc, 0),
            "expense": round(sk_exp, 0),
            "savings": round(sk_inc - sk_exp, 0),
        })

    end_baseline_surplus = baseline_series[-1]["savings"]
    end_shock_surplus = shock_series[-1]["savings"]
    surplus_drop = end_baseline_surplus - end_shock_surplus

    return {
        "inflation_rate_pct": round(inflation_rate * 100, 1),
        "horizon_months": horizon,
        "end_baseline_expense": baseline_series[-1]["expense"],
        "end_shock_expense": shock_series[-1]["expense"],
        "surplus_reduction": round(surplus_drop, 2),
        "baseline": baseline_series,
        "series": shock_series,
        "math_steps": [
            f"1. Compounding Outflows: Base expense ₹{base_expense:,.0f} inflated at {inflation_rate*100:.1f}% annualized.",
            f"2. Month {horizon} Outflow: Climbs from baseline ₹{baseline_series[-1]['expense']:,.0f} to ₹{shock_series[-1]['expense']:,.0f} (+₹{shock_series[-1]['expense'] - baseline_series[-1]['expense']:,.0f}).",
            f"3. Net Surplus Drag: Monthly surplus contracts by ₹{surplus_drop:,.0f} by end of horizon.",
        ],
    }


def generate_suggested_prompts(profile: Dict[str, Any]) -> List[Dict[str, str]]:
    """Contextually generate 4 suggested prompt cards from the user's financial profile."""
    prompts = []
    surplus = float(profile.get("monthly_surplus", 0))
    dti = float(profile.get("debt_service_ratio", 0)) * 100
    credit = float(profile.get("credit_score", 750))
    trend = float(profile.get("spending_trend", 0)) * 100

    if surplus < 0:
        prompts.append({
            "text": f"Why is my monthly surplus negative (-₹{abs(surplus):,.0f}) and how do I fix it?",
            "category": "risk",
        })
    else:
        prompts.append({
            "text": f"How should I allocate my monthly surplus of ₹{surplus:,.0f} into SIPs?",
            "category": "growth",
        })

    if dti > 35:
        prompts.append({
            "text": f"My DTI is high at {dti:.1f}%. Should I prepay my outstanding loans?",
            "category": "debt",
        })
    else:
        prompts.append({
            "text": "Should I take on an ₹8L car loan right now?",
            "category": "debt",
        })

    prompts.append({
        "text": "What happens to my savings if inflation jumps to 8%?",
        "category": "risk",
    })

    prompts.append({
        "text": "Can I afford a ₹75L house in 24 months?",
        "category": "milestone",
    })

    return prompts[:4]
