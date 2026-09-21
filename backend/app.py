from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, close_db
from auth.routes import router as auth_router
from api.financial import router as financial_router
from api.chat import router as chat_router
from agents.collaborative_graph import collaborative_system
from core.digital_twin_engine import FinancialDigitalTwinEngine
from core.explainability_engine import ExplainabilityEngine
from core.forecasting_engine import ForecastingScenarioEngine
from core.currency import ensure_inr
from schemas import ChatRequest, FinancialMonth, PersonalizedTrainingRequest, ScenarioRequest, TwinProfileRequest
from services.model_service import PersonalizedFinanceModelService
from training.dataset_registry import dataset_summary
from training.personalize_from_profile import export_personalization_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(title="FinTwinAI Backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(financial_router)
app.include_router(chat_router)

twin_engine = FinancialDigitalTwinEngine()
forecasting_engine = ForecastingScenarioEngine()
explainability_engine = ExplainabilityEngine()
model_service = PersonalizedFinanceModelService()


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "FinTwinAI Backend"}


@app.get("/datasets/summary")
def datasets_overview():
    return {"datasets": dataset_summary()}


@app.post("/twin/profile")
def create_financial_twin(request: TwinProfileRequest):
    result = collaborative_system.run(
        months=request.months,
        user_question=request.question,
        max_rounds=request.max_rounds or 3,
    )

    agents = result["agent_outputs"]
    for agent_data in agents.values():
        if "signal" in agent_data and isinstance(agent_data["signal"], str):
            agent_data["signal"] = ensure_inr(agent_data["signal"])

    return {
        "profile": result["profile"],
        "agents": agents,
        "final_answer": ensure_inr(result["final_answer"]),
        "explainability": result["explanation"],
        "forecast": result["forecast"],
        "collaboration_rounds": result["collaboration_rounds"],
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
    result = collaborative_system.run(
        months=request.months,
        user_question=request.question,
        max_rounds=3,
    )

    fallback_answer = twin_engine.answer_question(
        question=request.question,
        profile=result["profile"],
        forecast=result["forecast"],
        explanation=result["explanation"],
    )
    model_answer = model_service.answer(
        question=request.question,
        profile=result["profile"],
        forecast=result["forecast"],
        explanation=result["explanation"],
        fallback_answer=fallback_answer,
        agent_outputs=list(result["agent_outputs"].values()),
    )

    agents = result["agent_outputs"]
    for agent_data in agents.values():
        if "signal" in agent_data and isinstance(agent_data["signal"], str):
            agent_data["signal"] = ensure_inr(agent_data["signal"])

    return {
        "answer": ensure_inr(model_answer["answer"]),
        "answer_source": model_answer["answer_source"],
        "model_name": model_answer["model_name"],
        "profile": result["profile"],
        "agents": agents,
        "final_answer": ensure_inr(result["final_answer"]),
        "forecast": result["forecast"],
        "explainability": result["explanation"],
        "collaboration_rounds": result["collaboration_rounds"],
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