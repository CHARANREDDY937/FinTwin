from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
import uuid


class FinancialMonth(BaseModel):
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    active_income: float = Field(default=0, ge=0)
    passive_income: float = Field(default=0, ge=0)
    credit_score: float = Field(default=0, ge=0, le=900)
    loans_outstanding: float = Field(default=0, ge=0)
    emi_monthly: float = Field(default=0, ge=0)
    miscellaneous_charges: float = Field(default=0, ge=0)
    money_spent: float = Field(default=0, ge=0)


class FinancialMonthResponse(FinancialMonth):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScenarioRequest(BaseModel):
    months: List[FinancialMonth]
    model: str = "xgboost"
    scenario: str = "baseline"
    horizon: int = Field(default=12, ge=1, le=120)


class ChatRequest(BaseModel):
    question: str
    months: List[FinancialMonth]
    model: str = "xgboost"
    scenario: str = "baseline"


class PersonalizedTrainingRequest(BaseModel):
    months: List[FinancialMonth] = Field(default_factory=list)
    output_dir: str = "artifacts/personalized-fintwin-model"
    base_model_name: str = "Qwen/Qwen2.5-1.5B-Instruct"
    epochs: int = Field(default=1, ge=1, le=5)
    max_samples: int = Field(default=2000, ge=100, le=20000)


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
    id: uuid.UUID
    email: str
    name: str

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    role: str
    content: str
    metric: Optional[str] = None
    title: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    metric: Optional[str]
    title: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True