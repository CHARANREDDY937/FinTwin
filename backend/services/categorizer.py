import re
import json
import logging
from typing import List, Dict, Any, Optional
from services.groq_service import GroqService

logger = logging.getLogger("FinTwin.Categorizer")

# Canonical FinTwin category keys
CAT_ACTIVE_INCOME = "active_income"
CAT_PASSIVE_INCOME = "passive_income"
CAT_MONEY_SPENT = "money_spent"
CAT_EMI = "emi_monthly"
CAT_MISC = "miscellaneous_charges"
CAT_INVESTMENT = "investment"

# Category metadata labels for UI display
CATEGORY_META = {
    CAT_ACTIVE_INCOME: {"label": "Active Income", "type": "credit", "color": "#10B981"},
    CAT_PASSIVE_INCOME: {"label": "Passive Income", "type": "credit", "color": "#06B6D4"},
    CAT_MONEY_SPENT: {"label": "Living Expense", "type": "debit", "color": "#F43F5E"},
    CAT_EMI: {"label": "EMI / Loan", "type": "debit", "color": "#F59E0B"},
    CAT_MISC: {"label": "Misc Charges", "type": "debit", "color": "#8B5CF6"},
    CAT_INVESTMENT: {"label": "Investment / Savings", "type": "neutral", "color": "#3B82F6"},
}

