from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
import uuid
import json
from datetime import datetime

from database import get_db_session, add_financial_month, get_financial_months, delete_financial_month
from auth.jwt import get_current_user, get_current_user_optional
from database.models import User, FinancialMonth
from services.bank_statement_parser import bank_statement_parser

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
    transactions: Optional[List[Dict[str, Any]]] = None


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
    transactions: Optional[List[Dict[str, Any]]] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        raw_txns = getattr(obj, "transactions", "[]")
        parsed_txns = []
        if isinstance(raw_txns, str):
            try:
                parsed_txns = json.loads(raw_txns)
            except Exception:
                parsed_txns = []
        elif isinstance(raw_txns, list):
            parsed_txns = raw_txns

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
            transactions=parsed_txns,
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


# -------------------------------------------------------------
# Bank Statement & UPI Ingestion Endpoints
# -------------------------------------------------------------
@router.post("/ingest")
async def ingest_statement(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
):
    """Parses, decrypts, categorizes, and aggregates Indian Bank Statement PDF or UPI CSV."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    result = await bank_statement_parser.ingest_file(
        file_bytes=file_bytes,
        filename=file.filename or "statement.pdf",
        password=password,
    )
    return result


@router.get("/sample-statements/{statement_type}")
async def get_sample_statement(statement_type: str):
    """Returns authentic sample parsed data for HDFC statement or PhonePe UPI export."""
    s_type = statement_type.lower().strip()
    if s_type in ["hdfc", "bank", "pdf"]:
        return bank_statement_parser.get_sample_hdfc_statement()
    elif s_type in ["phonepe", "upi", "csv"]:
        return bank_statement_parser.get_sample_phonepe_csv()
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown statement type '{statement_type}'. Supported types: 'hdfc', 'phonepe'",
        )