"""
Genera las texturas de casquetes polares (public/textures/caps/{body}_{s,n}.jpg).

Formato de salida (lo que espera el shader de GlobeView):
  - Proyección estereográfica polar, centrada en el polo, cuadrada N×N.
  - Cubre desde el polo hasta |lat| = 60°  →  rho_max = 2·tan(15°) (esfera unitaria).
  - X = rho·sin(lon), Y = rho·cos(lon) en el polo sur (lon 0° arriba),
    Y = −rho·cos(lon) en el polo norte (lon 0° abajo). Fila 0 = arriba de la imagen.

Fuentes:
  - Luna: mosaicos LROC WAC Global Morphologic Map polares reales (PDS, WAC_GLOBAL_P900{S,N}0000_064P.IMG,
    estereográfica polar 90°→60°, 64 px/°, 473,8 m/px). La orientación se detecta sola por
    correlación con la textura global, el tono se iguala por histograma.
  - Marte y Tierra: reproyección de la textura equirectangular 8k (Solar System Scope) a la
    misma estereográfica. No es dato polar nuevo, pero elimina la convergencia del polo.

Uso:
  python3 -I scripts/build_polar_caps.py <dir_descargas> <dir_salida>
  (dir_descargas con P900S0000.IMG, P900N0000.IMG, 8k_moon.jpg, 8k_mars.jpg, 8k_earth_daymap.jpg)
"""

import os
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

N = 2048
LAT_EDGE = 60.0
RHO_MAX = 2 * np.tan(np.radians((90 - LAT_EDGE) / 2))

# LROC PDS IMG (ver etiqueta): 3931×3931 PC_REAL (float32 LE), 1 registro de etiqueta de 15724 bytes.
LROC_SIZE = 3931
LROC_LABEL_BYTES = 15724
LROC_NULL_BELOW = -1e30


def out_grid(pole):
    """lat/lon (grados) de cada píxel de la imagen de salida."""
    c = (np.arange(N) + 0.5) / N * 2 - 1
    X, Y = np.meshgrid(c * RHO_MAX, -c * RHO_MAX)  # fila 0 arriba → Y positivo
    rho = np.hypot(X, Y)
    alat = 90 - np.degrees(2 * np.arctan(rho / 2))
    if pole == "s":
        lon = np.degrees(np.arctan2(X, Y))
        lat = -alat
    else:
        lon = np.degrees(np.arctan2(X, -Y))
        lat = alat
    return lat, lon, alat


def sample_equirect(img, lat, lon):
    """Muestreo bilineal (con wrap en longitud) de una imagen equirectangular uint8 H×W×C."""
    H, W = img.shape[:2]
    x = (lon + 180) / 360 * W - 0.5
    y = (90 - lat) / 180 * H - 0.5
    x0 = np.floor(x).astype(np.int64)
    y0 = np.clip(np.floor(y).astype(np.int64), 0, H - 1)
    y1 = np.clip(y0 + 1, 0, H - 1)
    fx = (x - x0)[..., None]
    fy = np.clip(y - np.floor(y), 0, 1)[..., None]
    x0w = x0 % W
    x1w = (x0 + 1) % W
    a = img[y0, x0w].astype(np.float32)
    b = img[y0, x1w].astype(np.float32)
    c = img[y1, x0w].astype(np.float32)
    d = img[y1, x1w].astype(np.float32)
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def load_lroc(path):
    raw = np.fromfile(path, dtype="<f4", offset=LROC_LABEL_BYTES, count=LROC_SIZE * LROC_SIZE)
    arr = raw.reshape(LROC_SIZE, LROC_SIZE)
    valid = np.isfinite(arr) & (arr > LROC_NULL_BELOW)
    return arr, valid


def resize(arr, valid):
    """Reescala el mosaico LROC (misma proyección y extensión) a N×N, propagando la máscara."""
    filled = np.where(valid, arr, 0).astype(np.float32)
    im = Image.fromarray(filled, mode="F").resize((N, N), Image.BILINEAR)
    vm = Image.fromarray(valid.astype(np.float32), mode="F").resize((N, N), Image.BILINEAR)
    v = np.asarray(vm)
    out = np.asarray(im) / np.maximum(v, 1e-6)
    return out, v > 0.99


