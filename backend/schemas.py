from pydantic import BaseModel, Field


class FinancialMonth(BaseModel):
    month: str
    active_income: float = Field(default=0, ge=0)
    passive_income: float = Field(default=0, ge=0)
    credit_score: float = Field(default=0, ge=0)
    loans_outstanding: float = Field(default=0, ge=0)
    emi_monthly: float = Field(default=0, ge=0)
    miscellaneous_charges: float = Field(default=0, ge=0)
    money_spent: float = Field(default=0, ge=0)


class ScenarioRequest(BaseModel):
    months: list[FinancialMonth]
    model: str = "xgboost"
    scenario: str = "baseline"
    horizon: int = Field(default=12, ge=1, le=120)


class ChatRequest(BaseModel):
    question: str
    months: list[FinancialMonth]
    model: str = "xgboost"
    scenario: str = "baseline"


class PersonalizedTrainingRequest(BaseModel):
    months: list[FinancialMonth] = Field(default_factory=list)
    output_dir: str = "artifacts/personalized-fintwin-model"
    base_model_name: str = "Qwen/Qwen2.5-1.5B-Instruct"
    epochs: int = Field(default=1, ge=1, le=5)
    max_samples: int = Field(default=2000, ge=100, le=20000)
