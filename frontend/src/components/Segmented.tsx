import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { spring } from '../lib/motion'

interface Option<T extends string> {
  value: T
  label: ReactNode
  title?: string
}

interface Props<T extends string> {
  id: string
  value: T
  options: Option<T>[]
  onChange: (v: T) => void
  ariaLabel: string
  size?: 'sm' | 'md'
  className?: string
}

/** Control segmentado con indicador que se desliza con resorte. */
export default function Segmented<T extends string>({ id, value, options, onChange, ariaLabel, size = 'md', className = '' }: Props<T>) {
  const pad = size === 'sm' ? 'px-3 h-8 text-[13px]' : 'px-4 h-10 text-sm'
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center gap-0.5 rounded-full border border-(--line) bg-(--glass) p-1 backdrop-blur-xl shadow-[inset_0_1px_0_var(--line-top)] ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`press relative z-0 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium tracking-[-0.01em] transition-colors ${pad} ${
              active ? 'text-white' : 'text-(--muted) hover:text-(--fg)'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring}
                className="absolute inset-0 -z-10 rounded-full bg-accent shadow-[0_6px_20px_-6px_rgb(57_135_229/0.8),inset_0_1px_0_rgb(255_255_255/0.3)]"
              />
            )}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
