"""
Evaluador genérico — opera sobre strings, sin dependencia de Symbol enum.
Recibe un GameConfig que define paytable, paylines y scatter.
"""
import numpy as np
from dataclasses import dataclass, field

from .config import GameConfig


@dataclass
class LineResult:
    line_id: int
    symbols: list[str]
    match_count: int
    matched_symbol: str
    multiplier: int
    prize: float


@dataclass
class SpinResult:
    matrix: np.ndarray
    bet: float
    lines_played: int
    line_results: list[LineResult] = field(default_factory=list)
    scatter_count: int = 0
    scatter_prize: float = 0.0
    scatter_free_spins: int = 0
    total_prize: float = 0.0


def _count_matches(symbols: list[str], scatter: str | None) -> tuple[str | None, int]:
    """Matches consecutivos desde la izquierda; scatter no inicia payline."""
    first = symbols[0]
    if first == scatter:
        return None, 0
    count = 1
    for s in symbols[1:]:
        if s == first:
            count += 1
        else:
            break
    return first, count


def evaluate_spin(
    matrix: np.ndarray,
    bet: float,
    lines_played: int,
    config: GameConfig,
) -> SpinResult:
    result = SpinResult(matrix=matrix, bet=bet, lines_played=lines_played)
    total_bet = bet * lines_played

    for line_id in range(1, lines_played + 1):
        coords = config.paylines[line_id]
        symbols = [str(matrix[r, c]) for r, c in coords]
        base_symbol, count = _count_matches(symbols, config.scatter_symbol)

        if count >= 3 and base_symbol is not None:
            multiplier = config.paytable.get(base_symbol, {}).get(count, 0)
            if multiplier > 0:
                result.line_results.append(LineResult(
                    line_id=line_id,
                    symbols=symbols,
                    match_count=count,
                    matched_symbol=base_symbol,
                    multiplier=multiplier,
                    prize=bet * multiplier,
                ))

    if config.scatter_symbol:
        scatter_count = int(np.sum(matrix == config.scatter_symbol))
        result.scatter_count = scatter_count
        if scatter_count >= 3:
            result.scatter_prize = total_bet * config.scatter_pays.get(scatter_count, 0)
            result.scatter_free_spins = config.scatter_free_spins.get(scatter_count, 0)

    result.total_prize = sum(lr.prize for lr in result.line_results) + result.scatter_prize
    return result
