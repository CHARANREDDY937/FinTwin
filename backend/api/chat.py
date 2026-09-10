from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db_session, save_chat_message, get_chat_history, clear_chat_history
from auth.jwt import get_current_user
from database.models import User, ChatMessage

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessageCreate(BaseModel):
    role: str
    content: str
    metric: Optional[str] = None
    title: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    metric: Optional[str]
    title: Optional[str]
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
            created_at=obj.created_at.isoformat() if obj.created_at else "",
        )


@router.post("/messages", response_model=ChatMessageResponse)
async def create_chat_message(
    message: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    chat_msg = await save_chat_message(
        db,
        current_user.id,
        message.role,
        message.content,
        message.metric,
        message.title
    )
    return ChatMessageResponse.from_orm(chat_msg)


@router.get("/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    messages = await get_chat_history(db, current_user.id, limit)
    return [ChatMessageResponse.from_orm(m) for m in messages]


@router.delete("/messages")
async def clear_chat(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    count = await clear_chat_history(db, current_user.id)
    return {"status": "ok", "deleted": count}