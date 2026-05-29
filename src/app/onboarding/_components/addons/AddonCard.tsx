"use client"

import { Check } from 'lucide-react'
import type { PublicAddon } from '@/types/onboarding'

interface AddonCardProps {
  addon: PublicAddon
  selected: boolean
  onToggle: () => void
}

export function AddonCard({ addon, selected, onToggle }: AddonCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'flex h-full min-h-[260px] flex-col text-left p-5 rounded-lg border w-full',
        'transition-all duration-150 hover:shadow-[0_10px_28px_rgba(52,8,143,0.08)]',
        selected
          ? 'border-[#34088f] bg-[#f8f5ff] shadow-[0_0_0_1px_#34088f]'
          : 'border-[#e0d9f7] bg-white hover:border-[#34088f]/45',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className={['text-base font-bold leading-tight', selected ? 'text-[#34088f]' : 'text-gray-950'].join(' ')}>
          {addon.name}
        </h3>
        <span
          className={[
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-[#34088f] bg-[#34088f]' : 'border-gray-300 bg-white',
          ].join(' ')}
        >
          {selected && <Check size={12} className="text-white stroke-[3]" />}
        </span>
      </div>

      <div className="mt-4">
        <span className="text-2xl font-extrabold text-[#34088f] font-[Manrope]">
          ${addon.price.toLocaleString()}
        </span>
      </div>

      {addon.categoryNames.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {addon.categoryNames.map(cat => (
            <span
              key={cat}
              className="rounded-md bg-[#f4f0fe] text-[#34088f] text-xs px-2.5 py-1 font-medium border border-[#e0d9f7]/60"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {addon.features.length > 0 && (
        <>
          <div className="my-4 h-px w-full bg-[#e0d9f7]" />
          <ul className="flex flex-1 flex-col gap-2.5">
            {addon.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f4f0fe] text-[#34088f]">
                  <Check size={12} className="stroke-[3]" />
                </span>
                <span className="text-sm text-gray-600 leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-auto pt-4">
        <span className={['text-xs font-bold', selected ? 'text-[#34088f]' : 'text-gray-400'].join(' ')}>
          {selected ? 'Selected' : 'Select add-on'}
        </span>
      </div>
    </button>
  )
}
