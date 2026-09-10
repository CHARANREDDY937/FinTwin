from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional, List
import uuid
import hashlib
import secrets

from database.models import User, FinancialMonth, ChatMessage


def hash_password(password: str) -> str:
    """Hash password using PBKDF2 with SHA-256"""
    salt = secrets.token_bytes(16)
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return salt.hex() + ':' + pwdhash.hex()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    try:
        salt_hex, pwdhash_hex = hashed_password.split(':')
        salt = bytes.fromhex(salt_hex)
        pwdhash = bytes.fromhex(pwdhash_hex)
        new_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
        return secrets.compare_digest(pwdhash, new_hash)
    except Exception:
        return False


async def create_user(db: AsyncSession, email: str, name: str, password: str) -> User:
    user = User(
        email=email,
        name=name,
        password_hash=hash_password(password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def add_financial_month(db: AsyncSession, user_id: uuid.UUID, month_data: dict) -> FinancialMonth:
    existing = await db.execute(
        select(FinancialMonth).where(
            FinancialMonth.user_id == user_id,
            FinancialMonth.month == month_data["month"]
        )
    )
    existing_month = existing.scalar_one_or_none()

    if existing_month:
        existing_month.active_income = month_data["active_income"]
        existing_month.passive_income = month_data["passive_income"]
        existing_month.credit_score = month_data["credit_score"]
        existing_month.loans_outstanding = month_data["loans_outstanding"]
        existing_month.emi_monthly = month_data["emi_monthly"]
        existing_month.miscellaneous_charges = month_data["miscellaneous_charges"]
        existing_month.money_spent = month_data["money_spent"]
        await db.flush()
        await db.refresh(existing_month)
        return existing_month
    else:
        month = FinancialMonth(
            user_id=user_id,
            **month_data
        )
        db.add(month)
        await db.flush()
        await db.refresh(month)
        return month


async def get_financial_months(db: AsyncSession, user_id: uuid.UUID) -> List[FinancialMonth]:
    result = await db.execute(
        select(FinancialMonth)
        .where(FinancialMonth.user_id == user_id)
        .order_by(FinancialMonth.month.desc())
    )
    return list(result.scalars().all())


async def delete_financial_month(db: AsyncSession, user_id: uuid.UUID, month: str) -> bool:
    result = await db.execute(
        delete(FinancialMonth).where(
            FinancialMonth.user_id == user_id,
            FinancialMonth.month == month
        )
    )
    return result.rowcount > 0


async def save_chat_message(
    db: AsyncSession,
    user_id: uuid.UUID,
    role: str,
    content: str,
    metric: Optional[str] = None,
    title: Optional[str] = None
) -> ChatMessage:
    message = ChatMessage(
        user_id=user_id,
        role=role,
        content=content,
        metric=metric,
        title=title,
    )
    db.add(message)
    await db.flush()
    await db.refresh(message)
    return message


async def get_chat_history(db: AsyncSession, user_id: uuid.UUID, limit: int = 50) -> List[ChatMessage]:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def clear_chat_history(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        delete(ChatMessage).where(ChatMessage.user_id == user_id)
    )
    return result.rowcount