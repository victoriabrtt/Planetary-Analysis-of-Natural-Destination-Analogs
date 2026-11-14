import type { DimKey } from '../engine/dimensions'
import { useActiveProfile, useStore } from '../store/useStore'
import Segmented from './Segmented'

export default function ProfileSelector() {
  const setProfile = useStore((s) => s.setProfile)
  const profiles = useStore((s) => s.profiles)
  const dims = useStore((s) => s.dims)
  const profileId = useStore((s) => s.profileId)
  const p = useActiveProfile()
  const boosted = (Object.entries(p.weights) as [DimKey, number][]).flatMap(([k, w]) => {
    const d = dims.find((x) => x.key === k)
    return d ? [{ d, w }] : []
  })

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 id="resultados" tabIndex={-1} className="display scroll-mt-6 text-[24px]">
          Perfil de misión
        </h2>
        <p className="mt-1 text-[16px] text-(--muted)">
          {p.blurb}
          {boosted.length > 0 && (
            <span className="tnum text-[14px]">
              {' · '}
              {boosted.map(({ d, w }) => `${d.short.toLowerCase()} ×${w}`).join(', ')}
            </span>
          )}
        </p>
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
