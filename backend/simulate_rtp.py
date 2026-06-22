"""
Simulación de N tiradas para estimar el RTP de un juego.
Uso: python simulate_rtp.py [game_id] [num_spins]

Ejemplos:
  python simulate_rtp.py slots-classic 1000000
  python simulate_rtp.py slots-high-vol 500000
"""
import sys
import numpy as np
import pandas as pd

from database import SessionLocal
from db_models import Game
from engine.config import GameConfig
from engine.reels import spin_reels
from engine.evaluator import evaluate_spin

GAME_ID = sys.argv[1] if len(sys.argv) > 1 else "slots-classic"
SPINS   = int(sys.argv[2]) if len(sys.argv) > 2 else 1_000_000
BET     = 1.0
LINES   = 5

# Cargar config desde DB
db = SessionLocal()
try:
    game = db.query(Game).filter(Game.id == GAME_ID, Game.active == True).first()
    if not game:
        print(f"Error: juego '{GAME_ID}' no encontrado. Ejecuta seed_game.py primero.")
        sys.exit(1)
    config = GameConfig.model_validate_json(game.config_json)
finally:
    db.close()

rng = np.random.default_rng(42)

total_bet   = 0.0
total_prize = 0.0
records     = []

for _ in range(SPINS):
    matrix = spin_reels(config, rng)
    result = evaluate_spin(matrix, BET, LINES, config)
    total_bet   += BET * LINES
    total_prize += result.total_prize

    if result.total_prize > 0:
        records.append({
            "prize":         result.total_prize,
            "scatter_count": result.scatter_count,
            "lines_won":     len(result.line_results),
        })

rtp      = total_prize / total_bet * 100
hit_rate = len(records) / SPINS * 100
df       = pd.DataFrame(records)

print(f"\n{'='*45}")
print(f"Juego             : {config.name} ({GAME_ID})")
print(f"Tiradas simuladas : {SPINS:,}")
print(f"Apuesta total     : {total_bet:,.2f}")
print(f"Premio total      : {total_prize:,.2f}")
print(f"RTP estimado      : {rtp:.2f}%")
print(f"Hit rate          : {hit_rate:.2f}%")

if not df.empty:
    print(f"\nPremios por tirada ganadora:")
    print(df["prize"].describe().round(2))
    scatter_hits = df[df["scatter_count"] >= 3]
    print(f"\nScatter triggers  : {len(scatter_hits):,}")
print(f"{'='*45}\n")