def blur(a, k=4):
    """Desenfoque de caja barato (para comparar estructura grande, no ruido)."""
    pad = np.pad(a, k, mode="edge")
    cs = pad.cumsum(0).cumsum(1)
    cs = np.pad(cs, ((1, 0), (1, 0)))
    s = 2 * k + 1
    return (cs[s:, s:] - cs[:-s, s:] - cs[s:, :-s] + cs[:-s, :-s]) / (s * s)


TRANSFORMS = {
    "id": lambda a: a,
    "rot90": lambda a: np.rot90(a, 1),
    "rot180": lambda a: np.rot90(a, 2),
    "rot270": lambda a: np.rot90(a, 3),
    "flipH": lambda a: a[:, ::-1],
    "flipV": lambda a: a[::-1, :],
    "transpose": lambda a: a.T,
    "antitranspose": lambda a: np.rot90(a, 2).T,
}


def hist_match(src, src_mask, ref, ref_mask):
    """Iguala la distribución de src (en src_mask) a la de ref (en ref_mask)."""
    s = src[src_mask]
    r = ref[ref_mask]
    qs = np.linspace(0, 100, 257)
    sq = np.percentile(s, qs)
    rq = np.percentile(r, qs)
    sq = np.maximum.accumulate(sq + np.arange(sq.size) * 1e-9)
    return np.interp(src, sq, rq)


def build_moon(dl, out):
    eq = np.asarray(Image.open(os.path.join(dl, "8k_moon.jpg")).convert("RGB"))
    for pole, name in (("s", "P900S0000"), ("n", "P900N0000")):
        lat, lon, alat = out_grid(pole)
        ref_rgb = sample_equirect(eq, lat, lon)
        ref = ref_rgb.mean(-1)

        arr, valid = load_lroc(os.path.join(dl, f"{name}.IMG"))
        lroc, lvalid = resize(arr, valid)
        print(f"[moon {pole}] LROC válido: {lvalid.mean() * 100:.1f}%  rango {np.percentile(lroc[lvalid], [1, 99])}")

        # Orientación: correlación en la franja 62–80° (donde la textura global es buena).
        band = (alat > 62) & (alat < 80)
        refb = blur(ref)
        scores = {}
        for k, t in TRANSFORMS.items():
            l, m = t(lroc), t(lvalid)
            mm = band & m
            a = blur(l)[mm]
            b = refb[mm]
            scores[k] = float(np.corrcoef(a, b)[0, 1])
        best = max(scores, key=scores.get)
        print(f"[moon {pole}] correlación por orientación: " + ", ".join(f"{k}={v:+.3f}" for k, v in scores.items()))
        print(f"[moon {pole}] → {best}")
        l, m = TRANSFORMS[best](lroc), TRANSFORMS[best](lvalid)

        # Tono: igualar histograma al de la textura global en la zona de mezcla.
        matched = hist_match(l, m, ref, band)
        # Teñido: mantener el leve color de la textura global.
        tint = ref_rgb[band].mean(0) / max(ref[band].mean(), 1e-6)
        rgb = matched[..., None] * tint[None, None, :]
        # Huecos sin dato → textura global.
        rgb = np.where(m[..., None], rgb, ref_rgb)
        save(rgb, os.path.join(out, f"moon_{pole}.jpg"))


def build_from_equirect(dl, out, body, fname):
    eq = np.asarray(Image.open(os.path.join(dl, fname)).convert("RGB"))
    for pole in ("s", "n"):
        lat, lon, _ = out_grid(pole)
        save(sample_equirect(eq, lat, lon), os.path.join(out, f"{body}_{pole}.jpg"))


def save(rgb, path):
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(path, quality=86, optimize=True, progressive=True)
    print(f"  → {path} ({os.path.getsize(path) / 1e6:.2f} MB)")


if __name__ == "__main__":
    dl, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    build_moon(dl, out)
    build_from_equirect(dl, out, "mars", "8k_mars.jpg")
    build_from_equirect(dl, out, "earth", "8k_earth_daymap.jpg")
