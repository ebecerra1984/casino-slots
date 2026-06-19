"""
Paylines para grilla 3 filas × 5 rodillos.
Índices de fila: 0=top, 1=middle, 2=bottom
"""

PAYLINES: dict[int, list[tuple[int, int]]] = {
    1: [(1,0), (1,1), (1,2), (1,3), (1,4)],  # fila central
    2: [(0,0), (0,1), (0,2), (0,3), (0,4)],  # fila superior
    3: [(2,0), (2,1), (2,2), (2,3), (2,4)],  # fila inferior
    4: [(0,0), (1,1), (2,2), (1,3), (0,4)],  # V hacia abajo  (zigzag)
    5: [(2,0), (1,1), (0,2), (1,3), (2,4)],  # V hacia arriba (zigzag)
}

MAX_LINES = len(PAYLINES)


def extract_line(matrix, payline: list[tuple[int, int]]) -> list:
    return [matrix[r, c] for r, c in payline]
