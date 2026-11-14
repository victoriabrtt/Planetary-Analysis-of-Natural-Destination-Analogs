# Analog Matcher — backend (pipeline de datos + API)

Dada una ubicación en la Luna o Marte, encuentra el lugar de la Tierra con la **forma de terreno** más
parecida (y al revés: modo inverso Tierra → Luna/Marte), usando modelos de elevación reales.

## Correr

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements-precompute.txt

# 1) Datos crudos (~650 MB, una sola vez; se puede cortar y retomar)
.venv/bin/python -m precompute.download
# 2) Índices precalculados → data/index/ (~1–2 min)
.venv/bin/python -m precompute.build_index
# 3) API
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Front contra la API real: `cd frontend && npm run dev:api` (Vite redirige `/api` → `localhost:8000`).

Tests: `.venv/bin/pip install pytest httpx && .venv/bin/python -m pytest`

## Datos

| Cuerpo | Producto | Resolución | Fuente |
|---|---|---|---|
| Luna | LOLA **LDEM_16** | 16 px/° ≈ 1,90 km/px | `imbrium.mit.edu` (PDS) |
| Marte | MOLA **MEGDR** `megt90n000fb` | 32 px/° ≈ 1,85 km/px | PDS Geosciences (WUSTL) |
| Tierra | **ETOPO 2022** 60″ surface | ≈ 1,85 km/px | NOAA NCEI |
| Tierra (máscara/nombres) | Natural Earth 10m land, lakes, geography regions; 50m countries | — | naturalearthdata.com |

**¿Por qué ETOPO y no COP90 por OpenTopography?** El handoff pide una grilla global gruesa de ~1–2 km.
Bajar COP90 completo para remuestrearlo son terabytes, y la API de OpenTopography limita el área de cada
pedido. En tierra firme, ETOPO 2022 se deriva de Copernicus GLO-30, así que es el mismo dato ya remuestreado
a ~1,85 km, la misma escala en el terreno que LDEM_16 y MOLA 32 px/°. La descarga por OpenTopography queda
como comando opcional para refinar un bbox:
`OPENTOPO_KEY=… python -m precompute.download earth-tile --south -55 --north -54 --west -69 --east -68`.

## Método: se compara FORMA, no altura

El cero es distinto en cada cuerpo (nivel del mar / esfera de 1737,4 km / areoide), así que nunca se restan
alturas crudas. Por celda se calculan descriptores locales, donde el cero se cancela solo
(`precompute/descriptors.py`):

| Dimensión | Descriptor | Tolerancia |
|---|---|---|
| `terrain` | pendiente media (°): atan(‖∇z‖) por píxel, con dx/dy en metros reales | 10° |
| `roughness` | rugosidad (m): desvío estándar de z **respecto del plano ajustado** en la celda | 120 m |
| `relief` | relieve local (m): max(z) − min(z) | 400 m |
| `illum` | iluminación (°): \|lat\| como proxy de la incidencia solar | 18° |

- **Misma vara en los tres cuerpos.** Las celdas tienen **~20 km de lado en el terreno**, no un tamaño fijo en
  grados: hay bandas de latitud de altura fija, y en cada banda `round(360·cos(lat)/Δlat)` celdas, lo que da una
  grilla de área casi igual. Así, rugosidad y relieve se miden sobre la misma ventana física. Con los radios
  6371 / 1737,4 / 3389,5 km salen ~94 mil celdas en la Luna, ~360 mil en Marte y ~1,27 millones en la Tierra
  (de las cuales ~380 mil son tierra firme).
- **El paso del gradiente también es igual en x e y.** En cada fila se toma una columna cada `round(1/cos(lat))`,
  porque la longitud se acorta hacia los polos.
- **Rugosidad sin la pendiente.** Con `std(z)` crudo, una llanura lisa inclinada 2° tiene ~200 m de "rugosidad"
  en 20 km. Por eso la rugosidad es el residuo del ajuste del plano z = a + bx + cy.
