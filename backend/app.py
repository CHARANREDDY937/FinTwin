from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uuid as _uuid

from database import init_db, close_db, get_db_session, save_chat_message, create_conversation, get_conversation, update_conversation_title
from sqlalchemy.ext.asyncio import AsyncSession
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
from core.grounded_chat_handler import build_grounded_response
from starlette.responses import StreamingResponse
from pydantic import BaseModel

class ChatStreamRequest(BaseModel):
    question: str
    months: list
    model: str = "xgboost"
    scenario: str = "baseline"
    horizon: int = 12
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None


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
        max_rounds=request.max_rounds or 4,
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
        "collaboration_log": result.get("messages", []),
    }


@app.post("/agents/collaborate")
def run_agents_collaboration(request: TwinProfileRequest):
    result = collaborative_system.run(
        months=request.months,
        user_question=request.question,
        max_rounds=request.max_rounds or 4,
    )

    agents = result["agent_outputs"]
    for agent_data in agents.values():
        if "signal" in agent_data and isinstance(agent_data["signal"], str):
            agent_data["signal"] = ensure_inr(agent_data["signal"])

    return {
        "agents": agents,
        "final_answer": ensure_inr(result["final_answer"]),
        "profile": result["profile"],
        "forecast": result["forecast"],
        "explainability": result["explanation"],
        "collaboration_rounds": result["collaboration_rounds"],
        "collaboration_log": result.get("messages", []),
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
        max_rounds=4,
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

    grounded = build_grounded_response(
        question=request.question,
        profile=result["profile"],
        months=request.months,
        raw_answer=model_answer.get("answer"),
        source=model_answer.get("answer_source", "ensemble"),
    )

    agents = result["agent_outputs"]
    for agent_data in agents.values():
        if "signal" in agent_data and isinstance(agent_data["signal"], str):
            agent_data["signal"] = ensure_inr(agent_data["signal"])

    return {
        "answer": ensure_inr(grounded["answer"]),
        "answer_source": model_answer.get("answer_source", "ensemble"),
        "model_name": model_answer.get("model_name"),
        "verdict": grounded["verdict"],
        "verdict_tone": grounded["verdict_tone"],
        "key_figures": grounded["key_figures"],
        "assumptions": grounded["assumptions"],
        "confidence": grounded["confidence"],
        "math_steps": grounded["math_steps"],
        "viz_payload": grounded["viz_payload"],
        "disclaimer": grounded["disclaimer"],
        "profile": result["profile"],
        "agents": agents,
        "final_answer": ensure_inr(result["final_answer"]),
        "forecast": result["forecast"],
        "explainability": result["explanation"],
        "collaboration_rounds": result["collaboration_rounds"],
        "collaboration_log": result.get("messages", []),
    }


@app.post("/chat/stream")
async def chat_stream_with_twin(
    request: ChatStreamRequest,
    db: AsyncSession = Depends(get_db_session),
):
    import asyncio
    import json as _json
    from schemas import FinancialMonth as FMSchema

    months_parsed = []
    for m in request.months:
        if isinstance(m, dict):
            try:
                months_parsed.append(FMSchema(**m))
            except Exception:
                pass
        else:
            months_parsed.append(m)

    result = collaborative_system.run(
        months=months_parsed,
        user_question=request.question,
        max_rounds=4,
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

    grounded = build_grounded_response(
        question=request.question,
        profile=result["profile"],
        months=months_parsed,
        raw_answer=model_answer.get("answer"),
        source=model_answer.get("answer_source", "ensemble"),
    )

    agents = result["agent_outputs"]
    for agent_data in agents.values():
        if "signal" in agent_data and isinstance(agent_data["signal"], str):
            agent_data["signal"] = ensure_inr(agent_data["signal"])

    full_answer = ensure_inr(grounded["answer"])

    # Resolve or auto-create conversation for DB persistence
    conv_id = None
    user_uid = None
    if request.user_id:
        try:
            user_uid = _uuid.UUID(request.user_id)
            if request.conversation_id:
                try:
                    conv_id = _uuid.UUID(request.conversation_id)
                except (ValueError, TypeError):
                    pass
            if conv_id is None:
                first_words = " ".join(request.question.split()[:6])
                new_conv = await create_conversation(db, user_uid, title=first_words or "New Chat")
                conv_id = new_conv.id
            await save_chat_message(db, user_uid, "user", request.question, conversation_id=conv_id)
            await db.commit()
        except Exception:
            pass  # Never block streaming due to DB errors

    async def event_generator():
        start_evt = _json.dumps({
            "type": "start",
            "source": model_answer.get("answer_source", "ensemble"),
            "title": "Multi-Agent Consensus",
            "conversation_id": str(conv_id) if conv_id else None,
        })
        yield f"data: {start_evt}\n\n"

        words = full_answer.split(" ")
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            yield f"data: {_json.dumps({'type': 'token', 'token': token})}\n\n"
            await asyncio.sleep(0.015)

        meta_payload = {
            "type": "metadata",
            "verdict": grounded["verdict"],
            "verdict_tone": grounded["verdict_tone"],
            "key_figures": grounded["key_figures"],
            "assumptions": grounded["assumptions"],
            "confidence": grounded["confidence"],
            "math_steps": grounded["math_steps"],
            "viz_payload": grounded["viz_payload"],
            "disclaimer": grounded["disclaimer"],
            "agents": agents,
            "collaboration_log": result.get("messages", []),
            "collaboration_rounds": result["collaboration_rounds"],
        }
        yield f"data: {_json.dumps(meta_payload)}\n\n"
        yield 'data: {"type": "done"}\n\n'

        # Persist assistant message after stream completes using a fresh session
        if user_uid and conv_id:
            try:
                from database import get_db_session
                db_gen = app.dependency_overrides.get(get_db_session, get_db_session)()
                async for session in db_gen:
                    metric = (grounded.get("viz_payload") or {}).get("metric")
                    await save_chat_message(session, user_uid, "assistant", full_answer, metric=metric, conversation_id=conv_id)
                    first_words = " ".join(request.question.split()[:6])
                    await update_conversation_title(session, conv_id, user_uid, first_words)
                    await session.commit()
            except Exception:
                pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")


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