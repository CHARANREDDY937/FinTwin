from schemas import FinancialMonth


class FinancialDigitalTwinEngine:
    """Builds the user's live financial profile from monthly uploads."""

    def build_profile(self, months: list[FinancialMonth]) -> dict:
        if not months:
            return {
                "months_tracked": 0,
                "active_income": 0,
                "passive_income": 0,
                "monthly_income": 0,
                "monthly_outflow": 0,
                "savings_rate": 0,
                "debt_service_ratio": 0,
                "credit_score": 0,
                "loan_balance": 0,
                "spending_trend": 0,
                "emergency_buffer_months": 0,
            }

        ordered = sorted(months, key=lambda item: item.month)
        latest = ordered[-1]
        previous = ordered[-2] if len(ordered) > 1 else latest
        monthly_income = latest.active_income + latest.passive_income
        monthly_outflow = latest.money_spent + latest.emi_monthly + latest.miscellaneous_charges
        monthly_surplus = monthly_income - monthly_outflow
        spending_trend = (latest.money_spent - previous.money_spent) / max(previous.money_spent, 1)

        return {
            "months_tracked": len(months),
            "active_income": latest.active_income,
            "passive_income": latest.passive_income,
            "monthly_income": monthly_income,
            "monthly_outflow": monthly_outflow,
            "monthly_surplus": monthly_surplus,
            "savings_rate": monthly_surplus / monthly_income if monthly_income else 0,
            "debt_service_ratio": latest.emi_monthly / monthly_income if monthly_income else 0,
            "credit_score": latest.credit_score,
            "loan_balance": latest.loans_outstanding,
            "spending_trend": spending_trend,
            "emergency_buffer_months": max(monthly_surplus, 0) / monthly_outflow if monthly_outflow else 0,
            "average_spend": sum(month.money_spent for month in months) / len(months),
            "average_emi": sum(month.emi_monthly for month in months) / len(months),
            "average_misc": sum(month.miscellaneous_charges for month in months) / len(months),
        }

    def answer_question(self, question: str, profile: dict, forecast: list[dict], explanation: dict) -> str:
        question_text = question.lower()
        next_month = forecast[0] if forecast else {"expense": 0, "savings": 0}
        top_driver = explanation["feature_importance"][0]["feature"] if explanation["feature_importance"] else "monthly spending"

        if "inflation" in question_text or "expense" in question_text:
            return (
                f"Your next-month expense forecast is ₹{next_month['expense']:.0f}. "
                f"The strongest driver is {top_driver}, so controlling that factor will improve the forecast fastest."
            )
        if "loan" in question_text or "emi" in question_text or "debt" in question_text:
            return (
                f"Your EMI burden is {profile['debt_service_ratio']:.1%} of monthly income. "
                "The risk agent recommends lowering debt pressure before adding new loans."
            )
        if "credit" in question_text:
            return (
                f"Your latest credit score is {profile['credit_score']:.0f}. "
                "Keeping EMI stable and paying on time should improve future borrowing readiness."
            )
        if "goal" in question_text or "house" in question_text or "mba" in question_text:
            return (
                f"Your projected monthly savings is ₹{next_month['savings']:.0f}. "
                "Large goals are safer when this value stays positive after EMI and essentials."
            )

        return (
            f"I see {profile['months_tracked']} uploaded month(s). "
            f"Your monthly income is ₹{profile['monthly_income']:.0f}, outflow is ₹{profile['monthly_outflow']:.0f}, "
            f"and the top forecast driver is {top_driver}."
        )
