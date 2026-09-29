from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

from database import (
    get_db_session,
    save_chat_message,
    get_chat_history,
    clear_chat_history,
    create_conversation,
    get_user_conversations,
    get_conversation,
    update_conversation_title,
    delete_conversation,
    get_conversation_messages,
)
from auth.jwt import get_current_user
from database.models import User, ChatMessage, Conversation
from core.digital_twin_engine import FinancialDigitalTwinEngine
from core.finance_grounding import generate_suggested_prompts
from schemas import FinancialMonth

router = APIRouter(prefix="/chat", tags=["chat"])
twin_engine = FinancialDigitalTwinEngine()


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"


class ConversationUpdate(BaseModel):
    title: str


class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj, count: int = 0):
        c_at = obj.created_at.isoformat() if obj.created_at else ""
        u_at = obj.updated_at.isoformat() if obj.updated_at else ""
        return cls(
            id=str(obj.id),
            title=obj.title,
            created_at=c_at,
            updated_at=u_at,
            createdAt=c_at,
            updatedAt=u_at,
            message_count=count,
        )


class ChatMessageCreate(BaseModel):
    role: str
    content: str
    metric: Optional[str] = None
    title: Optional[str] = None
    conversation_id: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    metric: Optional[str]
    title: Optional[str]
    conversation_id: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=str(obj.id),
            role=obj.role,
            content=obj.content,
            metric=obj.metric,
            title=obj.title,
            conversation_id=str(obj.conversation_id) if obj.conversation_id else None,
            created_at=obj.created_at.isoformat() if obj.created_at else "",
        )


class SuggestedPromptItem(BaseModel):
    text: str
    category: str


# ── Conversation Endpoints ─────────────────────────────────────

@router.post("/conversations", response_model=ConversationResponse)
async def create_new_conversation(
    body: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    conv = await create_conversation(db, current_user.id, title=body.title or "New Conversation")
    return ConversationResponse.from_orm(conv, 0)


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    convs = await get_user_conversations(db, current_user.id)
    out = []
    for c in convs:
        msgs = await get_conversation_messages(db, c.id, current_user.id)
        out.append(ConversationResponse.from_orm(c, len(msgs)))
    return out


@router.get("/conversations/{conversation_id}/messages", response_model=List[ChatMessageResponse])
async def list_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        c_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    conv = await get_conversation(db, c_uuid, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await get_conversation_messages(db, c_uuid, current_user.id)
    return [ChatMessageResponse.from_orm(m) for m in messages]


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def rename_conversation(
    conversation_id: str,
    body: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        c_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    conv = await update_conversation_title(db, c_uuid, current_user.id, body.title)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = await get_conversation_messages(db, c_uuid, current_user.id)
    return ConversationResponse.from_orm(conv, len(msgs))


@router.delete("/conversations/{conversation_id}")
async def remove_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        c_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    deleted = await delete_conversation(db, c_uuid, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {"status": "ok", "deleted_conversation_id": conversation_id}


# ── Messages Endpoints ─────────────────────────────────────────

@router.post("/messages", response_model=ChatMessageResponse)
async def create_chat_message(
    message: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    c_uuid = None
    if message.conversation_id:
        try:
            c_uuid = uuid.UUID(str(message.conversation_id))
        except (ValueError, TypeError, AttributeError):
            c_uuid = None
    chat_msg = await save_chat_message(
        db,
        current_user.id,
        message.role,
        message.content,
        message.metric,
        message.title,
        conversation_id=c_uuid,
    )
    return ChatMessageResponse.from_orm(chat_msg)


@router.get("/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    limit: int = 50,
    conversation_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    if conversation_id:
        try:
            c_uuid = uuid.UUID(conversation_id)
            messages = await get_conversation_messages(db, c_uuid, current_user.id)
            return [ChatMessageResponse.from_orm(m) for m in messages]
        except ValueError:
            pass

    messages = await get_chat_history(db, current_user.id, limit)
    return [ChatMessageResponse.from_orm(m) for m in messages]


@router.delete("/messages")
async def clear_chat(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    count = await clear_chat_history(db, current_user.id)
    return {"status": "ok", "deleted": count}


# ── Contextual Suggested Prompts ────────────────────────────────

@router.post("/suggested-prompts", response_model=List[SuggestedPromptItem])
async def get_suggested_prompts(
    months: List[FinancialMonth],
):
    profile = twin_engine.build_profile(months)
    prompts = generate_suggested_prompts(profile)
    return prompts