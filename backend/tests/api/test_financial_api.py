import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_create_month_valid(user_a: dict, async_client: AsyncClient):
    payload = {
        "month": "2024-05",
        "active_income": 95000,
        "passive_income": 5000,
        "credit_score": 770,
        "loans_outstanding": 450000,
        "emi_monthly": 15000,
        "miscellaneous_charges": 1200,
        "money_spent": 35000,
    }
    resp = await async_client.post("/financial/months", json=payload, headers=user_a["headers"])
    assert resp.status_code == 200
    data = resp.json()
    assert data["month"] == "2024-05"
    assert data["active_income"] == 95000
    assert data["credit_score"] == 770


async def test_create_month_invalid_month_format(user_a: dict, async_client: AsyncClient):
    payload = {
        "month": "05-2024",
        "active_income": 50000,
    }
    resp = await async_client.post("/financial/months", json=payload, headers=user_a["headers"])
    assert resp.status_code == 422


async def test_create_month_credit_score_bounds(user_a: dict, async_client: AsyncClient):
    payload = {
        "month": "2024-06",
        "active_income": 50000,
        "credit_score": 950,  # Max allowed is 900
    }
    resp = await async_client.post("/financial/months", json=payload, headers=user_a["headers"])
    assert resp.status_code == 422


async def test_update_existing_month(user_a: dict, async_client: AsyncClient):
    month_data = {
        "month": "2024-07",
        "active_income": 80000,
        "credit_score": 750,
    }
    resp1 = await async_client.post("/financial/months", json=month_data, headers=user_a["headers"])
    assert resp1.status_code == 200

    # Update with new income
    month_data["active_income"] = 120000
    resp2 = await async_client.post("/financial/months", json=month_data, headers=user_a["headers"])
    assert resp2.status_code == 200
    assert resp2.json()["active_income"] == 120000


async def test_get_months_authenticated(user_a: dict, async_client: AsyncClient):
    resp = await async_client.get("/financial/months", headers=user_a["headers"])
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2


async def test_get_months_unauthenticated(async_client: AsyncClient):
    resp = await async_client.get("/financial/months")
    assert resp.status_code == 401


async def test_delete_month_success(user_a: dict, async_client: AsyncClient):
    # Create month to delete
    await async_client.post("/financial/months", json={"month": "2024-08", "active_income": 60000}, headers=user_a["headers"])

    # Delete it
    del_resp = await async_client.delete("/financial/months/2024-08", headers=user_a["headers"])
    assert del_resp.status_code == 200
    assert "deleted" in del_resp.json()["message"]


async def test_delete_nonexistent_month(user_a: dict, async_client: AsyncClient):
    resp = await async_client.delete("/financial/months/1990-01", headers=user_a["headers"])
    assert resp.status_code == 404


async def test_sample_statements_hdfc(async_client: AsyncClient):
    resp = await async_client.get("/financial/sample-statements/hdfc")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "HDFC" in data["bank_detected"]
    assert len(data["monthly_aggregates"]) >= 1


async def test_sample_statements_phonepe(async_client: AsyncClient):
    resp = await async_client.get("/financial/sample-statements/phonepe")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "PhonePe" in data["bank_detected"]


async def test_sample_statements_invalid(async_client: AsyncClient):
    resp = await async_client.get("/financial/sample-statements/unknown_bank")
    assert resp.status_code == 400


async def test_ingest_empty_file(async_client: AsyncClient):
    files = {"file": ("empty.pdf", b"", "application/pdf")}
    resp = await async_client.post("/financial/ingest", files=files)
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


async def test_categorize_feedback(async_client: AsyncClient):
    payload = {
        "merchant": "MY_LOCAL_KIRANA_STORE",
        "category": "money_spent",
        "subcategory": "Groceries",
    }
    resp = await async_client.post("/financial/categorize/feedback", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "success" or data.get("status") == "registered" or "pattern" in data or "rule" in data or "message" in data
