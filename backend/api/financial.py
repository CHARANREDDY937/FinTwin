from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

from database import get_db_session, add_financial_month, get_financial_months, delete_financial_month
from auth.jwt import get_current_user
from database.models import User, FinancialMonth

router = APIRouter(prefix="/financial", tags=["financial"])


class FinancialMonthCreate(BaseModel):
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    active_income: float = Field(default=0, ge=0)
    passive_income: float = Field(default=0, ge=0)
    credit_score: int = Field(default=0, ge=0, le=900)
    loans_outstanding: float = Field(default=0, ge=0)
    emi_monthly: float = Field(default=0, ge=0)
    miscellaneous_charges: float = Field(default=0, ge=0)
    money_spent: float = Field(default=0, ge=0)


class FinancialMonthResponse(BaseModel):
    id: str
    month: str
    active_income: float
    passive_income: float
    credit_score: int
    loans_outstanding: float
    emi_monthly: float
    miscellaneous_charges: float
    money_spent: float
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=str(obj.id),
            month=obj.month,
            active_income=float(obj.active_income),
            passive_income=float(obj.passive_income),
            credit_score=obj.credit_score,
            loans_outstanding=float(obj.loans_outstanding),
            emi_monthly=float(obj.emi_monthly),
            miscellaneous_charges=float(obj.miscellaneous_charges),
            money_spent=float(obj.money_spent),
            created_at=obj.created_at.isoformat() if obj.created_at else "",
            updated_at=obj.updated_at.isoformat() if obj.updated_at else "",
        )


@router.post("/months", response_model=FinancialMonthResponse)
async def create_or_update_month(
    month_data: FinancialMonthCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    month = await add_financial_month(db, current_user.id, month_data.model_dump())
    return FinancialMonthResponse.from_orm(month)


@router.get("/months", response_model=List[FinancialMonthResponse])
async def get_months(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    months = await get_financial_months(db, current_user.id)
    return [FinancialMonthResponse.from_orm(m) for m in months]


@router.delete("/months/{month}")
async def delete_month(
    month: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    deleted = await delete_financial_month(db, current_user.id, month)
    if not deleted:
        raise HTTPException(status_code=404, detail="Month not found")
    return {"status": "ok", "message": f"Month {month} deleted"}