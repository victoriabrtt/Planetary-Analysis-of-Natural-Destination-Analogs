// Textos de la interfaz en español (por defecto) e inglés. Los textos que define el backend
// (dimensiones, perfiles, caveats, errores, nombres de lugares) llegan ya traducidos con ?lang=.
import { useStore } from './store/useStore'

export type Lang = 'es' | 'en'
export const LANGS: { value: Lang; label: string; name: string }[] = [
  { value: 'es', label: 'ES', name: 'Español' },
  { value: 'en', label: 'EN', name: 'English' },
]

const es = {
  'body.moon': 'Luna',
  'body.mars': 'Marte',
  'body.earth': 'Tierra',
  'the.moon': 'la Luna',
  'the.mars': 'Marte',
  'the.earth': 'la Tierra',

  'verdict.strong': 'Fuerte',
  'verdict.moderate': 'Moderado',
  'verdict.weak': 'Débil',
  'verdict.broken': 'Se rompe',

  'header.direction': 'Dirección de la búsqueda',
  'header.toEarth': 'Hacia la Tierra',
  'header.fromEarth': 'Desde la Tierra',
  'header.toEarthTitle': 'Elegís un punto de {body} y se busca en la Tierra',
  'header.fromEarthTitle': 'Elegís un punto de la Tierra y se busca en {body}',
  'header.bodyGroup': 'Cuerpo celeste',
  'header.toLight': 'Cambiar a modo claro',
  'header.toDark': 'Cambiar a modo oscuro',
  'header.language': 'Idioma',

  'intro.title': 'El terreno de {tgt} más parecido a un punto de {src}',
  'intro.factReal': '{n} medidas del terreno contra {cells} celdas de {km} km',
  'intro.factMock': '{n} medidas del terreno contra {cells} sitios (motor de demostración)',

  'skip': 'Saltar al resultado',

  'source.label': 'Origen en {body}',
  'source.picked': 'Punto elegido',
  'source.howTo': 'Hacé clic en cualquier punto del globo, elegí un sitio conocido o escribí coordenadas.',
  'source.sites': 'Sitios conocidos de {body}',
  'source.showAll': 'Ver los {n} sitios',
  'source.globe': 'Globo de {body}. Hacé clic para elegir un punto de origen.',

  'coord.form': 'Ir a coordenadas',
  'coord.lat': 'Latitud',
  'coord.lon': 'Longitud',
  'coord.go': 'Ir al punto',
  'coord.latErr': 'Escribí una latitud entre −90 y 90.',
  'coord.lonErr': 'Escribí una longitud entre −180 y 180.',

  'target.label': 'Análogo en {body}',
  'target.none': 'Sin análogo para ese punto',
  'target.calculating': 'Calculando…',
  'target.viewing': 'Estás viendo el puesto {n} del ranking.',
  'target.back': 'Volver al más parecido',
  'target.strongIn': 'Fuerte en {ok} de {n}',
  'target.breaksIn': 'se rompe en {dims}',
  'target.awayIn': 'se aleja en {dims}',
  'target.rarity.none': 'ningún lugar llega a «Fuerte»',
  'target.rarity.unique': 'único: es el único que califica',
  'target.rarity.rare': 'raro: {n} celdas, {share} de {body}',
  'target.rarity.rareFew': 'raro: solo {n} celdas de {body}',
  'target.rarity.common': 'común: {share} de {body}',
  'target.commonTitle': 'Terreno común en {body}',
  'target.example': 'por ejemplo: {place}',
  'target.measures': 'Cómo se compara en cada medida',
  'target.diff': 'dif.',
  'target.legend': 'Leyenda del globo',
  'target.legendOrigin': 'Origen proyectado sobre {body}',
  'target.legendQual': 'Califican como análogo fuerte',
  'target.useNearest': 'Usar el punto con datos más cercano',
  'target.globe': 'Globo de {body} con el análogo en {place}.',
  'target.globeEmpty': 'Globo de {body}',
  'still': '{label} (vista fija: este navegador no tiene WebGL)',
  'origin.projected': 'Origen proyectado',

  'reading.reproduces': 'reproduce',
  'reading.all': 'las {n} medidas de {src}',
  'reading.some': '{ok} de las {n} medidas de {src}',
  'reading.withinTol': 'dentro de su tolerancia',
  'reading.awayIn': '; se aleja en',
  'reading.breaksIn': '; se rompe en',
  'reading.commonLead': 'Es un terreno común: el {share} de {body} reproduce',
  'reading.forExample': 'Por ejemplo,',

  'profile.title': 'Perfil de misión',

  'actions.copy': 'Copiar enlace',
  'actions.copied': 'Enlace copiado',
  'actions.copyPrompt': 'Copiá este enlace:',
  'actions.csv': 'Descargar ranking (CSV)',

  'ranking.title': 'Otros lugares parecidos',
  'ranking.hint': 'Tocá uno para compararlo en el panel y en el globo.',
  'ranking.near': 'a {km} km del n.º {n}',
  'ranking.breaks': 'se rompe en {dims}',

  'dims.title': 'Medida por medida',
  'dims.legend': 'El anillo es {src}, el punto de color es {tgt} y la franja gris es la tolerancia de cada medida.',
  'dims.source': 'el origen',
  'dims.target': 'el análogo',
  'card.diff': 'Diferencia',
  'card.of': 'de',
  'card.bestOnly': 'Mejor solo en {dim}:',
  'card.noneCloser': 'Ningún lugar se acerca más en esta medida.',
  'card.weight': 'peso ×{w}',
  'card.closeness': 'Cercanía {p}.',

  'caveats.title': 'Dónde se rompe la analogía',
  'caveats.allOk': 'En el terreno, {place} reproduce las {n} medidas de {src} dentro de su tolerancia. Lo que no puede reproducir ningún lugar de {body}:',
  'caveats.some': '{place} se aleja de {src} en {count} del terreno, y además hay cosas que ningún lugar de {body} reproduce:',
  'caveats.one': 'una medida',
  'caveats.many': '{n} medidas',
  'caveats.row': '{src} en {from} contra {match} en {place}: una diferencia de {diff}, con tolerancia de ±{tol}.',

  'method.title': 'Cómo se calcula',
  'method.p1': 'Se compara la forma del terreno, no la altura: cada cuerpo mide la altura desde un cero distinto (nivel del mar, una esfera, el areoide). Cada lugar es una celda de unos 20 km.',
  'method.p2': 'En cada medida, la cercanía es 100 % si los valores son iguales y baja a medida que la diferencia se acerca a su tolerancia:',
  'method.p3': 'La cercanía global promedia las medidas con los pesos del perfil. Veredicto: Fuerte desde 75 %, Moderado desde 50 %, Débil desde 25 %; debajo, se rompe. Si alguna medida se rompe, el veredicto lo aclara.',
  'method.p4': 'Además se cuenta cuánta superficie califica como análogo fuerte: así se distingue un análogo raro de un terreno común.',
  'method.formula': 'cercanía = exp(−(|a − b| / tolerancia)²)',
  'csv.file': 'analogos',
  'csv.head': 'origen,origen_cuerpo,origen_lat,origen_lon,puesto,lugar,lat,lon,cercania_pct',
  'csv.value': 'valor',
  'csv.diff': 'dif',

  'footer.mock': 'Motor local de demostración',
  'footer.data': 'Datos: LOLA (Luna), MOLA (Marte), ETOPO 2022 (Tierra)',
  'footer.textures': 'Texturas: Solar System Scope (CC BY 4.0) · Polos lunares: LROC WAC, NASA/GSFC/ASU',

  'error.title': 'Sin resultado para ese punto.',
  'error.server': 'No se pudo consultar el servidor (error {status}). Probá de nuevo en un momento.',
  'error.meta': 'No se pudo leer /api/meta: {msg}',
  'unnamed': 'Zona sin nombre oficial',
} as const

