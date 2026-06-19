from enum import Enum


class Symbol(str, Enum):
    SEVEN   = "7"
    BAR     = "BAR"
    BELL    = "BELL"
    CHERRY  = "CHERRY"
    LEMON   = "LEMON"
    ORANGE  = "ORANGE"
    GRAPE   = "GRAPE"
    SCATTER = "SCATTER"


# Paytable: símbolo → {matches: multiplicador sobre apuesta por línea}
# Modelo: bet = apuesta POR LÍNEA; costo total = bet × lines
# RTP objetivo ~94% con 5 paylines y 2 scatters bien espaciados por rodillo
PAYTABLE: dict[Symbol, dict[int, int]] = {
    Symbol.SEVEN:   {3: 130, 4: 486,  5: 2430},
    Symbol.BAR:     {3: 53,  4: 209,  5: 1009},
    Symbol.BELL:    {3: 38,  4: 149,  5: 738},
    Symbol.CHERRY:  {3: 28,  4: 92,   5: 450},
    Symbol.LEMON:   {3: 10,  4: 36,   5: 175},
    Symbol.ORANGE:  {3: 10,  4: 36,   5: 175},
    Symbol.GRAPE:   {3: 10,  4: 36,   5: 175},
}

SCATTER_PAYS: dict[int, int] = {
    3: 3,
    4: 10,
    5: 50,
}

SCATTER_FREE_SPINS: dict[int, int] = {
    3: 10,
    4: 15,
    5: 20,
}
