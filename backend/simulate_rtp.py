"""
Simulación de N tiradas para estimar el RTP real de la máquina.
Uso: python simulate_rtp.py [num_spins]
"""
import sys
import numpy as np
import pandas as pd
from engine.reels import spin_reels
from engine.evaluator import evaluate_spin

SPINS     = int(sys.argv[1]) if len(sys.argv) > 1 else 1_000_000
BET       = 1.0
LINES     = 5

rng = np.random.default_rng(42)

total_bet   = 0.0
total_prize = 0.0
records     = []

for _ in range(SPINS):
    matrix = spin_reels(rng)
    result = evaluate_spin(matrix, BET, LINES)
    total_bet   += BET * LINES   # costo real = bet_por_línea × líneas
    total_prize += result.total_prize

    if result.total_prize > 0:
        records.append({
            "prize":         result.total_prize,
            "scatter_count": result.scatter_count,
            "lines_won":     len(result.line_results),
        })

rtp = total_prize / total_bet * 100
hit_rate = len(records) / SPINS * 100

df = pd.DataFrame(records)

print(f"\n{'='*40}")
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
print(f"{'='*40}\n")
