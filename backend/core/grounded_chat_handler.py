from __future__ import annotations

import re
from typing import Dict, Any, List, Optional
from schemas import FinancialMonth
from core.finance_grounding import (
    compute_cashflow,
    compute_affordability,
    compute_inflation_scenario,
    generate_suggested_prompts,
)
from core.forecasting_engine import ForecastingScenarioEngine
from core.currency import ensure_inr

forecasting_engine = ForecastingScenarioEngine()


def _match_keywords(text: str, keywords: list[str]) -> bool:
    """Check if any keyword appears as a whole word (or standalone token) in text."""
    for kw in keywords:
        # Use word-boundary regex so 'flat' doesn't match inside 'inflation'
        if re.search(r'\b' + re.escape(kw) + r'\b', text, re.IGNORECASE):
            return True
    return False


def build_grounded_response(
    question: str,
    profile: Dict[str, Any],
    months: List[FinancialMonth],
    raw_answer: Optional[str] = None,
    source: str = "ensemble_consensus",
) -> Dict[str, Any]:
    """Deterministically calculate all figures, verdict, math steps, and viz payload."""
    q_lower = question.lower()

    # 1. Baseline forecast series
    baseline_forecast = forecasting_engine.simulate(
        profile=profile,
        months=months,
        model="xgboost",
        scenario="baseline",
        horizon=12,
    )
    baseline_series = [
        {
            "month": f"M{item['month']}",
            "income": item["income"],
            "expense": item["expense"],
            "savings": item["savings"],
            "netWorth": item.get("net_worth_proxy", 0),
        }
        for item in baseline_forecast
    ]

    # 2. Deterministic evaluation by scenario
    if _match_keywords(q_lower, ["house", "home", "flat", "75l", "75 lakh", "mortgage"]):
        aff = compute_affordability(profile, principal=7500000.0, annual_interest_rate=0.085, tenure_years=20)
        scenario_forecast = forecasting_engine.simulate(
            profile=profile, months=months, model="xgboost", scenario="home", horizon=24
        )
        scenario_series = [
            {
                "month": f"M{item['month']}",
                "income": item["income"],
                "expense": item["expense"],
                "savings": item["savings"],
                "netWorth": item.get("net_worth_proxy", 0),
            }
            for item in scenario_forecast
        ]
        key_figures = [
            {"label": "Target Principal", "value": f"₹{aff['principal']:,.0f}"},
            {"label": "Est. Monthly EMI", "value": f"₹{aff['estimated_emi']:,.0f}/mo"},
            {"label": "Projected DTI", "value": f"{aff['projected_dti_pct']}%"},
            {"label": "Post-EMI Surplus", "value": f"₹{aff['projected_surplus']:,.0f}"},
        ]
        assumptions = [
            "Interest Rate: 8.5% p.a. (Home Loan Standard)",
            "Tenure: 20 Years (240 Monthly Installments)",
            "Prudent DTI Ceiling: 45% of Gross Income",
        ]
        confidence = 0.94
        verdict = aff["verdict"]
        verdict_tone = aff["verdict_tone"]
        math_steps = aff["math_steps"]
        viz_payload = {
            "metric": "savings",
            "horizon": 24,
            "scenario": "home",
            "scenario_label": "Home Acquisition (₹75L)",
            "baseline": baseline_series,
            "series": scenario_series,
        }
        surplus_msg = (
            f"Your surplus safely absorbs this payment with ₹{aff['projected_surplus']:,.0f} buffer remaining."
            if aff['is_feasible']
            else "This severely compresses your monthly buffer into a deficit."
        )
        default_narrative = (
            f"{verdict}: Financing a ₹75L home requires an estimated EMI of ₹{aff['estimated_emi']:,.0f}/month. "
            f"This raises your Debt-to-Income (DTI) from {aff['current_dti_pct']}% to {aff['projected_dti_pct']}%. "
            f"{surplus_msg}"
        )

    elif _match_keywords(q_lower, ["car", "vehicle", "auto", "8l", "8 lakh"]):
        aff = compute_affordability(profile, principal=800000.0, annual_interest_rate=0.09, tenure_years=5)
        scenario_forecast = forecasting_engine.simulate(
            profile=profile, months=months, model="xgboost", scenario="vehicle", horizon=12
        )
        scenario_series = [
            {
                "month": f"M{item['month']}",
                "income": item["income"],
                "expense": item["expense"],
                "savings": item["savings"],
                "netWorth": item.get("net_worth_proxy", 0),
            }
            for item in scenario_forecast
        ]
        key_figures = [
            {"label": "Car Loan Amount", "value": f"₹{aff['principal']:,.0f}"},
            {"label": "Monthly EMI", "value": f"₹{aff['estimated_emi']:,.0f}/mo"},
            {"label": "New DTI Ratio", "value": f"{aff['projected_dti_pct']}%"},
            {"label": "Remaining Surplus", "value": f"₹{aff['projected_surplus']:,.0f}"},
        ]
        assumptions = [
            "Interest Rate: 9.0% p.a. (Auto Loan Benchmark)",
            "Tenure: 5 Years (60 Monthly Installments)",
            "Downpayment assumed from existing liquid savings",
        ]
        confidence = 0.95
        verdict = aff["verdict"]
        verdict_tone = aff["verdict_tone"]
        math_steps = aff["math_steps"]
        viz_payload = {
            "metric": "expense",
            "horizon": 12,
            "scenario": "vehicle",
            "scenario_label": "Car Loan Impact (₹8L)",
            "baseline": baseline_series,
            "series": scenario_series,
        }
        default_narrative = (
            f"{verdict}: An ₹8L car loan incurs ₹{aff['estimated_emi']:,.0f}/month for 5 years. "
            f"Your DTI shifts from {aff['current_dti_pct']}% to {aff['projected_dti_pct']}%. "
            f"Post-obligation surplus stands at ₹{aff['projected_surplus']:,.0f}/month."
        )

    elif _match_keywords(q_lower, ["inflation", "cost of living", "prices", "surge", "8%"]):
        inf = compute_inflation_scenario(profile, inflation_rate=0.08, horizon=12)
        scenario_forecast = forecasting_engine.simulate(
            profile=profile, months=months, model="xgboost", scenario="inflation", horizon=12
        )
        scenario_series = [
            {
                "month": f"M{item['month']}",
                "income": item["income"],
                "expense": item["expense"],
                "savings": item["savings"],
                "netWorth": item.get("net_worth_proxy", 0),
            }
            for item in scenario_forecast
        ]
        diff = inf["end_shock_expense"] - inf["end_baseline_expense"]
        key_figures = [
            {"label": "Stress Inflation", "value": "8.0% p.a."},
            {"label": "Baseline Inflation", "value": "6.5% p.a."},
            {"label": "M12 Outflow Drift", "value": f"+₹{diff:,.0f}/mo"},
            {"label": "Surplus Contraction", "value": f"-₹{inf['surplus_reduction']:,.0f}"},
        ]
        assumptions = [
            "Baseline Inflation: 6.5% annual headline CPI",
            "Stress Inflation: 8.0% sustained across 12 months",
            "Income Growth: Conservatively dampened to 1.5% under stagflation",
        ]
        confidence = 0.91
        verdict = "Manageable with 6% Outflow Discipline"
        verdict_tone = "warn"
        math_steps = inf["math_steps"]
        viz_payload = {
            "metric": "expense",
            "horizon": 12,
            "scenario": "inflation",
            "scenario_label": "Inflation Shock (+8%)",
            "baseline": baseline_series,
            "series": scenario_series,
        }
        default_narrative = (
            f"Under an 8.0% sustained inflation shock, your monthly expenses expand by ₹{diff:,.0f} by Month 12 "
            f"compared to baseline. Your monthly surplus contracts by ₹{inf['surplus_reduction']:,.0f}. "
            "Trimming discretionary subscriptions and dining keeps your savings cushion stable."
        )

    elif _match_keywords(q_lower, ["negative", "surplus", "deficit", "why is my surplus"]):
        cf = compute_cashflow(profile)
        surplus = cf["monthly_surplus"]
        key_figures = [
            {"label": "Monthly Inflows", "value": f"₹{cf['monthly_income']:,.0f}"},
            {"label": "Monthly Outflows", "value": f"₹{cf['monthly_outflow']:,.0f}"},
            {"label": "Net Surplus", "value": f"₹{surplus:,.0f}"},
            {"label": "Savings Ratio", "value": f"{cf['savings_rate_pct']}%"},
        ]
        assumptions = [
            "Based on verified statements in statement ledger",
            "Net Surplus = Active + Passive Incomes − (Spent + EMI + Misc Charges)",
        ]
        confidence = 0.98
        if cf["is_deficit"]:
            verdict = "Cashflow Deficit Detected"
            verdict_tone = "alert"
            math_steps = [
                f"1. Total Inflow: ₹{cf['monthly_income']:,.0f}.",
                f"2. Total Outflow: ₹{cf['monthly_outflow']:,.0f}.",
                f"3. Deficit Gap: ₹{cf['monthly_income']:,.0f} - ₹{cf['monthly_outflow']:,.0f} = -₹{abs(surplus):,.0f} monthly drain.",
                "4. Remedy: Reduce discretionary lifestyle outflow or restructure high-interest debt.",
            ]
            default_narrative = (
                f"Your cashflow is currently in a deficit of -₹{abs(surplus):,.0f} per month because total outflows "
                f"(₹{cf['monthly_outflow']:,.0f}) exceed gross monthly receipts (₹{cf['monthly_income']:,.0f}). "
                "Immediate remediation requires pruning non-essential spends and consolidating loans."
            )
        else:
            verdict = "Positive Surplus - Disciplined"
            verdict_tone = "good"
            math_steps = [
                f"1. Inflows: ₹{cf['monthly_income']:,.0f}.",
                f"2. Outflows: ₹{cf['monthly_outflow']:,.0f}.",
                f"3. Net Surplus: ₹{surplus:,.0f} available for systematic wealth building.",
            ]
            default_narrative = (
                f"Your cashflow is healthy with a net monthly surplus of ₹{surplus:,.0f} ({cf['savings_rate_pct']}% savings rate). "
                "Deploying this surplus across emergency funds and equity SIPs guarantees compounding."
            )
        viz_payload = {
            "metric": "savings",
            "horizon": 12,
            "scenario": "baseline",
            "scenario_label": "Cashflow Trajectory",
            "baseline": baseline_series,
            "series": baseline_series,
        }

    else:
        # General cashflow & horizon inquiry
        cf = compute_cashflow(profile)
        key_figures = [
            {"label": "Monthly Inflows", "value": f"₹{cf['monthly_income']:,.0f}"},
            {"label": "Monthly Outflows", "value": f"₹{cf['monthly_outflow']:,.0f}"},
            {"label": "Monthly Surplus", "value": f"₹{cf['monthly_surplus']:,.0f}"},
            {"label": "Credit Score", "value": f"{profile.get('credit_score', 750):.0f}"},
        ]
        assumptions = [
            "Calibrated from your uploaded monthly ledger statements",
            "Baseline inflation pegged at 6.5% p.a.",
            "Historical spending trend incorporated",
        ]
        confidence = 0.93
        verdict = "Stable Twin Baseline"
        verdict_tone = "good" if cf["monthly_surplus"] >= 0 else "alert"
        math_steps = [
            f"1. Inflows: ₹{cf['monthly_income']:,.0f}.",
            f"2. Outflows: ₹{cf['monthly_outflow']:,.0f}.",
            f"3. Monthly Surplus: ₹{cf['monthly_surplus']:,.0f}.",
        ]
        viz_payload = {
            "metric": "expense",
            "horizon": 12,
            "scenario": "baseline",
            "scenario_label": "Baseline Outlook",
            "baseline": baseline_series,
            "series": baseline_series,
        }
        default_narrative = (
            f"Based on your {profile.get('months_tracked', len(months))} months of tracked statement ledgers, "
            f"your monthly income is ₹{cf['monthly_income']:,.0f} against outflows of ₹{cf['monthly_outflow']:,.0f}, "
            f"yielding a monthly surplus of ₹{cf['monthly_surplus']:,.0f}."
        )

    answer_text = raw_answer if (raw_answer and len(raw_answer.strip()) > 20) else default_narrative

    return {
        "answer": ensure_inr(answer_text),
        "verdict": verdict,
        "verdict_tone": verdict_tone,
        "key_figures": key_figures,
        "assumptions": assumptions,
        "confidence": confidence,
        "math_steps": math_steps,
        "viz_payload": viz_payload,
        "disclaimer": "Estimates, not financial advice.",
    }
