"""
Descriptores de FORMA del terreno por celda (no altura cruda).

Cada cuerpo tiene un cero distinto (nivel del mar / esfera de 1737,4 km / areoide), así que nunca se
comparan alturas absolutas. Todo descriptor es una diferencia dentro de una ventana local, y el cero
se cancela solo:

  terrain    pendiente media (°)  — atan(|∇z|) por píxel, con dx, dy en metros reales
  roughness  rugosidad (m)        — desvío estándar de z respecto del plano ajustado en la celda
                                    (std crudo confundiría "inclinado" con "rugoso")
  relief     relieve local (m)    — max(z) − min(z) en la celda
  illum      iluminación (°)      — max(0, |lat| − oblicuidad del cuerpo): ángulo mínimo de incidencia
                                    solar (Luna 1,5°, Tierra 23,4°, Marte 25,2°; ver app/engine.py)

Para que la vara sea la misma en los tres cuerpos:
  - Celdas de igual tamaño EN EL TERRENO (CELL_KM), no en grados: bandas de latitud de altura fija
    y, en cada banda, n = round(360·cos(lat)/Δlat) celdas en longitud (grilla de área casi igual).
  - El gradiente usa un paso ~igual en x e y en metros: en cada fila se toma 1 de cada
    k = round(1/cos(lat)) columnas, porque la longitud se acorta hacia los polos.
  - Los tres DEM tienen ~1,85–1,9 km/px (ETOPO 60″, LOLA 16 px/°, MOLA 32 px/°).
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from app.engine import illumination  # una sola definición, compartida con la API

RADIUS_M = {"earth": 6_371_000.0, "moon": 1_737_400.0, "mars": 3_389_500.0}
CELL_KM = 20.0
DIMS = ["terrain", "roughness", "relief", "illum"]
MIN_VALID_FRACTION = 0.5  # celdas con menos de la mitad de píxeles válidos (costas, lagos) se descartan
MIN_SAMPLES = 20


# ───────────────────────────── Grilla ─────────────────────────────


@dataclass
class Grid:
    """Grilla de área casi igual. Banda 0 = la más austral."""

    body: str
    radius: float
    dlat: float  # grados
    nlon: np.ndarray  # celdas por banda
    offset: np.ndarray  # id de la primera celda de cada banda

    @classmethod
    def build(cls, body: str, cell_km: float = CELL_KM) -> "Grid":
        R = RADIUS_M[body]
        nb = math.ceil(180.0 / math.degrees(cell_km * 1000 / R))
        dlat = 180.0 / nb
        latc = -90 + (np.arange(nb) + 0.5) * dlat
        nlon = np.maximum(1, np.round(360.0 * np.cos(np.radians(latc)) / dlat)).astype(np.int64)
        offset = np.concatenate([[0], np.cumsum(nlon)[:-1]])
        return cls(body, R, dlat, nlon, offset)

    @property
    def nbands(self) -> int:
        return len(self.nlon)

    @property
    def ncells(self) -> int:
        return int(self.nlon.sum())

    def band_of(self, lat):
        return np.clip(np.floor((np.asarray(lat) + 90) / self.dlat).astype(np.int64), 0, self.nbands - 1)

    def cell_of(self, lat, lon):
        b = self.band_of(lat)
        n = self.nlon[b]
        lon = (np.asarray(lon) + 180.0) % 360.0
        j = np.minimum(np.floor(lon / 360.0 * n).astype(np.int64), n - 1)
        return self.offset[b] + j

    def centers(self):
        """lat, lon (grados) del centro de cada celda."""
        b = np.repeat(np.arange(self.nbands), self.nlon)
        j = np.arange(self.ncells) - self.offset[b]
        lat = -90 + (b + 0.5) * self.dlat
        lon = -180 + (j + 0.5) * 360.0 / self.nlon[b]
        return lat, lon


# ───────────────────────────── Lectura de DEMs ─────────────────────────────


class Raster:
    """DEM global en lat/lon con filas de norte a sur y columnas desde −180°. Devuelve z en metros (NaN = inválido)."""

    height: int
    width: int
    lat0: float  # latitud del borde norte
    dlat_px: float
    dlon_px: float

    def rows(self, r0: int, r1: int) -> np.ndarray:  # pragma: no cover - interfaz
        raise NotImplementedError

    def row_lat(self, r):
        return self.lat0 - (np.asarray(r) + 0.5) * self.dlat_px

    def col_lon(self, c):
        return -180.0 + (np.asarray(c) + 0.5) * self.dlon_px


def parse_pds3_label(path: Path) -> dict[str, str]:
    """Parser mínimo de etiquetas PDS3 (KEY = VALUE), suficiente para IMAGE e IMAGE_MAP_PROJECTION."""
    out: dict[str, str] = {}
    for line in Path(path).read_text(errors="replace").splitlines():
        m = re.match(r"\s*\^?([A-Z_0-9]+)\s*=\s*(.+?)\s*$", line)
        if m and m.group(1) not in out:
            out[m.group(1)] = m.group(2).strip().strip('"')
    return out


def _num(v: str) -> float:
    return float(re.match(r"[-+0-9.eE]+", v).group(0))


class PDSRaster(Raster):
    """IMG simple-cylindrical (LOLA LDEM / MOLA MEGDR) con etiqueta .LBL separada. Lectura por memmap."""

    def __init__(self, img: Path, lbl: Path):
        L = parse_pds3_label(lbl)
        self.height = int(_num(L["LINES"]))
        self.width = int(_num(L["LINE_SAMPLES"]))
        bits = int(_num(L["SAMPLE_BITS"]))
        st = L["SAMPLE_TYPE"]
        if bits != 16 or "INTEGER" not in st:
            raise ValueError(f"Formato no soportado: {st} {bits} bits")
        dtype = np.dtype(">i2" if st.startswith(("MSB", "SUN")) and "UNSIGNED" not in st else "<i2")
        self.scale = _num(L.get("SCALING_FACTOR", "1"))
        res = _num(L["MAP_RESOLUTION"])  # px/°
        self.dlat_px = self.dlon_px = 1.0 / res
        self.lat0 = _num(L["MAXIMUM_LATITUDE"])
        west = _num(L["WESTERNMOST_LONGITUDE"])
        # Columnas que empiezan en `west` (0° en LOLA/MOLA) → rotamos para empezar en −180°.
        self.roll = int(round(((west + 180.0) % 360.0) / self.dlon_px))
        self.data = np.memmap(img, dtype=dtype, mode="r", shape=(self.height, self.width))
        self.source = f"{img.name} ({res:g} px/°)"

    def rows(self, r0: int, r1: int) -> np.ndarray:
        z = np.asarray(self.data[r0:r1], dtype=np.float32) * np.float32(self.scale)
        return np.roll(z, self.roll, axis=1) if self.roll else z


class GeoTiffRaster(Raster):
    """GeoTIFF global (ETOPO 2022) leído por bloques de filas, con máscara opcional (True = válido)."""

    def __init__(self, path: Path, valid_mask: np.ndarray | None = None, chunk: int = 1024):
        import rasterio

        self.ds = rasterio.open(path)
        t = self.ds.transform
        self.height, self.width = self.ds.height, self.ds.width
        self.dlon_px, self.dlat_px = t.a, -t.e
        self.lat0 = t.f
        west = t.c
        if abs(west + 180.0) > 1e-6 or abs(self.width * self.dlon_px - 360.0) > 1e-3:
            raise ValueError(f"Se esperaba un raster global desde −180°: west={west}, ancho={self.width * self.dlon_px}°")
        self.nodata = self.ds.nodata
        self.mask = valid_mask
        self.chunk = chunk
        self._c0, self._buf = -1, None
        self.source = f"{Path(path).name} ({1 / self.dlon_px:g} px/°)"

    def rows(self, r0: int, r1: int) -> np.ndarray:
        from rasterio.windows import Window

        if self._buf is None or r0 < self._c0 or r1 > self._c0 + len(self._buf):
            c0 = max(0, r0)
            c1 = min(self.height, max(r1, c0 + self.chunk))
            z = self.ds.read(1, window=Window(0, c0, self.width, c1 - c0)).astype(np.float32)
            if self.nodata is not None:
                z[z == self.nodata] = np.nan
            if self.mask is not None:
                z[~self.mask[c0:c1]] = np.nan
            self._c0, self._buf = c0, z
        return self._buf[r0 - self._c0 : r1 - self._c0]


# ───────────────────────────── Descriptores ─────────────────────────────


def compute(raster: Raster, grid: Grid, log=print) -> dict[str, np.ndarray]:
    """Descriptores por celda. Devuelve arrays de tamaño grid.ncells (NaN donde la celda no es válida)."""
    R = grid.radius
    H, W = raster.height, raster.width
    dlat_r = math.radians(raster.dlat_px)
    dlon_r = math.radians(raster.dlon_px)
    dy2 = 2 * R * dlat_r
    kmax = max(1, W // 8)

    nc = grid.ncells
    out = {k: np.full(nc, np.nan, np.float32) for k in ("terrain", "roughness", "relief", "elev", "valid_frac")}
    rows_lat = raster.row_lat(np.arange(H))
    row_band = grid.band_of(rows_lat)

    # Recorremos bandas de norte a sur (filas crecientes) para leer el raster en orden.
    for b in range(grid.nbands - 1, -1, -1):
        rr = np.nonzero(row_band == b)[0]
        if rr.size == 0:
            continue
        nlon = int(grid.nlon[b])
        off = int(grid.offset[b])
        latc_b = -90 + (b + 0.5) * grid.dlat
        r0, r1 = int(rr[0]), int(rr[-1]) + 1
        h0, h1 = max(0, r0 - 1), min(H, r1 + 1)
        Z = raster.rows(h0, h1)

        cells, xs, ys, zs, ss = [], [], [], [], []
        for r in range(r0, r1):
            i = r - h0
            iu, idn = max(0, i - 1), min(Z.shape[0] - 1, i + 1)
            lat = float(rows_lat[r])
            cosl = max(math.cos(math.radians(lat)), 1e-6)
            k = int(min(kmax, max(1, round(1.0 / cosl))))
            cols = np.arange(k // 2, W, k)
            z = Z[i, cols]
            zl = Z[i, (cols - k) % W]
            zr = Z[i, (cols + k) % W]
            zu = Z[iu, cols]
            zd = Z[idn, cols]
            dzdx = (zr - zl) / (2 * k * R * cosl * dlon_r)
            dzdy = (zu - zd) / (dy2 if 0 < i < Z.shape[0] - 1 else dy2 / 2)
            slope = np.degrees(np.arctan(np.hypot(dzdx, dzdy)))  # NaN si falta un vecino

            lon = raster.col_lon(cols)
            j = np.minimum(np.floor((lon + 180.0) / 360.0 * nlon).astype(np.int64), nlon - 1)
            lonc = -180 + (j + 0.5) * 360.0 / nlon
            cells.append(j)
            xs.append(R * cosl * np.radians(lon - lonc))
            ys.append(np.full(cols.size, R * math.radians(lat - latc_b)))
            zs.append(z)
            ss.append(slope)

        j = np.concatenate(cells)
        x = np.concatenate(xs).astype(np.float64)
        y = np.concatenate(ys).astype(np.float64)
        z = np.concatenate(zs).astype(np.float64)
        s = np.concatenate(ss).astype(np.float64)

        n_all = np.bincount(j, minlength=nlon)
        v = np.isfinite(z)
        jv, xv, yv, zv = j[v], x[v], y[v], z[v]
        n = np.bincount(jv, minlength=nlon).astype(np.float64)
        frac = np.divide(n, n_all, out=np.zeros(nlon), where=n_all > 0)
        ok = (frac >= MIN_VALID_FRACTION) & (n >= MIN_SAMPLES)
        if not ok.any():
            continue

        nn = np.maximum(n, 1)
        zmean = np.bincount(jv, zv, nlon) / nn
        zc = zv - zmean[jv]  # centrado por celda: evita cancelación numérica

        # Ajuste de plano z = a + bx + cy por celda (mínimos cuadrados) → residuo = rugosidad.
        S = lambda w: np.bincount(jv, w, nlon)  # noqa: E731
        Sx, Sy, Sxx, Syy, Sxy = S(xv), S(yv), S(xv * xv), S(yv * yv), S(xv * yv)
        Sz, Sxz, Syz, Szz = S(zc), S(xv * zc), S(yv * zc), S(zc * zc)
        A = np.stack(
            [np.stack([n, Sx, Sy], -1), np.stack([Sx, Sxx, Sxy], -1), np.stack([Sy, Sxy, Syy], -1)], -2
        )
        rhs = np.stack([Sz, Sxz, Syz], -1)
        A[~ok] = np.eye(3)
        rhs[~ok] = 0
        A += np.eye(3) * 1e-9 * (np.abs(A).max(axis=(1, 2), keepdims=True) + 1)
        theta = np.linalg.solve(A, rhs[..., None])[..., 0]
        ss_res = np.maximum(Szz - np.einsum("ij,ij->i", theta, rhs), 0)
        rough = np.sqrt(ss_res / nn)

        zmin = np.full(nlon, np.inf)
        zmax = np.full(nlon, -np.inf)
        np.minimum.at(zmin, jv, zv)
        np.maximum.at(zmax, jv, zv)

        sv = np.isfinite(s)
        ns = np.bincount(j[sv], minlength=nlon)
        smean = np.bincount(j[sv], s[sv], nlon) / np.maximum(ns, 1)

        ids = off + np.nonzero(ok)[0]
        out["terrain"][ids] = smean[ok]
        out["roughness"][ids] = rough[ok]
        out["relief"][ids] = (zmax - zmin)[ok]
        out["elev"][ids] = zmean[ok]
        out["valid_frac"][ids] = frac[ok]

        if b % 100 == 0:
            log(f"    banda {b:5d}/{grid.nbands}  lat {latc_b:+7.2f}°  celdas válidas {int(ok.sum())}/{nlon}")

    lat, _ = grid.centers()
    out["illum"] = np.where(np.isfinite(out["terrain"]), illumination(grid.body, lat), np.nan).astype(np.float32)
    return out
