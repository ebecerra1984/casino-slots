import json
import os
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from database import get_db
from db_models import Casino, Game, GameSession, SpinRecord
from services.webhook import fire_spin_webhook
from engine.config import GameConfig
from engine.reels import spin_reels
from engine.evaluator import evaluate_spin
from engine.paylines import PAYLINES, MAX_LINES
from engine.symbols import PAYTABLE, SCATTER_PAYS, SCATTER_FREE_SPINS
from .models import SpinRequest, SpinResponse, LineResultOut

DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"

router = APIRouter()

# Cache de configs en memoria — se invalida al actualizar via PUT /games/{id}
_config_cache: dict[str, GameConfig] = {}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _matrix_to_json(matrix: np.ndarray) -> list[list[str]]:
    return [[str(cell) for cell in row] for row in matrix]


def _load_game_config(game_id: str, db: DBSession) -> GameConfig:
    if game_id in _config_cache:
        return _config_cache[game_id]
    game = db.query(Game).filter(Game.id == game_id, Game.active == True).first()
    if not game:
        raise HTTPException(status_code=404, detail=f"Juego '{game_id}' no encontrado. Ejecuta seed_game.py primero.")
    config = GameConfig.model_validate_json(game.config_json)
    _config_cache[game_id] = config
    return config


def _resolve_session(
    token: str,
    total_bet: float,
    is_free: bool,
    db: DBSession,
) -> tuple[GameSession, Casino]:
    session = db.query(GameSession).filter(GameSession.token == token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if session.status == "active" and session.expires_at < _utcnow():
        session.status = "expired"
        db.commit()

    if session.status != "active":
        raise HTTPException(status_code=409, detail=f"Sesión {session.status}")

    if not is_free and session.balance < total_bet:
        raise HTTPException(status_code=402, detail="Saldo insuficiente")

    casino = db.query(Casino).filter(Casino.id == session.casino_id).first()
    return session, casino


@router.post("/spin", response_model=SpinResponse)
def spin(req: SpinRequest, bg: BackgroundTasks, db: DBSession = Depends(get_db)) -> SpinResponse:
    total_bet = req.bet * req.lines

    session: Optional[GameSession] = None
    casino: Optional[Casino] = None

    token = (req.session_token or "").strip() or None
    if token:
        session, casino = _resolve_session(token, total_bet, req.is_free_spin, db)
    elif not DEV_MODE:
        raise HTTPException(status_code=401, detail="session_token requerido")

    # Resolver game config: sesión tiene prioridad; fallback al campo game_id del request
    game_id = session.game_id if session else req.game_id
    config = _load_game_config(game_id, db)

    matrix = spin_reels(config)
    result = evaluate_spin(matrix, req.bet, req.lines, config)

    response_balance: Optional[float] = None

    if session is not None:
        balance_before = session.balance
        if req.is_free_spin:
            session.balance = round(session.balance + result.total_prize, 2)
        else:
            session.balance = round(session.balance - total_bet + result.total_prize, 2)
        balance_after = session.balance
        response_balance = session.balance

        record = SpinRecord(
            session_token=session.token,
            bet=req.bet,
            lines=req.lines,
            total_bet=0.0 if req.is_free_spin else total_bet,
            total_prize=result.total_prize,
            balance_before=balance_before,
            balance_after=balance_after,
            is_win=result.total_prize > 0,
            result_json=json.dumps(_matrix_to_json(matrix)),
        )
        db.add(record)
        db.commit()

        if casino and casino.callback_url:
            bg.add_task(
                fire_spin_webhook,
                casino.callback_url,
                session_token=session.token,
                player_id=session.player_id,
                currency=session.currency,
                bet=req.bet,
                lines=req.lines,
                total_bet=record.total_bet,
                total_prize=result.total_prize,
                is_win=result.total_prize > 0,
                balance_before=balance_before,
                balance_after=balance_after,
            )

    return SpinResponse(
        matrix=_matrix_to_json(matrix),
        bet=result.bet,
        lines_played=result.lines_played,
        line_results=[
            LineResultOut(
                line_id=lr.line_id,
                symbols=lr.symbols,
                match_count=lr.match_count,
                matched_symbol=lr.matched_symbol,
                multiplier=lr.multiplier,
                prize=lr.prize,
            )
            for lr in result.line_results
        ],
        scatter_count=result.scatter_count,
        scatter_prize=result.scatter_prize,
        scatter_free_spins=result.scatter_free_spins,
        total_prize=result.total_prize,
        is_win=result.total_prize > 0,
        balance=response_balance,
    )


@router.get("/config")
def get_config(game_id: str = "slots-classic", db: DBSession = Depends(get_db)):
    """Configuración pública de un juego (paylines, paytable, scatter)."""
    config = _load_game_config(game_id, db)
    return {
        "game_id": config.id,
        "game_name": config.name,
        "reels": config.cols,
        "rows": config.rows,
        "max_lines": len(config.paylines),
        "paylines": {
            str(line_id): coords
            for line_id, coords in config.paylines.items()
        },
        "paytable": config.paytable,
        "scatter": {
            "symbol": config.scatter_symbol,
            "pays": {str(k): v for k, v in config.scatter_pays.items()},
            "free_spins": {str(k): v for k, v in config.scatter_free_spins.items()},
        },
    }
