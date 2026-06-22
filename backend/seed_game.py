#!/usr/bin/env python3
"""
Seed de juegos y casino de prueba.

Crea:
  - slots-classic      (configuración actual, ~93% RTP)
  - slots-high-vol     (alta volatilidad, mismos símbolos, más premiums en tira)
  - Casino Demo        (con API key impresa en pantalla)

Uso:
  cd backend && python3 seed_game.py
"""
import json
import secrets
import sys

from database import Base, SessionLocal, engine
from db_models import Casino, Game
import db_models  # noqa: F401

Base.metadata.create_all(bind=engine)

# Importar constantes del engine clásico para construir el config base
from engine.reels import REEL_STRIPS
from engine.symbols import PAYTABLE, SCATTER_PAYS, SCATTER_FREE_SPINS
from engine.paylines import PAYLINES


# ── Builders de configuración ─────────────────────────────────────────────────

def _classic_config() -> dict:
    """Convierte las constantes hardcodeadas al formato GameConfig."""
    reels = [[s.value for s in strip] for strip in REEL_STRIPS]
    paylines = {k: [list(coord) for coord in v] for k, v in PAYLINES.items()}
    paytable = {sym.value: pays for sym, pays in PAYTABLE.items()}
    return {
        "id": "slots-classic",
        "name": "Slots Clásico",
        "rows": 3,
        "cols": 5,
        "reels": reels,
        "paylines": paylines,
        "paytable": paytable,
        "scatter_symbol": "SCATTER",
        "scatter_pays": {k: float(v) for k, v in SCATTER_PAYS.items()},
        "scatter_free_spins": dict(SCATTER_FREE_SPINS),
        "scatter_max_per_reel": 1,
    }


def _high_vol_config() -> dict:
    """
    Alta volatilidad: mismas tiras que classic (igual hit rate ~8%, igual scatter density).
    Paytable modificada para mayor varianza:
      - Símbolos comunes (LEMON/ORANGE/GRAPE) pagan menos en ×3
      - Símbolos premium (7/BAR/BELL) pagan mucho más en ×4 y ×5
    Efecto: pérdidas frecuentes, ganancias grandes ocasionales.
    RTP objetivo ~90% (verificar con simulate_rtp.py slots-high-vol 1000000).
    """
    # Mismas tiras que classic para mantener densidad de scatter estable
    reels = [[s.value for s in strip] for strip in REEL_STRIPS]
    paylines = {k: [list(coord) for coord in v] for k, v in PAYLINES.items()}

    return {
        "id": "slots-high-vol",
        "name": "Slots Alta Volatilidad",
        "rows": 3,
        "cols": 5,
        "reels": reels,
        "paylines": paylines,
        # Mismo RTP que classic (~92%), mayor varianza:
        # comunes igual, premiums ×4/×5 mucho más grandes → distribución más skewed
        # RTP objetivo ~94%, mayor varianza que classic:
        # comunes iguales, premiums ×4/×5 moderadamente más grandes
        "paytable": {
            "7":      {3: 130, 4: 770,  5: 4500},
            "BAR":    {3: 53,  4: 320,  5: 1800},
            "BELL":   {3: 38,  4: 210,  5: 1100},
            "CHERRY": {3: 28,  4: 92,   5: 450},
            "LEMON":  {3: 10,  4: 36,   5: 175},
            "ORANGE": {3: 10,  4: 36,   5: 175},
            "GRAPE":  {3: 10,  4: 36,   5: 175},
        },
        "scatter_symbol": "SCATTER",
        "scatter_pays":       {3: 3.0, 4: 10.0, 5: 50.0},
        "scatter_free_spins": {3: 10,  4: 15,   5: 25},
        "scatter_max_per_reel": 1,
    }


# ── Seed functions ────────────────────────────────────────────────────────────

def seed_games(db, force: bool = False) -> None:
    for cfg in [_classic_config(), _high_vol_config()]:
        gid = cfg["id"]
        existing = db.query(Game).filter(Game.id == gid).first()
        if existing and not force:
            print(f"  ⏭   Juego '{gid}' ya existe (--force para actualizar)")
        elif existing:
            existing.name = cfg["name"]
            existing.config_json = json.dumps(cfg)
            print(f"  🔄  Juego '{gid}' actualizado")
        else:
            db.add(Game(id=gid, name=cfg["name"], config_json=json.dumps(cfg)))
            print(f"  ✅  Juego '{gid}' creado")
    db.commit()


def seed_demo_casino(db) -> str | None:
    if db.query(Casino).filter(Casino.name == "Casino Demo").first():
        print("  ⏭   Casino 'Casino Demo' ya existe")
        return None

    api_key = f"cs_live_{secrets.token_urlsafe(24)}"
    db.add(Casino(name="Casino Demo", api_key=api_key, callback_url=None))
    db.commit()
    print("  ✅  Casino 'Casino Demo' creado")
    return api_key


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    force = "--force" in sys.argv
    db = SessionLocal()
    try:
        print("\n=== Juegos ===")
        seed_games(db, force=force)

        print("\n=== Casino Demo ===")
        api_key = seed_demo_casino(db)

        if api_key:
            print(f"\n  API Key: {api_key}")
            print("  ⚠️  Guarda el API Key: no se puede recuperar.\n")

            print("=== Ejemplos de uso ===\n")
            _print_examples(api_key)
        else:
            print("\n  (Ejecuta seed_casino.py --name ... para crear otro casino)\n")
    finally:
        db.close()


def _print_examples(api_key: str) -> None:
    base = "http://localhost:8000"
    for game_id, player in [("slots-classic", "jugador1"), ("slots-high-vol", "jugador2")]:
        print(f"  # Sesión para {game_id}:")
        payload = json.dumps({"player_id": player, "balance": 1000, "currency": "ARS", "game_id": game_id})
        print(f"  curl -X POST {base}/api/v1/sessions \\")
        print(f"       -H 'X-API-Key: {api_key}' \\")
        print(f"       -H 'Content-Type: application/json' \\")
        print(f"       -d '{payload}'")
        print(f"\n  # Abrir máquina:")
        print(f"  http://localhost:5173/?session=<TOKEN>")
        print()

    print(f"  # Listar juegos disponibles:")
    print(f"  curl {base}/api/v1/games\n")


if __name__ == "__main__":
    main()
