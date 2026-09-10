from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from datetime import timedelta

from database import get_db_session, create_user, authenticate_user
from auth.jwt import create_access_token, get_current_user
from config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=str(obj.id),
            email=obj.email,
            name=obj.name
        )


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db_session)):
    print(f"[DEBUG] Register: email={user_data.email}")
    existing_user = await authenticate_user(db, user_data.email, user_data.password)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    user = await create_user(db, user_data.email, user_data.name, user_data.password)
    print(f"[DEBUG] Created user: {user.id}")
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.jwt_expiration_minutes)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db_session)
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.jwt_expiration_minutes)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-json", response_model=Token)
async def login_json(user_data: UserLogin, db: AsyncSession = Depends(get_db_session)):
    user = await authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.jwt_expiration_minutes)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user)):
    return UserResponse.from_orm(current_user)