export type Key = keyof typeof es

const en: Record<Key, string> = {
  'body.moon': 'Moon',
  'body.mars': 'Mars',
  'body.earth': 'Earth',
  'the.moon': 'the Moon',
  'the.mars': 'Mars',
  'the.earth': 'Earth',

  'verdict.strong': 'Strong',
  'verdict.moderate': 'Moderate',
  'verdict.weak': 'Weak',
  'verdict.broken': 'Breaks',

  'header.direction': 'Search direction',
  'header.toEarth': 'To Earth',
  'header.fromEarth': 'From Earth',
  'header.toEarthTitle': 'Pick a point on {body} and search Earth',
  'header.fromEarthTitle': 'Pick a point on Earth and search {body}',
  'header.bodyGroup': 'Celestial body',
  'header.toLight': 'Switch to light mode',
  'header.toDark': 'Switch to dark mode',
  'header.language': 'Language',

  'intro.title': 'The terrain on {tgt} most like a point on {src}',
  'intro.factReal': '{n} terrain measures against {cells} cells of {km} km',
  'intro.factMock': '{n} terrain measures against {cells} sites (demo engine)',

  'skip': 'Skip to the result',

  'source.label': 'Origin on {body}',
  'source.picked': 'Chosen point',
  'source.howTo': 'Click anywhere on the globe, pick a known site or type coordinates.',
  'source.sites': 'Known sites on {body}',
  'source.showAll': 'Show all {n} sites',
  'source.globe': 'Globe of {body}. Click to choose an origin point.',

  'coord.form': 'Go to coordinates',
  'coord.lat': 'Latitude',
  'coord.lon': 'Longitude',
  'coord.go': 'Go to point',
  'coord.latErr': 'Enter a latitude between −90 and 90.',
  'coord.lonErr': 'Enter a longitude between −180 and 180.',

  'target.label': 'Analog on {body}',
  'target.none': 'No analog for that point',
  'target.calculating': 'Calculating…',
  'target.viewing': 'You are viewing #{n} in the ranking.',
  'target.back': 'Back to the closest',
  'target.strongIn': 'Strong in {ok} of {n}',
  'target.breaksIn': 'breaks on {dims}',
  'target.awayIn': 'drifts on {dims}',
  'target.rarity.none': 'nowhere reaches “Strong”',
  'target.rarity.unique': 'unique: the only place that qualifies',
  'target.rarity.rare': 'rare: {n} cells, {share} of {body}',
  'target.rarity.rareFew': 'rare: only {n} cells on {body}',
  'target.rarity.common': 'common: {share} of {body}',
  'target.commonTitle': 'Common terrain on {body}',
  'target.example': 'for example: {place}',
  'target.measures': 'How it compares on each measure',
  'target.diff': 'diff.',
  'target.legend': 'Globe legend',
  'target.legendOrigin': 'Origin projected onto {body}',
  'target.legendQual': 'Qualify as a strong analog',
  'target.useNearest': 'Use the nearest point with data',
  'target.globe': 'Globe of {body} with the analog at {place}.',
  'target.globeEmpty': 'Globe of {body}',
  'still': '{label} (still view: this browser has no WebGL)',
  'origin.projected': 'Projected origin',

  'reading.reproduces': 'reproduces',
  'reading.all': 'all {n} measures of {src}',
  'reading.some': '{ok} of the {n} measures of {src}',
  'reading.withinTol': 'within tolerance',
  'reading.awayIn': '; it drifts on',
  'reading.breaksIn': '; it breaks on',
  'reading.commonLead': 'Common terrain: {share} of {body} reproduces',
  'reading.forExample': 'For example,',

  'profile.title': 'Mission profile',

  'actions.copy': 'Copy link',
  'actions.copied': 'Link copied',
  'actions.copyPrompt': 'Copy this link:',
  'actions.csv': 'Download ranking (CSV)',

  'ranking.title': 'Other similar places',
  'ranking.hint': 'Tap one to compare it in the panel and on the globe.',
  'ranking.near': '{km} km from #{n}',
  'ranking.breaks': 'breaks on {dims}',

  'dims.title': 'Measure by measure',
  'dims.legend': 'The ring is {src}, the coloured dot is {tgt} and the grey band is each measure’s tolerance.',
  'dims.source': 'the origin',
  'dims.target': 'the analog',
  'card.diff': 'Difference',
  'card.of': 'of',
  'card.bestOnly': 'Best on {dim} alone:',
  'card.noneCloser': 'No place comes closer on this measure.',
  'card.weight': 'weight ×{w}',
  'card.closeness': 'Closeness {p}.',

  'caveats.title': 'Where the analogy breaks',
  'caveats.allOk': 'On terrain, {place} reproduces all {n} measures of {src} within tolerance. What no place on {body} can reproduce:',
  'caveats.some': '{place} drifts from {src} on {count} of terrain, and there are things no place on {body} reproduces:',
  'caveats.one': 'one measure',
  'caveats.many': '{n} measures',
  'caveats.row': '{src} at {from} against {match} at {place}: a difference of {diff}, with a tolerance of ±{tol}.',

  'method.title': 'How it is calculated',
  'method.p1': 'Terrain shape is compared, not height: each body measures height from a different zero (sea level, a sphere, the areoid). Each place is a cell of about 20 km.',
  'method.p2': 'For each measure, closeness is 100% when the values match and drops as the difference approaches its tolerance:',
  'method.p3': 'Overall closeness averages the measures with the profile weights. Verdict: Strong from 75%, Moderate from 50%, Weak from 25%; below that, it breaks. If any measure breaks, the verdict says so.',
  'method.p4': 'It also counts how much surface qualifies as a strong analog, which tells a rare analog from common terrain.',
  'method.formula': 'closeness = exp(−(|a − b| / tolerance)²)',
  'csv.file': 'analogs',
  'csv.head': 'source,source_body,source_lat,source_lon,rank,place,lat,lon,closeness_pct',
  'csv.value': 'value',
  'csv.diff': 'diff',

  'footer.mock': 'Local demo engine',
  'footer.data': 'Data: LOLA (Moon), MOLA (Mars), ETOPO 2022 (Earth)',
  'footer.textures': 'Textures: Solar System Scope (CC BY 4.0) · Lunar poles: LROC WAC, NASA/GSFC/ASU',

  'error.title': 'No result for that point.',
  'error.server': 'Could not reach the server (error {status}). Try again in a moment.',
  'error.meta': 'Could not read /api/meta: {msg}',
  'unnamed': 'Unnamed area',
}

const DICT: Record<Lang, Record<Key, string>> = { es, en }

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = DICT[lang][key] ?? DICT.es[key]
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

/** t('clave', { variable }) en el idioma activo. Re-renderiza al cambiar de idioma. */
export function useT() {
  const lang = useStore((s) => s.lang)
  return (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars)
}

/** Idioma inicial: el guardado, si no el del navegador (inglés si no es español). */
export function initialLang(): Lang {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('lang') : null
  if (saved === 'es' || saved === 'en') return saved
  if (typeof navigator !== 'undefined' && !navigator.language.toLowerCase().startsWith('es')) return 'en'
  return 'es'
}
