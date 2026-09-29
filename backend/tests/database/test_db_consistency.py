import pytest
import uuid
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import User, FinancialMonth, Conversation, ChatMessage
from database.crud import hash_password

pytestmark = pytest.mark.asyncio


async def test_user_email_unique_constraint(setup_test_db):
    from tests.conftest import TestAsyncSessionLocal
    async with TestAsyncSessionLocal() as session:
        u1 = User(
            id=uuid.uuid4(),
            email="unique_test_user@example.com",
            name="User One",
            password_hash=hash_password("Pass1!"),
        )
        session.add(u1)
        await session.commit()

        # Attempt to insert same email
        u2 = User(
            id=uuid.uuid4(),
            email="unique_test_user@example.com",
            name="User Two",
            password_hash=hash_password("Pass2!"),
        )
        session.add(u2)
        with pytest.raises(IntegrityError):
            await session.commit()
        await session.rollback()


async def test_financial_month_unique_user_month(setup_test_db):
    from tests.conftest import TestAsyncSessionLocal
    async with TestAsyncSessionLocal() as session:
        u = User(
            id=uuid.uuid4(),
            email="fin_unique@example.com",
            name="Fin User",
            password_hash=hash_password("Pass!"),
        )
        session.add(u)
        await session.commit()

        m1 = FinancialMonth(
            id=uuid.uuid4(),
            user_id=u.id,
            month="2024-03",
            active_income=50000,
        )
        session.add(m1)
        await session.commit()

        # Duplicate (user_id, month)
        m2 = FinancialMonth(
            id=uuid.uuid4(),
            user_id=u.id,
            month="2024-03",
            active_income=70000,
        )
        session.add(m2)
        with pytest.raises(IntegrityError):
            await session.commit()
        await session.rollback()


async def test_cascade_delete_user(setup_test_db):
    from tests.conftest import TestAsyncSessionLocal
    async with TestAsyncSessionLocal() as session:
        user_id = uuid.uuid4()
        u = User(
            id=user_id,
            email="cascade_user@example.com",
            name="Cascade User",
            password_hash=hash_password("Pass!"),
        )
        session.add(u)

        conv_id = uuid.uuid4()
        c = Conversation(id=conv_id, user_id=user_id, title="Test Chat")
        session.add(c)

        msg = ChatMessage(id=uuid.uuid4(), user_id=user_id, conversation_id=conv_id, role="user", content="Hello")
        session.add(msg)

        m = FinancialMonth(id=uuid.uuid4(), user_id=user_id, month="2024-04", active_income=80000)
        session.add(m)

        await session.commit()

        # Verify existence
        assert (await session.execute(select(Conversation).where(Conversation.id == conv_id))).scalar_one_or_none() is not None
        assert (await session.execute(select(FinancialMonth).where(FinancialMonth.user_id == user_id))).scalar_one_or_none() is not None

        # Delete user
        await session.delete(u)
        await session.commit()

        # Verify cascades
        assert (await session.execute(select(Conversation).where(Conversation.id == conv_id))).scalar_one_or_none() is None
        assert (await session.execute(select(ChatMessage).where(ChatMessage.user_id == user_id))).scalar_one_or_none() is None
        assert (await session.execute(select(FinancialMonth).where(FinancialMonth.user_id == user_id))).scalar_one_or_none() is None
