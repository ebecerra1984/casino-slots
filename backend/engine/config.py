"""
GameConfig — configuración completa de un juego de slots.
Almacenable como JSON en DB; consumida por el engine en tiempo de ejecución.
"""
from pydantic import BaseModel


class GameConfig(BaseModel):
    id: str
    name: str
    rows: int = 3
    cols: int = 5
    # Una tira de símbolos por rodillo (columna)
    reels: list[list[str]]
    # Paylines: {line_id: [[row, col], ...]}
    paylines: dict[int, list[list[int]]]
    # Paytable: {symbol_str: {match_count: multiplier}}
    paytable: dict[str, dict[int, int]]
    scatter_symbol: str | None = None
    # scatter_pays: {count: multiplier_sobre_apuesta_total}
    scatter_pays: dict[int, float] = {}
    scatter_free_spins: dict[int, int] = {}
    # Máximo de scatters visibles por rodillo en una tirada
    scatter_max_per_reel: int = 1