- **Cercanía** (`app/engine.py`): `exp(-((a-b)/tol)^2)` por dimensión, con valores **absolutos** (no percentiles).
  La cercanía global es el promedio ponderado por el perfil de misión. Si una dimensión da baja, se muestra:
  es donde se rompe la analogía.
- **Máscara de la Tierra.** Se descartan océano y lagos (Natural Earth land − lakes). En ETOPO el mar tiene
  batimetría, no nodata, y "z ≤ 0" se comería el Mar Muerto o el Valle de la Muerte. También se descartan las
  celdas con menos del 50% de píxeles válidos (costas) y el gradiente no cruza la costa.
- **Nombres.** Para las celdas cerca de análogos conocidos (Devon, Atacama, Lanzarote…) se usan sitios curados.
  Para el resto, región geográfica + país de Natural Earth, y si no hay, coordenadas.
- **Ranking diverso.** El top N exige ≥300 km entre resultados; si no, serían 5 celdas vecinas del mismo lugar.
- **Puntos sin datos.** Un punto en el océano se lleva a la celda válida más cercana si está a ≤250 km. Si no,
  la API responde 422 con un mensaje.

## API

`POST /api/match`, con el contrato del front:

```json
{ "source_body": "moon", "lat": -89.9, "lon": 0.0, "target_body": "earth", "top_n": 5,
  "weights": { "terrain": 1, "roughness": 1, "illum": 1 } }
```

La respuesta trae `source`, `overall`, `perDim[dim] = {site, score, src, match, diff}` y `caveats`, con valores
absolutos en unidades reales. Extensiones opcionales que el front usa si están: `source.name`, `ranking` (top N)
y `perDim[dim].tol`. Las dimensiones que no reconoce el backend se ignoran en `weights`, y las que faltan valen 1.

`GET /api/meta` devuelve las dimensiones (nombre, unidad, tolerancia), los perfiles y los puntos famosos. El
front lo lee en modo real, así que **una dimensión nueva aparece en la UI sin tocar el front**.

`GET /health` devuelve el estado y la cantidad de celdas por cuerpo.

Perfiles: Balanceado `{}` · Rover `{terrain: 3, roughness: 2.5}` · Térmico `{illum: 3}`.

## Agregar una dimensión (fase 2)

1. Calcular la columna por celda en `precompute/` (ej. FeO de Diviner/CRISM/ASTER, densidad de cráteres de
   Robbins, cuevas del pit atlas de LROC) y sumarla a `DIMS` en `descriptors.py`.
2. Agregar su entrada (nombre, unidad, tolerancia) a `DIMENSIONS` en `app/engine.py`.
3. Regenerar los índices. El contrato no cambia.

## Deploy (Cloud Run)

El `Dockerfile` está en la raíz del repo y tiene dos etapas: Node compila el front con `VITE_API_MODE=real` y
Python sirve la API más `dist/` como estático en el mismo origen. Escucha en `$PORT` (8080).
La imagen pesa ~450 MB, usa ~120 MB de RAM y responde `/api/match` en ~30 ms. Los índices
(`data/index/*.npz`, ~16 MB) se copian a la imagen: hay que generarlos antes del build.

```bash
docker build -t analog-matcher . && docker run -p 8080:8080 analog-matcher
gcloud run deploy analog-matcher --source . --region southamerica-east1 --allow-unauthenticated --memory 512Mi
```

## Limitaciones conocidas

- La escala es de ~20 km sobre un DEM de ~1,9 km: no ve rocas, regolito ni pendientes de detalle. La pendiente
  a 1,9 km da valores menores que la pendiente local real.
- `illum = |lat|` es la incidencia al mediodía en el equinoccio sobre una superficie plana. No considera la
  oblicuidad (Tierra 23,4°, Marte 25°, Luna 1,5°) ni la orientación de la ladera.
- ETOPO sobre hielo (Antártida, Groenlandia) da la superficie del hielo, no la roca.
