# FinTwinAI Backend

This backend implements a four-layer architecture with **LangGraph-based multi-agent collaboration**:

1. **Financial Digital Twin Engine** — Builds live user profile from monthly financial uploads
2. **Multi-Agent Intelligence Layer (LangGraph)** — Four specialized agents (Spending, Investment, Risk, Goal) coordinated by a Supervisor agent with shared state and conditional routing
3. **Forecasting & Scenario Simulation Engine** — XGBoost/LightGBM models with baseline/optimistic/pessimistic scenarios
4. **Explainable AI & Future Self Simulation** — SHAP-inspired feature importance with natural language explanations

## Quick Start

```bash
python -m pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/datasets/summary` | Training dataset overview |
| `POST` | `/twin/profile` | Build financial twin + collaborative multi-agent analysis |
| `POST` | `/forecast/scenario` | Run forecasting with scenario simulation |
| `POST` | `/chat` | Chat with digital twin (uses collaborative agents) |
| `POST` | `/training/personalization-export` | Export personalization data for fine-tuning |

### `/twin/profile` — Collaborative Multi-Agent Analysis

**Request:**
```json
{
  "months": [
    {"month": "2024-01", "active_income": 150000, "passive_income": 10000, "credit_score": 750, "loans_outstanding": 500000, "emi_monthly": 15000, "miscellaneous_charges": 5000, "money_spent": 80000}
  ],
  "question": "Should I invest more or pay off debt?",
  "max_rounds": 3
}
```

**Response:**
```json
{
  "profile": {...},
  "agents": {
    "spending": {"agent": "Spending Agent", "metric": 0.6, "signal": "..."},
    "investment": {"agent": "Investment Agent", "metric": 0.7, "signal": "..."},
    "risk": {"agent": "Risk Agent", "metric": 0.4, "signal": "..."},
    "goal": {"agent": "Goal Agent", "metric": 0.8, "signal": "..."}
  },
  "final_answer": "Supervisor synthesis integrating all agents...",
  "explainability": {"feature_importance": [...], "recommendation": "..."},
  "forecast": [...],
  "collaboration_rounds": 3
}
```

### Multi-Agent Collaboration (LangGraph)

- **Supervisor Agent** — Dynamically routes between agents based on context and user question
- **Shared State** — All agents see prior agents' findings via `collaboration_context`
- **Conditional Routing** — Up to 3 rounds (configurable) before synthesis
- **Agents:**
  - **Spending Agent** — Cash flow, expense ratios, spending pressure
  - **Investment Agent** — Portfolio allocation, returns, risk-adjusted performance
  - **Risk Agent** — Credit risk, debt service capacity, financial resilience
  - **Goal Agent** — Major goals planning (house, education, retirement)

## Training

### Agent-Specific Trainers (scikit-learn)

```bash
python training/train_all_agents.py
# or individually:
python training/train_spending_agent.py
python training/train_investment_agent.py
python training/train_risk_agent.py
python training/train_goal_agent.py
```

Trained artifacts saved to `artifacts/agent_models/` — automatically loaded at runtime.

### Personalized LLM Fine-tuning

```bash
python training/train_personalized_model.py --epochs 1 --max-samples 2000
```

Uses FinGPT datasets + user's monthly records. When adapter exists at `PERSONALIZED_MODEL_DIR`, `/chat` uses it before falling back to Groq.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (FastAPI)                    │
├─────────────────────────────────────────────────────────────┤
│  /twin/profile  │  /chat  │  /forecast/scenario  │  /training │
└──────────────────┬──────────────┬────────────────────────────┘
                   ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│            CollaborativeAgentSystem (LangGraph)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │Supervisor│──│ Spending │  │Investment│  │   Risk   │  Goal│
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │ Agent│
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│        ▲           ▲           ▲           ▲         ▲       │
│        └───────────┴───────────┴───────────┴─────────┘       │
│                    Shared State (AgentState)                  │
└─────────────────────────────────────────────────────────────┘
                   ▲              ▲              ▲
           ┌───────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
           │Digital Twin │ │Forecasting│ │Explainable│
           │   Engine    │ │  Engine   │ │    AI     │
           └─────────────┘ └───────────┘ └───────────┘
```

## Configuration

Environment variables (`.env`):
- `GROQ_API_KEY` — Required for LLM calls
- `DATABASE_URL` — SQLite/PostgreSQL connection
- `PERSONALIZED_MODEL_DIR` — Path to fine-tuned adapter (default: `artifacts/personalized-fintwin-model`)