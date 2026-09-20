from services.categorizer import categorizer
from services.bank_statement_parser import bank_statement_parser

def main():
    print("Testing HDFC Statement Sample...")
    hdfc = bank_statement_parser.get_sample_hdfc_statement()
    print(f"Detected: {hdfc['bank_detected']}")
    print(f"Transactions: {hdfc['transaction_count']}")
    for m in hdfc['monthly_aggregates']:
        print(f"  Month {m['month']}: Income INR {m['total_income']}, Outflow INR {m['total_outflow']}, Savings INR {m['net_savings']}, Txns: {m['transaction_count']}")

    print("\nTesting PhonePe CSV Sample...")
    phonepe = bank_statement_parser.get_sample_phonepe_csv()
    print(f"Detected: {phonepe['bank_detected']}")
    print(f"Transactions: {phonepe['transaction_count']}")
    for m in phonepe['monthly_aggregates']:
        print(f"  Month {m['month']}: Income INR {m['total_income']}, Outflow INR {m['total_outflow']}, Savings INR {m['net_savings']}, Txns: {m['transaction_count']}")

    print("\nCategorization Test:")
    test_narrations = [
        ("ACH/INFOSYS/SALARY", "credit", 100000),
        ("UPI/SWIGGY/FOOD", "debit", 450),
        ("NACH/BAJAJ FINANCE/EMI", "debit", 3200),
        ("UPI/ZERODHA/SIP", "debit", 10000),
        ("ANNUAL SMS CHARGES", "debit", 25),
        ("DIVIDEND/RELIANCE", "credit", 1500),
    ]
    for nar, t, amt in test_narrations:
        cat = categorizer.categorize_single_deterministic(nar, t, amt)
        print(f"  '{nar}' -> {cat['category']} ({cat['subcategory']})")

if __name__ == "__main__":
    main()
