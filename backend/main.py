from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
import db_models  # noqa: F401 — registra todos los modelos ORM
from api.routes import router
from api.sessions import router as sessions_router
from api.games import router as games_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Casino Slots Engine",
    description="Motor matemático de tragamonedas 5×3 — multi-tenant, sesiones, webhooks",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # ajustar en producción
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(games_router, prefix="/api/v1")
