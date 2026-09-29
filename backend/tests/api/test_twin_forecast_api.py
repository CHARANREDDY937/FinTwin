import pytest
import os
import tempfile
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


@pytest.fixture
def sample_months_payload():
    return [
        {
            "month": "2024-01",
            "active_income": 100000,
            "passive_income": 10000,
            "credit_score": 750,
            "loans_outstanding": 500000,
            "emi_monthly": 15000,
            "miscellaneous_charges": 2000,
            "money_spent": 30000,
        },
        {
            "month": "2024-02",
            "active_income": 105000,
            "passive_income": 10000,
            "credit_score": 755,
            "loans_outstanding": 485000,
            "emi_monthly": 15000,
            "miscellaneous_charges": 1800,
            "money_spent": 32000,
        },
    ]


async def test_health_endpoint(async_client: AsyncClient):
    resp = await async_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "FinTwinAI" in data["service"]


async def test_datasets_summary(async_client: AsyncClient):
    resp = await async_client.get("/datasets/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "datasets" in data


async def test_twin_profile_endpoint(async_client: AsyncClient, sample_months_payload: list):
    resp = await async_client.post("/twin/profile", json={
        "months": sample_months_payload,
        "question": "Evaluate overall resilience",
        "max_rounds": 3,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "profile" in data
    assert "agents" in data
    assert "final_answer" in data
    assert "forecast" in data
    assert "explainability" in data
    assert "₹" in data["final_answer"]


async def test_agents_collaborate_endpoint(async_client: AsyncClient, sample_months_payload: list):
    resp = await async_client.post("/agents/collaborate", json={
        "months": sample_months_payload,
        "question": "Can I afford an 8L car?",
        "max_rounds": 3,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "agents" in data
    for agent_key in ["spending", "investment", "risk", "goal"]:
        assert agent_key in data["agents"]
    assert "collaboration_log" in data


async def test_forecast_scenario_endpoint(async_client: AsyncClient, sample_months_payload: list):
    resp = await async_client.post("/forecast/scenario", json={
        "months": sample_months_payload,
        "model": "xgboost",
        "scenario": "inflation",
        "horizon": 12,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "profile" in data
    assert "forecast" in data
    assert len(data["forecast"]) == 12
    assert "explainability" in data


async def test_forecast_scenario_invalid_model(async_client: AsyncClient, sample_months_payload: list):
    resp = await async_client.post("/forecast/scenario", json={
        "months": sample_months_payload,
        "model": "super_fancy_nonexistent_model",
        "scenario": "baseline",
    })
    assert resp.status_code == 422


async def test_personalization_export_endpoint(async_client: AsyncClient, sample_months_payload: list):
    with tempfile.TemporaryDirectory() as tmp_dir:
        resp = await async_client.post("/training/personalization-export", json={
            "months": sample_months_payload,
            "output_dir": tmp_dir,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert os.path.exists(data["output_path"])
