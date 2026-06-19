import numpy as np
from fastapi import APIRouter
from engine.reels import spin_reels
from engine.evaluator import evaluate_spin
from engine.paylines import PAYLINES, MAX_LINES
from engine.symbols import PAYTABLE, SCATTER_PAYS, SCATTER_FREE_SPINS, Symbol
from .models import SpinRequest, SpinResponse, LineResultOut

router = APIRouter()


def _matrix_to_json(matrix: np.ndarray) -> list[list[str]]:
    return [[cell.value for cell in row] for row in matrix]


@router.post("/spin", response_model=SpinResponse)
def spin(req: SpinRequest) -> SpinResponse:
    matrix = spin_reels()
    result = evaluate_spin(matrix, req.bet, req.lines)

    return SpinResponse(
        matrix=_matrix_to_json(matrix),
        bet=result.bet,
        lines_played=result.lines_played,
        line_results=[
            LineResultOut(
                line_id=lr.line_id,
                symbols=[s.value for s in lr.symbols],
                match_count=lr.match_count,
                matched_symbol=lr.matched_symbol.value,
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
    )


@router.get("/config")
def get_config():
    """Devuelve la configuración pública de la máquina: paylines, paytable, scatter."""
    return {
        "reels": 5,
        "rows": 3,
        "max_lines": MAX_LINES,
        "paylines": {
            str(line_id): [[r, c] for r, c in coords]
            for line_id, coords in PAYLINES.items()
        },
        "paytable": {
            symbol.value: pays
            for symbol, pays in PAYTABLE.items()
        },
        "scatter": {
            "pays": {str(k): v for k, v in SCATTER_PAYS.items()},
            "free_spins": {str(k): v for k, v in SCATTER_FREE_SPINS.items()},
        },
    }
