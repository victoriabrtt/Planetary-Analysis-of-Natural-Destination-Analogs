# Analog Matcher — frontend (PANDA · NASA Space Apps 2026)

Un "Shazam de análogos planetarios": elegís un punto en la Luna o Marte y la app devuelve el lugar de la
Tierra más parecido, con la cercanía por dimensión, en valores absolutos reales, y dónde se rompe la analogía.

## Correr

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/ (lo sirve FastAPI con StaticFiles)
```

## Mock ↔ API real

El único punto de cambio es `src/api/client.ts`.

- Por defecto (`VITE_API_MODE` sin definir o `mock`), el front calcula con el **motor real**
  (`src/engine/match.ts`) sobre el dataset semilla y devuelve exactamente la forma del contrato.
- Con `VITE_API_MODE=real` (o `npm run dev:api`) hace `POST /api/match` contra el backend (`../backend`).
  En dev, Vite redirige `/api` a `http://localhost:8000`. Ver `.env.example`.
- En modo real, las dimensiones, tolerancias y perfiles salen de `GET /api/meta`, así que si el backend agrega
  una dimensión, aparece en la UI sin tocar el front. En modo mock se usa el catálogo local de 6 dimensiones.

La respuesta incluye un campo opcional `ranking` (top_n por cercanía global). Si el backend no lo manda,
la UI esconde ese panel y sigue funcionando.

## Estructura

```
src/
  engine/      dimensiones, tolerancias, perfiles, datos semilla, huella determinista, motor de cercanía
  api/         tipos del contrato y cliente (flag mock/real)
  store/       zustand: modo, cuerpo, perfil, punto, resultado, hover, tema
  components/  GlobeView (react-globe.gl), GlobePanel, ResultHero, Ranking, DimensionCard,
               ProfileSelector, Segmented, Caveats, Header, Starfield
public/textures  texturas 2k de Solar System Scope (CC BY 4.0) + bump de la Tierra (three-globe)
public/textures/caps  casquetes polares (estereográfica polar, 90°→60°), generados por scripts/build_polar_caps.py
```

## Polos (sin estiramiento)

Una textura equirectangular converge en los polos: se ven rayos y la GPU elige mal el nivel de mipmap.
Por eso el globo usa un material propio (`src/lib/polarMaterial.ts`) que, para |lat| > 62°, mezcla una
textura en **proyección estereográfica polar**. La transición es suave entre 62° y 70°.

- **Luna:** mosaico real **LROC WAC Global Morphologic Map** (PDS, `WAC_GLOBAL_P900{S,N}0000_064P.IMG`,
  474 m/px, NASA/GSFC/Arizona State University).
- **Marte y Tierra:** reproyección de las texturas 8k de Solar System Scope. No es dato polar nuevo,
  pero elimina la convergencia.

Las coordenadas del casquete se calculan en el shader desde la posición del vértice, sin `atan2`, así que no hay
singularidad en el polo.

Para regenerar los casquetes, bajá a un directorio los IMG de LROC (`P900S0000.IMG`, `P900N0000.IMG`) y
`8k_moon.jpg`, `8k_mars.jpg`, `8k_earth_daymap.jpg`, y corré:

```bash
python3 -I scripts/build_polar_caps.py <dir_descargas> public/textures/caps   # requiere numpy + Pillow
```

El script detecta solo la orientación del mosaico LROC (por correlación con la textura global) e iguala el tono
por histograma.

## Motor

- Cercanía por dimensión: `exp(-(|a-b|/tol)^2)`; la global es el promedio ponderado según el perfil.
- Un clic a ≤2,5° de un sitio conocido usa ese sitio. Si no, la huella se genera de forma determinista
  con campos suaves sobre la esfera: el mismo punto da la misma huella y los puntos vecinos dan huellas parecidas.
  `illum` se sesga con |lat| y `caves` tiende a valores bajos.
- Modo inverso (Tierra → Luna/Marte): los candidatos son los sitios famosos más una grilla generada de regiones.
