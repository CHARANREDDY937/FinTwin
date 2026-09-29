import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_journey_1_onboarding_and_statement_ingestion(async_client: AsyncClient):
    """E2E Journey 1: Register -> Login -> Ingest Statement Data -> View Twin Profile"""
    # 1. Register new user
    email = "journey1_user@example.com"
    pwd = "JourneyPassword123!"
    reg_resp = await async_client.post("/auth/register", json={
        "email": email,
        "name": "Journey One",
        "password": pwd,
    })
    assert reg_resp.status_code == 200
    token = reg_resp.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 2. Get user info
    me_resp = await async_client.get("/auth/me", headers=auth_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email

    # 3. Ingest sample HDFC statement
    sample_resp = await async_client.get("/financial/sample-statements/hdfc")
    assert sample_resp.status_code == 200
    hdfc_sample = sample_resp.json()
    assert len(hdfc_sample["monthly_aggregates"]) >= 1

    # 4. Save first month aggregate from statement into user records
    m1 = hdfc_sample["monthly_aggregates"][0]
    save_month_resp = await async_client.post("/financial/months", json={
        "month": m1["month"],
        "active_income": m1["active_income"],
        "passive_income": m1.get("passive_income", 0),
        "credit_score": 760,
        "loans_outstanding": 300000,
        "emi_monthly": m1.get("emi_monthly", 15000),
        "miscellaneous_charges": m1.get("miscellaneous_charges", 500),
        "money_spent": m1["money_spent"],
        "transactions": m1.get("transactions", []),
    }, headers=auth_headers)
    assert save_month_resp.status_code == 200

    # 5. Fetch records and verify saved
    records_resp = await async_client.get("/financial/months", headers=auth_headers)
    assert records_resp.status_code == 200
    records = records_resp.json()
    assert len(records) >= 1
    assert records[0]["month"] == m1["month"]

    # 6. Build Twin profile from user records
    twin_resp = await async_client.post("/twin/profile", json={
        "months": [
            {
                "month": r["month"],
                "active_income": r["active_income"],
                "passive_income": r["passive_income"],
                "credit_score": r["credit_score"],
                "loans_outstanding": r["loans_outstanding"],
                "emi_monthly": r["emi_monthly"],
                "miscellaneous_charges": r["miscellaneous_charges"],
                "money_spent": r["money_spent"],
            }
            for r in records
        ],
        "question": "What is my financial health?",
        "max_rounds": 2,
    })
    assert twin_resp.status_code == 200
    twin_data = twin_resp.json()
    assert "profile" in twin_data
    assert "agents" in twin_data
    assert "final_answer" in twin_data


async def test_journey_2_scenario_simulation_and_agent_consensus(async_client: AsyncClient):
    """E2E Journey 2: Run What-If Scenario Forecast -> Compare with Baseline -> Run Multi-Agent Consensus"""
    months_data = [
        {
            "month": "2024-01",
            "active_income": 110000,
            "passive_income": 5000,
            "credit_score": 765,
            "loans_outstanding": 400000,
            "emi_monthly": 18000,
            "miscellaneous_charges": 1500,
            "money_spent": 38000,
        },
        {
            "month": "2024-02",
            "active_income": 110000,
            "passive_income": 5000,
            "credit_score": 770,
            "loans_outstanding": 385000,
            "emi_monthly": 18000,
            "miscellaneous_charges": 1200,
            "money_spent": 36000,
        },
    ]

    # 1. Simulate baseline scenario
    base_resp = await async_client.post("/forecast/scenario", json={
        "months": months_data,
        "model": "xgboost",
        "scenario": "baseline",
        "horizon": 12,
    })
    assert base_resp.status_code == 200
    base_forecast = base_resp.json()["forecast"]

    # 2. Simulate inflation scenario
    inf_resp = await async_client.post("/forecast/scenario", json={
        "months": months_data,
        "model": "xgboost",
        "scenario": "inflation",
        "horizon": 12,
    })
    assert inf_resp.status_code == 200
    inf_forecast = inf_resp.json()["forecast"]

    # 3. Validate inflation expenses are higher than baseline
    assert inf_forecast[-1]["expense"] > base_forecast[-1]["expense"]

    # 4. Trigger 4-agent collaboration
    collab_resp = await async_client.post("/agents/collaborate", json={
        "months": months_data,
        "question": "Can I sustain an emergency expense of ₹2,00,000?",
        "max_rounds": 3,
    })
    assert collab_resp.status_code == 200
    collab_data = collab_resp.json()
    assert "spending" in collab_data["agents"]
    assert "risk" in collab_data["agents"]
    assert "investment" in collab_data["agents"]
    assert "goal" in collab_data["agents"]
    assert len(collab_data["collaboration_log"]) > 0


async def test_journey_3_interactive_chat_session(async_client: AsyncClient):
    """E2E Journey 3: Create conversation -> Stream advisory chat -> Verify persisted messages"""
    # 1. Login user
    email = "journey3_user@example.com"
    pwd = "Password3!"
    await async_client.post("/auth/register", json={
        "email": email, "name": "Journey Three", "password": pwd
    })
    login_resp = await async_client.post("/auth/login-json", json={
        "email": email, "password": pwd
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = await async_client.get("/auth/me", headers=headers)
    user_id = me_resp.json()["id"]

    # 2. Create conversation
    conv_resp = await async_client.post("/chat/conversations", json={
        "title": "Home Loan Advisory"
    }, headers=headers)
    assert conv_resp.status_code == 200
    conv_id = conv_resp.json()["id"]

    # 3. Stream chat response
    stream_payload = {
        "question": "Can I afford a ₹75L house in 24 months?",
        "months": [
            {
                "month": "2024-01",
                "active_income": 150000,
                "passive_income": 10000,
                "credit_score": 790,
                "loans_outstanding": 0,
                "emi_monthly": 0,
                "miscellaneous_charges": 2000,
                "money_spent": 40000,
            }
        ],
        "conversation_id": conv_id,
        "user_id": user_id,
        "horizon": 24,
    }
    stream_resp = await async_client.post("/chat/stream", json=stream_payload, headers=headers)
    assert stream_resp.status_code == 200
    body = stream_resp.text
    assert '"type": "token"' in body
    assert '"type": "metadata"' in body

    # 4. Save user question and assistant answer in messages
    await async_client.post("/chat/messages", json={
        "role": "user",
        "content": stream_payload["question"],
        "conversation_id": conv_id,
    }, headers=headers)

    await async_client.post("/chat/messages", json={
        "role": "assistant",
        "content": "Financing a ₹75L home is feasible given your monthly surplus.",
        "conversation_id": conv_id,
        "metric": "savings",
    }, headers=headers)

    # 5. Fetch messages in this conversation
    messages_resp = await async_client.get(
        f"/chat/conversations/{conv_id}/messages",
        headers=headers
    )
    assert messages_resp.status_code == 200
    messages = messages_resp.json()
    assert len(messages) >= 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"