# 100+ Indian Banking & Merchant Signatures (Uppercase regex patterns)
DETERMINISTIC_RULES = [
    # -------------------------------------------------------------
    # 1. ACTIVE INCOME (Salary, Payroll, Consulting, Employer NEFT)
    # -------------------------------------------------------------
    (
        r"\b(SALARY|SAL|PAYROLL|STIPEND|BONUS|INCENTIVE|CONSULTING|PROFESSIONAL\s*FEE|HONORARIUM)\b|"
        r"\b(INFOSYS|TCS|TATA\s*CONSULTANCY|WIPRO|ACCENTURE|COGNIZANT|CAPGEMINI|HCL\s*TECH|TECH\s*MAHINDRA|"
        r"GOOGLE|MICROSOFT|AMAZON\s*DEV|META|APPLE|FLIPKART\s*INT|SWIGGY\s*TECH|ZOMATO\s*TECH|"
        r"DELOITTE|PWC|EY|KPMG|MCKINSEY|BOSTON\s*CONSULTING)\b|"
        r"(?:ACH|CMS|NEFT|RTGS)[-/].*(?:SAL|PAYROLL|EMPLOYER)",
        CAT_ACTIVE_INCOME,
        "Salary / Professional Income",
        0.98,
    ),
    # -------------------------------------------------------------
    # 2. PASSIVE INCOME (Dividends, Interest, FD/RD payout, Rental)
    # -------------------------------------------------------------
    (
        r"\b(DIVIDEND|DIV\s*PAY|FD\s*INT|RD\s*INT|SB\s*INT|INTEREST\s*CREDIT|RENTAL\s*INCOME|"
        r"INTEREST\s*PAID|INT\.PD|MOD\s*INTEREST|TERM\s*DEP.*INT|TAX\s*REFUND|IT\s*REFUND)\b",
        CAT_PASSIVE_INCOME,
        "Dividends & Interest",
        0.95,
    ),
    # -------------------------------------------------------------
    # 3. EMI / LOANS / CREDIT REPAYMENTS
    # -------------------------------------------------------------
    (
        r"\b(BAJAJ\s*FINANCE|BAJAJ\s*FINSERV|HDFC\s*LOAN|SBI\s*LOAN|ICICI\s*HOME\s*LOAN|AXIS\s*LOAN|"
        r"KOTAK\s*LOAN|TATA\s*CAPITAL|L&T\s*FINANCE|CHOLAMANDALAM|PIRAMAL\s*CAPITAL|IDFC\s*FIRST\s*LOAN|"
        r"HOME\s*LOAN|HOUSING\s*LOAN|CAR\s*LOAN|AUTO\s*LOAN|PERSONAL\s*LOAN|EDUCATION\s*LOAN|"
        r"KREDITBEE|MONEYVIEW|EARLYSALARY|CASHE|FIBE|PAYENSE|ZOLOSTAYS\s*RENT|"
        r"CREDIT\s*CARD\s*PMT|CARD\s*PAYMENT|AUTOPAY\s*LOAN|ACH\s*LOAN|NACH.*LOAN|ECS.*LOAN)\b|"
        r"(?:ACH|NACH|ECS)[-/].*(?:LOAN|FIN|BAJAJ|HDFC|HDFC\s*BANK\s*LN)",
        CAT_EMI,
        "Loan EMI / Credit Payment",
        0.95,
    ),
    # -------------------------------------------------------------
    # 4. INVESTMENTS & WEALTH ACCUMULATION
    # -------------------------------------------------------------
    (
        r"\b(ZERODHA|KITE|GROWW|UPSTOX|ANGEL\s*ONE|INDMONEY|SHAREKHAN|MOTILAL\s*OSWAL|GEOGIT|"
        r"MUTUAL\s*FUND|MF\s*PURCHASE|SIP\s*DEBIT|ACH.*MF|NACH.*MF|CAMSONLINE|KFINTECH|"
        r"PPF|PUBLIC\s*PROVIDENT|NPS\s*CRA|NATIONAL\s*PENSION|SUKANYA\s*SAMRIDDHI|SGB|SOVEREIGN\s*GOLD|"
        r"SBI\s*MUTUAL|HDFC\s*MUTUAL|ICICI\s*PRUDENTIAL|NIPPON\s*INDIA|MIRAE\s*ASSET|QUANT\s*MUTUAL|"
        r"PARAG\s*PARIKH|AXIS\s*MUTUAL|UTI\s*MUTUAL)\b",
        CAT_INVESTMENT,
        "Investments & Mutual Funds",
        0.95,
    ),
    # -------------------------------------------------------------
    # 5. LIVING EXPENSES: FOOD & DINING
    # -------------------------------------------------------------
    (
        r"\b(SWIGGY|ZOMATO|DOMINOS|MCDONALDS|KFC|BURGER\s*KING|PIZZA\s*HUT|SUBWAY|STARBUCKS|"
        r"CHAAYOS|CHAI\s*POINT|BARBEQUE\s*NATION|HALDIRAMS|BIKANERVALA|PARADISE\s*BIRYANI|BEHROUZ|"
        r"FAASOS|BOX8|EATCLUB|CAFE\s*COFFEE\s*DAY|CCD|THE\s*BEER\s*CAFE|SOCIAL|SMOKE\s*HOUSE)\b",
        CAT_MONEY_SPENT,
        "Food & Dining",
        0.95,
    ),
    # -------------------------------------------------------------
    # 6. LIVING EXPENSES: GROCERIES & QUICK COMMERCE
    # -------------------------------------------------------------
    (
        r"\b(BLINKIT|ZEPTO|BIGBASKET|INSTAMART|DUNZO|DMART|SPENCERS|MORE\s*RETAIL|RELIANCE\s*FRESH|"
        r"RELIANCE\s*SMART|NATURES\s*BASKET|COUNTRY\s*DELIGHT|MILKBASKET|BB\s*DAILY|APOLLO\s*PHARMACY|"
        r"1MG|PHARMEASY|MEDPLUS|NETMEDS|TATA\s*1MG|MEDLIFE)\b",
        CAT_MONEY_SPENT,
        "Groceries & Essentials",
        0.95,
    ),
    # -------------------------------------------------------------
    # 7. LIVING EXPENSES: COMMUTE, FUEL & TRAVEL
    # -------------------------------------------------------------
    (
        r"\b(UBER|OLA|RAPIDO|NANDI\s*TOYOTA|IRCTC|INDIAN\s*RAILWAYS|MAKEMYTRIP|MMT|GOIBIBO|"
        r"EASEMYTRIP|YATRA|CLEARTRIP|INDIGO|AIR\s*INDIA|SPICEJET|VISTARA|AKASA\s*AIR|"
        r"RED\s*BUS|ABHIBUS|METRO\s*RECHARGE|DMRC|BMRC|MAHA\s*METRO|FASTAG|NETC\s*FASTAG|"
        r"HPCL|BPCL|IOCL|SHELL|INDIAN\s*OIL|BHARAT\s*PETROL|HINDUSTAN\s*PETROL)\b",
        CAT_MONEY_SPENT,
        "Transport & Travel",
        0.95,
    ),
    # -------------------------------------------------------------
    # 8. LIVING EXPENSES: SHOPPING & E-COMMERCE
    # -------------------------------------------------------------
    (
        r"\b(AMAZON|AMZN|FLIPKART|MYNTRA|AJIO|NYKAA|TATA\s*CLIQ|MEESHO|SNAPDEAL|DECATHLON|"
        r"ZARA|H&M|UNIQLO|LIFESTYLE|MAX\s*FASHION|PANTALOONS|WESTSIDE|CROMA|VIJAY\s*SALES|"
        r"RELIANCE\s*DIGITAL|IKEA|PEPPERFRY|URBAN\s*LADDER|LENSKART|TITAN|TANISHQ)\b",
        CAT_MONEY_SPENT,
        "Shopping & E-Commerce",
        0.93,
    ),
    # -------------------------------------------------------------
    # 9. LIVING EXPENSES: UTILITIES, BILLS & RECHARGES
    # -------------------------------------------------------------
    (
        r"\b(BESCOM|TSSPDCL|TSNPDCL|TANGEDCO|MSEB|MSEDCL|BSES|TATA\s*POWER|ADANI\s*ELECTRICITY|"
        r"AIRTEL|BHARTI\s*AIRTEL|JIO|RELIANCE\s*JIO|VODAFONE|VI\s*PREPAID|VI\s*POSTPAID|BSNL|"
        r"ACT\s*FIBERNET|HATHWAY|DEN\s*NETWORKS|AIRTEL\s*BROADBAND|JIO\s*FIBER|"
        r"TATAPLAY|TATA\s*SKY|DISH\s*TV|SUN\s*DIRECT|INDRAPRASTHA\s*GAS|IGL|MAHANAGAR\s*GAS|MGL|"
        r"BILLDESK|BBPS|PAYU|RAZORPAY|CRED\s*BILL|PAYTM\s*BILL)\b",
        CAT_MONEY_SPENT,
        "Utilities & Bills",
        0.95,
    ),
    # -------------------------------------------------------------
    # 10. LIVING EXPENSES: ENTERTAINMENT & SUBSCRIPTIONS
    # -------------------------------------------------------------
    (
        r"\b(NETFLIX|SPOTIFY|PRIME\s*VIDEO|DISNEY|HOTSTAR|YOUTUBE|GOOGLE\s*PLAY|APPLE\.COM|"
        r"ITUNES|SONYLIV|ZEE5|JIOCINEMA|BOOKMYSHOW|PVR|INOX|CINEPOLIS|CULT\.FIT|FITPASS|ANYTIME\s*FITNESS)\b",
        CAT_MONEY_SPENT,
        "Entertainment & Subscriptions",
        0.95,
    ),
    # -------------------------------------------------------------
    # 11. MISCELLANEOUS CHARGES (Bank Fees, Penalties, Taxes)
    # -------------------------------------------------------------
    (
        r"\b(ANNUAL\s*(?:MAINTENANCE|FEE|CHG|CHARGES?)|AMC|DEBIT\s*CARD\s*(?:CHG|CHARGES?)|SMS\s*(?:CHG|CHARGES?)|MIN\s*BAL|NON\s*MAINTENANCE|"
        r"ATM\s*DECLINE|CONVENIENCE\s*FEE|LATE\s*PMT\s*FEE|CHEQUE\s*RETURN|ECS\s*BOUNCE|"
        r"PENALTY|OVERDRAFT\s*INT|TDS\s*DEDUCTED|GST\s*CHARGES|SERVICE\s*TAX)\b",
        CAT_MISC,
        "Bank Charges & Penalties",
        0.94,
    ),
]


