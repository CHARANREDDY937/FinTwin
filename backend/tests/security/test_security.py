import pytest
from httpx import AsyncClient
from services.bank_statement_parser import sanitize_pii
from auth.jwt import create_access_token
from datetime import timedelta

pytestmark = pytest.mark.asyncio


async def test_idor_conversation_access_prevention(user_a: dict, user_b: dict, async_client: AsyncClient):
    # User A creates conversation
    create_resp = await async_client.post(
        "/chat/conversations",
        json={"title": "User A Private Confidential Chat"},
        headers=user_a["headers"]
    )
    assert create_resp.status_code == 200
    conv_id = create_resp.json()["id"]

    # User A writes sensitive message
    await async_client.post(
        "/chat/messages",
        json={
            "role": "user",
            "content": "Secret salary is ₹50,00,000",
            "conversation_id": conv_id,
        },
        headers=user_a["headers"]
    )

    # User B attempts to read User A's conversation messages
    idor_read_resp = await async_client.get(
        f"/chat/conversations/{conv_id}/messages",
        headers=user_b["headers"]
    )
    assert idor_read_resp.status_code == 404, "User B was able to access User A's conversation!"

    # User B attempts to rename User A's conversation
    idor_rename_resp = await async_client.patch(
        f"/chat/conversations/{conv_id}",
        json={"title": "Hacked Conversation"},
        headers=user_b["headers"]
    )
    assert idor_rename_resp.status_code == 404, "User B was able to modify User A's conversation!"

    # User B attempts to delete User A's conversation
    idor_delete_resp = await async_client.delete(
        f"/chat/conversations/{conv_id}",
        headers=user_b["headers"]
    )
    assert idor_delete_resp.status_code == 404, "User B was able to delete User A's conversation!"


async def test_idor_financial_month_isolation(user_a: dict, user_b: dict, async_client: AsyncClient):
    # User A creates a unique financial month
    month_key = "2023-11"
    await async_client.post(
        "/financial/months",
        json={
            "month": month_key,
            "active_income": 350000,
            "credit_score": 820,
        },
        headers=user_a["headers"]
    )

    # User B lists their own months
    user_b_months = await async_client.get("/financial/months", headers=user_b["headers"])
    assert user_b_months.status_code == 200
    user_b_month_keys = [m["month"] for m in user_b_months.json()]
    assert month_key not in user_b_month_keys, "User B can see User A's financial months!"

    # User B attempts to delete User A's month
    del_resp = await async_client.delete(f"/financial/months/{month_key}", headers=user_b["headers"])
    assert del_resp.status_code == 404, "User B was able to delete User A's financial month!"


async def test_expired_token_rejected(user_a: dict, async_client: AsyncClient):
    expired_token = create_access_token(
        data={"sub": user_a["id"]},
        expires_delta=timedelta(seconds=-10)  # Already expired in the past
    )
    resp = await async_client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401


async def test_sql_injection_resilience(user_a: dict, async_client: AsyncClient):
    # Attempt SQL injection in month path parameter
    sqli_month = "2024-01' OR '1'='1"
    resp = await async_client.delete(f"/financial/months/{sqli_month}", headers=user_a["headers"])
    # Should safely return 404 or 422, never 500 SQL syntax error
    assert resp.status_code in [404, 422]

    # Attempt SQL injection in conversation title
    sqli_title = "Safe'; DROP TABLE users; --"
    create_resp = await async_client.post(
        "/chat/conversations",
        json={"title": sqli_title},
        headers=user_a["headers"]
    )
    assert create_resp.status_code == 200
    assert create_resp.json()["title"] == sqli_title

    # Verify users table is intact
    me_resp = await async_client.get("/auth/me", headers=user_a["headers"])
    assert me_resp.status_code == 200


def test_pii_sanitization_rules():
    text = (
        "Transfer of Rs 50000 to 9876543210 via UPI ram.kumar@okhdfcbank "
        "Account 50100234567890 IFSC HDFC0000123 PAN ABCDE1234F"
    )
    sanitized = sanitize_pii(text)
    assert "9876543210" not in sanitized
    assert "ram.kumar@okhdfcbank" not in sanitized
    assert "50100234567890" not in sanitized
    assert "ABCDE1234F" not in sanitized
    assert "[PHONE_MASKED]" in sanitized or "[UPI_MASKED]" in sanitized
    assert "[ACCT_MASKED]" in sanitized
    assert "[PAN_MASKED]" in sanitized
