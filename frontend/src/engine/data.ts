// Datos semilla. vals = [terrain, roughness, FeO, craters, illum, caves]

export type Body = 'moon' | 'mars' | 'earth'
export type Vals = [number, number, number, number, number, number]

export interface Site {
  name: string
  lat: number
  lon: number
  vals: Vals
}

export const EARTH: Site[] = [
  { name: 'Harrat Khaybar, Arabia S.', lat: 25.0, lon: 39.9, vals: [6, 90, 12, 10, 25, 0.6] },
  { name: 'Lanzarote, Canarias', lat: 29.0, lon: -13.6, vals: [9, 120, 11, 8, 29, 0.9] },
  { name: 'Lava Beds, California', lat: 41.7, lon: -121.5, vals: [11, 140, 10, 6, 42, 0.88] },
  { name: 'Cráter Lonar, India', lat: 19.9, lon: 76.5, vals: [14, 180, 11, 120, 20, 0.15] },
  { name: 'Isla Axel Heiberg, Canadá', lat: 79.4, lon: -90.8, vals: [16, 300, 6, 4, 79, 0.1] },
  { name: 'Svalbard, Noruega', lat: 78.2, lon: 15.6, vals: [15, 260, 6, 4, 78, 0.12] },
  { name: 'Cuenca de Qaidam, China', lat: 37.0, lon: 95.0, vals: [5, 160, 7, 6, 37, 0.08] },
  { name: 'Desierto del Namib', lat: -24.7, lon: 15.3, vals: [4, 90, 8, 4, 25, 0.05] },
  { name: 'Emi Koussi, Chad', lat: 19.8, lon: 18.5, vals: [20, 420, 12, 10, 20, 0.3] },
  { name: 'Cañón Fish River, Namibia', lat: -27.6, lon: 17.6, vals: [26, 520, 7, 3, 28, 0.2] },
  { name: 'Campo del Teide, Canarias', lat: 28.3, lon: -16.6, vals: [18, 380, 11, 6, 28, 0.55] },
  { name: 'Meseta de Putorana, Rusia', lat: 69.0, lon: 94.0, vals: [22, 360, 11, 5, 69, 0.25] },
  { name: 'Isla Devon, Canadá', lat: 75.4, lon: -89.8, vals: [17, 300, 6, 60, 75, 0.12] },
  { name: 'Barreal, Argentina', lat: -31.6, lon: -69.4, vals: [3, 80, 7, 5, 32, 0.05] },
  { name: 'Galápagos (tubos de lava)', lat: -0.6, lon: -90.4, vals: [9, 120, 12, 5, 15, 0.85] },
]

export const FAMOUS: Record<'moon' | 'mars', Site[]> = {
  moon: [
    { name: 'Apollo 11', lat: 0.67, lon: 23.47, vals: [3, 60, 16, 30, 20, 0.2] },
    { name: 'Shackleton', lat: -89.9, lon: 0.0, vals: [20, 300, 6, 20, 88, 0.1] },
    { name: 'Tycho', lat: -43.3, lon: -11.4, vals: [28, 520, 10, 120, 45, 0.15] },
    { name: 'Apollo 17', lat: 20.19, lon: 30.77, vals: [10, 180, 15, 40, 25, 0.3] },
    { name: 'Mons Mouton', lat: -84.6, lon: -38.5, vals: [8, 160, 7, 15, 84, 0.08] },
    { name: 'Aristarchus', lat: 23.7, lon: -47.4, vals: [16, 300, 13, 25, 25, 0.85] },
  ],
  mars: [
    { name: 'Jezero', lat: 18.44, lon: 77.45, vals: [7, 160, 14, 40, 20, 0.1] },
    { name: 'Gale', lat: -5.4, lon: 137.8, vals: [12, 400, 13, 45, 10, 0.1] },
    { name: 'Olympus Mons', lat: 18.65, lon: -133.8, vals: [9, 300, 12, 10, 18, 0.35] },
    { name: 'Valles Marineris', lat: -13.9, lon: -59.2, vals: [26, 520, 13, 12, 16, 0.25] },
    { name: 'Gusev', lat: -14.6, lon: 175.5, vals: [8, 220, 14, 50, 16, 0.1] },
    { name: 'Elysium', lat: 4.5, lon: 135.9, vals: [6, 180, 12, 20, 8, 0.3] },
  ],
}

export const BODY_LABEL: Record<Body, string> = { moon: 'Luna', mars: 'Marte', earth: 'Tierra' }
/** Con artículo: "la Luna", "Marte", "la Tierra". */
export const BODY_THE: Record<Body, string> = { moon: 'la Luna', mars: 'Marte', earth: 'la Tierra' }

export const CAVEATS: string[] = [
  'La Tierra no reproduce la gravedad reducida de la Luna (1/6 g) ni la de Marte (3/8 g).',
  'No reproduce el vacío lunar ni la atmósfera delgada marciana (~0,6% de la terrestre).',
  'No reproduce el ambiente de radiación sin una magnetosfera que proteja.',
]
