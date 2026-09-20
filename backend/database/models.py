from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Integer, Text, Index, TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import uuid


class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(36) for SQLite.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID())
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(value))
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return uuid.UUID(value)


Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    financial_months = relationship("FinancialMonth", back_populates="user", cascade="all, delete-orphan", order_by="FinancialMonth.month.desc()")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan", order_by="ChatMessage.created_at.desc()")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, name={self.name})>"


class FinancialMonth(Base):
    __tablename__ = "financial_months"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    month = Column(String(7), nullable=False, index=True)
    active_income = Column(Numeric(12, 2), default=0, nullable=False)
    passive_income = Column(Numeric(12, 2), default=0, nullable=False)
    credit_score = Column(Integer, default=0, nullable=False)
    loans_outstanding = Column(Numeric(12, 2), default=0, nullable=False)
    emi_monthly = Column(Numeric(12, 2), default=0, nullable=False)
    miscellaneous_charges = Column(Numeric(12, 2), default=0, nullable=False)
    money_spent = Column(Numeric(12, 2), default=0, nullable=False)
    transactions = Column(Text, nullable=True, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="financial_months")

    __table_args__ = (
        Index("ix_user_month_unique", "user_id", "month", unique=True),
    )

    def __repr__(self):
        return f"<FinancialMonth(user_id={self.user_id}, month={self.month}, income={self.active_income})>"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    metric = Column(String(50), nullable=True)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="chat_messages")

    def __repr__(self):
        return f"<ChatMessage(user_id={self.user_id}, role={self.role}, metric={self.metric})>"