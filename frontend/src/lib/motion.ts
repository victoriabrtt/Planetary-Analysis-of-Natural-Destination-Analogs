import type { Transition } from 'framer-motion'

// Springs críticamente amortiguados (bounce 0): se asientan sin rebotar. Apple reserva el rebote
// para gestos con inercia (un flick), y en esta UI no hay ninguno. Interrumpibles por diseño.
export const spring: Transition = { type: 'spring', bounce: 0, duration: 0.35 }
export const softSpring: Transition = { type: 'spring', bounce: 0, duration: 0.5 }
/** Barras y números: un poco más lentos, para que el cambio se lea. */
export const valueSpring: Transition = { type: 'spring', bounce: 0, duration: 0.7 }
