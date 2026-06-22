import json

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from database import get_db
from db_models import Casino, Game
from engine.config import GameConfig

router = APIRouter(prefix="/games", tags=["games"])


# ── Auth ─────────────────────────────────────────────────────────────────────

def _require_casino(
    x_api_key: str = Header(...),
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

class GameSummary(BaseModel):
    id: str
    name: str
    active: bool


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[GameSummary])
def list_games(db: DBSession = Depends(get_db)):
    """Lista juegos disponibles (público)."""
    games = db.query(Game).filter(Game.active == True).all()
    return [GameSummary(id=g.id, name=g.name, active=g.active) for g in games]


@router.get("/{game_id}/config")
def get_game_config(game_id: str, db: DBSession = Depends(get_db)):
    """Retorna la configuración completa del juego (público)."""
    game = db.query(Game).filter(Game.id == game_id, Game.active == True).first()
    if not game:
        raise HTTPException(status_code=404, detail=f"Juego '{game_id}' no encontrado")
    return json.loads(game.config_json)


@router.post("", response_model=GameSummary, status_code=201)
def create_game(
    body: GameConfig,
    casino: Casino = Depends(_require_casino),
    db: DBSession = Depends(get_db),
):
    """Crea un nuevo juego. Requiere X-API-Key de casino."""
    if db.query(Game).filter(Game.id == body.id).first():
        raise HTTPException(status_code=409, detail=f"Juego '{body.id}' ya existe")
    game = Game(id=body.id, name=body.name, config_json=body.model_dump_json())
    db.add(game)
    db.commit()
    return GameSummary(id=game.id, name=game.name, active=game.active)


@router.put("/{game_id}", response_model=GameSummary)
def update_game(
    game_id: str,
    body: GameConfig,
    casino: Casino = Depends(_require_casino),
    db: DBSession = Depends(get_db),
):
    """Actualiza un juego existente. Requiere X-API-Key de casino."""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail=f"Juego '{game_id}' no encontrado")
    game.name = body.name
    game.config_json = body.model_dump_json()
    db.commit()
    # Invalida cache en routes.py
    from api.routes import _config_cache
    _config_cache.pop(game_id, None)
    return GameSummary(id=game.id, name=game.name, active=game.active)
