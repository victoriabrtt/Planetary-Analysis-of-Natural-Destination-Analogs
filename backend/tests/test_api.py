"""Tests de la API contra los índices reales (se saltean los que necesitan un cuerpo sin índice)."""

import math

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.engine import DIMENSIONS, INDEX_DIR
from app.main import app
from precompute.descriptors import Grid

HAS = {b: (INDEX_DIR / f"{b}_grid.npz").exists() for b in ("earth", "moon", "mars")}
need = lambda *bs: pytest.mark.skipif(not all(HAS[b] for b in bs), reason=f"falta índice {bs}")  # noqa: E731


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def post(client, **kw):
    body = {"source_body": "moon", "lat": -89.9, "lon": 0.0, "target_body": "earth", "top_n": 5, "weights": {}}
    body.update(kw)
    return client.post("/api/match", json=body)


def test_grid_roundtrip():
    g = Grid.build("moon")
    lat, lon = g.centers()
    ids = g.cell_of(lat, lon)
    assert np.array_equal(ids, np.arange(g.ncells))
    # Celdas de ~20 km en el terreno en todas las latitudes (salvo el casquete polar)
    R = g.radius / 1000
    b = g.band_of(lat)
    width_km = 2 * math.pi * R * np.cos(np.radians(lat)) / g.nlon[b]
    mid = np.abs(lat) < 80
    assert np.allclose(width_km[mid], 20, rtol=0.15)


@need("moon", "earth")
def test_contract_shape(client):
    r = post(client)
    assert r.status_code == 200, r.text
    j = r.json()
    assert set(j) >= {"source", "overall", "perDim", "caveats"}
    assert j["source"] == {**j["source"], "body": "moon", "lat": -89.9, "lon": 0.0}
    assert set(j["overall"]) == {"site", "score"} and set(j["overall"]["site"]) == {"name", "lat", "lon"}
    assert set(j["perDim"]) == set(DIMENSIONS)
    for k, m in j["perDim"].items():
        assert {"site", "score", "src", "match", "diff"} <= set(m)
        assert 0 <= m["score"] <= 1
        assert m["diff"] == pytest.approx(abs(m["src"] - m["match"]), abs=10 ** -DIMENSIONS[k]["decimals"] * 1.01)
        # La fórmula: exp(-(diff/tol)^2)
        assert m["score"] == pytest.approx(math.exp(-((m["diff"] / DIMENSIONS[k]["tol"]) ** 2)), abs=0.02)
    assert len(j["caveats"]) >= 3
    assert len(j["ranking"]) == 5
    assert j["ranking"][0]["site"] == j["overall"]["site"]


@need("moon", "earth")
def test_weights_change_winner(client):
    winners = set()
    for lat, lon in [(0.67, 23.47), (-43.3, -11.4), (23.7, -47.4), (-84.6, -38.5)]:
        for w in ({}, {"terrain": 3, "roughness": 2.5}, {"illum": 3}):
            winners.add((lat, post(client, lat=lat, lon=lon, weights=w).json()["overall"]["site"]["name"]))
    assert len(winners) > 4  # algún perfil cambia el ganador en algún punto


@need("earth", "moon")
def test_ocean_is_masked(client):
    r = post(client, source_body="earth", lat=-30.0, lon=-140.0, target_body="moon")  # Pacífico sur
    assert r.status_code == 422
    assert "océano" in r.json()["detail"]


@need("earth", "moon")
def test_inverse_mode(client):
    r = post(client, source_body="earth", lat=79.4, lon=-90.8, target_body="moon")
    assert r.status_code == 200, r.text
    assert r.json()["source"]["body"] == "earth"


def test_meta(client):
    j = client.get("/api/meta").json()
    assert [d["key"] for d in j["dims"]] == list(DIMENSIONS)
    assert {p["id"] for p in j["profiles"]} == {"balanced", "rover", "thermal"}
