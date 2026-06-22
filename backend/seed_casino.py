#!/usr/bin/env python3
"""CLI para crear un casino tenant con su API key."""
import argparse
import secrets
import sys

from database import Base, SessionLocal, engine
from db_models import Casino
import db_models  # noqa: F401 — registra todos los modelos antes de create_all

Base.metadata.create_all(bind=engine)


def main() -> None:
    p = argparse.ArgumentParser(description="Crear un casino tenant")
    p.add_argument("--name", required=True, help="Nombre del casino")
    p.add_argument("--callback-url", default=None, help="URL webhook (opcional)")
    args = p.parse_args()

    api_key = f"cs_live_{secrets.token_urlsafe(24)}"

    db = SessionLocal()
    try:
        if db.query(Casino).filter(Casino.name == args.name).first():
            print(f"❌  Ya existe un casino con el nombre '{args.name}'")
            sys.exit(1)

        casino = Casino(
            name=args.name,
            api_key=api_key,
            callback_url=args.callback_url,
        )
        db.add(casino)
        db.commit()
        db.refresh(casino)

        print(f"✅  Casino creado")
        print(f"    ID:       {casino.id}")
        print(f"    Nombre:   {casino.name}")
        print(f"    API Key:  {api_key}")
        print(f"    Callback: {casino.callback_url or '(ninguno)'}")
        print()
        print("⚠️   Guarda el API Key: no se puede recuperar.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
