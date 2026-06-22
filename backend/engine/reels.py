import numpy as np
from .config import GameConfig
from .symbols import Symbol


# ── Tiras por defecto (slots-classic) ────────────────────────────────────────
# Se mantienen como constantes del módulo para que seed_game.py pueda importarlas.

def _spaced(base: list) -> list:
    """Intercala 2 SCATTERs equidistantes en una tira base."""
    half = len(base) // 2
    return [Symbol.SCATTER] + base[:half] + [Symbol.SCATTER] + base[half:]


_r0_base = (
    [Symbol.CHERRY] * 8 + [Symbol.LEMON]  * 8 + [Symbol.ORANGE] * 5 +
    [Symbol.GRAPE]  * 6 + [Symbol.BELL]   * 4 + [Symbol.BAR]    * 3 +
    [Symbol.SEVEN]  * 2
)   # 36 → 38 con 2 SCATTER

_r1_base = (
    [Symbol.CHERRY] * 7 + [Symbol.LEMON]  * 8 + [Symbol.ORANGE] * 6 +
    [Symbol.GRAPE]  * 6 + [Symbol.BELL]   * 4 + [Symbol.BAR]    * 3 +
    [Symbol.SEVEN]  * 1
)   # 35 → 37

_r2_base = (
    [Symbol.CHERRY] * 6 + [Symbol.LEMON]  * 7 + [Symbol.ORANGE] * 5 +
    [Symbol.GRAPE]  * 6 + [Symbol.BELL]   * 5 + [Symbol.BAR]    * 4 +
    [Symbol.SEVEN]  * 2
)   # 35 → 37

REEL_STRIPS: list[list[Symbol]] = [
    _spaced(_r0_base),
    _spaced(_r1_base),
    _spaced(_r2_base),
    _spaced(_r1_base),
    _spaced(_r0_base),
]

ROWS = 3
COLS = 5


# ── Motor genérico ────────────────────────────────────────────────────────────

def spin_reels(config: GameConfig, rng: np.random.Generator | None = None) -> np.ndarray:
    """
    Devuelve una matriz (rows × cols) de strings usando las tiras del config.
    Rechaza posiciones donde un rodillo muestra más de scatter_max_per_reel scatters.
    """
    if rng is None:
        rng = np.random.default_rng()

    matrix = np.empty((config.rows, config.cols), dtype=object)
    scatter = config.scatter_symbol

    for col, strip in enumerate(config.reels):
        strip_len = len(strip)
        while True:
            stop = int(rng.integers(0, strip_len))
            visible = [strip[(stop + r) % strip_len] for r in range(config.rows)]
            if scatter is None or sum(1 for s in visible if s == scatter) <= config.scatter_max_per_reel:
                break
        for row in range(config.rows):
            matrix[row, col] = visible[row]

    return matrix
