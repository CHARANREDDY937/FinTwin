import pytest
from schemas import FinancialMonth
from agents.collaborative_graph import CollaborativeAgentSystem


@pytest.fixture
def sample_months():
    return [
        FinancialMonth(
            month="2024-01",
            active_income=100000,
            passive_income=10000,
            credit_score=750,
            loans_outstanding=500000,
            emi_monthly=15000,
            miscellaneous_charges=2000,
            money_spent=30000,
        ),
        FinancialMonth(
            month="2024-02",
            active_income=100000,
            passive_income=10000,
            credit_score=755,
            loans_outstanding=480000,
            emi_monthly=15000,
            miscellaneous_charges=1500,
            money_spent=32000,
        ),
    ]


def test_collaborative_system_deterministic_fallback(sample_months):
    system = CollaborativeAgentSystem()
    result = system.run(months=sample_months, user_question="Analyze my financial health", max_rounds=4)

    assert "profile" in result
    assert "agent_outputs" in result
    agents = result["agent_outputs"]

    # Verify all 4 specialized agents are executed
    assert "spending" in agents
    assert "investment" in agents
    assert "risk" in agents
    assert "goal" in agents

    assert "final_answer" in result
    assert len(result["final_answer"]) > 0
    assert "₹" in result["final_answer"]

    # Verify message serialization
    messages = result.get("messages", [])
    assert len(messages) > 0
    for m in messages:
        assert isinstance(m, dict)
        assert "sender" in m
        assert "content" in m


def test_agents_collaborate_with_app_if_available(sample_months):
    try:
        from fastapi.testclient import TestClient
        from app import app
    except ImportError:
        pytest.skip("FastAPI app auth dependencies (e.g. jose) not installed in current environment")

    client = TestClient(app)
    payload = {
        "months": [m.model_dump() for m in sample_months],
        "question": "Can I afford a new vehicle loan?",
        "max_rounds": 4,
    }

    response = client.post("/agents/collaborate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "agents" in data
    assert "spending" in data["agents"]
    assert "investment" in data["agents"]
    assert "risk" in data["agents"]
    assert "goal" in data["agents"]
    assert "collaboration_log" in data
    assert "collaboration_rounds" in data
    assert "final_answer" in data
