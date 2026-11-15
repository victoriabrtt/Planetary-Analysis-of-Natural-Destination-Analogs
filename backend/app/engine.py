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

# Traducciones de los textos que define el backend. El español es el idioma por defecto.
LANGS = ("es", "en")
DIMENSIONS_EN = {
    "terrain": {"name": "Slope", "short": "Slope", "hint": "Average steepness of the terrain"},
    "roughness": {"name": "Roughness", "short": "Roughness", "hint": "How much the ground rises and falls around its tilt"},
    "relief": {"name": "Relief", "short": "Relief", "hint": "Height difference between the highest and lowest point of the area"},
    "illum": {
        "name": "Illumination",
        "short": "Illumination",
        "hint": "How low the sun sits at its best time of year: |latitude| minus the axial tilt",
    },
}
PROFILES_EN = {
    "balanced": {"name": "Balanced", "blurb": "Every measure weighs the same"},
    "rover": {"name": "Rover", "blurb": "Mobility: slope and roughness"},
    "thermal": {"name": "Thermal", "blurb": "Solar illumination angle"},
}

PROFILES = [
    {"id": "balanced", "name": "Balanceado", "blurb": "Todas las medidas pesan igual", "weights": {}},
    {"id": "rover", "name": "Rover", "blurb": "Movilidad: pendiente y rugosidad", "weights": {"terrain": 3, "roughness": 2.5}},
    {"id": "thermal", "name": "Térmico", "blurb": "Ángulo de iluminación solar", "weights": {"illum": 3}},
]

TEXT = {
    "es": {
        "gravity": {"moon": "de la Luna (1/6 g)", "mars": "de Marte (3/8 g)"},
        "atmos": {"moon": "el vacío lunar", "mars": "la atmósfera delgada marciana (~0,6% de la terrestre)"},
        "cav_gravity": "La Tierra no reproduce la gravedad reducida {g}.",
        "cav_atmos": "No reproduce {a}.",
        "cav_radiation": "No reproduce el ambiente de radiación sin una magnetosfera que proteja.",
        "cav_scale": "Se compara la forma del terreno a escala de celdas de ~{km} km (DEM de ~1,9 km/px): "
        "no captura rocas, regolito ni detalle de metros.",
        "cav_illum": "La iluminación es el ángulo mínimo de incidencia del sol, |latitud| menos la inclinación del eje "
        "(Luna 1,5°, Tierra 23,4°, Marte 25,2°); no considera la orientación de cada ladera.",
        "ocean": "cae en el océano",
        "nodata": "no tiene datos de elevación",
        "no_point": "Ese punto ({c}) {where}: no hay terreno para comparar. El punto con datos más cercano está a {km} km.",
        "same_body": "El cuerpo de origen y el de destino deben ser distintos.",
        "no_index": "No hay índice precalculado para '{b}'.",
        "zone": "Zona a {km} km de {name}",
        "antarctica": "Antártida",
    },
    "en": {
        "gravity": {"moon": "of the Moon (1/6 g)", "mars": "of Mars (3/8 g)"},
        "atmos": {"moon": "the lunar vacuum", "mars": "the thin Martian atmosphere (~0.6% of Earth's)"},
        "cav_gravity": "Earth does not reproduce the reduced gravity {g}.",
        "cav_atmos": "It does not reproduce {a}.",
        "cav_radiation": "It does not reproduce a radiation environment without a protective magnetosphere.",
        "cav_scale": "Terrain shape is compared on ~{km} km cells (DEM of ~1.9 km/px): "
        "it does not capture rocks, regolith or metre-scale detail.",
        "cav_illum": "Illumination is the minimum solar incidence angle, |latitude| minus the axial tilt "
        "(Moon 1.5°, Earth 23.4°, Mars 25.2°); it ignores the orientation of each slope.",
        "ocean": "falls in the ocean",
        "nodata": "has no elevation data",
        "no_point": "That point ({c}) {where}: there is no terrain to compare. The nearest point with data is {km} km away.",
        "same_body": "Source and target bodies must be different.",
        "no_index": "There is no precomputed index for '{b}'.",
        "zone": "Area {km} km from {name}",
        "antarctica": "Antarctica",
    },
}


