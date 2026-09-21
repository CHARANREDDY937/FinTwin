import re

# Standard exchange rate: 1 USD = 95.91 INR
USD_TO_INR_RATE = 95.91
INR_TO_USD_RATE = 1.0 / USD_TO_INR_RATE


def convert_usd_to_inr(amount_usd: float) -> float:
    """Converts USD to INR using the standard rate of 95.91."""
    return round(float(amount_usd) * USD_TO_INR_RATE, 2)


def convert_inr_to_usd(amount_inr: float) -> float:
    """Converts INR to USD using the standard rate of 1 USD = 95.91 INR."""
    return round(float(amount_inr) * INR_TO_USD_RATE, 2)


def ensure_inr(text: str) -> str:
    """
    Normalizes monetary output for the Indian financial context:
    1. If the text has intentional currency conversion or explicit USD context
       (e.g., '1 USD = 95.91 INR', '$990.51 USD', 'in dollars: $100'), it preserves it.
    2. Any mislabeled dollar signs on user profile quantities (e.g. '$95,000' for a ₹95,000 salary)
       are corrected to '₹95,000' (same value, symbol change only).
    3. Cleans up any double symbols (₹₹ -> ₹).
    """
    if not text:
        return text

    cleaned = str(text)

    # Protect intentional conversion expressions like "1 USD = 95.91 INR" or "1 USD = ₹95.91"
    tokens = {}
    counter = [0]

    def stash_match(match):
        token = f"__CURRENCY_PRESERVE_{counter[0]}__"
        counter[0] += 1
        tokens[token] = match.group(0)
        return token

    # Match intentional exchange rate patterns
    rate_pattern = r"(?:1\s*(?:USD|\$)\s*=\s*(?:₹|INR\s*)?95\.91(?:\s*INR)?|95\.91\s*(?:INR|rupees)\s*(?:per|=|to)\s*(?:USD|dollar|\$1))"
    cleaned = re.sub(rate_pattern, stash_match, cleaned, flags=re.IGNORECASE)

    # Match intentional dual-currency expressions
    dual_pattern = r"\$\s*\d[\d,]*(?:\.\d+)?\s*(?:USD|dollars?)\b"
    cleaned = re.sub(dual_pattern, stash_match, cleaned, flags=re.IGNORECASE)

    # Convert any remaining mislabeled $ figures to ₹ (same value, symbol change)
    cleaned = re.sub(r"\$\s*(\d[\d,]*(?:\.\d+)?)", r"₹\1", cleaned)

    # Standalone '$' -> '₹'
    cleaned = cleaned.replace("$", "₹")

    # Restore preserved tokens
    for token, original in tokens.items():
        cleaned = cleaned.replace(token, original)

    # Deduplicate double symbols
    cleaned = re.sub(r"₹\s*₹+", "₹", cleaned)

    return cleaned
