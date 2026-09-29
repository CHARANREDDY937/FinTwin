import pytest
import json
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_conversation_lifecycle(user_a: dict, async_client: AsyncClient):
    # 1. Create conversation
    create_resp = await async_client.post(
        "/chat/conversations",
        json={"title": "Car Loan Planning"},
        headers=user_a["headers"]
    )
    assert create_resp.status_code == 200
    conv = create_resp.json()
    conv_id = conv["id"]
    assert conv["title"] == "Car Loan Planning"

    # 2. List conversations
    list_resp = await async_client.get("/chat/conversations", headers=user_a["headers"])
    assert list_resp.status_code == 200
    conv_ids = [c["id"] for c in list_resp.json()]
    assert conv_id in conv_ids

    # 3. Add message to conversation
    msg_resp = await async_client.post(
        "/chat/messages",
        json={
            "role": "user",
            "content": "Can I afford a ₹10L car?",
            "conversation_id": conv_id,
        },
        headers=user_a["headers"]
    )
    assert msg_resp.status_code == 200
    assert msg_resp.json()["conversation_id"] == conv_id

    # 4. Fetch conversation messages
    msgs_resp = await async_client.get(
        f"/chat/conversations/{conv_id}/messages",
        headers=user_a["headers"]
    )
    assert msgs_resp.status_code == 200
    assert len(msgs_resp.json()) == 1
    assert msgs_resp.json()[0]["content"] == "Can I afford a ₹10L car?"

    # 5. Rename conversation
    rename_resp = await async_client.patch(
        f"/chat/conversations/{conv_id}",
        json={"title": "Vehicle Financing Decision"},
        headers=user_a["headers"]
    )
    assert rename_resp.status_code == 200
    assert rename_resp.json()["title"] == "Vehicle Financing Decision"

    # 6. Delete conversation
    del_resp = await async_client.delete(
        f"/chat/conversations/{conv_id}",
        headers=user_a["headers"]
    )
    assert del_resp.status_code == 200

    # 7. Verify deletion
    verify_resp = await async_client.get(
        f"/chat/conversations/{conv_id}/messages",
        headers=user_a["headers"]
    )
    assert verify_resp.status_code == 404


async def test_suggested_prompts(async_client: AsyncClient):
    sample_months = [
        {
            "month": "2024-01",
            "active_income": 100000,
            "passive_income": 10000,
            "credit_score": 750,
            "loans_outstanding": 500000,
            "emi_monthly": 15000,
            "miscellaneous_charges": 2000,
            "money_spent": 30000,
        }
    ]
    resp = await async_client.post("/chat/suggested-prompts", json=sample_months)
    assert resp.status_code == 200
    prompts = resp.json()
    assert isinstance(prompts, list)
    assert len(prompts) == 4
    for p in prompts:
        assert "text" in p
        assert "category" in p


async def test_chat_non_streaming(async_client: AsyncClient):
    payload = {
        "question": "Can I afford a ₹75L house?",
        "months": [
            {
                "month": "2024-01",
                "active_income": 120000,
                "passive_income": 10000,
                "credit_score": 780,
                "loans_outstanding": 200000,
                "emi_monthly": 10000,
                "miscellaneous_charges": 1500,
                "money_spent": 35000,
            }
        ],
        "horizon": 24,
        "model": "xgboost",
        "scenario": "baseline",
    }
    resp = await async_client.post("/chat", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert "verdict" in data
    assert "key_figures" in data
    assert "math_steps" in data
    assert "agents" in data
    assert "forecast" in data
    assert "₹" in data["answer"]


async def test_chat_streaming_sse(async_client: AsyncClient):
    payload = {
        "question": "What is my current monthly surplus?",
        "months": [
            {
                "month": "2024-01",
                "active_income": 100000,
                "passive_income": 10000,
                "credit_score": 750,
                "loans_outstanding": 500000,
                "emi_monthly": 15000,
                "miscellaneous_charges": 2000,
                "money_spent": 30000,
            }
        ],
        "horizon": 12,
        "model": "xgboost",
        "scenario": "baseline",
    }
    resp = await async_client.post("/chat/stream", json=payload)
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")

    # Read SSE events
    body_text = resp.text
    assert "data: " in body_text
    assert '"type": "start"' in body_text
    assert '"type": "token"' in body_text
    assert '"type": "metadata"' in body_text
    assert '"type": "done"' in body_text