def thousands(n: float, lang: str) -> str:
    s = f"{n:,.0f}"
    return s.replace(",", ".") if lang == "es" else s

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
    names_en: np.ndarray | None = None
    name_idx_en: np.ndarray | None = None

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
            names_en=z["names_en"] if "names_en" in z else None,
            name_idx_en=z["name_idx_en"] if "name_idx_en" in z else None,
        )

    def __post_init__(self):
        la, lo = np.radians(self.lat), np.radians(self.lon)
        self._xyz = np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], 1)

    def dist_km(self, lat: float, lon: float, rows: np.ndarray | slice = slice(None)) -> np.ndarray:
        la, lo = math.radians(lat), math.radians(lon)
        p = np.array([math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)])
        return np.arccos(np.clip(self._xyz[rows] @ p, -1, 1)) * self.radius_km

    def row_at(self, lat: float, lon: float, lang: str = "es") -> int:
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
            T = TEXT[lang]
            km = float(d[row])
            raise PointError(
                T["no_point"].format(
                    c=fmt_coord(lat, lon, lang), where=T["ocean"] if self.body == "earth" else T["nodata"], km=thousands(km, lang)
                ),
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
    @staticmethod
    def _fname(f: dict, lang: str) -> str:
        return f.get("name_en", f["name"]) if lang == "en" else f["name"]

    def site_name(self, body: str, row: int, lat: float, lon: float, lang: str = "es", prefer_famous_km: float = 60.0) -> str:
        best = None
        for f in self.famous.get(body, []):
            d = self.index[body].dist_km(f["lat"], f["lon"], [row])[0] if row >= 0 else None
            if d is not None and d <= prefer_famous_km and (best is None or d < best[0]):
                best = (d, self._fname(f, lang))
        if best:
            return best[1]
        idx = self.index[body]
        names, name_idx = (idx.names_en, idx.name_idx_en) if lang == "en" and idx.names_en is not None else (idx.names, idx.name_idx)
        if names is not None and row >= 0:
            n = str(names[name_idx[row]])
            if n:
                return n  # las coordenadas van aparte (site.lat/lon); el front las muestra
        # Luna/Marte sin nombre: referirla al sitio conocido más cercano ("Zona a 1.230 km de Tycho").
        fam = self.famous.get(body, [])
        if fam and row >= 0:
            d, name = min((float(idx.dist_km(f["lat"], f["lon"], [row])[0]), self._fname(f, lang)) for f in fam)
            return TEXT[lang]["zone"].format(km=thousands(d, lang), name=name)
        return fmt_coord(lat, lon, lang)

    def source_name(self, body: str, lat: float, lon: float, lang: str = "es") -> str | None:
        for f in self.famous.get(body, []):
            if abs(f["lat"] - lat) < 1e-3 and abs(f["lon"] - lon) < 1e-3:
                return self._fname(f, lang)
        return None

    # ── matching ──
    def match(
        self, source_body: str, lat: float, lon: float, target_body: str, top_n: int, weights: dict, lang: str = "es"
    ) -> dict:
        lang = lang if lang in LANGS else "es"
        if source_body == target_body:
            raise PointError(TEXT[lang]["same_body"])
        for b in (source_body, target_body):
            if b not in self.index:
                raise PointError(TEXT[lang]["no_index"].format(b=b))
        src_idx, tgt = self.index[source_body], self.index[target_body]
        dims = [d for d in tgt.dims if d in src_idx.dims and d in DIMENSIONS]

        srow = src_idx.row_at(lat, lon, lang)
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
            return {"name": self.site_name(target_body, row, la, lo, lang), "lat": round(la, 3), "lon": round(lo, 3)}

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
                "name": self.source_name(source_body, lat, lon, lang)
                or self.site_name(source_body, srow, float(src_idx.lat[srow]), float(src_idx.lon[srow]), lang),
            },
            "overall": {
                "site": site(win),
                "score": round(float(overall[win]), 4),
                "perDim": cand_dims(win),
                "qualifying": qualifying,
            },
            "perDim": per_dim,
            "caveats": caveats(source_body, target_body, src_idx.cell_km, lang),
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

    def meta(self, lang: str = "es") -> dict:
        lang = lang if lang in LANGS else "es"
        if lang == "en":
            dims = [{"key": k, **v, **DIMENSIONS_EN.get(k, {})} for k, v in DIMENSIONS.items()]
            profiles = [{**p, **PROFILES_EN.get(p["id"], {})} for p in PROFILES]
        else:
            dims = [{"key": k, **v} for k, v in DIMENSIONS.items()]
            profiles = PROFILES
        return {
            "lang": lang,
            "dims": dims,
            "profiles": profiles,
            "bodies": {
                b: {"cells": int(len(i.lat)), "cell_km": i.cell_km, "source": i.source} for b, i in self.index.items()
            },
            "famous": {
                b: [{"name": self._fname(f, lang), "lat": f["lat"], "lon": f["lon"]} for f in v] for b, v in self.famous.items()
            },
        }


def caveats(source_body: str, target_body: str, cell_km: float, lang: str = "es") -> list[str]:
    T = TEXT[lang]
    off = source_body if source_body != "earth" else target_body
    return [
        T["cav_gravity"].format(g=T["gravity"].get(off, "")),
        T["cav_atmos"].format(a=T["atmos"].get(off, "")),
        T["cav_radiation"],
        T["cav_scale"].format(km=f"{cell_km:g}"),
        T["cav_illum"],
    ]


def fmt_coord(lat: float, lon: float, lang: str = "es") -> str:
    """Coordenadas como las muestra el front: coma decimal y "O" en español, punto y "W" en inglés."""
    c = (lambda v: f"{abs(v):.1f}".replace(".", ",")) if lang == "es" else (lambda v: f"{abs(v):.1f}")  # noqa: E731
    west = "O" if lang == "es" else "W"
    return f"{c(lat)}°{'N' if lat >= 0 else 'S'} {c(lon)}°{'E' if lon >= 0 else west}"
