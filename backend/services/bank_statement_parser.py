import io
import re
import csv
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from pypdf import PdfReader
from services.categorizer import (
    categorizer,
    CAT_ACTIVE_INCOME,
    CAT_PASSIVE_INCOME,
    CAT_MONEY_SPENT,
    CAT_EMI,
    CAT_MISC,
    CAT_INVESTMENT,
)

try:
    import pymupdf
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

logger = logging.getLogger("FinTwin.Parser")

# Common date formats used across Indian banks and UPI apps
DATE_PATTERNS = [
    (r"^\d{2}/\d{2}/\d{4}$", "%d/%m/%Y"),
    (r"^\d{2}-\d{2}-\d{4}$", "%d-%m-%Y"),
    (r"^\d{4}-\d{2}-\d{2}$", "%Y-%m-%d"),
    (r"^\d{2}/[A-Za-z]{3}/\d{4}$", "%d/%b/%Y"),
    (r"^\d{2}-[A-Za-z]{3}-[d\d]{4}$", "%d-%b-%Y"),
    (r"^\d{2}\s+[A-Za-z]{3}\s+\d{4}$", "%d %b %Y"),
    (r"^\d{2}/[A-Za-z]{3}/\d{2}$", "%d/%b/%y"),
    (r"^\d{2}-[A-Za-z]{3}-\d{2}$", "%d-%b-%y"),
    (r"^\d{2}/\d{2}/\d{2}$", "%d/%m/%y"),
]


def parse_indian_date(date_str: str) -> Optional[datetime]:
    """Parse various Indian banking date string representations into a datetime object."""
    if not date_str:
        return None
    cleaned = date_str.strip().replace(",", "")
    for pattern, dt_format in DATE_PATTERNS:
        if re.match(pattern, cleaned, re.IGNORECASE):
            try:
                return datetime.strptime(cleaned, dt_format)
            except ValueError:
                continue
    return None


def clean_amount(val: Any) -> float:
    """Parse currency string like '1,24,500.00' or '₹ 450.50' into float."""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if not s or s == "-" or s == "--":
        return 0.0
    # Remove currency symbols, commas, spaces, CR/DR suffixes
    s = re.sub(r"[₹$,\s]", "", s)
    s = re.sub(r"(?i)(?:cr|dr)$", "", s).strip()
    try:
        return abs(float(s))
    except ValueError:
        return 0.0


