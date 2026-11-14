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

/** Control segmentado. El activo es una pastilla de tinta con el texto en el color del fondo
 *  (tabs de software según la skill): sin acento, sin brillo. El indicador se desliza solo por transform. */
export default function Segmented<T extends string>({ id, value, options, onChange, ariaLabel, size = 'md', className = '' }: Props<T>) {
  const pad = size === 'sm' ? 'px-3 h-8 text-[13px]' : 'px-2.5 sm:px-4 h-9 text-[14px]'
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center gap-0.5 rounded-[10px] border border-(--line) bg-(--card) p-1 ${className}`}
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
            className={`press relative z-0 flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors ${pad} ${
              active ? 'text-(--bg)' : 'text-(--muted) hover:text-(--fg)'
            }`}
          >
            {active && (
              <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 -z-10 rounded-md bg-(--fg)" />
            )}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
