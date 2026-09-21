# FinTwinAI

**Your AI-powered financial twin.** Upload your monthly finances, ask questions about expenses, savings, loans, and life decisions — FinTwinAI builds a personalized digital twin and forecasts your financial trajectory with explainable AI.

---

## What it does

FinTwinAI is a **multi-agent financial coaching platform**. Instead of generic budgeting apps, it simulates *your* financial future by combining four layers:

| Layer | Engine | What it does |
|-------|--------|--------------|
| 🧬 **Digital Twin** | `FinancialDigitalTwinEngine` | Builds your financial profile from monthly data |
| 🤖 **Agent Intelligence** | 4 specialized AI agents | Spending, Investment, Risk & Goal agents each analyze your twin |
| 📊 **Forecasting** | `ForecastingScenarioEngine` | Runs scenario simulations (inflation, home, MBA, job loss, etc.) |
| 💡 **Explainable AI** | `ExplainabilityEngine` | Translates model outputs into human-readable insights |

---

## Features

- **Scenario simulation** — "What if inflation jumps 8%?" "Can I afford a house in 24 months?"
- **Multi-agent analysis** — 4 AI agents give specialized takes on your finances
- **Interactive forecasts** — Live charts with 6M / 12M / 24M / 36M projections
- **Explainable insights** — Every prediction comes with a plain-English rationale
- **AI fine-tuning pipeline** — Train a personalized model on your own data + FinGPT datasets
- **Local-first** — Runs entirely on your machine; no third-party data sharing
- **Dark + light mode** — Built-in theme toggle

---

## Quick start

```bash
# Backend (Windows PowerShell)
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --port 8000

# Backend (macOS / Linux / Bash)
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000

# Frontend
cd ../frontend
npm install
npm run dev    # opens http://localhost:5173
```

Copy the `.env.example` files to `.env` for each package and fill in your values.

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/datasets/summary` | Dataset overview |
| `POST` | `/twin/profile` | Build a financial twin profile |
| `POST` | `/forecast/scenario` | Run a scenario forecast |
| `POST` | `/chat` | Ask the twin a question (uses AI agents + optional personalized model) |
| `POST` | `/training/personalization-export` | Export personalization samples |

See the [backend README](./backend/README.md) for training details.

---

## Architecture

```
User →  React Frontend (Vite + Recharts)
        │  local forecast + chat UI
        │
        ▼
  FastAPI Backend (Python)
  ├── Auth (JWT)
  ├── API  (/twin, /forecast, /chat, /training)
  ├── Agents  (Spending • Investment • Risk • Goal)
  ├── Core   (Twin Engine • Forecasting • Explainability)
  ├── Services  (Personalized model inference)
  └── Training  (FinGPT + personalization fine-tuning)
```

---

## Tech stack

![Python](https://img.shields.io/badge/Python-3.10+-4B7896?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-2.12-63B388?logo=github&logoColor=white)

AI models: [FinGPT](https://github.com/Fireshine2019/FinGPT) datasets · Qwen2.5 · XGBoost · LSTM · Prophet

---

## License

[MIT](./LICENSE)
