import numpy as np
from .symbols import Symbol


# Sin BLANK ni WILD.
# Los 2 SCATTER por rodillo se insertan en posiciones 0 y ⌊len/2⌋
# para garantizar ≥3 posiciones de separación (nunca 2 en la misma ventana de 3).

def _spaced(base: list) -> list:
    """Intercala 2 SCATTERs equidistantes en una tira base."""
    half = len(base) // 2
    return [Symbol.SCATTER] + base[:half] + [Symbol.SCATTER] + base[half:]


_r0_base = (
    [Symbol.CHERRY] * 8 + [Symbol.LEMON]  * 8 + [Symbol.ORANGE] * 5 +
    [Symbol.GRAPE]  * 6 + [Symbol.BELL]   * 4 + [Symbol.BAR]    * 3 +
    [Symbol.SEVEN]  * 2
)   # 36 → total 38

_r1_base = (
    [Symbol.CHERRY] * 7 + [Symbol.LEMON]  * 8 + [Symbol.ORANGE] * 6 +
    [Symbol.GRAPE]  * 6 + [Symbol.BELL]   * 4 + [Symbol.BAR]    * 3 +
    [Symbol.SEVEN]  * 1
)   # 35 → total 37

_r2_base = (
    [Symbol.CHERRY] * 6 + [Symbol.LEMON]  * 7 + [Symbol.ORANGE] * 5 +
    [Symbol.GRAPE]  * 6 + [Symbol.BELL]   * 5 + [Symbol.BAR]    * 4 +
    [Symbol.SEVEN]  * 2
)   # 35 → total 37

REEL_STRIPS: list[list[Symbol]] = [
    _spaced(_r0_base),   # Rodillo 0
    _spaced(_r1_base),   # Rodillo 1
    _spaced(_r2_base),   # Rodillo 2 (centro)
    _spaced(_r1_base),   # Rodillo 3
    _spaced(_r0_base),   # Rodillo 4
]

REEL_ARRAYS: list[np.ndarray] = [np.array(strip, dtype=object) for strip in REEL_STRIPS]

ROWS = 3
COLS = 5


def spin_reels(rng: np.random.Generator | None = None) -> np.ndarray:
    if rng is None:
        rng = np.random.default_rng()

    matrix = np.empty((ROWS, COLS), dtype=object)
    for col, strip in enumerate(REEL_ARRAYS):
        strip_len = len(strip)
        while True:
            stop = rng.integers(0, strip_len)
            visible = [strip[(stop + r) % strip_len] for r in range(ROWS)]
            if sum(1 for s in visible if s is Symbol.SCATTER) <= 1:
                break
        for row in range(ROWS):
            matrix[row, col] = visible[row]

    return matrix
