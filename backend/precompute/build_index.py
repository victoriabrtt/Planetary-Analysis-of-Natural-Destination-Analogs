"""
Arma los índices precalculados que carga la API.

  python -m precompute.build_index                 # los tres cuerpos
  python -m precompute.build_index --only moon     # uno solo

Salida (backend/data/index/):
  {body}_grid.npz     descriptores por celda válida + tabla celda→fila para buscar por lat/lon
                      (earth_grid.npz es el que pide el handoff; moon/mars permiten consultar cualquier
                      punto y el modo inverso Tierra → Luna/Marte)
  query_points.json   puntos famosos de la Luna/Marte (y sitios análogos curados de la Tierra) con sus
                      descriptores, sacados de su celda

Tierra: el océano y los lagos se enmascaran con Natural Earth 10m (land − lakes). En ETOPO el mar tiene
batimetría (valores negativos), no nodata, así que no alcanza con "z ≤ 0": eso además se comería el Mar
Muerto o el Valle de la Muerte, que son tierra firme.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np

from app.engine import illumination

from .descriptors import CELL_KM, DIMS, GeoTiffRaster, Grid, PDSRaster, compute

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
INDEX = ROOT / "data" / "index"

# Puntos famosos (mismos que el front). Los descriptores salen de la grilla, no se inventan.
FAMOUS = {
    "moon": [
        ("Apollo 11", 0.67, 23.47),
        ("Shackleton", -89.9, 0.0),
        ("Tycho", -43.3, -11.4),
        ("Apollo 17", 20.19, 30.77),
        ("Mons Mouton", -84.6, -38.5),
        ("Aristarchus", 23.7, -47.4),
    ],
    "mars": [
        ("Jezero", 18.44, 77.45),
        ("Gale", -5.4, 137.8),
        ("Olympus Mons", 18.65, -133.8),
        ("Valles Marineris", -13.9, -59.2),
        ("Gusev", -14.6, 175.5),
        ("Elysium", 4.5, 135.9),
    ],
}

# Análogos terrestres conocidos: si una celda cae cerca, se usa este nombre (etiquetado a mano).
# (español, inglés, lat, lon)
EARTH_SITES = [
    ("Harrat Khaybar, Arabia Saudita", "Harrat Khaybar, Saudi Arabia", 25.0, 39.9),
    ("Lanzarote, Canarias", "Lanzarote, Canary Islands", 29.0, -13.6),
    ("Lava Beds, California", "Lava Beds, California", 41.7, -121.5),
    ("Cráter Lonar, India", "Lonar Crater, India", 19.9, 76.5),
    ("Isla Axel Heiberg, Canadá", "Axel Heiberg Island, Canada", 79.4, -90.8),
    ("Svalbard, Noruega", "Svalbard, Norway", 78.2, 15.6),
    ("Cuenca de Qaidam, China", "Qaidam Basin, China", 37.0, 95.0),
    ("Desierto del Namib", "Namib Desert", -24.7, 15.3),
    ("Emi Koussi, Chad", "Emi Koussi, Chad", 19.8, 18.5),
    ("Cañón Fish River, Namibia", "Fish River Canyon, Namibia", -27.6, 17.6),
    ("Parque Nacional del Teide, Canarias", "Teide National Park, Canary Islands", 28.3, -16.6),
    ("Meseta de Putorana, Rusia", "Putorana Plateau, Russia", 69.0, 94.0),
    ("Isla Devon (cráter Haughton), Canadá", "Devon Island (Haughton crater), Canada", 75.4, -89.8),
    ("Barreal, San Juan, Argentina", "Barreal, San Juan, Argentina", -31.6, -69.4),
    ("Galápagos (tubos de lava)", "Galápagos (lava tubes)", -0.6, -90.4),
    ("Valles Secos de McMurdo, Antártida", "McMurdo Dry Valleys, Antarctica", -77.5, 162.0),
    ("Desierto de Atacama, Chile", "Atacama Desert, Chile", -24.5, -69.25),
    ("Río Tinto, España", "Río Tinto, Spain", 37.7, -6.55),
    ("Mauna Kea, Hawái", "Mauna Kea, Hawaii", 19.82, -155.47),
    ("Cráter Meteor, Arizona", "Meteor Crater, Arizona", 35.03, -111.02),
    ("Islandia (campos de lava)", "Iceland (lava fields)", 64.9, -16.8),
    ("Utah (Mars Desert Research Station)", "Utah (Mars Desert Research Station)", 38.41, -110.79),
]
EARTH_SITE_RADIUS_KM = 60.0


def log(msg: str) -> None:
    print(time.strftime("%H:%M:%S"), msg, flush=True)


# ───────────────────────────── Tierra: máscara y nombres ─────────────────────────────


def _geoms(path: Path):
    return json.loads(path.read_text())["features"]


def earth_valid_mask(shape, transform) -> np.ndarray:
    from rasterio.features import rasterize

    land = _geoms(RAW / "ne_10m_land.geojson")
    lakes = _geoms(RAW / "ne_10m_lakes.geojson")
    log(f"  rasterizando máscara: {len(land)} polígonos de tierra, {len(lakes)} lagos")
    m = rasterize(((f["geometry"], 1) for f in land), out_shape=shape, transform=transform, fill=0, dtype="uint8")
    lk = rasterize(((f["geometry"], 1) for f in lakes), out_shape=shape, transform=transform, fill=0, dtype="uint8")
    valid = (m == 1) & (lk == 0)
    log(f"  tierra firme: {valid.mean() * 100:.1f}% de los píxeles")
    return valid


# Errores de traducción de Natural Earth (NAME_ES), corregidos a mano.
# Se aplican sobre el valor original: "GUIANA HIGHLANDS" (Venezuela) viene traducido en mayúsculas como
# "TIERRAS ALTAS DE GUINEA", que es otra región (África Occidental, bien traducida en minúsculas).
NAME_FIXES = {
    "TIERRAS ALTAS DE GUINEA": "Macizo de las Guayanas",
    "desiero de dinosaurios": "Desierto de los Dinosaurios",
}


def _clean(v: str) -> str:
    """Normaliza mayúsculas: "SAHEL" → "Sahel", "península de Kamchatka" → "Península de Kamchatka",
    "Tierras Altas De Khomas" → "Tierras Altas de Khomas"."""
    v = NAME_FIXES.get(v, v)
    if v.isupper():
        v = v.title()
    v = v[:1].upper() + v[1:]
    for w in ("De", "Del"):
        v = v.replace(f" {w} ", f" {w.lower()} ")
    return v


def _prop(p: dict, *keys: str) -> str | None:
    for k in keys:
        v = p.get(k)
        if isinstance(v, str) and v.strip():
            return _clean(v.strip())
    return None


# Clases de Natural Earth que no sirven como nombre de lugar (demasiado generales o no son tierra).
SKIP_REGION_CLASSES = {"Continent", "Dragons-be-here", "Lake"}


def _fill_nearest(ids: np.ndarray, max_iter: int) -> np.ndarray:
    """Rellena ceros con el id vecino (dilatación iterativa, con vuelta en longitud)."""
    ids = ids.copy()
    for _ in range(max_iter):
        empty = ids == 0
        if not empty.any():
            break
        for sh in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb = np.roll(ids, sh, axis=(0, 1))
            if sh[0] == 1:
                nb[0] = 0
            elif sh[0] == -1:
                nb[-1] = 0
            take = empty & (nb > 0)
            ids[take] = nb[take]
            empty &= ~take
    return ids


def _bbox_area(geom) -> float:
    pts = np.array(_flatten(geom["coordinates"]), dtype=float).reshape(-1, 2)
    return float(np.ptp(pts[:, 0]) * np.ptp(pts[:, 1]))


def _flatten(c):
    if isinstance(c[0], (int, float)):
        return [c[:2]]
    out = []
    for x in c:
        out.extend(_flatten(x))
    return out


def earth_names(lat: np.ndarray, lon: np.ndarray, lang: str = "es") -> tuple[np.ndarray, list[str]]:
    """Nombre legible para cada celda: sitio curado > región geográfica + país > país > coordenadas.
    lang "es" usa NAME_ES de Natural Earth; "en", NAME."""
    keys = ("name_es", "NAME_ES", "name", "NAME") if lang == "es" else ("NAME_EN", "name_en", "NAME", "name")  # NAME abrevia ("Ra.", "I.")
    from rasterio.features import rasterize
    from rasterio.transform import from_origin

    res = 0.1
    shape = (int(180 / res), int(360 / res))
    tr = from_origin(-180, 90, res, res)

    def raster_ids(features, key_fn):
        feats = [f for f in features if f.get("geometry")]
        feats.sort(key=lambda f: -_bbox_area(f["geometry"]))  # las chicas (más específicas) se pintan arriba
        names = [key_fn(f["properties"]) for f in feats]
        shapes = ((f["geometry"], i + 1) for i, f in enumerate(feats))
        return rasterize(shapes, out_shape=shape, transform=tr, fill=0, dtype="int32"), names

    regions, rnames = raster_ids(
        [
            f
            for f in _geoms(RAW / "ne_10m_geography_regions_polys.geojson")
            if f["properties"].get("FEATURECLA") not in SKIP_REGION_CLASSES
        ],
        lambda p: _prop(p, *keys),
    )
    countries, cnames = raster_ids(_geoms(RAW / "ne_50m_admin_0_countries.geojson"), lambda p: _prop(p, *keys))
    countries = _fill_nearest(countries, max_iter=30)  # costas e islas fuera del polígono 1:50m (≤ 3°)
    r = np.clip(((90 - lat) / res).astype(int), 0, shape[0] - 1)
    c = np.clip(((lon + 180) / res).astype(int), 0, shape[1] - 1)
    ri, ci = regions[r, c], countries[r, c]

    # Sitios curados (distancia de gran círculo)
    la, lo = np.radians(lat), np.radians(lon)
    site_idx = np.full(lat.shape, -1)
    best = np.full(lat.shape, np.inf)
    for k, (_, _, slat, slon) in enumerate(EARTH_SITES):
        d = 6371.0 * np.arccos(
            np.clip(
                np.sin(la) * np.sin(np.radians(slat)) + np.cos(la) * np.cos(np.radians(slat)) * np.cos(lo - np.radians(slon)),
                -1,
                1,
            )
        )
        hit = (d < EARTH_SITE_RADIUS_KM) & (d < best)
        site_idx[hit], best[hit] = k, d[hit]

    table: dict[str, int] = {}
    idx = np.empty(lat.shape, np.int32)
    for i in range(lat.size):
        if site_idx[i] >= 0:
            name = EARTH_SITES[site_idx[i]][0 if lang == "es" else 1]
        else:
            reg = rnames[ri[i] - 1] if ri[i] else None
            cty = cnames[ci[i] - 1] if ci[i] else None
            if reg and cty and reg != cty:
                name = f"{reg}, {cty}"
            else:
                name = reg or cty or ((("Antártida" if lang == "es" else "Antarctica")) if lat[i] < -60 else "")
        idx[i] = table.setdefault(name, len(table))
    names = [""] * len(table)
    for k, v in table.items():
        names[v] = k
    return idx, names


# ───────────────────────────── Build ─────────────────────────────


def open_raster(body: str):
    if body == "moon":
        return PDSRaster(RAW / "LDEM_16.IMG", RAW / "LDEM_16.LBL")
    if body == "mars":
        return PDSRaster(RAW / "megt90n000fb.img", RAW / "megt90n000fb.lbl")
    import rasterio

    tif = RAW / "ETOPO_2022_v1_60s_N90W180_surface.tif"
    with rasterio.open(tif) as ds:
        shape, transform = (ds.height, ds.width), ds.transform
    return GeoTiffRaster(tif, valid_mask=earth_valid_mask(shape, transform))


def build(body: str) -> dict:
    t0 = time.time()
    log(f"[{body}] grilla de celdas de ~{CELL_KM:g} km")
    grid = Grid.build(body)
    raster = open_raster(body)
    log(f"  DEM {raster.source}: {raster.width}×{raster.height}, {grid.ncells} celdas en {grid.nbands} bandas")
    d = compute(raster, grid, log=lambda m: log(m))

    lat, lon = grid.centers()
    valid = np.isfinite(d["terrain"]) & np.isfinite(d["roughness"])
    rows = np.nonzero(valid)[0]
    cell_to_row = np.full(grid.ncells, -1, np.int32)
    cell_to_row[rows] = np.arange(rows.size, dtype=np.int32)
    vals = np.stack([d[k][rows] for k in DIMS], axis=1).astype(np.float32)

    payload = dict(
        body=body,
        dims=np.array(DIMS),
        lat=lat[rows].astype(np.float32),
        lon=lon[rows].astype(np.float32),
        vals=vals,
        elev=d["elev"][rows],
        valid_frac=d["valid_frac"][rows],
        cell_to_row=cell_to_row,
        grid_dlat=np.float64(grid.dlat),
        grid_nlon=grid.nlon.astype(np.int32),
        grid_offset=grid.offset.astype(np.int64),
        radius_m=np.float64(grid.radius),
        cell_km=np.float64(CELL_KM),
        source=np.array(raster.source),
    )
    if body == "earth":
        log("  nombrando celdas (Natural Earth + sitios curados)")
        for lang, suffix in (("es", ""), ("en", "_en")):
            name_idx, names = earth_names(lat[rows], lon[rows], lang)
            payload[f"name_idx{suffix}"] = name_idx
            payload[f"names{suffix}"] = np.array(names)

    INDEX.mkdir(parents=True, exist_ok=True)
    out = INDEX / f"{body}_grid.npz"
    np.savez_compressed(out, **payload)

    pct = {k: np.percentile(vals[:, i], [5, 50, 95]).round(1).tolist() for i, k in enumerate(DIMS)}
    log(f"  ✓ {out.name}: {rows.size} celdas válidas ({out.stat().st_size / 1e6:.1f} MB) en {time.time() - t0:.0f}s")
    log(f"    p5/p50/p95: {pct}")
    return {"grid": grid, "cell_to_row": cell_to_row, "vals": vals}


def query_points(built: dict) -> None:
    out: dict[str, list] = {}
    for body, pts in [*FAMOUS.items(), ("earth", [(n, la, lo) for n, _, la, lo in EARTH_SITES])]:
        if body not in built:
            continue
        g, c2r, vals = built[body]["grid"], built[body]["cell_to_row"], built[body]["vals"]
        lst = []
        for name, la, lo in pts:
            row = int(c2r[int(g.cell_of(la, lo))])
            desc = None if row < 0 else {k: round(float(vals[row, i]), 2) for i, k in enumerate(DIMS)}
            if desc:
                desc["illum"] = round(float(illumination(body, la)), 2)  # el punto exacto, no el centro de la celda
            item = {"name": name, "lat": la, "lon": lo, "descriptors": desc}
            if body == "earth":
                item["name_en"] = next(en for es, en, *_ in EARTH_SITES if es == name)
            lst.append(item)
        out[body] = lst
    path = INDEX / "query_points.json"
    prev = json.loads(path.read_text()) if path.exists() else {}
    prev.update(out)
    path.write_text(json.dumps(prev, ensure_ascii=False, indent=2))
    log(f"✓ {path.name}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="+", choices=["earth", "moon", "mars"], default=["moon", "mars", "earth"])
    a = ap.parse_args()
    built = {b: build(b) for b in a.only}
    query_points(built)


if __name__ == "__main__":
    main()
