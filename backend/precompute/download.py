"""
Descarga de datos crudos → backend/data/raw/

  python -m precompute.download            # todo lo necesario para build_index (≈ 650 MB)
  python -m precompute.download --only moon mars
  python -m precompute.download earth-tile --south -55 --north -54 --west -69 --east -68
                                            # (opcional) tile COP90 por OpenTopography, requiere OPENTOPO_KEY

Fuentes (todas públicas, sin key salvo OpenTopography):
  Luna   LOLA LDEM_16 (16 px/°, ~1,9 km/px)            imbrium.mit.edu (PDS Geosciences / MIT)
  Luna/Marte  nomenclatura IAU (USGS Gazetteer of Planetary Nomenclature): nombres de las celdas
  Marte  MOLA MEGDR megt90n000fb (32 px/°, ~1,85 km/px)  pds-geosciences.wustl.edu
  Tierra ETOPO 2022 60″ surface (~1,85 km/px)           NOAA NCEI. En tierra firme deriva de Copernicus GLO-30.
         Natural Earth 10m land + lakes (máscara de océano y lagos), regiones geográficas y países (nombres)

¿Por qué ETOPO y no COP90 por la API? Para una grilla global gruesa, bajar COP90 completo son terabytes
y la API de OpenTopography limita el área por pedido. ETOPO 2022 ya es Copernicus remuestreado a ~1,85 km,
la misma escala que LOLA LDEM_16 y MOLA 32 px/°. OpenTopography queda para refinar un bbox puntual.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import requests

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"

NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"
# Gazetteer of Planetary Nomenclature (USGS/IAU): nombres oficiales de la Luna y Marte.
IAU = "https://asc-planetarynames-data.s3.us-west-2.amazonaws.com"

SOURCES: dict[str, list[tuple[str, str]]] = {
    "moon": [
        ("https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/IMG/LDEM_16.IMG", "LDEM_16.IMG"),
        ("https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/IMG/LDEM_16.LBL", "LDEM_16.LBL"),
        (f"{IAU}/MOON_nomenclature_center_pts.zip", "MOON_nomenclature_center_pts.zip"),
    ],
    "mars": [
        ("https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg032/megt90n000fb.img", "megt90n000fb.img"),
        ("https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg032/megt90n000fb.lbl", "megt90n000fb.lbl"),
        (f"{IAU}/MARS_nomenclature_center_pts.zip", "MARS_nomenclature_center_pts.zip"),
    ],
    "earth": [
        (
            "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/"
            "ETOPO_2022_v1_60s_N90W180_surface.tif",
            "ETOPO_2022_v1_60s_N90W180_surface.tif",
        ),
        (f"{NE}/ne_10m_land.geojson", "ne_10m_land.geojson"),
        (f"{NE}/ne_10m_lakes.geojson", "ne_10m_lakes.geojson"),
        (f"{NE}/ne_10m_geography_regions_polys.geojson", "ne_10m_geography_regions_polys.geojson"),
        (f"{NE}/ne_50m_admin_0_countries.geojson", "ne_50m_admin_0_countries.geojson"),
    ],
}


def fetch(url: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 0:
        print(f"  ✓ {dest.name} (ya estaba)")
        return
    tmp = dest.with_suffix(dest.suffix + ".part")
    done = tmp.stat().st_size if tmp.exists() else 0  # reanudar una descarga cortada
    headers = {"Range": f"bytes={done}-"} if done else {}
    with requests.get(url, stream=True, timeout=60, headers=headers) as r:
        r.raise_for_status()
        if done and r.status_code != 206:  # el servidor no soporta Range: desde cero
            done = 0
        total = done + int(r.headers.get("content-length", 0))
        with open(tmp, "ab" if done else "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
                done += len(chunk)
                if total:
                    print(f"\r  ↓ {dest.name}: {done / 1e6:7.1f} / {total / 1e6:.1f} MB", end="", flush=True)
    os.replace(tmp, dest)
    print(f"\r  ✓ {dest.name}: {dest.stat().st_size / 1e6:.1f} MB" + " " * 20)


def download(bodies: list[str]) -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    for body in bodies:
        print(f"[{body}]")
        for url, name in SOURCES[body]:
            fetch(url, RAW / name)
            if name.endswith("_nomenclature_center_pts.zip"):
                import zipfile

                out = RAW / f"iau_{name.split('_')[0]}"
                out.mkdir(exist_ok=True)
                with zipfile.ZipFile(RAW / name) as z:
                    z.extractall(out)


def earth_tile(south: float, north: float, west: float, east: float, demtype: str = "COP90") -> Path:
    """Tile de alta resolución por la API de OpenTopography (opcional; requiere OPENTOPO_KEY)."""
    key = os.environ.get("OPENTOPO_KEY")
    if not key:
        sys.exit("Falta OPENTOPO_KEY (key gratuita en https://portal.opentopography.org/).")
    params = {
        "demtype": demtype,
        "south": south,
        "north": north,
        "west": west,
        "east": east,
        "outputFormat": "GTiff",
        "API_Key": key,
    }
    r = requests.get("https://portal.opentopography.org/API/globaldem", params=params, timeout=300)
    r.raise_for_status()
    out = RAW / "tiles" / f"{demtype}_{south}_{north}_{west}_{east}.tif"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(r.content)
    print(f"  ✓ {out} ({len(r.content) / 1e6:.1f} MB)")
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd")
    ap.add_argument("--only", nargs="+", choices=list(SOURCES), default=list(SOURCES))
    t = sub.add_parser("earth-tile", help="tile COP90 por OpenTopography (opcional)")
    for k in ("south", "north", "west", "east"):
        t.add_argument(f"--{k}", type=float, required=True)
    t.add_argument("--demtype", default="COP90")
    a = ap.parse_args()
    if a.cmd == "earth-tile":
        earth_tile(a.south, a.north, a.west, a.east, a.demtype)
    else:
        download(a.only)


if __name__ == "__main__":
    main()
