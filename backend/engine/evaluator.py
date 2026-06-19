"""
Evaluador de ganancias sobre la matriz 3×5.

Reglas:
- Matches de izquierda a derecha, consecutivos desde el rodillo 0.
- Sin WILD — cada símbolo matchea solo consigo mismo.
- SCATTER paga en cualquier posición (no necesita payline).
- Premio total = suma de paylines ganadoras + scatter.
"""
import numpy as np
from dataclasses import dataclass, field

from .symbols import Symbol, PAYTABLE, SCATTER_PAYS, SCATTER_FREE_SPINS
from .paylines import PAYLINES, extract_line


@dataclass
class LineResult:
    line_id: int
    symbols: list[Symbol]
    match_count: int
    matched_symbol: Symbol
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


def _count_matches(symbols: list[Symbol]) -> tuple[Symbol | None, int]:
    """Cuenta matches consecutivos desde la izquierda. SCATTER no forma payline."""
    first = symbols[0]
    if first is Symbol.SCATTER:
        return None, 0

    count = 1
    for s in symbols[1:]:
        if s is first:
            count += 1
        else:
            break

    return first, count


def evaluate_spin(matrix: np.ndarray, bet: float, lines_played: int) -> SpinResult:
    # bet = apuesta POR LÍNEA; el costo total del spin es bet * lines_played
    result = SpinResult(matrix=matrix, bet=bet, lines_played=lines_played)
    total_bet = bet * lines_played

    for line_id in range(1, lines_played + 1):
        symbols = extract_line(matrix, PAYLINES[line_id])
        base_symbol, count = _count_matches(symbols)

        if count >= 3 and base_symbol is not None:
            multiplier = PAYTABLE.get(base_symbol, {}).get(count, 0)
            if multiplier > 0:
                result.line_results.append(LineResult(
                    line_id=line_id,
                    symbols=symbols,
                    match_count=count,
                    matched_symbol=base_symbol,
                    multiplier=multiplier,
                    prize=bet * multiplier,   # bet por línea × multiplicador
                ))

    # Scatter: paga sobre la apuesta total del spin
    scatter_count = sum(1 for s in matrix.flatten() if s is Symbol.SCATTER)
    result.scatter_count = scatter_count

    if scatter_count >= 3:
        result.scatter_prize = total_bet * SCATTER_PAYS.get(scatter_count, 0)
        result.scatter_free_spins = SCATTER_FREE_SPINS.get(scatter_count, 0)

    result.total_prize = sum(lr.prize for lr in result.line_results) + result.scatter_prize
    return result