class BankStatementParser:
    """End-to-end parser for Indian Bank PDFs (SBI, HDFC, ICICI, Axis, Kotak, etc.) and UPI CSVs."""

    def detect_bank_from_text(self, text: str, header_text: Optional[str] = None) -> Tuple[str, str]:
        """Detect bank identity accurately using header-first priority before scanning narrations."""
        header_upper = (header_text or text[:4000]).upper()
        text_upper = text.upper()

        # Prioritize header / issuer inspection
        for candidate in [header_upper, text_upper]:
            if any(k in candidate for k in ["STATE BANK OF INDIA", "SBIN0", "PERSONAL BKG", "WWW.ONLINESBI.COM", "ONLINE.SBI"]):
                return "State Bank of India", "SBI password hint: Date of Birth (DDMMYYYY) + last 5 digits of registered mobile number."
            elif any(k in candidate for k in ["HDFC BANK LIMITED", "HDFC BANK LTD", "WWW.HDFCBANK.COM", "HDFC000"]):
                return "HDFC Bank", "HDFC password hint: Customer ID (all digits) as per your welcome letter."
            elif any(k in candidate for k in ["ICICI BANK LIMITED", "ICICI BANK LTD", "WWW.ICICIBANK.COM", "ICIC000"]):
                return "ICICI Bank", "ICICI password hint: First 4 letters of your name in lowercase + Date of Birth (DDMM)."
            elif any(k in candidate for k in ["AXIS BANK LIMITED", "AXIS BANK LTD", "AXIS BANK", "UTIB000"]):
                return "Axis Bank", "Axis password hint: First 4 letters of your name in UPPERCASE + last 4 digits of your customer ID."
            elif any(k in candidate for k in ["KOTAK MAHINDRA", "KKBK000"]):
                return "Kotak Mahindra Bank", "Kotak password hint: Customer CRN number or Date of Birth (DDMMYYYY)."
            elif any(k in candidate for k in ["CANARA BANK", "CNRB000"]):
                return "Canara Bank", "Canara password hint: Customer ID or registered mobile."
            elif any(k in candidate for k in ["PUNJAB NATIONAL BANK", "PUNB000"]):
                return "Punjab National Bank", "PNB password hint: Account number or Customer ID."
            elif any(k in candidate for k in ["BANK OF BARODA", "BARB000"]):
                return "Bank of Baroda", "Bank of Baroda password hint: Account number or registered mobile."
            elif any(k in candidate for k in ["UNION BANK OF INDIA", "UBIN000"]):
                return "Union Bank of India", "Union Bank password hint: Customer ID or Date of Birth."
            elif "PHONEPE" in candidate:
                return "PhonePe UPI", "PhonePe export file."
            elif "PAYTM" in candidate:
                return "Paytm Payments Bank", "Paytm statement."

        # Secondary fallback if only short name appears
        if "HDFC" in header_upper:
            return "HDFC Bank", "HDFC password hint: Customer ID (all digits) as per your welcome letter."
        if "ICICI" in header_upper:
            return "ICICI Bank", "ICICI password hint: First 4 letters of your name in lowercase + Date of Birth (DDMM)."

        return "Indian Bank", "Password is typically your Date of Birth (DDMMYYYY) or Customer ID."

    def extract_transactions_block_format(self, text: str) -> List[Dict[str, Any]]:
        """Parse multi-line block statements (e.g. State Bank of India, PNB) where dates,

        codes, narrations, and amounts span consecutive lines in tabular format.
        """
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        date_re = re.compile(r"^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$")
        amount_re = re.compile(r"^\d{1,3}(?:,\d{2,3})*\.\d{2}$")

        transactions = []
        i = 0
        n = len(lines)

        while i < n:
            line = lines[i]
            if date_re.match(line):
                dt = parse_indian_date(line)
                if not dt:
                    i += 1
                    continue

                # Check if immediate next line is Value Date (identical or nearby date)
                j = i + 1
                if j < n and date_re.match(lines[j]):
                    j += 1

                # Gather transaction detail lines until next date or page header/footer
                block_lines = []
                while j < n and not date_re.match(lines[j]):
                    cur_line = lines[j]
                    if (
                        cur_line.startswith("STATEMENT OF ACCOUNT")
                        or cur_line.startswith("Account Summary")
                        or cur_line.startswith("Relationship Summary")
                        or cur_line.startswith("Statement From")
                        or cur_line.lower() in ["page no.", "page no", "balance", "cleared balance"]
                    ):
                        break
                    # Skip standalone page numbers followed by "Page no."
                    if re.match(r"^\d+\s*$", cur_line) and j + 1 < n and lines[j + 1].lower() in ["page no.", "page no"]:
                        j += 2
                        continue

                    block_lines.append(cur_line)
                    j += 1

                # Search for amounts in block lines
                amounts_in_block = []
                for bl in block_lines:
                    m = amount_re.findall(bl)
                    if m:
                        amounts_in_block.extend([clean_amount(x) for x in m])

                if amounts_in_block:
                    block_text = " ".join(block_lines)

                    # Deterministic Credit vs Debit Detection
                    is_credit = bool(
                        re.search(
                            r"(?i)\b(DEP TFR|DEP|CREDIT|CR|UPI/CR/|BY TRANSFER|NEFT CR|RTGS CR|REFUND|SALARY|DIVIDEND|ACH CR|INTEREST CREDITED)\b",
                            block_text,
                        )
                    )
                    is_debit = bool(
                        re.search(
                            r"(?i)\b(WDL TFR|WDL|DEBIT|DR|UPI/DR/|TO TRANSFER|ATM WDL|POS|CHQ WDL|NACH|ACH|EMI)\b",
                            block_text,
                        )
                    )

                    # In multi-column bank layouts (Withdrawal, Deposit, Balance):
                    # If len(amounts) >= 2, the last amount is Balance, and the preceding is txn amount
                    if len(amounts_in_block) >= 2:
                        amt = amounts_in_block[-2]
                        bal = amounts_in_block[-1]
                    else:
                        amt = amounts_in_block[0]
                        bal = 0.0

                    if is_credit and not (is_debit and "WDL TFR" in block_text):
                        txn_type = "credit"
                    elif is_debit:
                        txn_type = "debit"
                    elif is_credit:
                        txn_type = "credit"
                    else:
                        txn_type = "debit"

                    # Clean narration: strip amounts, transaction codes, and redundant punctuation
                    clean_narr = re.sub(r"\b\d{1,3}(?:,\d{2,3})*\.\d{2}\b", "", block_text)
                    clean_narr = re.sub(r"(?i)\b(WDL TFR|DEP TFR)\b", "", clean_narr)
                    clean_narr = re.sub(r"[-–]+", " ", clean_narr)
                    clean_narr = re.sub(r"\s+", " ", clean_narr).strip()

                    if amt > 0:
                        transactions.append({
                            "date": dt.strftime("%Y-%m-%d"),
                            "month": dt.strftime("%Y-%m"),
                            "narration": clean_narr[:140] if clean_narr else "Bank Transaction",
                            "type": txn_type,
                            "amount": amt,
                            "balance": bal,
                            "raw_line": block_text[:120],
                        })

                i = j
            else:
                i += 1

        return transactions

    def extract_transactions_from_pdf_text(self, text: str) -> List[Dict[str, Any]]:
        """Parse tabular lines from bank PDF text into normalized transaction dicts."""
        # Step 1: Try multi-line block parser first (e.g. SBI, PNB format)
        block_txns = self.extract_transactions_block_format(text)
        if len(block_txns) >= 3:
            return block_txns

        # Step 2: Line-by-line tabular parsing (e.g. HDFC, ICICI, Axis format)
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        transactions = []

        # Standard & flexible Indian bank regex for row start:
        # Supports optional serial numbers (e.g. '1 ', '002 ') followed by Date (DD/MM/YYYY, DD-MM-YYYY, DD-Mon-YYYY, DD Mon YYYY)
        row_date_regex = re.compile(
            r"^(?:\d{1,4}\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[/-][A-Za-z]{3}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})\b"
        )
        amount_regex = re.compile(r"\b\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})\b")
        int_amount_regex = re.compile(r"\b\d{1,3}(?:,\d{2,3})+\b")

        current_txn = None

        for line in lines:
            date_match = row_date_regex.match(line)
            if date_match:
                # Save previous transaction if complete
                if current_txn and current_txn.get("amount", 0) > 0:
                    transactions.append(current_txn)

                date_str = date_match.group(1)
                dt = parse_indian_date(date_str)
                iso_date = dt.strftime("%Y-%m-%d") if dt else date_str
                month_key = dt.strftime("%Y-%m") if dt else "2024-04"

                # Find amounts in line
                amounts = amount_regex.findall(line) or int_amount_regex.findall(line)
                remainder = row_date_regex.sub("", line).strip()

                txn_type = "debit"
                amount = 0.0
                balance = 0.0

                if len(amounts) >= 3:
                    # Often: Withdrawal, Deposit, Balance
                    w_amt = clean_amount(amounts[0])
                    d_amt = clean_amount(amounts[1])
                    balance = clean_amount(amounts[2])
                    if d_amt > 0:
                        txn_type = "credit"
                        amount = d_amt
                    else:
                        txn_type = "debit"
                        amount = w_amt
                elif len(amounts) == 2:
                    # Amount and Balance
                    amount = clean_amount(amounts[0])
                    balance = clean_amount(amounts[1])
                    if re.search(r"(?i)\b(cr|credit|deposit|by\s*transfer|neft\s*cr|rtgs\s*cr|ach\s*cr|upi/cr/)\b", line):
                        txn_type = "credit"
                    else:
                        txn_type = "debit"
                elif len(amounts) == 1:
                    amount = clean_amount(amounts[0])
                    if re.search(r"(?i)\b(cr|credit|deposit|by\s*transfer|neft\s*cr|rtgs\s*cr|ach\s*cr|upi/cr/)\b", line):
                        txn_type = "credit"
                    else:
                        txn_type = "debit"

                clean_desc = remainder
                for amt_s in amounts:
                    clean_desc = clean_desc.replace(amt_s, "")
                clean_desc = re.sub(r"\s+", " ", clean_desc).strip()

                current_txn = {
                    "date": iso_date,
                    "month": month_key,
                    "narration": clean_desc if clean_desc else "Bank Transaction",
                    "type": txn_type,
                    "amount": amount,
                    "balance": balance,
                    "raw_line": line,
                }
            elif current_txn:
                # Check if continuation line holds the transaction amounts
                if current_txn.get("amount", 0) == 0:
                    sub_amounts = amount_regex.findall(line) or int_amount_regex.findall(line)
                    if sub_amounts:
                        current_txn["amount"] = clean_amount(sub_amounts[0])
                        if len(sub_amounts) > 1:
                            current_txn["balance"] = clean_amount(sub_amounts[1])
                        if re.search(r"(?i)\b(cr|credit|deposit|upi/cr/|dep\s*tfr)\b", line):
                            current_txn["type"] = "credit"
                if not re.search(r"(?i)\b(page|statement|account number|opening balance|closing balance)\b", line):
                    current_txn["narration"] = (current_txn["narration"] + " " + line).strip()
                    if re.search(r"(?i)\b(upi/cr/|dep\s*tfr|by\s*transfer|neft\s*cr)\b", line):
                        current_txn["type"] = "credit"

        # Append last transaction
        if current_txn and current_txn.get("amount", 0) > 0:
            transactions.append(current_txn)

        # Fallback: If strict line-start regex yielded 0 rows, scan for any lines with date + amount anywhere
        if not transactions:
            fallback_date_regex = re.compile(
                r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[/-][A-Za-z]{3}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})\b"
            )
            for line in lines:
                d_match = fallback_date_regex.search(line)
                amts = amount_regex.findall(line) or int_amount_regex.findall(line)
                if d_match and amts:
                    d_str = d_match.group(1)
                    dt = parse_indian_date(d_str)
                    if dt:
                        iso_d = dt.strftime("%Y-%m-%d")
                        m_k = dt.strftime("%Y-%m")
                        is_cr = bool(re.search(r"(?i)\b(cr|credit|deposit|by\s*transfer|neft\s*cr|rtgs\s*cr|upi/cr/|dep\s*tfr)\b", line))
                        amt = clean_amount(amts[0])
                        if amt > 0:
                            clean_l = fallback_date_regex.sub("", line)
                            for a in amts:
                                clean_l = clean_l.replace(a, "")
                            clean_l = re.sub(r"\s+", " ", clean_l).strip()
                            transactions.append({
                                "date": iso_d,
                                "month": m_k,
                                "narration": clean_l or "Bank Transaction",
                                "type": "credit" if is_cr else "debit",
                                "amount": amt,
                                "balance": clean_amount(amts[1]) if len(amts) > 1 else 0.0,
                                "raw_line": line,
                            })

        return transactions

    def parse_pdf(
        self, file_bytes: bytes, password: Optional[str] = None
    ) -> Dict[str, Any]:
        """Parses a bank statement PDF in-memory with dual PyMuPDF and pypdf engines."""
        combined_text = ""
        header_text = ""
        clean_pwd = password.strip() if password else ""

        # Engine 1: PyMuPDF (Fast, handles all encryption variants seamlessly)
        if HAS_PYMUPDF:
            try:
                doc = pymupdf.open(stream=file_bytes, filetype="pdf")
                if doc.is_encrypted:
                    if not clean_pwd:
                        return {
                            "status": "password_required",
                            "bank_detected": "Encrypted Indian Bank Statement",
                            "hint": "Most Indian bank e-statements are password-protected with your DOB (DDMMYYYY), PAN, or Customer ID.",
                        }
                    auth = doc.authenticate(clean_pwd)
                    if auth <= 0 and password != clean_pwd:
                        auth = doc.authenticate(password)
                    if auth <= 0:
                        return {
                            "status": "invalid_password",
                            "message": "Incorrect password. Please verify your DOB, PAN, or Customer ID format.",
                        }

                pages_text = [p.get_text() for p in doc]
                header_text = "\n".join(pages_text[:2])
                combined_text = "\n".join(pages_text)
            except Exception as pe:
                logger.warning(f"PyMuPDF parse attempt failed, falling back to pypdf: {pe}")
                combined_text = ""

        # Engine 2: pypdf fallback
        if not combined_text:
            try:
                stream = io.BytesIO(file_bytes)
                reader = PdfReader(stream)

                if reader.is_encrypted:
                    if not clean_pwd:
                        return {
                            "status": "password_required",
                            "bank_detected": "Encrypted Indian Bank Statement",
                            "hint": "Most Indian bank e-statements are password-protected with your DOB (DDMMYYYY), PAN, or Customer ID.",
                        }

                    decrypt_success = 0
                    try:
                        decrypt_success = reader.decrypt(clean_pwd)
                        if not decrypt_success and password != clean_pwd:
                            decrypt_success = reader.decrypt(password)
                    except Exception as dec_err:
                        logger.warning(f"Error during pypdf decryption: {dec_err}")
                        decrypt_success = 0

                    if not decrypt_success or int(decrypt_success) == 0:
                        return {
                            "status": "invalid_password",
                            "message": "Incorrect password. Please verify your DOB, PAN, or Customer ID format.",
                        }

                full_text = []
                for page in reader.pages:
                    try:
                        full_text.append(page.extract_text() or "")
                    except Exception as pe:
                        logger.warning(f"pypdf could not extract page text: {pe}")

                header_text = "\n".join(full_text[:2])
                combined_text = "\n".join(full_text)
            except Exception as e:
                logger.exception(f"Both PDF parsing engines failed: {e}")
                return {"status": "error", "message": f"Failed to parse PDF statement: {str(e)}"}

        if not combined_text.strip():
            return {
                "status": "error",
                "message": "No selectable text found in the PDF. Scanned image PDFs without a text layer are not supported.",
            }

        bank_name, bank_hint = self.detect_bank_from_text(combined_text, header_text=header_text)
        transactions = self.extract_transactions_from_pdf_text(combined_text)

        if not transactions:
            return {
                "status": "error",
                "message": f"Could not identify tabular transactions in this {bank_name} statement layout. Please verify it is a valid statement.",
            }

        return {
            "status": "success",
            "bank_detected": bank_name,
            "transaction_count": len(transactions),
            "transactions": transactions,
        }


    def parse_csv(self, file_content: str) -> Dict[str, Any]:
        """Parses bank or UPI CSV files (PhonePe, Google Pay, Paytm, standard bank CSVs)."""
        try:
            # Handle BOM and strip leading/trailing spaces
            content = file_content.lstrip("\ufeff").strip()
            lines = content.splitlines()
            if not lines:
                return {"status": "error", "message": "CSV file is empty."}

            # Sniff delimiter
            sample = "\n".join(lines[:5])
            try:
                sniffer = csv.Sniffer()
                dialect = sniffer.sniff(sample, delimiters=",\t;|")
                delimiter = dialect.delimiter
            except Exception:
                delimiter = ","

            reader = csv.DictReader(lines, delimiter=delimiter)
            fieldnames = [f.strip() for f in (reader.fieldnames or [])]

            # Find matching column names case-insensitively
            col_map = {}
            for col in fieldnames:
                c_low = col.lower()
                if not col_map.get("date") and any(k in c_low for k in ["date", "time", "txn_dt"]):
                    col_map["date"] = col
                elif not col_map.get("narration") and any(
                    k in c_low for k in ["narration", "description", "particulars", "remarks", "details", "merchant", "paid to", "receiver"]
                ):
                    col_map["narration"] = col
                elif not col_map.get("amount") and any(
                    k in c_low for k in ["amount", "txn_amount", "amt", "total"]
                ) and not any(k in c_low for k in ["balance", "bal"]):
                    col_map["amount"] = col
                elif not col_map.get("debit") and any(k in c_low for k in ["debit", "withdrawal", "dr"]):
                    col_map["debit"] = col
                elif not col_map.get("credit") and any(k in c_low for k in ["credit", "deposit", "cr"]):
                    col_map["credit"] = col
                elif not col_map.get("type") and any(k in c_low for k in ["type", "transaction type", "dr_cr", "cr_dr"]):
                    col_map["type"] = col
                elif not col_map.get("ref") and any(k in c_low for k in ["ref", "utr", "upi", "txn id", "cheque"]):
                    col_map["ref"] = col

            transactions = []
            for row in reader:
                # 1. Parse date
                raw_date = row.get(col_map.get("date", "")) or ""
                dt = parse_indian_date(raw_date)
                iso_date = dt.strftime("%Y-%m-%d") if dt else raw_date
                month_key = dt.strftime("%Y-%m") if dt else "2024-04"

                # 2. Parse narration
                narration = row.get(col_map.get("narration", "")) or "Transaction"

                # 3. Parse Amount & Type
                txn_type = "debit"
                amount = 0.0

                if "debit" in col_map and "credit" in col_map:
                    dr_amt = clean_amount(row.get(col_map["debit"]))
                    cr_amt = clean_amount(row.get(col_map["credit"]))
                    if cr_amt > 0:
                        txn_type = "credit"
                        amount = cr_amt
                    else:
                        txn_type = "debit"
                        amount = dr_amt
                elif "amount" in col_map:
                    raw_amt = str(row.get(col_map["amount"], ""))
                    amount = clean_amount(raw_amt)
                    raw_type = str(row.get(col_map.get("type", ""), "")).lower()
                    if "credit" in raw_type or "cr" in raw_type or "+" in raw_amt:
                        txn_type = "credit"
                    elif "debit" in raw_type or "dr" in raw_type or "-" in raw_amt:
                        txn_type = "debit"
                    else:
                        # Guess from narration
                        if re.search(r"(?i)\b(received|credited|refund|salary|dividend)\b", narration):
                            txn_type = "credit"
                        else:
                            txn_type = "debit"

                if amount > 0:
                    transactions.append({
                        "date": iso_date,
                        "month": month_key,
                        "narration": narration.strip(),
                        "type": txn_type,
                        "amount": amount,
                        "reference": row.get(col_map.get("ref", ""), ""),
                    })

            return {
                "status": "success",
                "bank_detected": "UPI / Bank CSV Export",
                "transaction_count": len(transactions),
                "transactions": transactions,
            }
        except Exception as e:
            logger.exception(f"Error parsing CSV statement: {e}")
            return {"status": "error", "message": f"Failed to parse CSV statement: {str(e)}"}

    def aggregate_monthly(
        self, transactions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Roll up itemized categorized transactions into monthly aggregates."""
        months_dict = {}

        for txn in transactions:
            m_key = txn.get("month") or "2024-04"
            if m_key not in months_dict:
                months_dict[m_key] = {
                    "month": m_key,
                    "active_income": 0.0,
                    "passive_income": 0.0,
                    "money_spent": 0.0,
                    "emi_monthly": 0.0,
                    "miscellaneous_charges": 0.0,
                    "investment": 0.0,
                    "total_income": 0.0,
                    "total_outflow": 0.0,
                    "net_savings": 0.0,
                    "transaction_count": 0,
                    "transactions": [],
                }

            cat = txn.get("category", CAT_MONEY_SPENT)
            amt = float(txn.get("amount", 0.0))
            txn_type = txn.get("type", "debit")

            if cat == CAT_ACTIVE_INCOME:
                months_dict[m_key]["active_income"] += amt
                months_dict[m_key]["total_income"] += amt
            elif cat == CAT_PASSIVE_INCOME:
                months_dict[m_key]["passive_income"] += amt
                months_dict[m_key]["total_income"] += amt
            elif cat == CAT_EMI:
                months_dict[m_key]["emi_monthly"] += amt
                months_dict[m_key]["total_outflow"] += amt
            elif cat == CAT_MISC:
                months_dict[m_key]["miscellaneous_charges"] += amt
                months_dict[m_key]["total_outflow"] += amt
            elif cat == CAT_INVESTMENT:
                months_dict[m_key]["investment"] += amt
                # Note: investment is surplus allocation, not mandatory expense
            else:
                # Standard Living Expense (CAT_MONEY_SPENT)
                if txn_type == "debit":
                    months_dict[m_key]["money_spent"] += amt
                    months_dict[m_key]["total_outflow"] += amt
                else:
                    # A credit mapped to spent is a refund
                    months_dict[m_key]["money_spent"] = max(0.0, months_dict[m_key]["money_spent"] - amt)
                    months_dict[m_key]["total_outflow"] = max(0.0, months_dict[m_key]["total_outflow"] - amt)

            months_dict[m_key]["transaction_count"] += 1
            months_dict[m_key]["transactions"].append(txn)

        # Compute net savings and round figures
        summary_list = []
        for m_key in sorted(months_dict.keys(), reverse=True):
            m = months_dict[m_key]
            m["active_income"] = round(m["active_income"], 2)
            m["passive_income"] = round(m["passive_income"], 2)
            m["money_spent"] = round(m["money_spent"], 2)
            m["emi_monthly"] = round(m["emi_monthly"], 2)
            m["miscellaneous_charges"] = round(m["miscellaneous_charges"], 2)
            m["investment"] = round(m["investment"], 2)
            m["total_income"] = round(m["total_income"], 2)
            m["total_outflow"] = round(m["total_outflow"], 2)
            m["net_savings"] = round(m["total_income"] - m["total_outflow"], 2)
            summary_list.append(m)

        return summary_list

    async def ingest_file(
        self,
        file_bytes: bytes,
        filename: str,
        password: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Unified ingestion pipeline: Detect format -> Parse -> Categorize -> Aggregate."""
        is_pdf = filename.lower().endswith(".pdf")
        is_csv = filename.lower().endswith(".csv") or filename.lower().endswith(".txt")

        if is_pdf:
            parse_res = self.parse_pdf(file_bytes, password=password)
        elif is_csv:
            try:
                text_content = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                text_content = file_bytes.decode("latin-1", errors="ignore")
            parse_res = self.parse_csv(text_content)
        else:
            return {
                "status": "error",
                "message": "Unsupported file format. Please upload a PDF bank statement or a CSV export.",
            }

        # Handle password required or parse errors
        if parse_res.get("status") in ["password_required", "invalid_password", "error"]:
            return parse_res

        raw_txns = parse_res.get("transactions", [])
        if not raw_txns:
            return {
                "status": "error",
                "message": "No valid financial transactions could be parsed from the uploaded file.",
            }

        # Step 2: Categorization (Hybrid Regex + Groq AI)
        categorized_txns = await categorizer.categorize_transactions(raw_txns)

        # Step 3: Monthly Roll-up Aggregation
        monthly_aggregates = self.aggregate_monthly(categorized_txns)

        return {
            "status": "success",
            "bank_detected": parse_res.get("bank_detected", "Indian Bank"),
            "filename": filename,
            "transaction_count": len(categorized_txns),
            "transactions": categorized_txns,
            "monthly_aggregates": monthly_aggregates,
        }

    # -------------------------------------------------------------
    # Authentic Sample Fixtures for 1-Click Zero-Friction Testing
    # -------------------------------------------------------------
    def get_sample_hdfc_statement(self) -> Dict[str, Any]:
        """Returns authentic simulated HDFC Bank statement transactions across 2 months."""
        sample_txns = [
            # Month 2024-05
            {"date": "2024-05-01", "month": "2024-05", "narration": "ACH/INFOSYS LTD/SALARY/MAY2024", "type": "credit", "amount": 105000.0, "balance": 145000.0},
            {"date": "2024-05-02", "month": "2024-05", "narration": "NACH/HDFC HOME LOAN/EMI-4091823", "type": "debit", "amount": 28500.0, "balance": 116500.0},
            {"date": "2024-05-03", "month": "2024-05", "narration": "UPI/SWIGGY/4058291039/FOOD", "type": "debit", "amount": 540.0, "balance": 115960.0},
            {"date": "2024-05-05", "month": "2024-05", "narration": "UPI/ZEPTO/382910382/GROCERY", "type": "debit", "amount": 1250.0, "balance": 114710.0},
            {"date": "2024-05-08", "month": "2024-05", "narration": "UPI/UBER INDIA/RIDE-TRIP-92", "type": "debit", "amount": 380.0, "balance": 114330.0},
            {"date": "2024-05-10", "month": "2024-05", "narration": "ACH/ZERODHA BROKING/KITE-SIP", "type": "debit", "amount": 15000.0, "balance": 99330.0},
            {"date": "2024-05-12", "month": "2024-05", "narration": "UPI/BESCOM ELECTRICITY BILL/BANGALORE", "type": "debit", "amount": 2400.0, "balance": 96930.0},
            {"date": "2024-05-15", "month": "2024-05", "narration": "UPI/AMAZON SELLER SERVICES/SHOPPING", "type": "debit", "amount": 4200.0, "balance": 92730.0},
            {"date": "2024-05-18", "month": "2024-05", "narration": "UPI/ZOMATO RESTAURANT/DINING", "type": "debit", "amount": 1450.0, "balance": 91280.0},
            {"date": "2024-05-20", "month": "2024-05", "narration": "DIVIDEND CREDIT/TCS LIMITED/DIV2024", "type": "credit", "amount": 3500.0, "balance": 94780.0},
            {"date": "2024-05-25", "month": "2024-05", "narration": "DEBIT CARD ANNUAL MAINTENANCE CHARGES + GST", "type": "debit", "amount": 590.0, "balance": 94190.0},
            {"date": "2024-05-28", "month": "2024-05", "narration": "UPI/APOLLO PHARMACY/HEALTH", "type": "debit", "amount": 890.0, "balance": 93300.0},

            # Month 2024-06
            {"date": "2024-06-01", "month": "2024-06", "narration": "ACH/INFOSYS LTD/SALARY/JUNE2024", "type": "credit", "amount": 105000.0, "balance": 198300.0},
            {"date": "2024-06-02", "month": "2024-06", "narration": "NACH/HDFC HOME LOAN/EMI-4091823", "type": "debit", "amount": 28500.0, "balance": 169800.0},
            {"date": "2024-06-04", "month": "2024-06", "narration": "UPI/BLINKIT/QUICK COMMERCE", "type": "debit", "amount": 1100.0, "balance": 168700.0},
            {"date": "2024-06-06", "month": "2024-06", "narration": "UPI/AIRTEL BROADBAND/FIBER BILL", "type": "debit", "amount": 1179.0, "balance": 167521.0},
            {"date": "2024-06-09", "month": "2024-06", "narration": "ACH/ZERODHA BROKING/KITE-SIP", "type": "debit", "amount": 15000.0, "balance": 152521.0},
            {"date": "2024-06-11", "month": "2024-06", "narration": "UPI/DECATHLON SPORTS/FITNESS", "type": "debit", "amount": 3400.0, "balance": 149121.0},
            {"date": "2024-06-14", "month": "2024-06", "narration": "UPI/SWIGGY/492018301/DINNER", "type": "debit", "amount": 720.0, "balance": 148401.0},
            {"date": "2024-06-16", "month": "2024-06", "narration": "UPI/HPCL PETROL BUNK/FUEL", "type": "debit", "amount": 2800.0, "balance": 145601.0},
            {"date": "2024-06-20", "month": "2024-06", "narration": "FD INTEREST CREDITED/HDFC BANK FD-8921", "type": "credit", "amount": 4200.0, "balance": 149801.0},
            {"date": "2024-06-24", "month": "2024-06", "narration": "SMS CHARGES QUARTERLY + GST", "type": "debit", "amount": 23.60, "balance": 149777.40},
            {"date": "2024-06-27", "month": "2024-06", "narration": "UPI/ZOMATO RESTAURANT/FOOD", "type": "debit", "amount": 650.0, "balance": 149127.40},
        ]

        # Deterministically categorize
        for t in sample_txns:
            det = categorizer.categorize_single_deterministic(t["narration"], t["type"], t["amount"])
            if det:
                t.update(det)
            else:
                heur = categorizer.heuristic_fallback(t["narration"], t["type"], t["amount"])
                t.update(heur)

        aggregates = self.aggregate_monthly(sample_txns)
        return {
            "status": "success",
            "bank_detected": "HDFC Bank (Sample E-Statement)",
            "filename": "sample_hdfc_bank_statement.pdf",
            "transaction_count": len(sample_txns),
            "transactions": sample_txns,
            "monthly_aggregates": aggregates,
        }

    def get_sample_phonepe_csv(self) -> Dict[str, Any]:
        """Returns authentic simulated PhonePe UPI export transactions for 1-click testing."""
        sample_txns = [
            {"date": "2024-06-01", "month": "2024-06", "narration": "Payment to Swiggy via PhonePe UPI", "type": "debit", "amount": 420.0, "reference": "T240601Swiggy"},
            {"date": "2024-06-03", "month": "2024-06", "narration": "Payment to Blinkit Quick Mart", "type": "debit", "amount": 890.0, "reference": "T240603Blinkit"},
            {"date": "2024-06-05", "month": "2024-06", "narration": "Payment to Uber India Rides", "type": "debit", "amount": 310.0, "reference": "T240605Uber"},
            {"date": "2024-06-07", "month": "2024-06", "narration": "Monthly Rent Transfer to Landlord Sharma", "type": "debit", "amount": 22000.0, "reference": "T240607Rent"},
            {"date": "2024-06-10", "month": "2024-06", "narration": "Payment to Groww Investment UPI", "type": "debit", "amount": 10000.0, "reference": "T240610Groww"},
            {"date": "2024-06-12", "month": "2024-06", "narration": "Payment to BESCOM Electricity billdesk", "type": "debit", "amount": 1850.0, "reference": "T240612Bescom"},
            {"date": "2024-06-15", "month": "2024-06", "narration": "Payment to D-Mart Hypermarket Grocery", "type": "debit", "amount": 5400.0, "reference": "T240615Dmart"},
            {"date": "2024-06-18", "month": "2024-06", "narration": "Money received from Client Consulting Stipend", "type": "credit", "amount": 45000.0, "reference": "T240618Consulting"},
            {"date": "2024-06-22", "month": "2024-06", "narration": "Payment to Netflix India Subscription", "type": "debit", "amount": 649.0, "reference": "T240622Netflix"},
            {"date": "2024-06-25", "month": "2024-06", "narration": "Payment to Bharat Petroleum Petrol Fuel", "type": "debit", "amount": 2200.0, "reference": "T240625Fuel"},
        ]

        for t in sample_txns:
            det = categorizer.categorize_single_deterministic(t["narration"], t["type"], t["amount"])
            if det:
                t.update(det)
            else:
                heur = categorizer.heuristic_fallback(t["narration"], t["type"], t["amount"])
                t.update(heur)

        aggregates = self.aggregate_monthly(sample_txns)
        return {
            "status": "success",
            "bank_detected": "PhonePe UPI (Sample CSV)",
            "filename": "sample_phonepe_upi_export.csv",
            "transaction_count": len(sample_txns),
            "transactions": sample_txns,
            "monthly_aggregates": aggregates,
        }


# Global singleton instance
bank_statement_parser = BankStatementParser()
