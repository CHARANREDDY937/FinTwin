from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agents.goal_agent import GoalAgent
from agents.investment_agent import InvestmentAgent
from agents.risk_agent import RiskAgent
from agents.spending_agent import SpendingAgent
from core.digital_twin_engine import FinancialDigitalTwinEngine
from core.explainability_engine import ExplainabilityEngine
from core.forecasting_engine import ForecastingScenarioEngine
from schemas import ChatRequest, FinancialMonth, PersonalizedTrainingRequest, ScenarioRequest
from services.model_service import PersonalizedFinanceModelService
from training.dataset_registry import dataset_summary
from training.personalize_from_profile import export_personalization_data

app = FastAPI(title="FinTwinAI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

twin_engine = FinancialDigitalTwinEngine()
forecasting_engine = ForecastingScenarioEngine()
explainability_engine = ExplainabilityEngine()
model_service = PersonalizedFinanceModelService()
agents = [
    SpendingAgent(),
    InvestmentAgent(),
    RiskAgent(),
    GoalAgent(),
]


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "FinTwinAI Backend"}


@app.get("/datasets/summary")
def datasets_overview():
    return {"datasets": dataset_summary()}


@app.post("/twin/profile")
def create_financial_twin(months: list[FinancialMonth]):
    profile = twin_engine.build_profile(months)
    agent_outputs = [agent.analyze(profile, months) for agent in agents]
    explanation = explainability_engine.explain(profile)

    return {
        "profile": profile,
        "agents": agent_outputs,
        "explainability": explanation,
    }


@app.post("/forecast/scenario")
def simulate_scenario(request: ScenarioRequest):
    profile = twin_engine.build_profile(request.months)
    forecast = forecasting_engine.simulate(
        profile=profile,
        months=request.months,
        model=request.model,
        scenario=request.scenario,
        horizon=request.horizon,
    )
    explanation = explainability_engine.explain(profile)

    return {
        "profile": profile,
        "forecast": forecast,
        "explainability": explanation,
    }


@app.post("/chat")
def chat_with_twin(request: ChatRequest):
    profile = twin_engine.build_profile(request.months)
    agent_outputs = [agent.analyze(profile, request.months) for agent in agents]
    forecast = forecasting_engine.simulate(
        profile=profile,
        months=request.months,
        model=request.model,
        scenario=request.scenario,
        horizon=12,
    )
    explanation = explainability_engine.explain(profile)
    fallback_answer = twin_engine.answer_question(
        question=request.question,
        profile=profile,
        forecast=forecast,
        explanation=explanation,
    )
    model_answer = model_service.answer(
        question=request.question,
        profile=profile,
        forecast=forecast,
        explanation=explanation,
        fallback_answer=fallback_answer,
        agent_outputs=agent_outputs,
    )

    return {
        "answer": model_answer["answer"],
        "answer_source": model_answer["answer_source"],
        "model_name": model_answer["model_name"],
        "profile": profile,
        "agents": agent_outputs,
        "forecast": forecast,
        "explainability": explanation,
    }


@app.post("/training/personalization-export")
def personalization_export(request: PersonalizedTrainingRequest):
    path = export_personalization_data(
        months=request.months,
        output_path=f"{request.output_dir}/personalization.jsonl",
    )
    return {
        "status": "ok",
        "output_path": path,
        "message": "Personalization samples exported. Run the training script to fine-tune the model.",
    }
