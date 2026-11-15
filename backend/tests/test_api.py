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
    # Contrato: site + score. Extensión opcional: perDim del ganador global.
    assert {"site", "score"} <= set(j["overall"]) <= {"site", "score", "perDim", "qualifying"}
    assert set(j["overall"]["site"]) == {"name", "lat", "lon"}
    for k, w in j["overall"]["perDim"].items():
        dec = DIMENSIONS[k]["decimals"]
        assert w["diff"] == pytest.approx(abs(j["perDim"][k]["src"] - w["match"]), abs=10**-dec / 2)
        # el mejor por dimensión nunca es peor que el ganador global en esa dimensión
        assert j["perDim"][k]["score"] >= w["score"] - 1e-9
    assert set(j["perDim"]) == set(DIMENSIONS)
    for k, m in j["perDim"].items():
        assert {"site", "score", "src", "match", "diff"} <= set(m)
        assert 0 <= m["score"] <= 1
        assert m["diff"] == pytest.approx(abs(m["src"] - m["match"]), abs=10 ** -DIMENSIONS[k]["decimals"] * 1.01)
        # La fórmula: exp(-(diff/tol)^2). La diferencia mostrada sale de valores redondeados, así que
        # la diferencia real cae dentro de ±1 unidad de redondeo de la mostrada.
        unit, tol = 10 ** -DIMENSIONS[k]["decimals"], DIMENSIONS[k]["tol"]
        lo = math.exp(-(((m["diff"] + unit) / tol) ** 2))
        hi = math.exp(-((max(m["diff"] - unit, 0) / tol) ** 2))
        assert lo - 1e-3 <= m["score"] <= hi + 1e-3
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
    detail = r.json()["detail"]
    assert "océano" in detail["message"]
    assert {"lat", "lon", "km"} <= set(detail["nearest"])


@need("earth", "moon")
def test_inverse_mode(client):
    r = post(client, source_body="earth", lat=79.4, lon=-90.8, target_body="moon")
    assert r.status_code == 200, r.text
    assert r.json()["source"]["body"] == "earth"


def test_meta(client):
    j = client.get("/api/meta").json()
    assert [d["key"] for d in j["dims"]] == list(DIMENSIONS)
    assert {p["id"] for p in j["profiles"]} == {"balanced", "rover", "thermal"}


def test_illumination_obliquity():
    from app.engine import OBLIQUITY_DEG, illumination

    assert OBLIQUITY_DEG == {"moon": 1.5, "earth": 23.4, "mars": 25.2}
    assert illumination("moon", -89.9) == pytest.approx(88.4)
    assert illumination("earth", 10.0) == 0.0  # dentro de los trópicos el sol llega al cenit


@need("moon", "earth")
def test_lunar_pole_breaks_on_illumination(client):
    """Con la Tierra inclinada 23,4°, ningún lugar es tan rasante como el polo sur lunar."""
    j = post(client).json()
    assert j["perDim"]["illum"]["src"] == pytest.approx(88, abs=0.5)
    assert j["perDim"]["illum"]["match"] <= 90 - 23.4 + 0.5
    assert j["overall"]["perDim"]["illum"]["score"] < 0.25  # "Se rompe"


@need("mars", "earth")
def test_mars_pole_illumination_holds(client):
    """Marte (25,2°) y la Tierra (23,4°) tienen inclinación parecida: la analogía de iluminación aguanta."""
    j = post(client, source_body="mars", lat=-80.0, lon=0.0).json()
    assert j["perDim"]["illum"]["score"] > 0.9


@need("moon", "earth")
def test_qualifying_share_discriminates(client):
    """Un mar lunar liso tiene análogos en buena parte de la Tierra; un cráter como Tycho, en muy poca."""
    mare = post(client, lat=0.67, lon=23.47).json()["overall"]["qualifying"]
    tycho = post(client, lat=-43.3, lon=-11.4).json()["overall"]["qualifying"]
    assert mare["share"] > 10 * tycho["share"]
    assert 0 < len(mare["sample"]) <= 2500
    assert all(-90 <= la <= 90 and -180 <= lo <= 180 for la, lo in mare["sample"])
    # cada fila del ranking trae sus medidas
    r = post(client).json()["ranking"]
    assert all(set(x["perDim"]) == set(DIMENSIONS) for x in r)
