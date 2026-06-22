import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session as DBSession

from database import get_db
from db_models import Casino, GameSession

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ── Auth ─────────────────────────────────────────────────────────────────────

def _require_casino(
    x_api_key: str = Header(..., description="API key del casino"),
    db: DBSession = Depends(get_db),
) -> Casino:
    casino = db.query(Casino).filter(
        Casino.api_key == x_api_key,
        Casino.active == True,
    ).first()
    if not casino:
        raise HTTPException(status_code=401, detail="API key inválida o casino inactivo")
    return casino


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateSessionReq(BaseModel):
    player_id: str = Field(..., min_length=1, max_length=200)
    balance: float = Field(..., ge=0)
    currency: str = Field(default="USD", max_length=10)
    game_id: str = Field(default="slots-classic", max_length=50)
    expires_in_seconds: int = Field(default=14_400, ge=60, le=86_400)


class SessionOut(BaseModel):
    session_token: str
    player_id: str
    balance: float
    currency: str
    game_id: str
    status: str
    expires_at: datetime


class CloseOut(BaseModel):
    final_balance: float
    status: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=SessionOut, status_code=201)
def create_session(
    body: CreateSessionReq,
    casino: Casino = Depends(_require_casino),
    db: DBSession = Depends(get_db),
):
    now = _utcnow()
    session = GameSession(
        token=secrets.token_urlsafe(32),
        casino_id=casino.id,
        player_id=body.player_id,
        balance=round(body.balance, 2),
        currency=body.currency.upper(),
        game_id=body.game_id,
        expires_at=now + timedelta(seconds=body.expires_in_seconds),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _to_out(session)


@router.get("/{token}", response_model=SessionOut)
def get_session(token: str, db: DBSession = Depends(get_db)):
    session = _load_and_sync_expiry(token, db)
    return _to_out(session)


@router.post("/{token}/close", response_model=CloseOut)
def close_session(
    token: str,
    casino: Casino = Depends(_require_casino),
    db: DBSession = Depends(get_db),
):
    session = db.query(GameSession).filter(
        GameSession.token == token,
        GameSession.casino_id == casino.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if session.status != "active":
        raise HTTPException(status_code=409, detail=f"Sesión ya está {session.status}")
    session.status = "closed"
    db.commit()
    return CloseOut(final_balance=session.balance, status="closed")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _load_and_sync_expiry(token: str, db: DBSession) -> GameSession:
    session = db.query(GameSession).filter(GameSession.token == token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if session.status == "active" and session.expires_at < _utcnow():
        session.status = "expired"
        db.commit()
    return session


def _to_out(s: GameSession) -> SessionOut:
    return SessionOut(
        session_token=s.token,
        player_id=s.player_id,
        balance=s.balance,
        currency=s.currency,
        game_id=s.game_id,
        status=s.status,
        expires_at=s.expires_at,
    )
