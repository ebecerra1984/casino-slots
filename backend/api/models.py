from pydantic import BaseModel, Field, model_validator
from engine.paylines import MAX_LINES


class SpinRequest(BaseModel):
    bet: float = Field(..., gt=0, description="Apuesta total en créditos")
    lines: int = Field(default=MAX_LINES, ge=1, le=MAX_LINES,
                       description="Cantidad de paylines activas (1-3)")

    @model_validator(mode="after")
    def bet_divisible_by_lines(self):
        # Garantiza que bet/lines no genere decimales raros
        rounded = round(self.bet / self.lines, 10)
        if rounded <= 0:
            raise ValueError("bet/lines debe ser positivo")
        return self


class LineResultOut(BaseModel):
    line_id: int
    symbols: list[str]
    match_count: int
    matched_symbol: str
    multiplier: int
    prize: float


class SpinResponse(BaseModel):
    matrix: list[list[str]]        # 3 filas × 5 columnas de símbolos
    bet: float
    lines_played: int
    line_results: list[LineResultOut]
    scatter_count: int
    scatter_prize: float
    scatter_free_spins: int
    total_prize: float
    is_win: bool
