import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_register_success(async_client: AsyncClient):
    payload = {
        "email": "new_reg_user@example.com",
        "name": "New Registered User",
        "password": "StrongPassword!123",
    }
    response = await async_client.post("/auth/register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_register_duplicate_email(async_client: AsyncClient):
    payload = {
        "email": "dup_test@example.com",
        "name": "First User",
        "password": "Password123!",
    }
    res1 = await async_client.post("/auth/register", json=payload)
    assert res1.status_code == 200

    # Duplicate with same password
    res2 = await async_client.post("/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already registered" in res2.json()["detail"].lower()

    # Duplicate with different password
    payload_diff = dict(payload)
    payload_diff["password"] = "DifferentPassword456!"
    res3 = await async_client.post("/auth/register", json=payload_diff)
    assert res3.status_code == 400
    assert "already registered" in res3.json()["detail"].lower()


async def test_register_invalid_email_format(async_client: AsyncClient):
    payload = {
        "email": "not-an-email",
        "name": "Invalid Email User",
        "password": "Password123!",
    }
    response = await async_client.post("/auth/register", json=payload)
    assert response.status_code == 422


async def test_register_missing_fields(async_client: AsyncClient):
    response = await async_client.post("/auth/register", json={"email": "missing@example.com"})
    assert response.status_code == 422


async def test_login_json_success(async_client: AsyncClient):
    email = "login_success@example.com"
    pwd = "ValidPassword789!"
    await async_client.post("/auth/register", json={
        "email": email, "name": "Login User", "password": pwd
    })

    resp = await async_client.post("/auth/login-json", json={
        "email": email, "password": pwd
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_login_json_wrong_password(async_client: AsyncClient):
    email = "login_fail@example.com"
    pwd = "CorrectPassword123!"
    await async_client.post("/auth/register", json={
        "email": email, "name": "Fail User", "password": pwd
    })

    resp = await async_client.post("/auth/login-json", json={
        "email": email, "password": "WrongPassword!"
    })
    assert resp.status_code == 401
    assert "incorrect" in resp.json()["detail"].lower()


async def test_login_json_nonexistent_user(async_client: AsyncClient):
    resp = await async_client.post("/auth/login-json", json={
        "email": "ghost_user_999@example.com", "password": "AnyPassword"
    })
    assert resp.status_code == 401


async def test_login_form_oauth2(async_client: AsyncClient):
    email = "form_login@example.com"
    pwd = "FormPassword123!"
    await async_client.post("/auth/register", json={
        "email": email, "name": "Form User", "password": pwd
    })

    resp = await async_client.post("/auth/login", data={
        "username": email, "password": pwd
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_me_authenticated(user_a: dict, async_client: AsyncClient):
    resp = await async_client.get("/auth/me", headers=user_a["headers"])
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == user_a["email"]
    assert "id" in data


async def test_me_unauthenticated(async_client: AsyncClient):
    resp = await async_client.get("/auth/me")
    assert resp.status_code == 401


async def test_me_invalid_token(async_client: AsyncClient):
    resp = await async_client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.garbage"})
    assert resp.status_code == 401
