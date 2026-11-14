import { AnimatePresence, motion } from 'framer-motion'
import type { DimKey } from '../engine/dimensions'
import { spring } from '../lib/motion'
import { useActiveProfile, useStore } from '../store/useStore'
import Segmented from './Segmented'

export default function ProfileSelector() {
  const profileId = useStore((s) => s.profileId)
  const setProfile = useStore((s) => s.setProfile)
  const profiles = useStore((s) => s.profiles)
  const dims = useStore((s) => s.dims)
  const p = useActiveProfile()
  const boosted = (Object.entries(p.weights) as [DimKey, number][]).flatMap(([k, w]) => {
    const d = dims.find((x) => x.key === k)
    return d ? [{ d, w }] : []
  })

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="kicker">Perfil de misión</div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={spring}
            className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-(--muted)"
          >
            {p.blurb}
            {boosted.map(({ d, w }) => (
              <span key={d.key} className="tnum rounded-md border border-(--line) px-1.5 py-px text-[11.5px] text-(--fg)">
                <span style={{ color: d.color }}>●</span> {d.short} ×{w}
              </span>
            ))}
          </motion.p>
        </AnimatePresence>
      </div>
      <Segmented
        id="profile"
        ariaLabel="Perfil de misión"
        value={profileId}
        onChange={setProfile}
        className={`grid w-full md:inline-flex md:w-auto ${profiles.length === 4 ? 'grid-cols-[repeat(4,minmax(0,1fr))]' : 'grid-cols-[repeat(3,minmax(0,1fr))]'}`}
        options={profiles.map((x) => ({
          value: x.id,
          title: x.blurb,
          label: (
            <>
              <span className="sm:hidden">{x.name.split(' /')[0]}</span>
              <span className="hidden sm:inline">{x.name}</span>
            </>
          ),
        }))}
      />
    </div>
  )
}
