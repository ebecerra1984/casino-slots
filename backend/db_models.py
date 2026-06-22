from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Casino(Base):
    __tablename__ = "casinos"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    api_key = Column(String(64), unique=True, nullable=False, index=True)
    callback_url = Column(String(500), nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=_utcnow)


class GameSession(Base):
    __tablename__ = "game_sessions"

    token = Column(String(64), primary_key=True)
    casino_id = Column(Integer, ForeignKey("casinos.id"), nullable=False)
    player_id = Column(String(200), nullable=False)
    balance = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    game_id = Column(String(50), default="slots-classic", nullable=False)
    # active | closed | expired
    status = Column(String(20), default="active", nullable=False)
    created_at = Column(DateTime, default=_utcnow)
    expires_at = Column(DateTime, nullable=False)


class Game(Base):
    __tablename__ = "games"

    id = Column(String(50), primary_key=True)   # slug: "slots-classic"
    name = Column(String(100), nullable=False)
    config_json = Column(Text, nullable=False)   # JSON serializado de GameConfig
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=_utcnow)


class SpinRecord(Base):
    __tablename__ = "spin_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_token = Column(String(64), ForeignKey("game_sessions.token"), nullable=False, index=True)
    bet = Column(Float, nullable=False)
    lines = Column(Integer, nullable=False)
    total_bet = Column(Float, nullable=False)
    total_prize = Column(Float, nullable=False)
    balance_before = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    is_win = Column(Boolean, nullable=False)
    result_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_utcnow)
