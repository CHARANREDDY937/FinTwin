# FinTwinAI Backend

This backend mirrors the project proposal's four-layer architecture:

1. Financial Digital Twin Engine
2. Multi-Agent Intelligence Layer
3. Forecasting and Scenario Simulation Engine
4. Explainable AI and Future Self Simulation

## Run locally

```bash
python -m pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

## Main endpoints

- `GET /health`
- `GET /datasets/summary`
- `POST /twin/profile`
- `POST /forecast/scenario`
- `POST /chat`
- `POST /training/personalization-export`

## Training flow

The backend now includes a training path that blends these FinGPT datasets:

- `FinGPT/fingpt-fiqa_qa`
- `FinGPT/fingpt-convfinqa`
- `FinGPT/fingpt-sentiment-train`

It also generates small personalization samples from the user's uploaded monthly records.

```bash
python -m pip install -r requirements.txt
python training/train_personalized_model.py --epochs 1 --max-samples 2000
```

When a trained adapter/model exists at `PERSONALIZED_MODEL_DIR`, the `/chat` endpoint will try to use it for answers before falling back to the rule-based responder.

## Separate agent trainers

Each agent now has its own Python training script using the local files in `backend/Datasets`:

- `training/train_spending_agent.py`
- `training/train_investment_agent.py`
- `training/train_risk_agent.py`
- `training/train_goal_agent.py`
- `training/train_all_agents.py`

The trained sklearn artifacts are saved into `artifacts/agent_models` and are automatically used by the runtime agent files in `backend/agents`.
