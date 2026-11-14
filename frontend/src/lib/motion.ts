import type { Transition } from 'framer-motion'

export const spring: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }
export const softSpring: Transition = { type: 'spring', stiffness: 220, damping: 28 }
