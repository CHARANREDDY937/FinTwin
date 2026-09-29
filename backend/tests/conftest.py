import pytest
import os
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

# Force test database URL and test isolation
TEST_DB_FILE = "./test_audit.db"
TEST_DB_URL = f"sqlite+aiosqlite:///{TEST_DB_FILE}"
os.environ["DB_CONNECTION_STRING"] = TEST_DB_URL
os.environ["JWT_SECRET"] = "test-audit-jwt-secret-key-12345"
os.environ["GROQ_API_KEY"] = ""
os.environ["ENABLE_BASE_MODEL_DOWNLOAD"] = "0"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

from config import settings
settings.groq_api_key = ""
settings.db_connection_string = TEST_DB_URL
settings.jwt_secret = "test-audit-jwt-secret-key-12345"

from database.models import Base
from database import get_db_session
from app import app
from auth.jwt import create_access_token

test_engine = create_async_engine(
    TEST_DB_URL,
    echo=False,
    connect_args={"check_same_thread": False, "timeout": 30},
)

TestAsyncSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestAsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

app.dependency_overrides[get_db_session] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    async def _init():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
            # Add columns if required by migrations
            try:
                await conn.execute(text("ALTER TABLE financial_months ADD COLUMN transactions TEXT DEFAULT '[]'"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE chat_messages ADD COLUMN conversation_id CHAR(36)"))
            except Exception:
                pass
    asyncio.run(_init())
    yield
    async def _cleanup():
        await test_engine.dispose()
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass
    asyncio.run(_cleanup())


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
async def user_a(async_client: AsyncClient):
    email = "user_a@example.com"
    password = "PasswordA123!"
    name = "User Alpha"
    resp = await async_client.post("/auth/register", json={
        "email": email,
        "name": name,
        "password": password,
    })
    token = resp.json().get("access_token")
    if not token:
        # If already registered, login
        login_resp = await async_client.post("/auth/login-json", json={
            "email": email,
            "password": password,
        })
        token = login_resp.json().get("access_token")

    # Get user profile
    me_resp = await async_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_info = me_resp.json()
    return {
        "email": email,
        "password": password,
        "token": token,
        "id": user_info["id"],
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture
async def user_b(async_client: AsyncClient):
    email = "user_b@example.com"
    password = "PasswordB123!"
    name = "User Beta"
    resp = await async_client.post("/auth/register", json={
        "email": email,
        "name": name,
        "password": password,
    })
    token = resp.json().get("access_token")
    if not token:
        login_resp = await async_client.post("/auth/login-json", json={
            "email": email,
            "password": password,
        })
        token = login_resp.json().get("access_token")

    me_resp = await async_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_info = me_resp.json()
    return {
        "email": email,
        "password": password,
        "token": token,
        "id": user_info["id"],
        "headers": {"Authorization": f"Bearer {token}"},
    }
