import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'

export default function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => Math.round(v).toString())
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) {
      mv.set(value)
      return
    }
    const c = animate(mv, value, { type: 'spring', stiffness: 140, damping: 22 })
    return () => c.stop()
  }, [value, mv, reduced])
  return <motion.span className={className}>{text}</motion.span>
}
