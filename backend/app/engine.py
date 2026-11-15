"""
Motor de cercanía sobre los índices precalculados (backend/data/index/*.npz).

  cercania_dim    = exp(-((a - b) / tol)^2)        0..1, valores ABSOLUTOS (no percentiles)
  cercania_global = Σ w_d · cercania_d / Σ w_d     pesos = perfil de misión

Agregar una dimensión (fase 2: composición, cráteres, cuevas) = agregar una columna al índice y una
entrada en DIMENSIONS. El contrato de la API no cambia: perDim es un dict por dimensión.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np

INDEX_DIR = Path(__file__).resolve().parents[1] / "data" / "index"

# Inclinación del eje (oblicuidad) de cada cuerpo, en grados. Cambia todo en la iluminación:
# con |lat| crudo se asumiría inclinación cero, correcto para la Luna pero falso para la Tierra.
OBLIQUITY_DEG = {"moon": 1.5, "earth": 23.4, "mars": 25.2}


def illumination(body: str, lat):
    """Ángulo mínimo de incidencia solar (°): max(0, |lat| − oblicuidad). Cuanto más alto, más
    rasante pega el sol aun en el mejor momento del año. Sirve con escalares o arrays de numpy."""
    return np.maximum(0.0, np.abs(lat) - OBLIQUITY_DEG[body])


# key → metadatos. `tol` es la tolerancia física absoluta (cuánta diferencia cuenta como "lejos").
DIMENSIONS: dict[str, dict] = {
    "terrain": {
        "name": "Pendiente",
        "short": "Pendiente",
        "unit": "°",
        "tol": 10.0,
        "decimals": 1,
        "hint": "Inclinación media del terreno",
    },
    "roughness": {
        "name": "Rugosidad",
        "short": "Rugosidad",
        "unit": "m",
        "tol": 120.0,
        "decimals": 0,
        "hint": "Cuánto sube y baja el terreno alrededor de su inclinación",
    },
    "relief": {
        "name": "Relieve",
        "short": "Relieve",
        "unit": "m",
        "tol": 400.0,
        "decimals": 0,
        "hint": "Desnivel entre el punto más alto y el más bajo de la zona",
    },
    "illum": {
        "name": "Iluminación",
        "short": "Iluminación",
        "unit": "°",
        "tol": 18.0,
        "decimals": 0,
        "hint": "Qué tan rasante pega el sol en el mejor momento del año: |latitud| menos la inclinación del eje",
    },
}

PROFILES = [
    {"id": "balanced", "name": "Balanceado", "blurb": "Todas las medidas pesan igual", "weights": {}},
    {"id": "rover", "name": "Rover", "blurb": "Movilidad: pendiente y rugosidad", "weights": {"terrain": 3, "roughness": 2.5}},
    {"id": "thermal", "name": "Térmico", "blurb": "Ángulo de iluminación solar", "weights": {"illum": 3}},
]

GRAVITY = {"moon": "de la Luna (1/6 g)", "mars": "de Marte (3/8 g)"}
ATMOS = {"moon": "el vacío lunar", "mars": "la atmósfera delgada marciana (~0,6% de la terrestre)"}
BODY_ES = {"earth": "la Tierra", "moon": "la Luna", "mars": "Marte"}

STRONG = 0.745  # "Fuerte" = 75 % redondeado, el mismo criterio que el front
QUAL_SAMPLE = 2500  # celdas que califican enviadas para dibujar en el globo (muestra uniforme)
RANK_POOL = 4000  # candidatos considerados para el ranking diverso
RANK_SEPARATION_KM = 300.0  # dos resultados del ranking deben estar al menos a esta distancia
SNAP_MAX_KM = 250.0  # si el punto cae en una celda inválida (océano), se busca la válida más cercana


class PointError(ValueError):
    """El punto pedido no tiene datos (ej. océano en la Tierra). `nearest` = celda válida más cercana."""

    def __init__(self, message: str, nearest: dict | None = None):
        super().__init__(message)
        self.nearest = nearest


@dataclass
class BodyIndex:
    body: str
    dims: list[str]
    lat: np.ndarray
    lon: np.ndarray
    vals: np.ndarray  # (N, D)
    cell_to_row: np.ndarray
    dlat: float
    nlon: np.ndarray
    offset: np.ndarray
    radius_km: float
    cell_km: float
    source: str
    names: np.ndarray | None = None
    name_idx: np.ndarray | None = None

    @classmethod
    def load(cls, path: Path) -> "BodyIndex":
        z = np.load(path, allow_pickle=False)
        return cls(
            body=str(z["body"]),
            dims=[str(d) for d in z["dims"]],
            lat=z["lat"].astype(np.float64),
            lon=z["lon"].astype(np.float64),
            vals=z["vals"].astype(np.float64),
            cell_to_row=z["cell_to_row"],
            dlat=float(z["grid_dlat"]),
            nlon=z["grid_nlon"].astype(np.int64),
            offset=z["grid_offset"].astype(np.int64),
            radius_km=float(z["radius_m"]) / 1000,
            cell_km=float(z["cell_km"]),
            source=str(z["source"]),
            names=z["names"] if "names" in z else None,
            name_idx=z["name_idx"] if "name_idx" in z else None,
        )

    def __post_init__(self):
        la, lo = np.radians(self.lat), np.radians(self.lon)
        self._xyz = np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], 1)

    def dist_km(self, lat: float, lon: float, rows: np.ndarray | slice = slice(None)) -> np.ndarray:
        la, lo = math.radians(lat), math.radians(lon)
        p = np.array([math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)])
        return np.arccos(np.clip(self._xyz[rows] @ p, -1, 1)) * self.radius_km

    def row_at(self, lat: float, lon: float) -> int:
        """Fila del índice para un punto: su celda o, si es inválida, la válida más cercana."""
        b = min(max(int(math.floor((lat + 90) / self.dlat)), 0), len(self.nlon) - 1)
        n = int(self.nlon[b])
        j = min(int(math.floor(((lon + 180) % 360) / 360 * n)), n - 1)
        row = int(self.cell_to_row[self.offset[b] + j])
        if row >= 0:
            return row
        d = self.dist_km(lat, lon)
        row = int(np.argmin(d))
        if d[row] > SNAP_MAX_KM:
            where = "cae en el océano" if self.body == "earth" else "no tiene datos de elevación"
            km = float(d[row])
            raise PointError(
                f"Ese punto ({fmt_coord(lat, lon)}) {where}: no hay terreno para comparar. "
                f"El punto con datos más cercano está a {f'{km:,.0f}'.replace(',', '.')} km.",
                nearest={"lat": round(float(self.lat[row]), 3), "lon": round(float(self.lon[row]), 3), "km": round(km)},
            )
        return row


class Engine:
    def __init__(self, index_dir: Path = INDEX_DIR):
        self.index: dict[str, BodyIndex] = {}
        for body in ("earth", "moon", "mars"):
            p = index_dir / f"{body}_grid.npz"
            if p.exists():
                self.index[body] = BodyIndex.load(p)
        qp = index_dir / "query_points.json"
        self.famous: dict[str, list[dict]] = json.loads(qp.read_text()) if qp.exists() else {}

    # ── nombres ──
    def site_name(self, body: str, row: int, lat: float, lon: float, prefer_famous_km: float = 60.0) -> str:
        best = None
        for f in self.famous.get(body, []):
            d = self.index[body].dist_km(f["lat"], f["lon"], [row])[0] if row >= 0 else None
            if d is not None and d <= prefer_famous_km and (best is None or d < best[0]):
                best = (d, f["name"])
        if best:
            return best[1]
        idx = self.index[body]
        if idx.names is not None and row >= 0:
            n = str(idx.names[idx.name_idx[row]])
            if n:
                return n  # las coordenadas van aparte (site.lat/lon); el front las muestra
        # Luna/Marte sin nombre: referirla al sitio conocido más cercano ("Zona a 1.230 km de Tycho").
        fam = self.famous.get(body, [])
        if fam and row >= 0:
            d, name = min((float(idx.dist_km(f["lat"], f["lon"], [row])[0]), f["name"]) for f in fam)
            return f"Zona a {f'{d:,.0f}'.replace(',', '.')} km de {name}"
        return fmt_coord(lat, lon)

    def source_name(self, body: str, lat: float, lon: float) -> str | None:
        for f in self.famous.get(body, []):
            if abs(f["lat"] - lat) < 1e-3 and abs(f["lon"] - lon) < 1e-3:
                return f["name"]
        return None

    # ── matching ──
    def match(self, source_body: str, lat: float, lon: float, target_body: str, top_n: int, weights: dict) -> dict:
        if source_body == target_body:
            raise PointError("El cuerpo de origen y el de destino deben ser distintos.")
        for b in (source_body, target_body):
            if b not in self.index:
                raise PointError(f"No hay índice precalculado para '{b}'.")
        src_idx, tgt = self.index[source_body], self.index[target_body]
        dims = [d for d in tgt.dims if d in src_idx.dims and d in DIMENSIONS]

        srow = src_idx.row_at(lat, lon)
        src = {d: float(src_idx.vals[srow, src_idx.dims.index(d)]) for d in dims}
        if "illum" in src:
            src["illum"] = float(illumination(source_body, lat))  # el punto exacto, no el centro de su celda

        # Cercanía por dimensión sobre TODAS las celdas (vectorizado) y global ponderada.
        C = np.empty((len(tgt.lat), len(dims)))
        w = np.empty(len(dims))
        for j, d in enumerate(dims):
            col = tgt.vals[:, tgt.dims.index(d)]
            z = (src[d] - col) / DIMENSIONS[d]["tol"]
            C[:, j] = np.exp(-z * z)
            w[j] = max(0.0, float(weights.get(d, 1.0)))
        wsum = w.sum()
        overall = C @ w / wsum if wsum > 0 else C.mean(1)

        def site(row: int) -> dict:
            la, lo = float(tgt.lat[row]), float(tgt.lon[row])
            return {"name": self.site_name(target_body, row, la, lo), "lat": round(la, 3), "lon": round(lo, 3)}

        def rounded_pair(d: str, a: float, b: float) -> tuple[float, float, float]:
            """Valores redondeados como se muestran, y la diferencia ENTRE ESOS valores
            (si no, 18° contra 19° mostraría una diferencia de 0°)."""
            dec = DIMENSIONS[d]["decimals"]
            ra, rb = round(a, dec), round(b, dec)
            return ra, rb, round(abs(ra - rb), dec)

        per_dim = {}
        for j, d in enumerate(dims):
            # Mejor por dimensión; entre empates (pasa mucho con iluminación) gana el de mejor global.
            best = int(np.argmax(C[:, j] + 1e-4 * overall))
            col = tgt.dims.index(d)
            rs, rm, rd = rounded_pair(d, src[d], float(tgt.vals[best, col]))
            per_dim[d] = {
                "site": site(best),
                "score": round(float(C[best, j]), 4),
                "src": rs,
                "match": rm,
                "diff": rd,
                "tol": DIMENSIONS[d]["tol"],
            }

        ranking = self._diverse_top(tgt, overall, max(1, top_n))
        win = ranking[0]

        def cand_dims(row: int) -> dict:
            """Extensión: cómo le va a una celda candidata en cada dimensión (para las cards, "Dónde se
            rompe" y el ranking). perDim sigue siendo el mejor por dimensión, como pide el contrato."""
            out = {}
            for j, d in enumerate(dims):
                _, m, df = rounded_pair(d, src[d], float(tgt.vals[row, tgt.dims.index(d)]))
                out[d] = {"match": m, "diff": df, "score": round(float(C[row, j]), 4)}
            return out

        # Cuánto de la superficie destino califica como análogo "Fuerte" (global ≥ 0,75). El ganador
        # siempre es el mejor; esto dice si es un análogo raro o si medio continente sirve igual.
        qual = np.nonzero(overall >= STRONG)[0]
        step = max(1, int(np.ceil(qual.size / QUAL_SAMPLE)))
        sample = qual[::step]
        qualifying = {
            "count": int(qual.size),
            "share": round(float(qual.size / overall.size), 5),
            "sample": [[round(float(tgt.lat[i]), 2), round(float(tgt.lon[i]), 2)] for i in sample],
        }

        return {
            "source": {
                "body": source_body,
                "lat": lat,
                "lon": lon,
                "name": self.source_name(source_body, lat, lon)
                or self.site_name(source_body, srow, float(src_idx.lat[srow]), float(src_idx.lon[srow])),
            },
            "overall": {
                "site": site(win),
                "score": round(float(overall[win]), 4),
                "perDim": cand_dims(win),
                "qualifying": qualifying,
            },
            "perDim": per_dim,
            "caveats": caveats(source_body, target_body, src_idx.cell_km),
            "ranking": [{"site": site(r), "score": round(float(overall[r]), 4), "perDim": cand_dims(r)} for r in ranking],
        }

    @staticmethod
    def _diverse_top(idx: BodyIndex, score: np.ndarray, n: int) -> list[int]:
        """Top n con separación mínima: si no, el top 5 son 5 celdas vecinas del mismo lugar."""
        k = min(RANK_POOL, score.size)
        pool = np.argpartition(-score, k - 1)[:k]
        pool = pool[np.argsort(-score[pool])]
        chosen: list[int] = []
        for r in pool:
            if all(idx.dist_km(float(idx.lat[c]), float(idx.lon[c]), [int(r)])[0] >= RANK_SEPARATION_KM for c in chosen):
                chosen.append(int(r))
                if len(chosen) == n:
                    break
        return chosen

    def meta(self) -> dict:
        return {
            "dims": [{"key": k, **v} for k, v in DIMENSIONS.items()],
            "profiles": PROFILES,
            "bodies": {
                b: {"cells": int(len(i.lat)), "cell_km": i.cell_km, "source": i.source} for b, i in self.index.items()
            },
            "famous": {b: [{"name": f["name"], "lat": f["lat"], "lon": f["lon"]} for f in v] for b, v in self.famous.items()},
        }


def caveats(source_body: str, target_body: str, cell_km: float) -> list[str]:
    off = source_body if source_body != "earth" else target_body
    return [
        f"La Tierra no reproduce la gravedad reducida {GRAVITY.get(off, '')}.",
        f"No reproduce {ATMOS.get(off, 'la atmósfera')}.",
        "No reproduce el ambiente de radiación sin una magnetosfera que proteja.",
        f"Se compara la forma del terreno a escala de celdas de ~{cell_km:g} km (DEM de ~1,9 km/px): "
        "no captura rocas, regolito ni detalle de metros.",
        "La iluminación es el ángulo mínimo de incidencia del sol, |latitud| menos la inclinación del eje "
        "(Luna 1,5°, Tierra 23,4°, Marte 25,2°); no considera la orientación de cada ladera.",
    ]


def fmt_coord(lat: float, lon: float) -> str:
    c = lambda v: f"{abs(v):.1f}".replace(".", ",")  # noqa: E731 — coma decimal, como el front (es-AR)
    return f"{c(lat)}°{'N' if lat >= 0 else 'S'} {c(lon)}°{'E' if lon >= 0 else 'O'}"
