from typing import Optional

from pydantic import BaseModel, Field
from engine.paylines import MAX_LINES


class SpinRequest(BaseModel):
    session_token: Optional[str] = Field(default=None, description="Token de sesión del jugador")
    game_id: str = Field(default="slots-classic", description="ID del juego (fallback si no hay sesión)")
    is_free_spin: bool = Field(default=False, description="True cuando el frontend consume un free spin")
    bet: float = Field(..., gt=0, description="Apuesta por línea")
    lines: int = Field(default=MAX_LINES, ge=1, le=MAX_LINES,
                       description="Cantidad de paylines activas")


class LineResultOut(BaseModel):
    line_id: int
    symbols: list[str]
    match_count: int
    matched_symbol: str
    multiplier: int
    prize: float


class SpinResponse(BaseModel):
    matrix: list[list[str]]
    bet: float
    lines_played: int
    line_results: list[LineResultOut]
    scatter_count: int
    scatter_prize: float
    scatter_free_spins: int
    total_prize: float
    is_win: bool
    balance: Optional[float] = None  # saldo post-spin; solo en modo sesión
