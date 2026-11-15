"""
API de Analog Matcher.

  uvicorn app.main:app --reload --port 8000        (desde backend/)

  POST /api/match   contrato consumido por el front (ver README)
  GET  /api/meta    dimensiones, tolerancias, perfiles y puntos famosos (el front los usa en modo real)
  GET  /health

Si existe el build del front (STATIC_DIR, por defecto ../frontend/dist o /app/static en el contenedor),
se sirve en "/" desde el mismo origen.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .engine import Engine, PointError

Body = Literal["earth", "moon", "mars"]


class MatchRequest(BaseModel):
    source_body: Body
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-360, le=360)
    target_body: Body = "earth"
    top_n: int = Field(default=5, ge=1, le=20)
    weights: dict[str, float] = Field(default_factory=dict)
    # Opcional (extensión del contrato): idioma de los textos y nombres de la respuesta.
    lang: Literal["es", "en"] = "es"


state: dict = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    state["engine"] = Engine()  # carga los índices una sola vez
    yield


app = FastAPI(title="Analog Matcher API", version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["*"])


def engine() -> Engine:
    return state["engine"]


@app.get("/health")
def health() -> dict:
    e = engine()
    return {"status": "ok", "bodies": {b: len(i.lat) for b, i in e.index.items()}}


@app.get("/api/meta")
def meta(lang: Literal["es", "en"] = "es") -> dict:
    return engine().meta(lang)


@app.post("/api/match")
def match(req: MatchRequest) -> dict:
    lon = ((req.lon + 180) % 360) - 180
    try:
        return engine().match(req.source_body, req.lat, lon, req.target_body, req.top_n, req.weights, req.lang)
    except PointError as e:
        raise HTTPException(status_code=422, detail={"message": str(e), "nearest": e.nearest}) from e


# ── Front estático (mismo origen en producción) ──
_default_static = Path(__file__).resolve().parents[2] / "frontend" / "dist"
STATIC_DIR = Path(os.environ.get("STATIC_DIR", _default_static))
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")
    app.mount("/textures", StaticFiles(directory=STATIC_DIR / "textures"), name="textures")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        f = (STATIC_DIR / path).resolve()
        if path and f.is_file() and STATIC_DIR.resolve() in f.parents:
            return FileResponse(f)
        return FileResponse(STATIC_DIR / "index.html")
