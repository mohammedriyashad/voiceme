"""utils/database.py — SQLAlchemy ORM models + DB setup"""
from datetime import datetime
from sqlalchemy import (create_engine, Column, Integer, String, Float,
                        DateTime, Text, Boolean, ForeignKey)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from utils.config import config

DATABASE_URL = f"sqlite:///{config.DB_PATH}"
engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()


# ── ORM Models ────────────────────────────────────────────────
class ChildProfile(Base):
    __tablename__ = "child_profiles"
    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(100), nullable=False)
    age             = Column(Integer)
    photo_path      = Column(String(255), default="")
    notes           = Column(Text, default="")
    preferred_symbols = Column(Text, default="[]")   # JSON list
    created_at      = Column(DateTime, default=datetime.utcnow)
    sessions        = relationship("Session", back_populates="child", cascade="all, delete")
    alerts          = relationship("Alert",   back_populates="child", cascade="all, delete")


class Session(Base):
    __tablename__ = "sessions"
    id          = Column(Integer, primary_key=True, index=True)
    child_id    = Column(Integer, ForeignKey("child_profiles.id"))
    started_at  = Column(DateTime, default=datetime.utcnow)
    ended_at    = Column(DateTime, nullable=True)
    messages    = relationship("Message", back_populates="session", cascade="all, delete")
    child       = relationship("ChildProfile", back_populates="sessions")


class Message(Base):
    __tablename__ = "messages"
    id            = Column(Integer, primary_key=True, index=True)
    session_id    = Column(Integer, ForeignKey("sessions.id"))
    timestamp     = Column(DateTime, default=datetime.utcnow)
    sentence      = Column(Text)
    emotion       = Column(String(50))
    gesture       = Column(String(100))
    pose          = Column(String(100))
    symbols_used  = Column(Text, default="[]")   # JSON list
    speech_text   = Column(Text, default="")
    confidence    = Column(Float, default=0.0)
    session       = relationship("Session", back_populates="messages")


class Alert(Base):
    __tablename__ = "alerts"
    id          = Column(Integer, primary_key=True, index=True)
    child_id    = Column(Integer, ForeignKey("child_profiles.id"))
    timestamp   = Column(DateTime, default=datetime.utcnow)
    alert_type  = Column(String(50))   # distress / urgent / info
    message     = Column(Text)
    emotion     = Column(String(50))
    gesture     = Column(String(100))
    is_read     = Column(Boolean, default=False)
    child       = relationship("ChildProfile", back_populates="alerts")


class CustomSymbol(Base):
    __tablename__ = "custom_symbols"
    id          = Column(Integer, primary_key=True, index=True)
    child_id    = Column(Integer, ForeignKey("child_profiles.id"), nullable=True)
    label       = Column(String(100))
    file_path   = Column(String(255))
    uploaded_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()