class CategorizationEngine:
    def __init__(self):
        self.compiled_rules = [
            (re.compile(pattern, re.IGNORECASE), category, subcategory, confidence)
            for pattern, category, subcategory, confidence in DETERMINISTIC_RULES
        ]
        self.groq_service = GroqService()

    def categorize_single_deterministic(
        self, narration: str, txn_type: str, amount: float
    ) -> Optional[Dict[str, Any]]:
        """Fast regex pattern matching against 100+ known Indian entities."""
        clean_narration = narration.strip().upper()

        for regex, category, subcategory, confidence in self.compiled_rules:
            if regex.search(clean_narration):
                # Sanity check credit vs debit mapping
                if category == CAT_ACTIVE_INCOME and txn_type.lower() == "debit":
                    # E.g. paying salary to someone else or refunding
                    continue
                return {
                    "category": category,
                    "subcategory": subcategory,
                    "confidence": confidence,
                    "method": "deterministic_regex",
                }
        return None

    def heuristic_fallback(
        self, narration: str, txn_type: str, amount: float
    ) -> Dict[str, Any]:
        """Rule-based smart heuristics for unknown merchants when LLM is unavailable."""
        narration_lower = narration.lower()
        is_credit = txn_type.lower() == "credit"

        if is_credit:
            if amount >= 25000:
                return {
                    "category": CAT_ACTIVE_INCOME,
                    "subcategory": "Unclassified Credit / Income",
                    "confidence": 0.70,
                    "method": "heuristic",
                }
            elif any(w in narration_lower for w in ["refund", "cashback", "reversal"]):
                return {
                    "category": CAT_MONEY_SPENT,
                    "subcategory": "Refund / Cashback",
                    "confidence": 0.85,
                    "method": "heuristic",
                }
            else:
                return {
                    "category": CAT_PASSIVE_INCOME,
                    "subcategory": "Other Credits",
                    "confidence": 0.60,
                    "method": "heuristic",
                }
        else:
            # Debits
            if any(w in narration_lower for w in ["loan", "emi", "nach", "ach", "fin"]):
                return {
                    "category": CAT_EMI,
                    "subcategory": "EMI / Financial Debit",
                    "confidence": 0.75,
                    "method": "heuristic",
                }
            elif amount <= 250 and any(w in narration_lower for w in ["chg", "fee", "tax", "gst"]):
                return {
                    "category": CAT_MISC,
                    "subcategory": "Bank / Service Charges",
                    "confidence": 0.80,
                    "method": "heuristic",
                }
            elif any(w in narration_lower for w in ["fund", "invest", "sip", "share"]):
                return {
                    "category": CAT_INVESTMENT,
                    "subcategory": "Investments",
                    "confidence": 0.80,
                    "method": "heuristic",
                }
            else:
                return {
                    "category": CAT_MONEY_SPENT,
                    "subcategory": "General Expense / UPI Transfer",
                    "confidence": 0.65,
                    "method": "heuristic",
                }

    async def categorize_batch_ai(
        self, unclassified_items: List[Dict[str, Any]]
    ) -> Dict[int, Dict[str, Any]]:
        """Calls Groq LLM with a batched prompt to classify ambiguous Indian transaction narrations."""
        client = self.groq_service._get_client()
        if not client or not unclassified_items:
            return {}

        results = {}
        # Batch into slices of 30 to avoid token limits
        batch_size = 30
        for i in range(0, len(unclassified_items), batch_size):
            batch = unclassified_items[i : i + batch_size]
            prompt_items = [
                {
                    "id": item["idx"],
                    "narration": item["narration"][:100],
                    "type": item["type"],
                    "amount": item["amount"],
                }
                for item in batch
            ]

            system_prompt = (
                "You are an Indian personal finance categorization AI. Classify each banking transaction into "
                "exactly one of the following canonical category keys:\n"
                "- 'active_income': Monthly salary, wages, consultancy, client credit\n"
                "- 'passive_income': Interest, dividends, rental payout, cashback\n"
                "- 'money_spent': Food, groceries, shopping, travel, utilities, fuel, medical, dining\n"
                "- 'emi_monthly': Loan EMI (home/car/personal), credit card payments, NBFC repayment\n"
                "- 'miscellaneous_charges': Bank service charges, ATM fees, penalty, AMC\n"
                "- 'investment': Mutual funds, SIP, stocks, PPF, gold\n\n"
                "Return a raw valid JSON object mapping the transaction id to an object with keys 'category' and 'subcategory'."
            )

            user_prompt = f"Categorize these Indian banking transactions:\n{json.dumps(prompt_items, indent=2)}"

            try:
                response_text = await self.groq_service.chat_completion(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    model="llama-3.1-8b-instant",
                    temperature=0.1,
                    max_tokens=1024,
                )

                if response_text:
                    # Parse JSON safely
                    cleaned = response_text.strip()
                    if "```json" in cleaned:
                        cleaned = cleaned.split("```json")[1].split("```")[0].strip()
                    elif "```" in cleaned:
                        cleaned = cleaned.split("```")[1].split("```")[0].strip()

                    parsed = json.loads(cleaned)
                    # Handle both dictionary {"1": {...}} or list [{id: 1, ...}]
                    if isinstance(parsed, dict):
                        for k, v in parsed.items():
                            idx = int(k)
                            if isinstance(v, dict) and "category" in v:
                                cat = v["category"]
                                if cat not in CATEGORY_META:
                                    cat = CAT_MONEY_SPENT
                                results[idx] = {
                                    "category": cat,
                                    "subcategory": v.get("subcategory", "AI Categorized"),
                                    "confidence": 0.88,
                                    "method": "groq_llm",
                                }
                    elif isinstance(parsed, list):
                        for item in parsed:
                            idx = item.get("id")
                            if idx is not None and "category" in item:
                                cat = item["category"]
                                if cat not in CATEGORY_META:
                                    cat = CAT_MONEY_SPENT
                                results[int(idx)] = {
                                    "category": cat,
                                    "subcategory": item.get("subcategory", "AI Categorized"),
                                    "confidence": 0.88,
                                    "method": "groq_llm",
                                }
            except Exception as e:
                logger.warning(f"Batched Groq LLM categorization failed, falling back to heuristics: {e}")

        return results

    async def categorize_transactions(
        self, transactions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Categorizes an entire stream of extracted bank transactions using Regex -> Groq AI -> Heuristics."""
        unclassified = []
        enriched = []

        for idx, txn in enumerate(transactions):
            narration = txn.get("narration") or txn.get("description", "")
            txn_type = txn.get("type", "debit")
            amount = float(txn.get("amount", 0))

            det_result = self.categorize_single_deterministic(narration, txn_type, amount)
            if det_result:
                txn_copy = dict(txn)
                txn_copy.update(det_result)
                enriched.append((idx, txn_copy))
            else:
                unclassified.append({
                    "idx": idx,
                    "narration": narration,
                    "type": txn_type,
                    "amount": amount,
                    "original": txn,
                })

        # Run AI on ambiguous ones
        ai_results = {}
        if unclassified:
            ai_results = await self.categorize_batch_ai(unclassified)

        # Merge results or heuristic fallback
        for item in unclassified:
            idx = item["idx"]
            original = item["original"]
            txn_copy = dict(original)

            if idx in ai_results:
                txn_copy.update(ai_results[idx])
            else:
                heur = self.heuristic_fallback(
                    item["narration"], item["type"], item["amount"]
                )
                txn_copy.update(heur)
            enriched.append((idx, txn_copy))

        # Sort back to original transaction sequence
        enriched.sort(key=lambda x: x[0])
        return [item[1] for item in enriched]


# Global singleton instance
categorizer = CategorizationEngine()
